# Revisión de entregas con versión concreta — 28/10/2026

Implementado el vínculo entre tareas y versiones guardadas de escritos. Al crear una tarea se puede exigir un escrito. Al entregarla, el responsable elige escrito y versión del mismo expediente; las siguientes entregas de esa tarea también requieren una versión. Las tareas genéricas anteriores conservan su funcionamiento.

La entrega se registra como evento inmutable con versión, observaciones, usuario y fecha. La corrección o aprobación referencia el identificador exacto de esa entrega y la misma versión. La base impide registrar dos decisiones para una entrega. Una nueva versión del escrito no recibe automáticamente una aprobación anterior: el historial muestra el título y número de la versión aprobada en esa entrega.

El revisor asignado consulta el texto histórico desde la tarea. Los botones de revisión esperan que ese texto cargue correctamente. Una pestaña que intenta revisar una entrega anterior recibe conflicto. Los reintentos de solicitudes escritas usan UUID y devuelven la operación ya confirmada, conservando el estado actual; reutilizar el identificador con otros datos se rechaza. La creación de versiones y el circuito de tareas siguen siendo acciones explícitas.

Los permisos se releen dentro de la transacción. Solo el responsable asignado entrega y solo el revisor asignado con rol vigente decide. La versión se busca dentro del expediente de la tarea. Se conserva el control de cambios simultáneos de tareas y la retención de versiones vinculadas mediante claves foráneas.

## Migración

Aplicada `20261028050000_task_writing_versions`: indicador `requiresWriting` en Task y referencias opcionales, UUID y restricción de revisión única en TaskEvent. No se reinterpretan aprobaciones históricas como aprobaciones de escritos. Respaldo y ensayo: `server/scratch/fees-migration-1793240922341/before.db` y `trial.db`. Se compararon todos los campos y registros anteriores y se conservaron. El servidor de desarrollo fue reiniciado para actualizar Prisma y reanudado después de la migración.

## Verificaciones

La prueba de integración del circuito cubre entrega de versión 1, reintento sin duplicados, correcciones, entrega de versión 2, rechazo de revisión atrasada y aprobación exacta con reintento. La prueba de interfaz mantiene bloqueada la aprobación hasta cargar el texto y verifica que se apruebe la entrega de versión 2 incluso cuando el escrito ya tiene una versión 3. También se conserva la prueba del cambio de rol durante la revisión.

ESLint y compilación de producción pasaron. La compilación se guardó en `server/scratch/task-review-client`, conservando el dist anterior. La prueba de migración de escritos se adaptó a las referencias opcionales posteriores: tras crear las tablas padre se reactivan y auditan todas las claves foráneas antes de verificar restricciones y esquema.

Suites generales completas: 350 pruebas de servidor en 18 archivos y 94 de interfaz en 12 archivos, todas aprobadas (444 en total). La biblioteca parametrizada de modelos y la revisión técnica externa siguen pendientes.

## Comprobación en navegador

Completada sobre compilación de producción y SQLite aislados. Se prepararon tres versiones ficticias y una tarea independiente en curso. Desde la pantalla se entregó la versión 1, se solicitaron correcciones con observaciones, se retomó la tarea, se entregó la versión 2 y se aprobó esa entrega. La versión 3 ya existía y no recibió esa aprobación. La pantalla mostró el texto correcto y el historial completo de seis eventos, incluida la versión de cada entrega y decisión.

La consulta posterior de SQLite confirmó una única aprobación vinculada a la versión 2 y ninguna para la versión 3. La cuenta ficticia era titular independiente, por lo que realizó y revisó su propia tarea según la regla existente; las pruebas automatizadas cubren la separación de responsable y revisor dentro de estudios. La instancia aislada quedó detenida.

[Evidencia visual](<C:/Users/Usuario/.codex/visualizations/2026/10/26/01a178ea-851f-7d61-aee0-d250cd3ed11d/revision-version-exacta.png>).
