# Rectificación de pagos con historial — 28/10/2026

Implementación y migración activadas localmente. Permite corregir una carga de pago mediante anulación con motivo y, si corresponde, registrar un nuevo pago con los datos correctos. La revisión técnica externa de Bartolito sigue pendiente.

## Uso

1. Abrir el expediente y el panel Honorarios y cobranzas.
2. Elegir Anular pago en el movimiento que se quiere rectificar. Solo pueden hacerlo abogados y administradores con acceso al expediente.
3. Leer el importe que volverá al saldo pendiente, ingresar un motivo de hasta 2000 caracteres y confirmar. Cancelar el formulario no modifica datos.
4. El pago original queda visible con su importe, fecha y observaciones originales. La anulación registra motivo, nombre e identificador del usuario y momento del registro; la interfaz presenta motivo, nombre y fecha en horario de Córdoba.
5. Registrar el pago correcto como un nuevo movimiento si corresponde. No se cambia el importe ni la fecha del registro anterior.

La cuota recupera el importe anulado como saldo pendiente. Mi jornada vuelve a mostrarla si su vencimiento está dentro del período de cobros; un nuevo recordatorio usa ese saldo. Los textos ya copiados fuera de la aplicación no se modifican y deben reemplazarse por un recordatorio nuevo.

## Integridad y acceso

- Nueva relación FeePaymentReversal, una anulación por pago. No se reescribe ni elimina FeePayment. La clave foránea impide eliminar un pago que tiene anulación.
- Anulación y disminución del total abonado de la cuota ocurren en una única transacción. El saldo abonado no puede quedar negativo.
- Unicidad por pago, bloqueo transaccional y reintentos con UUID evitan descontar dos veces. La misma solicitud y el mismo motivo devuelven el acuerdo actual; cambiar identificador o motivo de una anulación ya realizada devuelve 409.
- Repetir tardíamente la solicitud original de un pago anulado devuelve 409: no lo revive ni registra otro movimiento.
- Un fallo de escritura de la auditoría revierte también el cambio de saldo. El formulario conserva el motivo ante errores, permite reintentar y comunica éxito únicamente cuando la respuesta confirma esa anulación.
- Se mantienen los permisos del usuario activo, aislamiento por estudio/titular independiente y exclusión de expedientes eliminados. El operador consulta historial y prepara recordatorios; no registra pagos ni anulaciones.

API: POST `/api/fees/payments/:id/reversal` con `{ reason, requestId }`; devuelve el acuerdo completo con saldo actualizado y cada pago con `reversal: null` o los datos de anulación. Los clientes anteriores pueden seguir registrando pagos con el contrato previo; el nuevo campo es aditivo.

## Migración

`20261028010000_fee_payment_reversals` agrega una tabla y un índice único. No altera registros monetarios ni tablas previas.

Se generalizó el helper de respaldo para admitir explícitamente esta migración y comparar también los registros de FeeAgreement, FeeInstallment y FeePayment. Comprobó que era la única pendiente, creó una copia consistente con VACUUM INTO, ensayó la migración y comparó conteos y hashes de todas las tablas existentes. La misma comprobación pasó después de aplicarla en la base habitual.

Respaldo privado: `server/scratch/fees-migration-1793227084714/before.db`; ensayo: `trial.db` en la misma carpeta. Se conservaron 4 expedientes, 2 archivos, 3 clientes, 1 configuración, 1 estudio y 2 usuarios; las tablas de honorarios existentes estaban vacías. No se crearon ni anularon pagos ficticios en la base habitual.

Para otra instalación, después del respaldo y con las migraciones anteriores aplicadas: ejecutar desde `server` `node scripts/apply-fees-migration.mjs 20261028010000_fee_payment_reversals`. El helper se detiene sin cambios si encuentra otro conjunto de migraciones pendientes. Instalar/generar Prisma y reiniciar el servidor de esa instalación para cargar el código nuevo.

## Pruebas y navegador

- Suite completa de servidor: **250 pruebas aprobadas** en 14 archivos, con `--maxWorkers=1 --testTimeout=15000`.
- Suite completa de cliente: **60 pruebas aprobadas** en 7 archivos con los mismos parámetros. Total actual: **310**.
- 13 pruebas nuevas de API cubren historial inmutable, reconexión, validaciones, acceso, cambios de rol/estudio, reintentos, replay original, dos anulaciones simultáneas, anulación concurrente con otro pago y rollback mediante un trigger de error.
- Una prueba adicional aplica el SQL nuevo sobre un esquema anterior con un acuerdo, una cuota parcialmente pagada y un pago ya guardados; conserva sus valores y comprueba unicidad y restricción de borrado.
- Seis pruebas nuevas de interfaz cubren motivo obligatorio, cancelación, conservación/reintento, respuesta inválida, consulta del operador y formularios excluyentes.
- ESLint sin observaciones. Compilación de producción correcta. Se conserva la advertencia anterior del archivo Excel de 500,05 kB, que se descarga bajo demanda; no se modificaron dependencias.
- Navegador con API real y base temporal: pago ficticio de $100,25 anulado; saldo $100,25 y reapertura en Mi jornada; recarga conserva el historial; nuevo pago correcto de $40,10 deja $60,15; el recordatorio copiado usa $60,15. No se observaron errores ni advertencias de consola en este circuito.
- Consulta final de esa base: 1 acuerdo, 2 pagos originales conservados, 1 anulación y 4010 centavos efectivos abonados. La instancia de prueba quedó detenida.

Reproducción del circuito manual: `node server/scripts/verify-client-browser.mjs --reversals` desde la raíz. Construye producción y sirve solo en 127.0.0.1:4317, sin usar la base habitual. La demora de prueba del escenario anterior es opcional con `--faults`.

Evidencia visual: `C:/Users/Usuario/.codex/visualizations/2026/10/26/01a178ea-851f-7d61-aee0-d250cd3ed11d/rectificacion-pago-verificada.png`.

## Límites

La anulación corrige el registro interno; no ejecuta devoluciones ni movimientos de dinero. No se edita ni se borra el motivo después de confirmar. La ampliación posterior del 28/10/2026 implementó [modificación de acuerdos y cuotas](ENTREGA_MODIFICACION_ACUERDOS.md), con 335 pruebas aprobadas en su validación completa. La ampliación siguiente incorpora [comprobantes privados de pagos](ENTREGA_COMPROBANTES_PAGOS.md), conservados para lectura incluso después de anular; su confirmación final se documenta por separado. Otras monedas siguen pendientes. Las ampliaciones de escritos y las integraciones judiciales conservan su lugar en la hoja de ruta.
