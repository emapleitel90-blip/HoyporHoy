# Skills de Antigravity — MVP HoyporHoy

Estas skills son **instrucciones para el agente de desarrollo**, no módulos funcionales instalados en la aplicación. Se activan por descripción de la tarea; no requieren dependencias ni migración por sí mismas. Consultar primero `.agent/AGENTS.md`, el código de la rama y el estado real de tests.

| Skill | Cuándo usarla | Prioridad |
|---|---|---|
| `skill-creator` | Crear o mejorar otras habilidades | Infraestructura |
| `mvp-legal-architect` | Definir flujo del producto, alcance y backlog | P1 |
| `expedientes-core` | CRUD, consulta, ficha y ciclo de expedientes | P1 |
| `team-workflow` | Asignar, ejecutar, revisar tareas del equipo | P1 |
| `deadline-agenda` | Agenda, vencimientos, Mi Jornada | P1 |
| `legal-documents` | Adjuntos protegidos y borradores DOCX | P1 |
| `tenant-security` | Autenticación, aislamiento, archivos, secretos | P0 bloqueante |
| `legal-ux` | Interfaz para abogados, móvil y usabilidad | P2 |
| `jurisprudence-assistant` | Investigación asistida con fuentes verificables | P2 |
| `mvp-qa` | Pruebas de seguridad y flujo real | P0/P1 |
| `demo-pilot` | Recorrido comercial con datos ficticios, onboarding | P2 |

## Ya existe como código de aplicación

- `server/src/skills/deadlineAgent.js`: agente de alertas de vencimientos.
- `server/src/skills/documentRedactor.js`: generación de archivos DOCX.
- `server/src/skills/fileOptimizer.js`: limpieza de temporales.
- `server/src/skills/saijSearcher.js`: sugerencias con IA sobre jurisprudencia (no implica recuperación de fallos verificados).

Las skills de agente **orientan mejoras sobre estos módulos** y no los duplican.

## Orden recomendado de ejecución

1. `tenant-security` + `mvp-qa`: reparar y demostrar aislamiento por estudio, archivos privados y secretos. **Sin expedientes reales antes de pasar P0.**
2. `expedientes-core`: ficha y carga rápida, clientes y asignación segura.
3. `team-workflow`: tarea y revisión por abogado titular.
4. `deadline-agenda` + `legal-documents`: flujo integrado al expediente.
5. `legal-ux` + `demo-pilot`: demo guiada usable y con datos ficticios.
6. `jurisprudence-assistant`: sólo resultados con origen etiquetado y sin citas inventadas.

## Criterio de MVP vendible

Un abogado entra, encuentra el expediente, asigna trabajo a un junior, revisa un borrador, identifica vencimientos y consulta documentos sin salir del sistema y sin ver información de otros estudios.

**Estado de esta entrega:** solo skills Markdown para desarrollo. No hay implementación, migración, dependencias ni ejecución de tests por la incorporación de estos archivos.

## Uso en Antigravity

Dar una instrucción como: «Aplicá la skill `tenant-security` y auditá el aislamiento real de casos, plazos, adjuntos y documentos; proponé parches mínimos y tests antes de modificar código».

Evitar modificaciones a `main` o cambios de base de datos sin revisar primero una rama y su diff. Consultar `ESTADO_HOYPORHOY.md` para pendientes conocidos, verificando vigencia.
