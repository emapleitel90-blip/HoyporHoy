# Skills de Antigravity — MVP HoyporHoy

Estas skills son **instrucciones para el agente de desarrollo**, no funciones ya instaladas. Consultar primero `.agent/AGENTS.md`, el código de la rama y el estado real de las pruebas.

## División de responsabilidades

- **Nosotros (producto y funcionalidad):** definir el uso cotidiano de un estudio jurídico, diseñar flujos, construir y probar pantallas, expedientes, tareas, supervisión, agenda y documentos.
- **Bartolito (seguridad y revisión técnica):** revisar autorización, multi-tenancy, protección de archivos, credenciales, riesgos de producción y cambios sensibles.
- **Regla compartida:** no desactivar ni eludir las protecciones existentes. Los cambios funcionales que impliquen permisos, endpoints o migraciones deben quedar identificados para revisión de Bartolito. Usar solo datos ficticios durante el desarrollo; pilotos con datos reales requieren aprobación de seguridad previa.

## Skills disponibles

| Skill | Cuándo usarla | Responsable principal |
|---|---|---|
| `skill-creator` | Crear y mejorar skills | Nosotros |
| `mvp-legal-architect` | Definir funcionalidad y alcance del MVP | Nosotros |
| `expedientes-core` | Registro, búsqueda y ficha de expedientes | Nosotros |
| `team-workflow` | Tareas, juniors y supervisión | Nosotros |
| `deadline-agenda` | Agenda, vencimientos, Mi Jornada | Nosotros |
| `legal-documents` | Borradores DOCX y adjuntos | Nosotros / revisión técnica |
| `legal-ux` | Interfaz de escritorio y móvil | Nosotros |
| `jurisprudence-assistant` | Investigación asistida con fuentes | Nosotros |
| `demo-pilot` | Demo y onboarding con datos ficticios | Nosotros |
| `mvp-qa` | Pruebas funcionales y de aislamiento | Compartido |
| `tenant-security` | Auditoría de acceso, secretos y uploads | Bartolito |

## Prioridad de **desarrollo funcional**

1. `expedientes-core`: ficha central del expediente y alta rápida.
2. `team-workflow`: asignar trabajo a junior, registrar avance, enviar a revisión, aprobar o solicitar corrección. **Primer módulo nuevo a diseñar e implementar.**
3. `deadline-agenda`: vincular tareas y vencimientos a Mi Jornada, sin mezclar plazos procesales con fechas internas.
4. `legal-documents`: vincular archivos y borradores a tareas/expedientes.
5. `legal-ux` + `demo-pilot`: navegación clara, móvil y guion de demo con datos ficticios.
6. `jurisprudence-assistant`: investigación orientativa, identificando fuentes verificadas.

**Carril paralelo — Bartolito:** `tenant-security` y pruebas de aislamiento de `mvp-qa`. Sus hallazgos bloquean el uso con datos reales, pero no impiden diseñar/prototipar flujos con datos ficticios.

## Módulos que ya existen

- `server/src/skills/deadlineAgent.js`: alertas de vencimientos.
- `server/src/skills/documentRedactor.js`: generación DOCX.
- `server/src/skills/fileOptimizer.js`: limpieza de temporales.
- `server/src/skills/saijSearcher.js`: sugerencias IA sin verificación directa de fallos.

No duplicar estos módulos. Para definición inicial de funcionalidades consultar `docs/MVP_FUNCIONAL.md`.

## Criterio de demo

Un abogado titular puede encontrar un expediente, asignar un trabajo a un junior, seguir su avance, revisar y aprobar un borrador, consultar documentos y vencimientos sin salir de la plataforma. Solo presentar como «operativo» lo implementado y probado.

**Estado de esta entrega:** documentación de skills y planificación funcional; no cambia código ejecutable, dependencias ni schema.

## Instrucción breve para Antigravity

«Aplicá `mvp-legal-architect` y `team-workflow`. Leé `docs/MVP_FUNCIONAL.md`, inspeccioná el código real y proponé el primer incremento de tareas y revisión sobre expedientes. Empezá por diseño, endpoints, pantallas y aceptación; no modifiques seguridad ni migres Prisma sin revisión».

Mantener cambios en rama de trabajo y revisar diff antes de mezclar a `develop/hoyporhoy-2.0`.