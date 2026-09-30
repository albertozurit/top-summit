"""Lectura mínima de PMTiles v3 (cabecera + metadatos), sin dependencias.

Debe coincidir con src/domain/pmtilesHeader.ts: la app aplica las mismas comprobaciones.
"""

from __future__ import annotations

import gzip
import json
import struct
from dataclasses import dataclass
from pathlib import Path

HEADER_BYTES = 127
TILE_TYPES = {0: "unknown", 1: "mvt", 2: "png", 3: "jpeg", 4: "webp", 5: "avif"}
COMPRESSION = {0: "unknown", 1: "none", 2: "gzip", 3: "brotli", 4: "zstd"}


class PmtilesError(ValueError):
    pass


@dataclass(frozen=True)
class Header:
    root_offset: int
    root_length: int
    metadata_offset: int
    metadata_length: int
    tile_data_offset: int
    tile_data_length: int
    internal_compression: str
    tile_type: str
    min_zoom: int
    max_zoom: int
    bounds: tuple[float, float, float, float]


def parse_header(data: bytes) -> Header:
    if len(data) < HEADER_BYTES:
        raise PmtilesError("cabecera incompleta")
    if data[:7] != b"PMTiles":
        raise PmtilesError("no es un fichero PMTiles")
    if data[7] != 3:
        raise PmtilesError(f"versión PMTiles no soportada: {data[7]}")
    root_off, root_len, meta_off, meta_len, _leaf_off, _leaf_len, tile_off, tile_len = struct.unpack_from("<8Q", data, 8)
    internal, _tile_compression, tile_type, min_zoom, max_zoom = struct.unpack_from("<5B", data, 97)
    w, s, e, n = (v / 1e7 for v in struct.unpack_from("<4i", data, 102))
    return Header(
        root_off,
        root_len,
        meta_off,
        meta_len,
        tile_off,
        tile_len,
        COMPRESSION.get(internal, "unknown"),
        TILE_TYPES.get(tile_type, "unknown"),
        min_zoom,
        max_zoom,
        (w, s, e, n),
    )


def read_header(path: Path) -> Header:
    with path.open("rb") as f:
        return parse_header(f.read(HEADER_BYTES))


def read_metadata(path: Path, header: Header) -> dict:
    with path.open("rb") as f:
        f.seek(header.metadata_offset)
        raw = f.read(header.metadata_length)
    if header.internal_compression == "gzip":
        raw = gzip.decompress(raw)
    elif header.internal_compression != "none":
        raise PmtilesError(f"compresión de metadatos no soportada: {header.internal_compression}")
    return json.loads(raw or b"{}")
