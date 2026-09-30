# ADR 0005 — S5: descarga y almacenamiento con expo-file-system

Estado: **implementado, pendiente de medir en el iPhone**. Decide D7 (mecanismo de descarga).

## Decisión provisional

API nueva de `expo-file-system` 57 (sin módulo nativo propio):

- `File.createDownloadTask(url, destino, { sessionType: 'background', onProgress })` → `downloadAsync()` / `pause()` / `resumeAsync()` / `cancel()`.
- Pausa persistente: `task.savable()` (incluye `resumeData`) se guarda en `Documents/zones/<id>/download.json`; tras reiniciar la app, `DownloadTask.fromSavable()` continúa el mismo fichero.
- Un fichero cada vez, a `*.pmtiles.download`; se activa (renombra) solo tras verificar tamaño, cabecera PMTiles y md5.
- MD5 nativo: `file.info({ md5: true })`. Espacio libre: `Paths.availableDiskSpace`, con margen de 500 MB.
- Pantalla encendida durante la descarga (`expo-keep-awake`).

Orquestación: `src/features/offline/zoneDownload.ts` (probada con dependencias simuladas: pausa/reanudación, error de red reanudable, md5 incorrecto nunca queda disponible, cancelación que conserva la versión instalada).

## Hallazgos sin dispositivo

- **Si la app se cierra sin pausar**, no hay `resumeData`: se reanuda desde el último fichero completo (no desde cero la zona, pero sí ese fichero). Con `sessionType: 'background'` la transferencia nativa puede seguir con la app suspendida, pero la instancia JS no se recupera si iOS la termina.
- **iCloud**: `Documents` entra en la copia de seguridad y expo-file-system no permite marcar ficheros como excluidos (no hay API de `isExcludedFromBackup`). Mitigación en M2: desactivar la copia de Top Summit en _Ajustes de iOS → [nombre] → iCloud → Gestionar almacenamiento → Copias → Top Summit_. Si molesta, módulo nativo mínimo (`URLResourceValues.isExcludedFromBackup`) después de M2.
- Caches no es opción: iOS puede purgarla sin avisar y el mapa desaparecería en la montaña.

## Pendiente (en el iPhone)

- [ ] Descargar un fichero ≥ 300 MB; pausar y reanudar, también tras cerrar la app.
- [ ] Bloquear la pantalla durante la descarga (¿continúa?).
- [ ] Tiempo del md5 nativo (< 10 s para el éxito del spike).
- [ ] Espacio libre fiable (comparar con Ajustes → General → Almacenamiento).
- [ ] [VERIFICAR] reanudar tras una pausa larga con GitHub Releases: la URL firmada de la redirección caduca (ver ADR 0006).

## Si falla

`@kesha-antonov/react-native-background-downloader` o un módulo Swift mínimo con `URLSession`.
