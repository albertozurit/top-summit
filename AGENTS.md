# Project Instructions

## General

- Antes de realizar cambios importantes, inspecciona el código existente.
- No introduzcas dependencias nuevas sin explicar por qué son necesarias.
- No dupliques lógica existente.
- Mantén las soluciones simples y mantenibles.
- No cambies APIs públicas o contratos existentes sin indicarlo explícitamente.
- No borres código funcional para reemplazarlo por una implementación nueva sin justificar el cambio.

## Architecture

- Respeta la arquitectura definida en `docs/architecture.md`.
- Mantén separadas presentación, lógica de negocio, acceso a datos e integraciones externas.
- Coloca cada nueva funcionalidad en el módulo que le corresponda.
- Evita crear archivos monolíticos.

## Testing

- Toda funcionalidad nueva debe incluir tests apropiados.
- Todo bug corregido debe incluir un test de regresión cuando sea razonable.
- No des por terminada una tarea hasta ejecutar las comprobaciones correspondientes.

## Security

- Nunca introducir secretos, API keys, tokens o credenciales en el repositorio.
- Validar entradas provenientes del usuario.
- Aplicar autorización además de autenticación cuando sea necesario.
- No confiar en datos enviados por el cliente.
- Revisar errores para evitar exposición de información sensible.

## Git

- Haz cambios pequeños y coherentes.
- No mezcles refactors no relacionados con la funcionalidad actual.
- Antes de terminar una tarea, revisa el diff completo.
- No hagas commits que contengan secretos, archivos temporales o artefactos generados innecesarios.

## Documentation

- Mantén actualizada la documentación cuando una decisión arquitectónica o comportamiento importante cambie.
- Actualiza README y documentación técnica cuando sea necesario.

## Agent workflow

- Para tareas complejas, planifica antes de implementar.
- Antes de modificar muchos archivos, explica qué vas a cambiar.
- Después de implementar, ejecuta tests, lint, typecheck y build cuando existan.
- Si una comprobación falla, investiga la causa y corrígela antes de marcar la tarea como terminada.
