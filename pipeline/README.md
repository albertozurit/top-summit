# Pipeline de zonas offline

Genera, para cada zona de `zones.yaml`, un PMTiles vectorial (base OpenMapTiles + senderos, caminos, PdI y curvas de nivel) y uno ráster (relieve o MTN25), más el `manifest.json` que consume la app. Contrato de capas: [`docs/tile-schema.md`](../docs/tile-schema.md).

## Requisitos

- Docker (en WSL: Docker Desktop con la integración WSL activada para esta distro).
- Python 3.11+ en el host con PyYAML (`pip install -r requirements.txt`): lo usan el Makefile, `validate_zone.py` y `manifest.py`.
- ~5 GB libres (extracto de España 1,3 GB, fuentes de Planetiler ~1 GB, intermedios).
- `gh` CLI para publicar.

## Uso

```bash
cd pipeline
make tools                     # imagen con GDAL, tippecanoe, osmium y pmtiles
make spain                     # extracto de España de Geofabrik (reanudable)
make zone ZONE=benasque        # todo el proceso de una zona + validación
make manifest                  # output/manifest.json (URLs relativas)
make serve                     # http://<IP-del-PC>:8080/manifest.json con Range, para el iPhone en la LAN
make publish TAG=zones-2026-10-01   # crea la release y sube manifest + pmtiles
make test                      # pytest (también en CI)
```

Pasos de `make zone`: `osm` (recorte con osmium + fecha OSM) → `base` (Planetiler) → `overlay` (ogr2ogr → `features.py` → tippecanoe) → `contours` (DEM → `gdal_contour` cada 10 m) → `vector` (`tile-join`) → `raster` (relieve u MTN25 según `zones.yaml`) → `validate`.

El DEM de Copernicus se descarga solo. Para MDT25/MDT05 del CNIG o las hojas MTN25, deja los GeoTIFF a mano en `input/dem/<zona>/` o `input/mtn25/<zona>/` y pon `dem:` / `raster:` en `zones.yaml`.

## Spike S3: comparar A y B

- **A**: `raster: hillshade` (base vectorial + relieve + curvas).
- **B**: `raster: mtn25` (ráster MTN25 + rutas encima). `make mtn25 ZONE=benasque`.
- Mide y anota en `docs/adr/0003-s3-pipeline.md`: tiempo de cada paso, tamaño por 100 km², capturas en el iPhone a zoom 12, 14 y 16.

## Spike S4: calidad de senderos

```bash
python3 scripts/trail_report.py zones.yaml benasque
```

Consulta Overpass y muestra cuántas rutas se clasifican por `ref`, `osmc:symbol`, `network` o quedan como "otra ruta". Compara 5 senderos conocidos (al menos un GR, un PR y un SL) con la señalización real y anótalo en `docs/adr/0004-s4-senderos.md`.

## Salida

```text
output/
  <zona>-vector.pmtiles
  <zona>-raster.pmtiles
  <zona>.osmdate
  manifest.json
```

`work/`, `input/` y `output/` están en `.gitignore`. Nunca se suben PMTiles al repositorio: se publican como assets de GitHub Releases.
