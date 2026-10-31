# Reintentos de importación — 31/10/2026

La app conserva un UUID de solicitud mientras se reintenta desde la misma vista previa. El servidor registra usuario, ámbito, hash de las filas y cantidad importada en `CaseImportRequest`, dentro de la transacción que crea los expedientes y sus avisos. La tabla no guarda nombres de clientes ni el contenido del archivo.

Una solicitud nueva devuelve 201. Repetir el mismo UUID con las mismas filas y ámbito devuelve 200 y la cantidad confirmada anteriormente, sin crear expedientes ni avisos adicionales. Cambiar las filas o el estudio con ese UUID devuelve 409. Si hay un conflicto simultáneo, se puede reintentar con los mismos datos. El índice único de usuario/solicitud impide confirmar dos veces el mismo lote.

La interfaz conserva la vista previa y el UUID ante errores y comprueba que la respuesta confirme ese identificador y la cantidad de filas. No informa éxito ante una respuesta incompatible. Se bloquean cambios de archivo durante el envío y se evita iniciar otro envío desde la misma pantalla mientras hay uno pendiente.

## Límites

Es protección por solicitud, no deduplicación global de archivos. Cerrar la vista previa, recargar la página o elegir nuevamente un archivo inicia una solicitud nueva y puede importar otra copia. Si una respuesta falla, reintentar desde la misma vista previa. Por compatibilidad, la API sigue aceptando clientes anteriores sin `requestId`; esas peticiones no tienen protección de reintentos. El cliente actualizado siempre envía el identificador.

El hash compara la serialización exacta de las filas recibidas, incluido su orden. El registro de confirmación se conserva aunque cambien o se eliminen los expedientes; el reintento confirma la operación original, no restaura los registros. Se comprueba cuenta activa y ámbito actual antes de devolver esa confirmación.

## Migración local

Aplicada `20261031000000_case_import_requests` con Prisma generado, respaldo SQLite consistente, ensayo en una copia y comparación de todos los campos y registros anteriores. Respaldo: `server/scratch/fees-migration-1793471342128/before.db`; ensayo `trial.db` en la misma carpeta. Se conservaron las 23 tablas anteriores, incluidos 5 expedientes, 4 usuarios, 3 tareas y 12 notificaciones. El servidor local fue reiniciado después de migrar.

Para otra instalación con esta única migración pendiente: desde server ejecutar `node scripts/apply-fees-migration.mjs 20261031000000_case_import_requests`, generar Prisma y reiniciar. El helper se detiene si hay otras migraciones pendientes o difieren los datos del ensayo.

## Verificación

Pruebas específicas aprobadas: creación y reintento tras reconexión sin duplicados, rechazo de otros datos/ámbito, UUID inválido, lote y avisos atómicos, aislamiento del titular y envío simultáneo con una sola confirmación. Las pruebas del cliente usan lectores reales CSV/XLS/XLSX y comprueban conservación del identificador y rechazo de respuestas que no confirman la solicitud. Las ejecuciones y totales finales se registran al cerrar la validación de esta entrega.

Validación final del 31/10/2026: 359 pruebas del servidor en 18 archivos y 112 de interfaz en 15 archivos, todas aprobadas (471 en total), con un trabajador y límite de 30 segundos por prueba. ESLint y compilación aprobados; salida `server/scratch/import-idempotency-client-build`, conservando client/dist. Persiste la advertencia conocida de tamaño del módulo Excel. No se realizó una importación manual en navegador para esta ampliación; se comprobaron lectores reales y API con SQLite temporal.

Durante la validación se restringió Vitest del servidor a `src/tests` para excluir copias archivadas en `scratch`. La primera ejecución sin esa restricción incluyó archivos del paquete de revisión y fue detenida. La primera pasada de las fuentes actuales detectó dos pruebas unitarias con un mock antiguo sin transacciones y una expectativa fija de destinatarios que no contemplaba usuarios creados por otros escenarios. Se actualizaron esas pruebas y la ejecución final completa pasó. No se excluyeron pruebas de `src/tests`.
