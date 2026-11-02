# Vencimientos: errores recuperables y envíos simultáneos — 01/11/2026

El panel distingue carga, lista vacía y error de consulta. Incluye Actualizar vencimientos y presenta errores de guardado en la pantalla, conservando descripción y fecha. Se bloquean campos, recarga y acciones mientras se confirma una operación; una referencia síncrona evita dos envíos del mismo formulario antes del siguiente render.

Las respuestas se validan contra el expediente y los campos mínimos del vencimiento. Una confirmación inválida no borra el formulario ni genera la señal de actualización de actividad. Al guardar o completar/reabrir, el panel utiliza el registro confirmado por el servidor, mantiene orden por fecha y evita una consulta adicional. Los estados se reinician al cambiar de expediente y las respuestas antiguas no actualizan la pantalla nueva. Las consultas tienen un límite de 15 segundos.

Se mantienen las rutas, permisos, fechas argentinas y generación de notificaciones del servidor. Esta ampliación no modifica esquema ni controladores.

## Validación

- 13 pruebas específicas aprobadas en DeadlinePanel, ViewCaseLoading y NotificationBell. Incluyen recuperación de carga fallida, formulario conservado, doble envío simultáneo, respuesta de otro expediente, confirmación inválida y respuestas de carga/guardado pendientes al cambiar de expediente.
- ESLint de los archivos modificados y revisión de espacios aprobados. Compilación de producción aprobada en server/scratch/deadlines-recovery-build; continúa la advertencia conocida de tamaño de Excel.
- Verificación en navegador con la cuenta de abogada de demostración: carga del panel y consulta mediante Actualizar vencimientos; sin errores y sin plazos registrados. No se crearon ni modificaron vencimientos en la base de demostración.

## Alcance

La protección evita envíos simultáneos desde este panel; no agrega idempotencia persistente a la creación de vencimientos. Si se pierde la respuesta del servidor, la pantalla conserva los datos y recomienda actualizar la lista antes de reintentar. No se simula una confirmación que no se recibió.

La pasada completa anterior de interfaz corresponde a 126 pruebas y precede a esta ampliación. Esta etapa usa validación específica y no repite la suite completa del servidor o del cliente.
