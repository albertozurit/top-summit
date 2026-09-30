# ADR 0003 — S3: pipeline y comparación de base cartográfica (A vs B)

Estado: **pipeline escrito y probado por unidades; ejecución real pendiente**. Decide D4 (base cartográfica).

## Opciones

- **A** — base vectorial OpenMapTiles (Planetiler) + relieve sombreado (Copernicus GLO-30 o MDT CNIG) + curvas cada 10 m (maestras 50 m) + senderos/caminos/PdI propios.
- **B** — ráster MTN25 del CNIG + rutas GR/PR/SL encima.

Por defecto se construye **A** (`raster: hillshade` en `pipeline/zones.yaml`); B se genera con `make mtn25` tras dejar las hojas en `pipeline/input/mtn25/<zona>/`.

## Comprobado (2026-09-30)

- 58 tests de pytest: clasificación GR/PR/SL (incluida una muestra sintética con la forma de la salida de ogr2ogr), SAC, cotas, curvas maestras, lectura de cabecera y metadatos PMTiles, validación de zona, manifest y su estructura frente a `docs/manifest.example.json` (que valida Zod en la app).
- Existen las versiones fijadas: GDAL `ubuntu-small-3.12.4`, Planetiler `0.9.3`, tippecanoe `2.79.0`, go-pmtiles `1.28.0`.
- No se pudo ejecutar el pipeline en esta sesión: Docker Desktop no tiene activada la integración WSL para la distro, y Geofabrik no es accesible desde el entorno del agente.

## Pendiente (Alberto)

1. Activar la integración WSL en Docker Desktop.
2. `cd pipeline && make tools spain && make zone ZONE=benasque`.
3. Anotar aquí: tiempo de cada paso, memoria de Planetiler (`PLANETILER_MEM`, por defecto 3 GB), tamaño de vector y ráster por 100 km².
4. [VERIFICAR] que `tile-join` lee y escribe PMTiles (si no: `pmtiles convert` a MBTiles, `tile-join` y vuelta).
5. [VERIFICAR] relieve: el factor `-z = 1/cos(lat)` en EPSG:3857 da un sombreado natural; si no, ajustar.
6. Opción B con 2-4 hojas MTN25 de la zona; capturas de A y B a zoom 12, 14 y 16 en el iPhone.
7. Decisión: ______ (A / B / A con MTN25 como capa opcional más adelante).

Referencia de tamaño de la zona piloto `benasque`: ~28 × 28 km ≈ 800 km².
