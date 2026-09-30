"""Comprueba los PMTiles de una zona antes de publicarla.

Uso: python validate_zone.py zones.yaml ZONA DIRECTORIO_SALIDA
"""

from __future__ import annotations

import sys
from pathlib import Path

from pmtiles_header import PmtilesError, read_header, read_metadata
from zones import Zone, load_zones

# Capas que usa el estilo de la app (src/domain/map/tileSchema.ts).
REQUIRED_VECTOR_LAYERS = {"water", "transportation", "place", "ts_routes", "ts_paths", "ts_pois", "ts_contours"}
OPTIONAL_VECTOR_LAYERS = {"landcover", "landuse", "park", "boundary", "waterway", "transportation_name", "building"}
MAX_ZONE_BYTES = 3 * 1024**3
BOUNDS_TOLERANCE_DEG = 0.05


def _covers(bounds: tuple[float, float, float, float], bbox: tuple[float, float, float, float]) -> bool:
    t = BOUNDS_TOLERANCE_DEG
    return bounds[0] <= bbox[0] + t and bounds[1] <= bbox[1] + t and bounds[2] >= bbox[2] - t and bounds[3] >= bbox[3] - t


def validate_vector(path: Path, zone: Zone) -> list[str]:
    errors: list[str] = []
    try:
        header = read_header(path)
    except (OSError, PmtilesError) as e:
        return [f"{path.name}: {e}"]
    size = path.stat().st_size
    if header.tile_type != "mvt":
        errors.append(f"{path.name}: se esperaba mvt y es {header.tile_type}")
    if header.tile_data_offset + header.tile_data_length > size:
        errors.append(f"{path.name}: fichero truncado")
    if header.max_zoom < zone.max_zoom:
        errors.append(f"{path.name}: maxzoom {header.max_zoom} < {zone.max_zoom}")
    if not _covers(header.bounds, zone.bbox):
        errors.append(f"{path.name}: bounds {header.bounds} no cubren el bbox {zone.bbox}")
    layers = {layer.get("id") for layer in read_metadata(path, header).get("vector_layers", [])}
    missing = REQUIRED_VECTOR_LAYERS - layers
    if missing:
        errors.append(f"{path.name}: faltan capas {sorted(missing)}")
    return errors


def validate_raster(path: Path, zone: Zone) -> list[str]:
    try:
        header = read_header(path)
    except (OSError, PmtilesError) as e:
        return [f"{path.name}: {e}"]
    errors = []
    if header.tile_type not in ("png", "jpeg", "webp"):
        errors.append(f"{path.name}: tipo ráster no soportado {header.tile_type}")
    if header.tile_data_offset + header.tile_data_length > path.stat().st_size:
        errors.append(f"{path.name}: fichero truncado")
    if not _covers(header.bounds, zone.bbox):
        errors.append(f"{path.name}: bounds {header.bounds} no cubren el bbox {zone.bbox}")
    return errors


def validate_zone(zone: Zone, out_dir: Path) -> list[str]:
    vector = out_dir / f"{zone.id}-vector.pmtiles"
    raster = out_dir / f"{zone.id}-raster.pmtiles"
    errors = validate_vector(vector, zone) if vector.exists() else [f"falta {vector.name}"]
    if zone.raster != "none":
        errors += validate_raster(raster, zone) if raster.exists() else [f"falta {raster.name}"]
    total = sum(p.stat().st_size for p in (vector, raster) if p.exists())
    if total > MAX_ZONE_BYTES:
        errors.append(f"la zona ocupa {total / 1024**3:.1f} GB (> 3 GB): reducir bbox o zoom")
    return errors


def main(argv: list[str]) -> int:
    zones = load_zones(Path(argv[1]))
    zone, out_dir = zones[argv[2]], Path(argv[3])
    errors = validate_zone(zone, out_dir)
    for error in errors:
        print(f"ERROR {zone.id}: {error}", file=sys.stderr)
    if not errors:
        print(f"OK {zone.id}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
