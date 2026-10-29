# Estado del proyecto HoyporHoy — 19/10/2026

Nota del 28/10/2026: este documento conserva el registro del circuito de tareas del 19/10. Para el estado posterior consultar [la hoja de ruta actualizada](HOJA_DE_RUTA_PRODUCTO.md), [jurisprudencia sin IA](ENTREGA_JURISPRUDENCIA_OFICIAL.md) y [la séptima etapa de correcciones](ENTREGA_CARGA_CLIENTE.md). Las validaciones locales no equivalen a aprobación técnica de Bartolito ni a despliegue.

## Rama activa

`feature/tasks-review`

## Lo que está implementado y probado

### Circuito expediente → tarea → revisión → aprobación

**Backend (completo):**
- Modelos `Task` / `TaskEvent` en schema Prisma con índices.
- Migración `20261016000000_add_tasks_review` con el SQL de las tablas.
- Migración inicial `20260413195754_init_complete` restaurada con su `migration.sql`.
- `prisma migrate status` → "Database schema is up to date!".
- Controlador [`taskController.js`](server/src/controllers/taskController.js): crear, leer, bandeja propia, bandeja de revisión, iniciar, avanzar, entregar, revisar (aprobar / solicitar correcciones).
- Rutas [`taskRoutes.js`](server/src/routes/taskRoutes.js): protegidas con `protect`.
- Utilitarios de aislamiento [`caseAccess.js`](server/src/utils/caseAccess.js).
- Montado en [`index.js`](server/src/index.js) bajo `/api/tasks`.

**Reglas del circuito:**
- Estados: `PENDING` → `IN_PROGRESS` → `SUBMITTED` → `APPROVED` (con desvío a `REVISION_REQUESTED` → `IN_PROGRESS`).
- Solo el responsable puede iniciar, avanzar y entregar.
- Solo el revisor designado (rol LAWYER / ADMIN / SUPER_ADMIN) puede revisar.
- En estudios, responsable y revisor deben ser personas distintas.
- En modo independiente, el titular puede ser responsable y revisor de su propia tarea.
- Correcciones requieren observaciones; entrega requiere observaciones.
- Historial completo con `TaskEvent` (actor, acción, fecha, observaciones, estado antes/después).
- Optimistic locking para evitar acciones concurrentes sobre el mismo estado.

**Frontend (completo):**
- [`TaskPanel.jsx`](client/src/components/TaskPanel.jsx): panel por expediente y bandeja inbox.
- Integrado en [`ViewCase.jsx`](client/src/pages/ViewCase.jsx) (dentro del expediente).
- Integrado en [`MyDay.jsx`](client/src/pages/MyDay.jsx) como `<TaskPanel inbox />` (Mis tareas / Para revisar).
- URLs centralizadas en [`api.js`](client/src/config/api.js).
- Compilación de producción: **exitosa** (12.56 s, 2510 módulos, advertencias previas de chunk size y Browserslist sin cambios).

**Tests:**
- `tasks.integration.test.js`: 32 tests — circuito completo, permisos, aislamiento, datos inválidos, bandejas, casos eliminados, usuarios trasladados, asignación de responsables de expediente.
- Suite completa tras agregar seguimiento de clientes: **109 tests, 9 archivos, todos en verde**; 25 pruebas nuevas del seguimiento.
- Los `[ERROR]` en stderr de `caseFiles.integration.test.js` son logs esperados de rutas que verifican rechazos.

## Archivos creados o modificados en esta sesión

- `server/prisma/migrations/20260413195754_init_complete/migration.sql` — **creado** (SQL de baseline para la migración inicial que faltaba; permite que `prisma migrate status` funcione).
- La migración `20261016000000_add_tasks_review` fue **registrada** en `_prisma_migrations` de la base local (las tablas ya existían; solo faltaba el registro).
- `server/scratch/register_migration.mjs`, `check_db.mjs`, `check_db2.mjs`, `baseline_schema.sql` — temporales de diagnóstico.

## Pendiente

- Revisión técnica de Bartolito y validación del circuito por Ema. [Entrega de seguimiento](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/ENTREGA_SEGUIMIENTO_PARA_REVISION.md>).
- El SQL inicial restaurado tiene un checksum diferente del registro histórico de SQLite. Se conservó el registro; la instalación nueva y el esquema actual fueron comprobados por separado. No usar un reset para corregir esa diferencia.

- Los archivos de scratch pueden eliminarse una vez revisados.
- La advertencia de chunk size (bundle > 500 kB) es anterior a esta entrega; puede abordarse con code splitting en una iteración futura.
- No se hizo push, merge ni despliegue.

## Pasos para probar el circuito con ejecutor y revisor

### Requisitos previos
- Backend corriendo: `cd server && npm start`
- Frontend corriendo: `cd client && npm run dev`
- Al menos 2 usuarios activos en el mismo estudio: uno con rol OPERATOR (o LAWYER) para ejecutar, otro con rol LAWYER o ADMIN para revisar.

### Flujo como ejecutor
1. Abrí un expediente existente → sección "Tareas del expediente".
2. Completá título, instrucciones, seleccioná responsable (vos) y revisor (otro abogado), y opcionalmente fecha de vencimiento.
3. Clic en "Crear tarea" → aparece con estado "Pendiente".
4. Clic en "Iniciar" → pasa a "En curso".
5. Escribí observaciones → clic en "Registrar avance" (estado sigue "En curso").
6. Escribí el resultado → clic en "Enviar a revisión" → pasa a "En revisión".

### Flujo como revisor
7. Iniciá sesión como el revisor → ir a "Mi jornada" → pestaña "Para revisar".
8. La tarea aparece. Podés:
   - Aprobar directamente → estado "Aprobada" (desaparece de la bandeja).
   - Escribir observaciones → "Solicitar correcciones" → estado "Correcciones solicitadas".

### Flujo de corrección y reentrega
9. Como ejecutor, "Mi jornada" → "Mis tareas" → tarea en "Correcciones solicitadas".
10. Clic en "Retomar" → "En curso".
11. Enviar nueva entrega con observaciones → "En revisión".
12. Revisor aprueba → "Aprobada".

### Bandeja de Mi Jornada
- "Mis tareas": muestra todas las tareas asignadas al usuario logueado excepto las aprobadas.
- "Para revisar": muestra las tareas que el usuario debe revisar y están en estado "En revisión".

### Tests automáticos
```powershell
cd server
npm test -- --pool=threads --maxWorkers=1
```

## Continuación: seguimiento del cliente

Se conservó el módulo de tareas y se agregaron requisitos de documentación, compromisos, motivos de bloqueo, historial y bandejas de Mi Jornada. Los documentos recibidos requieren una verificación separada; los borradores de WhatsApp se preparan para revisión manual.

La comprobación detectó cuatro índices de tareas ausentes pese a que su migración estaba registrada. `20261018000000_reconcile_task_indexes` los repone con `IF NOT EXISTS`; `20261019000000_client_followups` agrega las dos tablas nuevas. Ambas se ensayaron en una copia, se aplicaron a la base local con respaldo y se verificó que todos los registros de las tablas anteriores se conservaran. No se alteró el checksum histórico ni se hizo reset.

Respaldo de la activación: `server/prisma/backups/before-followups-2026-10-20T02-51-46.092Z-4f14a26d.db`. El script reproducible es [upgrade-followups.mjs](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/scripts/upgrade-followups.mjs>); sin argumentos solo ensaya en una copia y conserva un respaldo.
