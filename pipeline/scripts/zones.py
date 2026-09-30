"""Carga y valida pipeline/zones.yaml (mismas reglas que el manifest de la app)."""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

import yaml

ZONE_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
DEM_SOURCES = {"copernicus-glo30", "cnig-mdt25", "cnig-mdt05"}
RASTER_KINDS = {"hillshade", "mtn25", "none"}


@dataclass(frozen=True)
class Zone:
    id: str
    name: str
    description: str | None
    bbox: tuple[float, float, float, float]
    min_zoom: int
    max_zoom: int
    dem: str
    raster: str


class ZoneConfigError(ValueError):
    pass


def parse_zone(raw: dict) -> Zone:
    zid = raw.get("id")
    if not isinstance(zid, str) or not ZONE_ID.match(zid):
        raise ZoneConfigError(f"id inválido: {zid!r}")
    bbox = raw.get("bbox")
    if not (isinstance(bbox, list) and len(bbox) == 4 and all(isinstance(v, (int, float)) for v in bbox)):
        raise ZoneConfigError(f"{zid}: bbox debe ser [oeste, sur, este, norte]")
    w, s, e, n = (float(v) for v in bbox)
    if not (-180 <= w < e <= 180 and -90 <= s < n <= 90):
        raise ZoneConfigError(f"{zid}: bbox fuera de rango o invertido")
    min_zoom, max_zoom = int(raw.get("minZoom", 0)), int(raw.get("maxZoom", 14))
    if not 0 <= min_zoom <= max_zoom <= 16:
        raise ZoneConfigError(f"{zid}: rango de zoom inválido")
    dem = raw.get("dem", "copernicus-glo30")
    if dem not in DEM_SOURCES:
        raise ZoneConfigError(f"{zid}: dem desconocido {dem!r}")
    raster = raw.get("raster", "hillshade")
    if raster not in RASTER_KINDS:
        raise ZoneConfigError(f"{zid}: raster desconocido {raster!r}")
    name = raw.get("name")
    if not isinstance(name, str) or not name.strip():
        raise ZoneConfigError(f"{zid}: falta name")
    return Zone(zid, name.strip(), raw.get("description"), (w, s, e, n), min_zoom, max_zoom, dem, raster)


def load_zones(path: Path) -> dict[str, Zone]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    zones = [parse_zone(z) for z in data.get("zones", [])]
    ids = [z.id for z in zones]
    if len(set(ids)) != len(ids):
        raise ZoneConfigError("ids de zona repetidos")
    return {z.id: z for z in zones}


def main(argv: list[str]) -> int:
    """`zones.py <zones.yaml> <id> <campo>`: imprime un campo para el Makefile."""
    path, zone_id, field = Path(argv[1]), argv[2], argv[3]
    zone = load_zones(path)[zone_id]
    if field == "bbox":
        print(",".join(f"{v:g}" for v in zone.bbox))
    elif field == "bbox-ws":
        print(" ".join(f"{v:g}" for v in zone.bbox))
    else:
        print(getattr(zone, field.replace("-", "_")))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
