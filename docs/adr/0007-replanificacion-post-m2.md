# ADR 0007 — Replanificación después de M2

Estado: **plantilla**. Se completa cuando M2 pase el protocolo de modo avión (`docs/device-tests.md`). Hasta entonces nada de lo de abajo es una decisión.

## Entradas necesarias

| Resultado                                                                           | Dónde                  | Afecta a                                                            |
| ----------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| Vía de firma definitiva (gratuita o de pago) y cuánto molesta re-firmar cada 7 días | ADR 0001               | Bundle ID/equipo (difícil de cambiar desde M3)                      |
| Base A o B, tamaños reales por zona                                                 | ADR 0003               | Número de zonas viables en el iPhone y en GitHub Releases           |
| Precisión de la clasificación GR/PR/SL                                              | ADR 0004               | Si hace falta una fuente oficial de senderos                        |
| Comportamiento de la descarga (bloqueo de pantalla, cierre de la app, URL firmada)  | ADR 0005, 0006         | Si hacen falta descargas en segundo plano de verdad (módulo nativo) |
| Rendimiento del mapa a zoom 12-16 y batería con GPS en primer plano                 | `docs/device-tests.md` | Presupuesto del tracking                                            |

## Hipótesis para M3+ (heredadas de la v1, sin decidir)

1. **Tracking en segundo plano (S7 primero)**: módulo Swift con `CLLocationUpdate.liveUpdates`, `CLBackgroundActivitySession` y `CMAltimeter`; lo nativo es la fuente de verdad y JS solo lee. Implica subir el iOS mínimo a 17. El `UIBackgroundModes: location` ya está en el Info.plist.
2. **Base de datos**: una sola, `expo-sqlite`, migraciones con `PRAGMA user_version`. Los `zone.json` pueden seguir en disco.
3. **Tracks**: SQLite interno; exportación GPX 1.1 y GeoJSON.
4. **Después**: marcadores, historial, navegación con aviso de desvío, meteorología (AEMET/Open-Meteo detrás de una interfaz).
5. **Mapa**: `raster-dem` o consulta de cotas del DEM, recuadro de descarga libre, MTN25/ortofoto como capa opcional.
6. **Calidad**: inglés completo revisado, Maestro E2E, XCTest del módulo nativo, comprobación de licencias en CI.

## Orden propuesto (a confirmar)

S7 (tracking nativo, 2-3 días) → M3 grabar y exportar una actividad → M4 historial → resto según uso real.

## Decisión

______ (fecha, qué se hace en M3 y qué se descarta)
