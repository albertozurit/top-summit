# ADR 0001 — S1: firma e instalación con Apple ID gratuita

Estado: **preparado, pendiente de validar en el iPhone**. Decide D1 (vía de distribución) y D13 (build de desarrollo vs release).

## Decisión provisional

IPA sin firmar compilado en GitHub Actions macOS (`.github/workflows/ios-build.yml`, variantes `release` y `development`) + Sideloadly en Windows con Apple ID gratuita. Guía: [`docs/distribution.md`](../distribution.md).

## Hecho y comprobado sin dispositivo (2026-09-30)

- `expo prebuild -p ios` genera el proyecto `TopSummit` (iOS mínimo 16.4) con MapLibre integrado vía el hook del Podfile.
- Info.plist generado: `UIBackgroundModes = [location]`, `NSLocationWhenInUseUsageDescription`, `NSAppTransportSecurity.NSAllowsLocalNetworking = true`, sin permisos "Siempre".
- `expo export -p ios` produce el bundle Hermes (3,8 MB) con los 15 ficheros de glyphs como assets.
- La app lee `embedded.mobileprovision` desde `Paths.bundle` (expo-file-system) y extrae `ExpirationDate` (parser probado en `src/domain/provisioning.test.ts`). En _Ajustes → Firma_ se ve la fecha y en el mapa un aviso con < 4 días (rojo con < 2).

## Pendiente (Alberto, en el iPhone)

Criterios de éxito del plan:

- [ ] El workflow termina en verde en `macos-26` [VERIFICAR versión de Xcode del runner frente a la que exige Expo SDK 57].
- [ ] Ambas variantes se instalan con Sideloadly y arrancan.
- [ ] La release arranca en modo avión.
- [ ] Los frameworks dinámicos de MapLibre quedan bien firmados (si falla: revisar "Signing" de Sideloadly y el log).
- [ ] Se muestra la fecha de caducidad.
- [ ] Reinstalar encima conserva `Documents`.
- [ ] `UIBackgroundModes: location` no bloquea la instalación.

Registro en [`docs/device-tests.md`](../device-tests.md) (sección M0).

## Si falla

AltStore o SideStore; si tampoco, cuenta de pago (EAS Build + ad hoc) o un Mac prestado. Decidir antes de M3.
