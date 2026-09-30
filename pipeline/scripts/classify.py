"""Normalización de etiquetas OSM al esquema de teselas de la app (docs/tile-schema.md).

Funciones puras: se prueban sin GDAL. `features.py` las aplica a la salida de ogr2ogr.
"""

from __future__ import annotations

import re

# --- Rutas GR / PR / SL -------------------------------------------------------

_REF_CLASS = [
    ("GR", re.compile(r"^\s*GR\s*[-\s]?\s*\d", re.IGNORECASE)),
    ("PR", re.compile(r"^\s*PR\s*[-\s]", re.IGNORECASE)),
    ("SL", re.compile(r"^\s*SL\s*[-\s]", re.IGNORECASE)),
]
_RANK = {"GR": 0, "PR": 1, "SL": 2, "OTHER": 3}

# Señal pintada: osmc:symbol = "color_trazo:fondo[:figura...]". GR rojo-blanco, PR amarillo-blanco, SL verde-blanco.
_OSMC_WAYCOLOR = {"red": "GR", "yellow": "PR", "green": "SL"}

# [VERIFICAR en S4] En España `network` no distingue bien PR de GR regionales; solo es el último recurso.
_NETWORK_CLASS = {"iwn": "GR", "nwn": "GR", "rwn": "PR", "lwn": "SL"}


def classify_route_with_source(tags: dict[str, str]) -> tuple[str, str]:
    """(clase, regla que decidió). Orden: `ref` → `osmc:symbol` → `network` → OTHER."""
    refs = [r for r in (tags.get("ref") or "").split(";") if r.strip()]
    from_ref = [cls for ref in refs for cls, pattern in _REF_CLASS if pattern.match(ref)]
    if from_ref:
        return min(from_ref, key=_RANK.__getitem__), "ref"
    symbol = [part.strip().lower() for part in (tags.get("osmc:symbol") or "").split(":")]
    if len(symbol) >= 2 and symbol[1] == "white" and symbol[0] in _OSMC_WAYCOLOR:
        return _OSMC_WAYCOLOR[symbol[0]], "osmc:symbol"
    network = (tags.get("network") or "").strip().lower()
    if network in _NETWORK_CLASS:
        return _NETWORK_CLASS[network], "network"
    return "OTHER", "none"


def classify_route(tags: dict[str, str]) -> str:
    return classify_route_with_source(tags)[0]


# --- Dificultad SAC -----------------------------------------------------------

SAC = {
    "hiking": "T1",
    "mountain_hiking": "T2",
    "demanding_mountain_hiking": "T3",
    "alpine_hiking": "T4",
    "demanding_alpine_hiking": "T5",
    "difficult_alpine_hiking": "T6",
}


def sac_grade(value: str | None) -> str | None:
    if not value:
        return None
    return SAC.get(value.strip().lower().split(";")[0])


# --- Puntos de interés --------------------------------------------------------

_POI_RULES: list[tuple[str, str, str]] = [
    ("natural", "peak", "peak"),
    ("natural", "saddle", "saddle"),
    ("mountain_pass", "yes", "saddle"),
    ("tourism", "alpine_hut", "alpine_hut"),
    ("tourism", "wilderness_hut", "wilderness_hut"),
    ("amenity", "shelter", "shelter"),
    ("natural", "spring", "spring"),
    ("amenity", "drinking_water", "drinking_water"),
    ("tourism", "viewpoint", "viewpoint"),
    ("natural", "cave_entrance", "cave_entrance"),
]


def poi_kind(tags: dict[str, str]) -> str | None:
    for key, value, kind in _POI_RULES:
        if tags.get(key) == value:
            return kind
    return None


_ELE = re.compile(r"^\s*(-?\d+(?:[.,]\d+)?)\s*(m|metros|meters)?\s*$", re.IGNORECASE)


def parse_ele(value: str | None) -> int | None:
    """`ele` de OSM → metros enteros. Descarta pies y valores no numéricos o absurdos."""
    if not value:
        return None
    match = _ELE.match(value)
    if not match:
        return None
    ele = round(float(match.group(1).replace(",", ".")))
    return ele if -500 <= ele <= 9000 else None


# --- Caminos ------------------------------------------------------------------

PATH_HIGHWAYS = {"path", "footway", "track", "bridleway", "steps"}


def path_props(tags: dict[str, str]) -> dict | None:
    highway = tags.get("highway")
    if highway not in PATH_HIGHWAYS:
        return None
    props: dict = {"highway": "track" if highway == "track" else "path"}
    grade = sac_grade(tags.get("sac_scale"))
    if grade:
        props["sac"] = grade
    if tags.get("name"):
        props["name"] = tags["name"]
    return props


# --- Curvas de nivel ----------------------------------------------------------

def contour_props(ele: float, index_every: int = 50) -> dict:
    value = round(ele)
    return {"ele": value, "idx": value % index_every == 0}


# --- other_tags de GDAL -------------------------------------------------------

_HSTORE_PAIR = re.compile(r'"((?:[^"\\]|\\.)*)"=>"((?:[^"\\]|\\.)*)"')


def parse_other_tags(value: str | None) -> dict[str, str]:
    """El driver OSM de GDAL mete las etiquetas no configuradas en `other_tags` con formato hstore."""
    if not value:
        return {}
    return {k.replace('\\"', '"'): v.replace('\\"', '"') for k, v in _HSTORE_PAIR.findall(value)}


def feature_tags(properties: dict) -> dict[str, str]:
    """Etiquetas OSM de una feature de ogr2ogr: columnas + other_tags (las columnas mandan)."""
    tags = parse_other_tags(properties.get("other_tags"))
    for key, value in properties.items():
        if key == "other_tags" or value is None:
            continue
        tags["osmc:symbol" if key == "osmc_symbol" else key] = str(value)
    return tags
