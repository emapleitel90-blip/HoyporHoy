# Comprobantes de pagos de honorarios — 28/10/2026

Implementado y activado localmente: archivos reales vinculados a pagos existentes, descarga privada e historial de reemplazos. Se verificaron 360 pruebas, la migración con conservación de datos y el circuito en navegador. La revisión técnica externa de Bartolito y la validación de uso por Ema siguen pendientes.

## Uso

En Honorarios y cobranzas, cada pago tiene su propio apartado de comprobantes. Un abogado o administrador con acceso al expediente puede elegir Adjuntar comprobante, seleccionar el archivo y guardar. La primera carga admite un motivo opcional; un reemplazo requiere motivo de hasta 2000 caracteres.

Se admiten archivos no vacíos de hasta 20 MB en los formatos privados del expediente: PDF, Word, Excel, PNG, JPG y WebP. El servidor comprueba extensión, tipo declarado y firma básica del contenido. El nombre original se conserva como metadato y el almacenamiento usa una identidad propia, evitando sobrescribir un archivo anterior.

El comprobante más reciente aparece como actual. Los anteriores permanecen en un apartado desplegable con nombre, autor, fecha y motivo. Todos se descargan mediante una solicitud autenticada. El operador puede consultar y descargar, pero no adjuntar ni reemplazar.

Adjuntar un archivo no modifica importe, fecha ni estado financiero del pago y no verifica que su contenido respalde el cobro. Los archivos también se incorporan a la documentación del expediente. No se admite borrar desde ese panel ningún archivo que forme parte del historial de comprobantes de honorarios, incluidos los reemplazados.

## Pagos anulados y archivos faltantes

- Al anular un pago, sus comprobantes se conservan como parte del historial y siguen disponibles para descarga autorizada.
- Un pago anulado no admite nuevas cargas ni reemplazos. Si una actualización informa la anulación mientras el formulario estaba abierto, la interfaz bloquea la carga y ofrece cerrar el comprobante. El servidor también lo comprueba antes de recibir bytes y dentro de la transacción.
- Si falta el archivo físico, el registro se muestra como no disponible y no ofrece una descarga que aparente funcionar. En un pago activo se puede cargar un reemplazo con motivo; el registro anterior permanece identificado como faltante.
- La consulta de un archivo no acredita la validez jurídica o bancaria del pago.

## Integridad, permisos y reintentos

El servidor deriva el expediente desde el pago. No recibe un identificador de expediente o una URL elegidos por el cliente para vincular archivos. Comprueba rol y alcance antes de la carga y vuelve a leer la cuenta activa, el rol, el estudio y el acceso al pago después de recibir el archivo.

La carga conserva la versión del acuerdo y un UUID de solicitud. Un pago, anulación, cambio de acuerdo u otra carga concurrente puede invalidar esa versión; se devuelve 409 y la selección se conserva para que el usuario decida actualizar. El cliente no presenta como guardado un archivo que solo terminó de enviarse.

Archivo, registro del historial y avance de versión se confirman en una transacción. Cada comprobante tiene una secuencia propia dentro del pago. Reintentar el mismo UUID, nombre, contenido SHA-256, motivo y versión de origen devuelve el acuerdo actual sin crear otro comprobante; la carga temporal duplicada se elimina. Reutilizar ese UUID con otros datos se rechaza. Una carga fallida o rechazada se limpia; si la limpieza física falla, el servidor deja registro del problema.

La interfaz conserva el borrador mientras se actualizan los honorarios y descarta lecturas GET anteriores a una mutación. La selección se descarta explícitamente al cancelar o elegir actualizar tras un conflicto. Los formularios de comprobante, pago, anulación y modificación de acuerdo son excluyentes.

## API y almacenamiento

POST `/api/fees/payments/:id/receipt`, con multipart:

- `file`: archivo.
- `expectedVersion`: versión del acuerdo en texto decimal.
- `requestId`: UUIDv4.
- `reason`: motivo opcional en la primera carga y obligatorio en reemplazos.

La respuesta contiene el acuerdo completo. Cada pago incluye `receipts` en orden de secuencia descendente, con archivo, metadatos de carga y `fileStatus` AVAILABLE o MISSING. El hash de contenido se conserva internamente y no forma parte de la respuesta.

Los bytes usan el almacenamiento privado existente de CaseFile y su ruta de descarga autenticada. FeePaymentReceipt conserva pago, archivo, secuencia, solicitud, motivo, versión de origen, hash, usuario y fecha. Sus restricciones impiden reutilizar el mismo archivo o la misma secuencia y protegen el pago y el archivo referenciados frente al borrado.

## Migración

