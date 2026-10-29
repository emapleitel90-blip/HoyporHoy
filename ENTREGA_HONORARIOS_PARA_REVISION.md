# Honorarios y cobranzas — 28/10/2026

Implementación local y migración activadas. Revisión técnica de Bartolito y validación de uso por Ema pendientes; este documento no acredita envío ni aprobación externa.

## Circuito disponible

- Un acuerdo de honorarios por expediente, con descripción, moneda ARS y entre 1 y 60 cuotas. Cada cuota registra importe y vencimiento, sin calcular intereses ni condiciones jurídicas.
- Los importes se conservan como centavos enteros; máximo $20.000.000 por cuota o pago. El total se obtiene sumando las cuotas, sin diferencias de redondeo.
- Un abogado o administrador registra el acuerdo y los pagos efectivamente recibidos. El operador puede consultar y preparar recordatorios, pero no registrar acuerdos o pagos.
- Cada pago conserva importe, fecha, observaciones, usuario de registro y momento de carga. Un pago parcial reduce el saldo; uno completo elimina las acciones de cobro de esa cuota sin borrar el historial.
- Mi jornada muestra cuotas con saldo que están atrasadas, vencen hoy o en los próximos siete días, según el calendario de Córdoba. Las cuotas más lejanas permanecen en el expediente.
- Los recordatorios se copian con el saldo vigente para revisar y enviar manualmente. No hay envío automático ni conexión con WhatsApp o un proveedor de pagos. Los gastos existentes no se convierten automáticamente en honorarios.
- Las consultas y escrituras respetan estudios, titulares independientes y expedientes eliminados. Los endpoints usan el usuario activo de la sesión y autorización del servidor.
- Si todavía falta la migración en otra instalación, la API informa 503 en este módulo, conservando el resto de la app.

## Integridad de los pagos

El cliente conserva un identificador UUID para reintentar la misma solicitud de pago. El servidor devuelve el mismo resultado sin agregar otro pago; reutilizar ese identificador con datos distintos se rechaza. La actualización del saldo y la creación del historial ocurren en una transacción. Una condición atómica impide que pagos concurrentes excedan el importe de la cuota. Se rechazan importes no positivos, más de dos decimales, fechas inválidas y pagos con fecha futura.

## Migración y respaldo

Migración aditiva: `20261028000000_fees`, con FeeAgreement, FeeInstallment y FeePayment. No reescribe tablas previas ni el historial de migraciones anteriores.

Antes de aplicarla, `server/scripts/apply-fees-migration.mjs` comprobó que era la única pendiente, creó un respaldo SQLite consistente con VACUUM INTO, ensayó la migración en una copia y comparó el contenido de cada tabla previa mediante conteos y SHA-256 de sus registros. Repitió la comparación después de migrar la base local.

Respaldo: `server/scratch/fees-migration-1793210115020/before.db`. Ensayo: `trial.db` en esa misma carpeta. Ambos contienen datos locales del usuario, permanecen en el equipo y los archivos .db están excluidos de Git. Conservarlos como respaldo privado.

Se conservaron 4 expedientes, 2 archivos, 3 clientes, 1 configuración, 1 estudio y 2 usuarios, además de las tablas vacías anteriores. Las tres tablas nuevas quedaron vacías en la base habitual: los cobros de prueba se hicieron únicamente en otra base temporal.

## Verificación

- Servidor completo: 236 pruebas aprobadas en 13 suites con `npm --prefix server test -- --maxWorkers=1 --testTimeout=15000`.
- Se agregaron 15 pruebas del servidor: centavos, reconexión, permisos, duplicados, concurrencia, sobrepagos, estados, avisos, fechas e importes inválidos.
- Cuatro pruebas nuevas del cliente cubren registro, conservación de formularios, reintento con el mismo identificador, recordatorio actualizado, pago completo y consulta del operador.
- Cliente completo: 54 pruebas aprobadas en 7 suites. Sumadas a las 236 del servidor, 290 pruebas aprobadas en la validación final. ESLint sin observaciones y compilación final de producción correcta; persiste únicamente la advertencia de tamaño del archivo de Excel bajo demanda.
- Navegador con compilación de producción y rutas reales: acuerdo de $100,25; pago de $40,10; saldo y recordatorio de $60,15; aparición en Mi jornada; segundo pago de $60,15; saldo cero y retiro de los pendientes. Consulta final de la base ficticia: 1 acuerdo, 2 pagos, 10025 centavos abonados.
- El servidor de verificación quedó detenido y se restauró el tamaño normal del navegador. El escenario se reproduce con `node server/scripts/verify-client-browser.mjs --faults` desde la raíz; crea una base nueva aislada y sirve solo en 127.0.0.1:4317.

## Alcance pendiente

Ampliaciones del 28/10/2026: ya se puede [rectificar un pago mediante anulación](ENTREGA_RECTIFICACION_PAGOS.md) y [modificar acuerdos y cuotas con historial](ENTREGA_MODIFICACION_ACUERDOS.md). La validación completa de esa etapa aprobó 335 pruebas. Las cuotas conservan sus IDs y pagos; se pueden ajustar importes y vencimientos y agregar cuotas al final, con motivo y control de versión. La ampliación siguiente agrega [comprobantes privados vinculados al pago](ENTREGA_COMPROBANTES_PAGOS.md), con el estado de su confirmación final separado en esa entrega. Siguen pendientes eliminar o renumerar cuotas, otras monedas, conciliación bancaria y avisos automáticos. Los comprobantes de gastos se conservan.

Las versiones de escritos, el análisis documental y las integraciones judiciales siguen como entregas posteriores de la hoja de ruta.
