# ADR 0002 — S2: MapLibre RN v11 con ficheros locales

Estado: **implementado, pendiente de validar en el iPhone**. Decide D3 (motor de mapas), D5 (formato de teselas) y D12 (recursos del estilo).

## Decisión provisional

- `@maplibre/maplibre-react-native` 11.4 (incluye MapLibre Native iOS 6.31; PMTiles soportado desde 6.10).
- **PMTiles** local (`pmtiles://file:///…/Documents/zones/<id>/vector.pmtiles`), sin OfflineManager (no admite PMTiles).
- Estilo generado en JS (`src/domain/map/buildStyle.ts`) y pasado como objeto a `<Map mapStyle>`; cambiar de zonas = nuevo objeto + remontar el mapa.
- Glyphs Noto Sans (.pbf) empaquetados como assets de Metro y copiados a `Documents/map-assets/glyphs/` en el primer arranque (`src/platform/mapAssets.ts`), referenciados como `file://…/{fontstack}/{range}.pbf`.
- Sin sprites: los PdI se dibujan como círculos de color + texto. Evita un paso más en el pipeline en M1.
- Mundo de bajo zoom en GeoJSON embebido (Natural Earth 110m).
- Punto de ubicación nativo (`NativeUserLocation`, modos `default`/`heading`) y seguimiento con `Camera.trackUserLocation`.

## Comprobado sin dispositivo

- El estilo generado pasa `validateStyleMin` de `@maplibre/maplibre-gl-style-spec` y no contiene ninguna URL `http(s)` (tests en `src/domain/map/buildStyle.test.ts`).
- El bundle iOS resuelve los assets `.pbf` (`expo export`).

## Pendiente (en el iPhone, build release, modo avión)

- [ ] Se ven la base, las curvas, el relieve ráster y las etiquetas (los glyphs cargan desde `file://`).
- [ ] Punto de ubicación con rumbo.
- [ ] Cambiar de zonas en caliente (instalar/borrar) re-renderiza bien.
- [ ] Ninguna petición de red: comprobar con el log de MapLibre o con un proxy (Proxyman/Charles en el PC) con la wifi activa.
- [ ] Comparación opcional con MBTiles (`mbtiles://`) y GeoJSON: solo si PMTiles da problemas.

## Si falla

Si `pmtiles://file://` no funciona en iOS: MBTiles con `mbtiles://` [VERIFICAR soporte en 6.31]. Si MapLibre RN v11 es inestable con la New Architecture: fijar una versión anterior de la v11 o evaluar la v10 (plan B del Plan v2).
