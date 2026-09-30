# Pruebas en dispositivo

Checklists manuales para lo que no se puede probar en CI. Copia la plantilla de registro al final de cada sección y rellena **fecha, modelo de iPhone, versión de iOS, variante y commit de la build, y resultado**.

## Protocolo de modo avión (M0 y M2)

Es la prueba de aceptación central: **nada** del mapa puede depender de la red.

1. Instala la build **release** (la de desarrollo necesita Metro y no vale).
2. Con red: descarga la zona en _Zonas_ y espera a "Disponible offline".
3. Cierra la app del todo (deslizar hacia arriba en el selector de apps).
4. Activa **modo avión** y desactiva también la wifi (en iOS el modo avión puede dejar la wifi encendida).
5. Opcional: reinicia el iPhone (arranque en frío real).
6. Abre la app. Comprueba lo de la checklist de M2.
7. Sal al exterior (cielo abierto) para la parte de GPS: el GPS funciona sin red, pero el primer fijado puede tardar más sin A-GPS. Anota el tiempo.

## M0 · Instalación y arranque

- [ ] El IPA `release` se firma con Sideloadly y se instala.
- [ ] El IPA `development` se instala y conecta con Metro en WSL (red _mirrored_ o `--tunnel`).
- [ ] La instalación no se rechaza por `UIBackgroundModes: location` (clave presente para S1).
- [ ] La app arranca sin Metro y en modo avión (release).
- [ ] Primer arranque: aparece el aviso de limitaciones; tras aceptarlo no vuelve a aparecer.
- [ ] _Ajustes → Firma_ muestra la fecha de caducidad (≈ 7 días desde la firma).
- [ ] El permiso de ubicación se pide en contexto; con permiso se ve el punto azul.
- [ ] _Ajustes → Atribuciones_ muestra OSM (ODbL), OpenMapTiles, relieve, Natural Earth, Noto Sans y MapLibre.
- [ ] Re-firmar con Sideloadly encima de la app instalada **conserva** las zonas descargadas y los ajustes.

## M1 · Mapa topográfico, senderos y GPS

Con la zona piloto instalada (descargada desde `make serve` o desde GitHub Releases):

- [ ] Se ven curvas de nivel (maestras cada 50 m con cota a zoom ≥ 13), relieve sombreado, bosques, agua, carreteras y pistas.
- [ ] Senderos GR (rojo), PR (amarillo) y SL (verde) con su color; otras rutas en morado.
- [ ] Los 5 senderos elegidos en S4 aparecen con la clase correcta (anotar cuáles en el registro).
- [ ] Caminos con trazo según SAC (continuo T1-T2, discontinuo T3+); pistas en marrón claro.
- [ ] Cota de 5 cimas conocidas coincide con IGN/OSM (anotar diferencias).
- [ ] Tocar una ruta, cima, refugio o fuente abre la ficha con nombre, clase o cota.
- [ ] Panel GPS: precisión en metros; altitud con su ± o "Altitud sin precisión fiable".
- [ ] Botón de seguimiento: norte arriba → rumbo arriba → sin seguimiento. Mover el mapa con el dedo desactiva el seguimiento.
- [ ] Con "Ubicación exacta" desactivada en Ajustes de iOS aparece el aviso rojo de precisión reducida.
- [ ] Con el permiso denegado aparece el aviso y lleva a Ajustes.
- [ ] Fuera del polígono de la zona aparece "Fuera de las zonas descargadas".
- [ ] Fluidez aceptable con zoom 12-16 (sin tirones apreciables al moverse).
- [ ] Leyenda coherente con lo que se ve en el mapa.
- [ ] Cambiar idioma a EN en _Ajustes_ cambia la interfaz (y los nombres del mapa cuando OSM tiene `name:en`).

## M2 · Descarga offline y modo avión

- [ ] _Zonas_ muestra el catálogo, el mapa con los polígonos, tamaño de cada zona y espacio libre.
- [ ] Con espacio insuficiente (margen de 500 MB) no deja descargar y explica cuánto falta.
- [ ] Descarga con progreso; **Pausar** y **Reanudar** continúan sin empezar de cero.
- [ ] Cerrar la app a mitad y volver a abrir: la zona aparece "En pausa" y se reanuda (si se pausó antes de cerrar, sin empezar el fichero de cero; si no, reanuda desde el último fichero completo).
- [ ] Bloquear la pantalla durante la descarga (anotar si continúa).
- [ ] Cortar la red a mitad: error de red y **Reintentar** continúa.
- [ ] Una descarga corrupta (p. ej. servir un fichero cambiado con `make serve`) **nunca** queda como "Disponible offline".
- [ ] Verificación (md5) de la zona completa tarda < 10 s (anotar tiempo y tamaño).
- [ ] **Protocolo de modo avión**: arranque en frío, la zona se ve completa con zoom 8-16 dentro de su polígono, senderos clasificados y posición GPS a cielo abierto.
- [ ] Banner "Sin conexión" visible en modo avión; el mapa no muestra errores.
- [ ] Borrar la zona libera el espacio (el espacio libre mostrado sube en lo que ocupaba).
- [ ] El tamaño mostrado coincide con el real (iOS → Ajustes → General → Almacenamiento → Top Summit).
- [ ] Actualizar una zona (nueva versión en el manifest): la versión instalada sigue funcionando hasta que la nueva se verifica.

## Plantilla de registro

```text
Fecha:
iPhone / iOS:
Build (variante, commit):
Sección:
Resultado: OK / FALLA
Notas (tiempos, tamaños, capturas):
```
