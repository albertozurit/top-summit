# Top Summit

App personal de senderismo para iPhone: mapa topográfico **offline** (senderos GR/PR/SL, curvas de nivel, relieve, refugios y fuentes) y posición GPS. Sin backend ni cuentas; las zonas se generan en el PC y se descargan a la app.

Estado: M0–M2 implementados (mapa, zonas offline, GPS en primer plano). Falta la validación en el dispositivo: ver [`docs/device-tests.md`](docs/device-tests.md) y los ADR de `docs/adr/`.

> Aviso: la app no garantiza la seguridad de ninguna ruta. Los senderos proceden de OpenStreetMap y pueden estar incompletos o desactualizados.

## Requisitos

- Node 24 LTS y npm.
- Para el iPhone: Windows con Sideloadly (no hace falta Mac). Ver [`docs/distribution.md`](docs/distribution.md).
- Para generar zonas: Docker (integración WSL activada) y Python 3.11+. Ver [`pipeline/README.md`](pipeline/README.md).

## Puesta en marcha

```bash
npm install                 # también activa los hooks de .githooks (pre-commit)
cp .env.example .env        # opcional: URL del catálogo de zonas
npm run check               # lint + typecheck + tests + formato
npm start                   # Metro para la build de desarrollo (dev client)
```

La app no se ejecuta en Expo Go (usa MapLibre nativo): hay que instalar la build `development` del workflow **iOS build** y conectarla a Metro.

## Scripts

| Script                            | Qué hace                                                                   |
| --------------------------------- | -------------------------------------------------------------------------- |
| `npm run lint`                    | ESLint (incluye la regla de que `src/domain` no importa React Native/Expo) |
| `npm run typecheck`               | `tsc --noEmit`                                                             |
| `npm test`                        | Jest: `domain` en Node y `app` con React Native Testing Library            |
| `npm run format` / `format:check` | Prettier                                                                   |
| `npm run check`                   | Todo lo anterior                                                           |
| `npm run prebuild:ios`            | Genera `ios/` (no se versiona)                                             |

Pipeline: `cd pipeline && make test` (pytest), `make zone ZONE=benasque`, `make serve`, `make publish TAG=…`.

## Configuración

- `EXPO_PUBLIC_MANIFEST_URL`: URL del `manifest.json` de las zonas (pública, no es un secreto). En CI se toma de la variable del repositorio `MANIFEST_URL`. También se puede cambiar en _Ajustes_ dentro de la app.
- Solo se aceptan URLs `https`, o `http` a IPs de la red local (servidor de pruebas `make serve`).

## Documentación

- [`docs/architecture.md`](docs/architecture.md): capas, almacenamiento, ciclo de vida de las zonas.
- [`docs/tile-schema.md`](docs/tile-schema.md): contrato de capas entre pipeline y app.
- [`docs/manifest.example.json`](docs/manifest.example.json): contrato del catálogo (lo validan Zod y pytest).
- [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md): fuentes y licencias.
- [`docs/distribution.md`](docs/distribution.md): compilar, firmar e instalar.
- [`docs/device-tests.md`](docs/device-tests.md): pruebas manuales y protocolo de modo avión.
- [`docs/adr/`](docs/adr): decisiones y resultados de los spikes S1–S6.

## Datos y atribución

© Colaboradores de OpenStreetMap (ODbL) · © OpenMapTiles · Copernicus DEM GLO-30 · IGN/CNIG (CC-BY 4.0) · Natural Earth. Detalle en [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).
