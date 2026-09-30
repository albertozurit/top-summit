"""URLs de las teselas Copernicus DEM GLO-30 (AWS Open Data, sin cuenta) que cubren un bbox.

Uso: python dem.py OESTE SUR ESTE NORTE   → una URL por línea
Los MDT del CNIG no tienen descarga automatizable: se dejan a mano en pipeline/input/dem/<zona>/.
"""

from __future__ import annotations

import math
import sys

BASE = "https://copernicus-dem-30m.s3.amazonaws.com"


def tile_name(lat: int, lon: int) -> str:
    ns = f"N{lat:02d}" if lat >= 0 else f"S{-lat:02d}"
    ew = f"E{lon:03d}" if lon >= 0 else f"W{-lon:03d}"
    return f"Copernicus_DSM_COG_10_{ns}_00_{ew}_00_DEM"


def tiles_for_bbox(w: float, s: float, e: float, n: float) -> list[str]:
    names = []
    for lat in range(math.floor(s), math.ceil(n)):
        for lon in range(math.floor(w), math.ceil(e)):
            names.append(tile_name(lat, lon))
    return names


def tile_urls(w: float, s: float, e: float, n: float) -> list[str]:
    return [f"{BASE}/{name}/{name}.tif" for name in tiles_for_bbox(w, s, e, n)]


def main(argv: list[str]) -> int:
    w, s, e, n = (float(v) for v in argv[1:5])
    print("\n".join(tile_urls(w, s, e, n)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
