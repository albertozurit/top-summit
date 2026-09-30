# ADR 0006 — S6: alojamiento de las zonas

Estado: **aceptado para M2** (falta la prueba desde el iPhone). Decide D9.

## Decisión

**GitHub Releases** del propio repositorio: `manifest.json` y los `*.pmtiles` como assets de una release por versión de datos (`make publish TAG=zones-AAAA-MM-DD`). Gratis, sin tarjeta, límite de 2 GB por asset. La URL del manifest de la última release se fija como variable `MANIFEST_URL` del workflow o en _Ajustes_ de la app.

Si el repositorio es **privado**, los assets exigen autenticación y la app no los puede descargar. Opciones: un repositorio público solo para datos (`top-summit-data`), o hacer público el principal.

## Comprobado (2026-09-30, desde WSL con curl)

- Un asset de release (`github.com/…/releases/download/…`) responde con **una redirección** a `release-assets.githubusercontent.com` (URL firmada y temporal).
- Tras la redirección, `Range: bytes=100-199` devuelve **206** con exactamente 100 bytes: la reanudación por rangos funciona.

## Riesgo

La URL firmada caduca en minutos. Si una pausa larga guarda `resumeData` apuntando a ella, la reanudación puede fallar con 403. La app lo trata como error de red: el usuario pulsa _Reintentar_ y el fichero vuelve a pedirse desde la URL original (se pierde lo descargado de ese fichero, no el resto). [VERIFICAR en el iPhone]

## Alternativa de desarrollo

`make serve` en `pipeline/` sirve `output/` en la LAN con soporte de Range (`python -m http.server` no lo tiene). La app acepta `http` solo hacia IPs privadas.

## Pendiente

- [ ] Descargar la zona piloto desde la release en el iPhone, con una pausa y reanudación.
