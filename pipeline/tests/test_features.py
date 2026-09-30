from conftest import FIXTURES

from features import convert


def test_rutas_sinteticas_gr_pr_sl():
    with (FIXTURES / "routes.geojsonl").open(encoding="utf-8") as f:
        routes = list(convert("routes", f))

    by_name = {r["properties"]["name"]: r["properties"] for r in routes}
    assert by_name["Senda de Camille"] == {"ts_class": "GR", "name": "Senda de Camille", "ref": "GR 11"}
    assert by_name["Ibón de Batisielles"]["ts_class"] == "PR"
    assert by_name["Ibón de Batisielles"]["name:es"] == "Ibón de Batisielles"
    assert by_name["Sendero del Forau"]["ts_class"] == "SL"
    assert by_name["Ruta sin señalizar"]["ts_class"] == "OTHER"
    assert "Línea de autobús" not in by_name
    assert len(routes) == 4


def test_pois_y_curvas():
    pois = list(
        convert(
            "pois",
            [
                '{"type":"Feature","properties":{"natural":"peak","name":"Aneto","ele":"3404"},"geometry":{"type":"Point","coordinates":[0.656,42.631]}}',
                '{"type":"Feature","properties":{"amenity":"bench"},"geometry":{"type":"Point","coordinates":[0.6,42.6]}}',
            ],
        )
    )
    assert pois == [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [0.656, 42.631]},
            "properties": {"kind": "peak", "name": "Aneto", "ele": 3404},
        }
    ]

    contours = list(
        convert(
            "contours",
            ['\x1e{"type":"Feature","properties":{"ele":2500.0},"geometry":{"type":"LineString","coordinates":[[0,0],[1,1]]}}'],
        )
    )
    assert contours[0]["properties"] == {"ele": 2500, "idx": True}
