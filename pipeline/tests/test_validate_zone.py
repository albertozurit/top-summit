from pathlib import Path

import pytest

from pmtiles_header import PmtilesError, parse_header, read_header, read_metadata
from validate_zone import REQUIRED_VECTOR_LAYERS, validate_zone
from zones import load_zones

ZONES = load_zones(Path(__file__).resolve().parent.parent / "zones.yaml")
LAYERS = sorted(REQUIRED_VECTOR_LAYERS | {"landcover"})


def test_lee_cabecera_y_metadatos(tmp_path, pmtiles_factory):
    path = pmtiles_factory(tmp_path / "v.pmtiles", layers=["ts_routes"])
    header = read_header(path)
    assert header.tile_type == "mvt"
    assert header.max_zoom == 14
    assert header.bounds == pytest.approx((0.4, 42.5, 0.75, 42.75))
    assert read_metadata(path, header)["vector_layers"] == [{"id": "ts_routes"}]


def test_rechaza_no_pmtiles():
    with pytest.raises(PmtilesError):
        parse_header(b"x" * 127)


def test_zona_valida(tmp_path, pmtiles_factory):
    zone = ZONES["benasque"]
    pmtiles_factory(tmp_path / "benasque-vector.pmtiles", layers=LAYERS)
    pmtiles_factory(tmp_path / "benasque-raster.pmtiles", tile_type=3)
    assert validate_zone(zone, tmp_path) == []


@pytest.mark.parametrize(
    ("kwargs", "message"),
    [
        ({"layers": ["water"]}, "faltan capas"),
        ({"layers": LAYERS, "truncate": True}, "truncado"),
        ({"layers": LAYERS, "max_zoom": 12}, "maxzoom"),
        ({"layers": LAYERS, "bounds": (0.5, 42.5, 0.75, 42.75)}, "no cubren"),
        ({"layers": LAYERS, "tile_type": 2}, "se esperaba mvt"),
    ],
)
def test_zona_invalida(tmp_path, pmtiles_factory, kwargs, message):
    zone = ZONES["benasque"]
    pmtiles_factory(tmp_path / "benasque-vector.pmtiles", **kwargs)
    pmtiles_factory(tmp_path / "benasque-raster.pmtiles", tile_type=3)
    errors = validate_zone(zone, tmp_path)
    assert any(message in e for e in errors), errors


def test_falta_raster(tmp_path, pmtiles_factory):
    pmtiles_factory(tmp_path / "benasque-vector.pmtiles", layers=LAYERS)
    assert validate_zone(ZONES["benasque"], tmp_path) == ["falta benasque-raster.pmtiles"]
