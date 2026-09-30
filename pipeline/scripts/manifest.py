"""Genera manifest.json (formato de src/domain/manifest.ts) a partir de las zonas construidas.

Uso: python manifest.py zones.yaml DIRECTORIO_SALIDA [--base-url URL] [ZONA ...]
Las URLs de fichero son relativas al manifest salvo que se pase --base-url.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

from zones import Zone, load_zones

SCHEMA_VERSION = 1

ATTRIBUTION_OSM = "© Colaboradores de OpenStreetMap (ODbL)"
ATTRIBUTION_OMT = "© OpenMapTiles"
DEM_ATTRIBUTION = {
    "copernicus-glo30": "Copernicus DEM GLO-30 © DLR e.V. 2010-2014 y © Airbus Defence and Space GmbH 2014-2018, proporcionado bajo COPERNICUS por la Unión Europea y la ESA",
    # [VERIFICAR] Texto exacto según la tabla de productos del SCNE.
    "cnig-mdt25": "MDT25 CC-BY 4.0 scne.es",
    "cnig-mdt05": "MDT05 CC-BY 4.0 scne.es",
}
# [VERIFICAR] Texto exacto según la tabla de productos del SCNE.
ATTRIBUTION_MTN25 = "MTN25 CC-BY 4.0 scne.es"


def md5sum(path: Path) -> str:
    digest = hashlib.md5(usedforsecurity=False)
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def attribution(zone: Zone) -> list[str]:
    parts = [ATTRIBUTION_OSM, ATTRIBUTION_OMT, DEM_ATTRIBUTION[zone.dem]]
    if zone.raster == "mtn25":
        parts.append(ATTRIBUTION_MTN25)
    return parts


def zone_entry(zone: Zone, out_dir: Path, osm_date: str, base_url: str | None) -> dict:
    files = []
    kinds = ["vector"] + ([] if zone.raster == "none" else ["raster"])
    for kind in kinds:
        path = out_dir / f"{zone.id}-{kind}.pmtiles"
        if not path.exists():
            raise FileNotFoundError(path)
        url = f"{base_url.rstrip('/')}/{path.name}" if base_url else path.name
        files.append({"kind": kind, "url": url, "bytes": path.stat().st_size, "md5": md5sum(path)})
    entry = {
        "id": zone.id,
        "name": zone.name,
        "version": f"{osm_date}.{files[0]['md5'][:8]}",
        "bbox": list(zone.bbox),
        "minZoom": zone.min_zoom,
        "maxZoom": zone.max_zoom,
        "osmDate": osm_date,
        "demSource": zone.dem,
        "raster": zone.raster,
        "attribution": attribution(zone),
        "files": files,
    }
    if zone.description:
        entry["description"] = zone.description
    return entry


def read_osm_date(out_dir: Path, zone_id: str) -> str:
    stamp = out_dir / f"{zone_id}.osmdate"
    if not stamp.exists():
        raise FileNotFoundError(f"{stamp} (lo escribe `make osm`)")
    return stamp.read_text(encoding="utf-8").strip()


def build_manifest(zones: list[Zone], out_dir: Path, base_url: str | None) -> dict:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "zones": [zone_entry(z, out_dir, read_osm_date(out_dir, z.id), base_url) for z in zones],
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("zones_yaml", type=Path)
    parser.add_argument("out_dir", type=Path)
    parser.add_argument("zone_ids", nargs="*")
    parser.add_argument("--base-url")
    args = parser.parse_args(argv[1:])
    if args.base_url and not args.base_url.startswith("https://"):
        parser.error("--base-url debe ser https")
    all_zones = load_zones(args.zones_yaml)
    ids = args.zone_ids or [z for z in all_zones if (args.out_dir / f"{z}-vector.pmtiles").exists()]
    manifest = build_manifest([all_zones[i] for i in ids], args.out_dir, args.base_url)
    target = args.out_dir / "manifest.json"
    target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{target}: {len(manifest['zones'])} zonas")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