`20261028030000_fee_payment_receipts` agrega la tabla FeePaymentReceipt y sus índices y claves foráneas. No requiere reescribir importes, fechas, acuerdos, cuotas ni pagos anteriores.

El helper de respaldo admite esta migración explícita y exige que sea la única pendiente. Se ejecutó sobre la base local: creó una copia SQLite consistente, ensayó la migración en otra copia y comparó todos los campos y registros anteriores antes y después de aplicarla en la base habitual. Las 19 tablas anteriores conservaron sus datos; la nueva tabla quedó vacía. La base habitual no contiene los pagos ni los comprobantes ficticios usados para verificar la interfaz.

Respaldo: `server/scratch/fees-migration-1793231146878/before.db`. Ensayo: `trial.db` en la misma carpeta. Conservar el respaldo junto con los archivos privados al preparar una recuperación.

Para otra instalación, con las migraciones anteriores aplicadas y después del respaldo, ejecutar desde `server`: `node scripts/apply-fees-migration.mjs 20261028030000_fee_payment_receipts`. Generar Prisma y reiniciar el servidor para cargar el código nuevo.

## Validación local

- Servidor: 282 pruebas en 16 archivos, todas aprobadas con `npm --prefix server test -- --pool=threads --maxWorkers=1` bajo Node 24.15.0. También se completaron las 282 con el ejecutor habitual `forks` y `--maxWorkers=1` bajo Node 24.22.1, usando la versión ya incluida en Codex.
- Cliente: 78 pruebas en 9 archivos, todas aprobadas con `npm --prefix client test -- --maxWorkers=1`.
- ESLint sin errores. Compilación de producción correcta, realizada en una carpeta temporal para conservar el `client/dist` previo. Persiste la advertencia del fragmento de Excel de aproximadamente 500 kB, cargado bajo demanda.
- Prisma generado y migración local aplicada con respaldo y ensayo previo.
- Navegador sobre compilación de producción y SQLite/almacenamiento aislados: carga inicial, incorporación automática a Documentación y Archivos, reemplazo con motivo, comprobante actual y anterior visibles. Ambas descargas coincidieron por SHA-256 con sus archivos de origen.
- Comprobación posterior de la base ficticia: acuerdo versión 3, dos comprobantes y bytes almacenados consistentes con sus hashes. Cuota de 10025 centavos, pago y acumulado de 4010 centavos conservados tras las dos cargas.
- [Evidencia del historial](<C:/Users/Usuario/.codex/visualizations/2026/10/26/01a178ea-851f-7d61-aee0-d250cd3ed11d/comprobantes-pago-historial.png>).

Reproducción del navegador: `node server/scripts/verify-client-browser.mjs --payment-receipts` desde la raíz. Usa únicamente datos ficticios y escucha en loopback. No carga la base habitual ni inicia los avisos programados.

En Windows con Node 24.15.0, el ejecutor `forks` de Vitest terminó inesperadamente durante la suite de archivos, sin informar una aserción fallida. No se considera aprobada esa ejecución incompleta ni se atribuye una causa a Prisma. La ejecución completa con `threads` y un trabajador sí finalizó con las 282 pruebas aprobadas. El cierre tampoco se reprodujo al ejecutar toda la suite con Node 24.22.1, el modo habitual `forks` y un trabajador: 16 archivos y 282 pruebas aprobadas, código de salida 0. Registro local en `server/scratch/receipt-validation-node24.log`. Este contraste no cambió la instalación global de Node ni los valores predeterminados del proyecto. La primera ejecución paralela del cliente agotó el tiempo de una prueba de navegación; la ejecución secuencial completó las 78. Se conservan las pruebas y sus aserciones, sin ampliar tiempos para obtener estos resultados.

## Cobertura

Esta etapa agrega 15 pruebas de servidor para los comprobantes, una de migración y 9 de interfaz. Cubren archivo real y descarga autenticada, conservación del pago, reconexión, historial de reemplazos, archivos faltantes, duplicados, conflictos, permisos actuales, aislamiento, cambios de acceso durante la carga, pagos anulados, rollback de la transacción, limpieza de bytes y migración sobre datos anteriores. La interfaz también comprueba que una anulación recibida durante una actualización bloquee el formulario ya abierto.

## Pendientes del producto

Otras monedas, conciliación bancaria y avisos automáticos siguen pendientes, además de eliminación o renumeración de cuotas, versiones de escritos e integraciones judiciales. Los comprobantes adjuntos son documentación interna: esta entrega no emite comprobantes fiscales ni realiza movimientos de dinero. Publicación y revisión técnica externa siguen separadas de la validación local.
