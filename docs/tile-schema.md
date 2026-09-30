# Esquema de teselas (contrato pipeline ↔ app)

El vectorial de cada zona (`<zona>-vector.pmtiles`) es la unión (`tile-join`) de:

1. **Base OpenMapTiles** generada por Planetiler (perfil por defecto). Capas usadas por el estilo: `water`, `waterway`, `landcover`, `landuse`, `park`, `boundary`, `transportation`, `transportation_name`, `place`, `building`. Ver [openmaptiles.org/schema](https://openmaptiles.org/schema/).
2. **Capas propias `ts_*`**, generadas por `pipeline/scripts/features.py`:

| Capa          | Geometría | Propiedades                                                                                                                                               | Zoom  |
| ------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `ts_routes`   | líneas    | `ts_class`: `GR` \| `PR` \| `SL` \| `OTHER`; `ref`; `name`, `name:es`, `name:en`                                                                          | 8–14  |
| `ts_paths`    | líneas    | `highway`: `path` \| `track`; `sac`: `T1`…`T6` (opcional); `name`                                                                                         | 8–14  |
| `ts_pois`     | puntos    | `kind`: `peak`, `saddle`, `alpine_hut`, `wilderness_hut`, `shelter`, `spring`, `drinking_water`, `viewpoint`, `cave_entrance`; `ele` (m, entero); `name`… | 8–14  |
| `ts_contours` | líneas    | `ele` (m, entero); `idx`: `true` en las maestras (cada 50 m)                                                                                              | 10–14 |

El ráster (`<zona>-raster.pmtiles`) es relieve sombreado en JPEG (opción A) o MTN25 (opción B), teselas de 256 px en EPSG:3857.

## Reglas de clasificación (`pipeline/scripts/classify.py`)

- **Rutas** (`route=hiking|foot`): `ref` que empieza por `GR`/`PR`/`SL` → esa clase (con varias, gana GR > PR > SL); si no, `osmc:symbol` rojo/amarillo/verde sobre blanco; si no, `network` (`iwn`/`nwn` → GR, `rwn` → PR, `lwn` → SL); si no, `OTHER` ("otra ruta", no es un error). Validar con S4.
- **SAC**: `hiking`→T1, `mountain_hiking`→T2, `demanding_mountain_hiking`→T3, `alpine_hiking`→T4, `demanding_alpine_hiking`→T5, `difficult_alpine_hiking`→T6.
- **Cota** (`ele`): metros; se descartan valores en pies o fuera de [-500, 9000].

## Dónde está definido cada lado

- App: `src/domain/map/tileSchema.ts` (nombres) y `src/domain/map/zoneLayers.ts` (estilo). `src/domain/map/featureInfo.ts` normaliza lo que se muestra al tocar.
- Pipeline: `pipeline/scripts/classify.py`, `features.py`; `validate_zone.py` exige las capas.

Si se cambia un nombre de capa o propiedad hay que cambiarlo en ambos lados y regenerar las zonas.
