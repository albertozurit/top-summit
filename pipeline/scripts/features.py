"""Convierte la salida GeoJSONSeq de ogr2ogr / gdal_contour en las capas propias ts_*.

Uso: python features.py {routes|paths|pois|contours} ENTRADA.geojsonl SALIDA.geojsonl
"""

from __future__ import annotations

import json
import sys
from collections.abc import Iterable, Iterator
from pathlib import Path

from classify import classify_route, contour_props, feature_tags, parse_ele, path_props, poi_kind

NAME_KEYS = ("name", "name:es", "name:en")


def _names(tags: dict[str, str]) -> dict[str, str]:
    return {k: tags[k][:120] for k in NAME_KEYS if tags.get(k)}


def route_feature(feature: dict) -> dict | None:
    tags = feature_tags(feature.get("properties") or {})
    if tags.get("route") not in ("hiking", "foot"):
        return None
    props = {"ts_class": classify_route(tags), **_names(tags)}
    if tags.get("ref"):
        props["ref"] = tags["ref"][:40]
    return {"type": "Feature", "geometry": feature["geometry"], "properties": props}


def path_feature(feature: dict) -> dict | None:
    tags = feature_tags(feature.get("properties") or {})
    props = path_props(tags)
    return None if props is None else {"type": "Feature", "geometry": feature["geometry"], "properties": props}


def poi_feature(feature: dict) -> dict | None:
    tags = feature_tags(feature.get("properties") or {})
    kind = poi_kind(tags)
    if kind is None:
        return None
    props: dict = {"kind": kind, **_names(tags)}
    ele = parse_ele(tags.get("ele"))
    if ele is not None:
        props["ele"] = ele
    return {"type": "Feature", "geometry": feature["geometry"], "properties": props}


def contour_feature(feature: dict) -> dict | None:
    ele = (feature.get("properties") or {}).get("ele")
    if not isinstance(ele, (int, float)):
        return None
    return {"type": "Feature", "geometry": feature["geometry"], "properties": contour_props(ele)}


CONVERTERS = {"routes": route_feature, "paths": path_feature, "pois": poi_feature, "contours": contour_feature}


def read_seq(lines: Iterable[str]) -> Iterator[dict]:
    for line in lines:
        line = line.strip().lstrip("\x1e")
        if line:
            yield json.loads(line)


def convert(kind: str, lines: Iterable[str]) -> Iterator[dict]:
    converter = CONVERTERS[kind]
    for feature in read_seq(lines):
        if feature.get("geometry") is None:
            continue
        out = converter(feature)
        if out is not None:
            yield out


def main(argv: list[str]) -> int:
    if len(argv) != 4 or argv[1] not in CONVERTERS:
        print(__doc__, file=sys.stderr)
        return 2
    kind, src, dst = argv[1], Path(argv[2]), Path(argv[3])
    count = 0
    with src.open(encoding="utf-8") as fin, dst.open("w", encoding="utf-8") as fout:
        for feature in convert(kind, fin):
            fout.write(json.dumps(feature, ensure_ascii=False, separators=(",", ":")) + "\n")
            count += 1
    print(f"{kind}: {count} features → {dst}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
