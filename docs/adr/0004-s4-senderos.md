# ADR 0004 — S4: calidad de la clasificación GR/PR/SL en OSM

Estado: **regla implementada; recuento y comprobación en campo pendientes**. Decide D6 (regla de clasificación).

## Regla actual (`pipeline/scripts/classify.py`)

1. `ref` empieza por `GR`, `PR` o `SL` (admite `GR 11`, `GR-11.1`, `PR-HU 30`, `SL-HU 5`; con varios `ref` gana GR > PR > SL).
2. `osmc:symbol` con trazo rojo, amarillo o verde sobre blanco.
3. `network`: `iwn`/`nwn` → GR, `rwn` → PR, `lwn` → SL. Es el criterio más débil: en España hay GR regionales con `rwn`.
4. Si nada encaja: `OTHER`, que la app muestra como "otra ruta de senderismo" (morado), no como error.

## Pendiente (Alberto)

- `python3 pipeline/scripts/trail_report.py pipeline/zones.yaml benasque` (en esta sesión Overpass devolvió 504 en dos instancias; es un servicio compartido, reintentar más tarde).
- Anotar: total de relaciones, cuántas con `ref`, cuántas con `network`, cuántas acaban en `OTHER`.
- Elegir 5 senderos conocidos (≥ 1 GR, 1 PR, 1 SL) y comparar con la señalización real o la de la federación (FAM en Aragón).

| Sendero | Señalización real | Clase en la app | ¿Coincide? |
| ------- | ----------------- | --------------- | ---------- |
|         |                   |                 |            |

Éxito: la regla acierta en los 5. Si falla en los `network`, quitar la regla 3 y dejar esos casos como `OTHER`.
