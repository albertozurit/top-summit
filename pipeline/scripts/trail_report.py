"""Spike S4: cómo se clasifican las rutas de senderismo OSM de una zona.

Uso:
  python trail_report.py zones.yaml ZONA            # consulta Overpass y guarda output/<zona>-routes.json
  python trail_report.py --file RESPUESTA.json      # reutiliza una respuesta guardada
Imprime recuentos por clase y por regla, y la lista para revisar a mano frente a la señalización.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

from classify import classify_route_with_source

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "top-summit-pipeline/0.1 (uso personal, spike S4)"


def overpass_query(bbox: tuple[float, float, float, float]) -> str:
    w, s, e, n = bbox
    return f'[out:json][timeout:120];relation["type"="route"]["route"~"^(hiking|foot)$"]({s},{w},{n},{e});out tags;'


def fetch(bbox: tuple[float, float, float, float]) -> dict:
    body = urllib.parse.urlencode({"data": overpass_query(bbox)}).encode()
    request = urllib.request.Request(OVERPASS_URL, data=body, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=180) as response:  # noqa: S310 - URL fija https
        return json.load(response)


def summarize(elements: list[dict]) -> dict:
    rows = []
    for element in elements:
        tags = element.get("tags", {})
        cls, source = classify_route_with_source(tags)
        rows.append(
            {
                "id": element.get("id"),
                "class": cls,
                "source": source,
                "ref": tags.get("ref", ""),
                "network": tags.get("network", ""),
                "osmc": tags.get("osmc:symbol", ""),
                "name": tags.get("name", ""),
            }
        )
    rows.sort(key=lambda r: (r["class"], r["ref"], r["name"]))
    return {
        "total": len(rows),
        "by_class": dict(Counter(r["class"] for r in rows)),
        "by_source": dict(Counter(r["source"] for r in rows)),
        "with_ref": sum(1 for r in rows if r["ref"]),
        "with_network": sum(1 for r in rows if r["network"]),
        "rows": rows,
    }


def print_report(report: dict) -> None:
    print(f"Relaciones route=hiking|foot: {report['total']}")
    print(f"  con ref: {report['with_ref']}  con network: {report['with_network']}")
    print(f"  por clase: {report['by_class']}")
    print(f"  por regla: {report['by_source']}")
    print()
    print(f"{'clase':6} {'regla':12} {'ref':14} {'network':8} {'osmc:symbol':26} nombre")
    for r in report["rows"]:
        print(f"{r['class']:6} {r['source']:12} {r['ref'][:14]:14} {r['network'][:8]:8} {r['osmc'][:26]:26} {r['name']}")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("zones_yaml", nargs="?", type=Path)
    parser.add_argument("zone", nargs="?")
    parser.add_argument("--file", type=Path)
    args = parser.parse_args(argv[1:])
    if args.file:
        data = json.loads(args.file.read_text(encoding="utf-8"))
    else:
        from zones import load_zones

        zone = load_zones(args.zones_yaml)[args.zone]
        data = fetch(zone.bbox)
        target = Path("output") / f"{zone.id}-routes.json"
        target.parent.mkdir(exist_ok=True)
        target.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print_report(summarize(data.get("elements", [])))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
