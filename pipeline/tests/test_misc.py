import pytest

from dem import tile_name, tiles_for_bbox
from serve import parse_range
from trail_report import overpass_query, summarize
from zones import ZoneConfigError, parse_zone


def test_informe_s4():
    report = summarize(
        [
            {"id": 1, "tags": {"ref": "GR 11", "network": "nwn", "name": "GR 11"}},
            {"id": 2, "tags": {"osmc:symbol": "yellow:white:yellow_bar", "name": "Batisielles"}},
            {"id": 3, "tags": {"name": "Sin datos"}},
        ]
    )
    assert report["total"] == 3
    assert report["by_class"] == {"GR": 1, "PR": 1, "OTHER": 1}
    assert report["by_source"] == {"ref": 1, "osmc:symbol": 1, "none": 1}
    assert overpass_query((0.4, 42.5, 0.75, 42.75)).endswith("(42.5,0.4,42.75,0.75);out tags;")


def test_teselas_copernicus_para_bbox():
    assert tile_name(42, 0) == "Copernicus_DSM_COG_10_N42_00_E000_00_DEM"
    assert tile_name(40, -4) == "Copernicus_DSM_COG_10_N40_00_W004_00_DEM"
    assert tiles_for_bbox(-0.2, 42.5, 0.75, 42.75) == [
        "Copernicus_DSM_COG_10_N42_00_W001_00_DEM",
        "Copernicus_DSM_COG_10_N42_00_E000_00_DEM",
    ]


@pytest.mark.parametrize(
    ("header", "expected"),
    [
        ("bytes=0-99", (0, 99)),
        ("bytes=500-", (500, 999)),
        ("bytes=-100", (900, 999)),
        ("bytes=900-5000", (900, 999)),
        ("bytes=1000-", None),
        ("bytes=0-1,5-6", None),
        (None, None),
    ],
)
def test_parse_range(header, expected):
    assert parse_range(header, 1000) == expected


def _zone(**overrides):
    base = {"id": "benasque", "name": "Benasque", "bbox": [0.4, 42.5, 0.75, 42.75]}
    return {**base, **overrides}


def test_parse_zone_valida():
    zone = parse_zone(_zone())
    assert zone.bbox == (0.4, 42.5, 0.75, 42.75)
    assert zone.raster == "hillshade"


@pytest.mark.parametrize(
    "overrides",
    [
        {"id": "../etc"},
        {"bbox": [1, 42, 0, 43]},
        {"bbox": [0, 1]},
        {"maxZoom": 20},
        {"dem": "srtm"},
        {"raster": "satelite"},
        {"name": " "},
    ],
)
def test_parse_zone_invalida(overrides):
    with pytest.raises(ZoneConfigError):
        parse_zone(_zone(**overrides))
