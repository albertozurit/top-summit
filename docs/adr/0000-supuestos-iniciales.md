# ADR 0000 — Supuestos iniciales (preguntas pendientes del Plan v2)

Estado: provisional. Fecha: 2026-09-30.

Las preguntas de la sección 16 del Plan v2 no tienen respuesta todavía. Para no bloquear M0–M2 se adoptan estos supuestos. Cambiar cualquiera de ellos es barato hasta M3 (no hay datos de usuario).

| Pregunta               | Supuesto                                                                                          | Qué cambia si es distinto                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| ¿Hay Mac?              | No. Todo se compila en GitHub Actions macOS.                                                      | Con Mac se puede compilar e instalar con Xcode directamente. |
| ¿Cuenta Apple de pago? | No, vía gratuita (Apple ID + Sideloadly). Decisión definitiva antes de M3.                        | Con cuenta de pago: EAS Build + ad hoc.                      |
| Zonas piloto           | `benasque` (Pirineo aragonés: GR 11, PR-HU, SL-HU) y `casa` (a definir en `pipeline/zones.yaml`). | Solo se edita `pipeline/zones.yaml`.                         |
| Repositorio            | Privado en GitHub. Las builds iOS son manuales para ahorrar minutos macOS.                        | Público: minutos macOS gratis.                               |
| iPhone / iOS / Windows | iPhone con iOS reciente, Windows 11 (red WSL _mirrored_ disponible).                              | Ver `docs/distribution.md`.                                  |

Versiones fijadas al iniciar el proyecto: Expo SDK 57 (React Native 0.86), `@maplibre/maplibre-react-native` 11.4, Node 24 LTS.
