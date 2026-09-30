import gzip
import json
import struct
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def make_pmtiles(
    path: Path,
    *,
    tile_type: int = 1,
    layers: list[str] | None = None,
    bounds: tuple[float, float, float, float] = (0.4, 42.5, 0.75, 42.75),
    max_zoom: int = 14,
    tile_bytes: int = 1000,
    truncate: bool = False,
) -> Path:
    """PMTiles v3 sintético: cabecera real + metadatos gzip + bytes de relleno como teselas."""
    metadata = gzip.compress(json.dumps({"vector_layers": [{"id": layer} for layer in layers or []]}).encode())
    root = b"\x00" * 16
    root_off = 127
    meta_off = root_off + len(root)
    tile_off = meta_off + len(metadata)
    header = bytearray(127)
    header[:7] = b"PMTiles"
    header[7] = 3
    struct.pack_into("<8Q", header, 8, root_off, len(root), meta_off, len(metadata), 0, 0, tile_off, tile_bytes)
    struct.pack_into("<5B", header, 97, 2, 2, tile_type, 0, max_zoom)
    struct.pack_into("<4i", header, 102, *(round(v * 1e7) for v in bounds))
    body = bytes(header) + root + metadata + b"\x01" * (tile_bytes - (10 if truncate else 0))
    path.write_bytes(body)
    return path


@pytest.fixture
def pmtiles_factory():
    return make_pmtiles
