import pytest

from classify import (
    classify_route,
    contour_props,
    feature_tags,
    parse_ele,
    parse_other_tags,
    path_props,
    poi_kind,
    sac_grade,
)


@pytest.mark.parametrize(
    ("tags", "expected"),
    [
        ({"ref": "GR 11"}, "GR"),
        ({"ref": "GR-11.1"}, "GR"),
        ({"ref": "GR11"}, "GR"),
        ({"ref": "PR-HU 30"}, "PR"),
        ({"ref": "PR-C 12"}, "PR"),
        ({"ref": "SL-HU 5"}, "SL"),
        ({"ref": "PR-HU 1;GR 11"}, "GR"),
        ({"ref": "E-7", "network": "iwn"}, "GR"),
        ({"osmc:symbol": "yellow:white:yellow_bar"}, "PR"),
        ({"osmc:symbol": "red:white:red_bar", "network": "lwn"}, "GR"),
        ({"osmc:symbol": "green:white:green_bar"}, "SL"),
        ({"network": "lwn"}, "SL"),
        ({"network": "rwn"}, "PR"),
        ({"ref": "GRAN VUELTA"}, "OTHER"),
        ({}, "OTHER"),
    ],
)
def test_classify_route(tags, expected):
    assert classify_route(tags) == expected


def test_sac_grade():
    assert sac_grade("demanding_mountain_hiking") == "T3"
    assert sac_grade("alpine_hiking;demanding_alpine_hiking") == "T4"
    assert sac_grade("T3") is None
    assert sac_grade(None) is None


@pytest.mark.parametrize(
    ("value", "expected"),
    [("3404", 3404), ("3404 m", 3404), ("3404,4", 3404), ("11168 ft", None), ("alto", None), ("99999", None), (None, None)],
)
def test_parse_ele(value, expected):
    assert parse_ele(value) == expected


def test_poi_kind():
    assert poi_kind({"natural": "peak"}) == "peak"
    assert poi_kind({"mountain_pass": "yes"}) == "saddle"
    assert poi_kind({"tourism": "alpine_hut"}) == "alpine_hut"
    assert poi_kind({"amenity": "bar"}) is None


def test_path_props():
    assert path_props({"highway": "footway", "sac_scale": "mountain_hiking"}) == {"highway": "path", "sac": "T2"}
    assert path_props({"highway": "track", "name": "Pista de Estós"}) == {"highway": "track", "name": "Pista de Estós"}
    assert path_props({"highway": "residential"}) is None


def test_contour_props_marca_maestras_cada_50():
    assert contour_props(2150.0) == {"ele": 2150, "idx": True}
    assert contour_props(2160.0) == {"ele": 2160, "idx": False}


def test_other_tags_hstore():
    raw = '"type"=>"route","osmc:symbol"=>"red:white:red_bar","note"=>"con \\"comillas\\""'
    assert parse_other_tags(raw) == {"type": "route", "osmc:symbol": "red:white:red_bar", "note": 'con "comillas"'}
    assert parse_other_tags(None) == {}


def test_feature_tags_columnas_mandan_sobre_other_tags():
    tags = feature_tags({"ref": "GR 11", "network": None, "other_tags": '"ref"=>"X","network"=>"lwn"'})
    assert tags["ref"] == "GR 11"
    assert tags["network"] == "lwn"
