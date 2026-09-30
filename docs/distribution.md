# Distribución e instalación en el iPhone (vía gratuita)

Sin Mac y sin cuenta de pago: el IPA se compila **sin firmar** en GitHub Actions (macOS) y se firma e instala desde Windows con **Sideloadly** y una Apple ID gratuita. Spike S1, ver [ADR 0001](adr/0001-s1-firma-instalacion.md).

## Variantes de build

| Variante      | Qué es                                                      | Cuándo                                                   |
| ------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| `release`     | JS embebido (`main.jsbundle`). Arranca sin Metro y sin red. | Pruebas en modo avión (M0, M2), salidas reales.          |
| `development` | _dev client_: carga el JS desde Metro en el PC.             | Desarrollo diario: los cambios de JS se ven al instante. |

Solo hay que recompilar cuando cambia algo nativo (librerías con código nativo, `app.config.ts`, plugins). Los cambios de JS no requieren build nueva con la variante `development`.

## 1. Generar el IPA

1. GitHub → _Actions_ → **iOS build (unsigned)** → _Run workflow_ → variante `release`, `development` o `both`.
2. Opcional: variable del repositorio `MANIFEST_URL` (Settings → Secrets and variables → _Variables_) con la URL del `manifest.json` de las zonas. No es un secreto; también se puede configurar después en _Ajustes_ dentro de la app.
3. Al terminar, descarga el artefacto `TopSummit-<variante>-<commit>-unsigned.ipa` (se conserva 14 días).

Coste: en repositorio privado los minutos macOS cuentan ×10. Una build tarda ~20-30 min, así que caben unas 8-12 builds al mes en el plan gratuito.

## 2. Preparar Windows (una vez)

- Instala **iTunes** e **iCloud** en su versión de escritorio de apple.com (**no** las de Microsoft Store) [VERIFICAR según la versión actual de Sideloadly].
- Instala **Sideloadly** desde sideloadly.io.
- Conecta el iPhone por USB y acepta "Confiar en este ordenador".

## 3. Firmar e instalar

1. Abre Sideloadly, arrastra el `.ipa`.
2. Apple ID: usa **siempre la misma** (ver "Bundle ID" abajo). Sideloadly pide la contraseña y el código 2FA; se envían a Apple, no se guardan en el repositorio.
3. _Advanced options_: deja el bundle ID original `com.albertozurita.topsummit` si Sideloadly lo permite; si lo cambia, anota cuál usa y no lo cambies después.
4. _Start_. Tarda 1-2 minutos.

## 4. Primera vez en el iPhone

- **Modo Desarrollador**: Ajustes → Privacidad y seguridad → Modo de desarrollador → activar y reiniciar.
- **Confiar en el desarrollador**: Ajustes → General → VPN y gestión de dispositivos → tu Apple ID → Confiar.

## 5. Re-firmar cada 7 días

La firma gratuita caduca a los **7 días**; después la app **no abre** (los datos se conservan).

- La app muestra la caducidad: en _Ajustes → Firma_ siempre, y como aviso en el mapa cuando quedan menos de 4 días (rojo con menos de 2).
- Re-firmar = repetir el paso 3 con el mismo IPA (o uno nuevo) y la **misma Apple ID**. Se instala encima y conserva `Documents` (zonas descargadas y ajustes).
- **Antes de cada salida**: comprueba que la firma dura al menos hasta el día después de volver. Si no, re-firma en casa.

Límites de la Apple ID gratuita [VERIFICAR con la versión de iOS del iPhone]: máximo 3 apps sideloaded activas, número limitado de App IDs nuevos por semana, firma de 7 días.

## Bundle ID y datos

- Bundle ID: `com.albertozurita.topsummit`. **No cambiarlo a partir de M3**: otro bundle ID es otra app y los datos locales de la anterior no se migran.
- Algunas herramientas añaden un sufijo por equipo de firma. La app no depende del bundle ID (no usa App Groups ni Keychain compartido), pero cada persona debe firmar siempre con la misma herramienta y Apple ID para conservar sus datos.
- Sin extensiones (widgets, Live Activities) mientras se use la cuenta gratuita.

## Desarrollo con Metro desde WSL

La variante `development` necesita que el iPhone llegue a Metro, que corre en WSL:

- **Opción A (recomendada): red _mirrored_ de WSL.** En `%UserProfile%\.wslconfig`:

  ```ini
  [wsl2]
  networkingMode=mirrored
  ```

  `wsl --shutdown` y vuelve a abrir. Luego `npm start` y, en el iPhone (misma wifi), abre la app y pulsa la URL del PC (`http://<IP-del-PC>:8081`). Puede hacer falta abrir el puerto 8081 en el Firewall de Windows.

- **Opción B: túnel.** `npx expo start --dev-client --tunnel` (más lento, no depende de la red local).

## Servidor de zonas en la red local

Para probar descargas sin publicar nada: `cd pipeline && make serve` sirve `pipeline/output/` en el puerto 8080 **con soporte de Range** (necesario para reanudar). En la app, _Ajustes → URL del catálogo_ = `http://<IP-del-PC>:8080/manifest.json`. La app solo acepta `http` hacia IPs privadas (`NSAllowsLocalNetworking`); para cualquier otra cosa exige `https`.

## Alternativa de pago

Si la re-firma semanal o Sideloadly fallan (ver criterios en ADR 0001): Apple Developer Program (99 USD/año, una persona del grupo) + EAS Build con distribución _ad hoc_ (perfiles de 1 año) o TestFlight. Decidir **antes de M3** y antes de la primera salida que dependa de la app.
