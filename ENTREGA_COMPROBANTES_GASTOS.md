# Comprobantes de gastos — quinta corrección

26/10/2026. Implementación local sobre el esquema existente; no agrega tablas, columnas ni migraciones.

## Comportamiento

- Al crear un gasto, el cliente envía descripción, monto, tipo y, opcionalmente, el archivo mediante multipart. También se conserva la creación JSON sin archivo.
- Se reemplazó la carga simulada y se eliminó `client/src/utils/firebaseUpload.js`.
- El archivo utiliza el almacenamiento privado de expedientes: `CASE_FILES_DIR` o `server/storage/case-files/`. Se conserva el nombre original y se asigna una identidad UUID propia al contenido.
- Gasto, metadatos del archivo y notificación se registran en una transacción. Si falla antes del commit, se revierten los registros y se intenta retirar el archivo recibido. Una falla de limpieza se registra en el servidor y el contenido sin metadatos no queda descargable por la API.
- La descarga usa el endpoint privado del expediente, con token, nombre de archivo, `no-store` y `nosniff`; no expone una URL pública.
- Los comprobantes nuevos aparecen también en Documentación y Archivos del expediente.
- Se validan monto positivo y finito, descripción, tipo y estado. Los archivos conservan las validaciones de tamaño, extensión, MIME y firma del almacenamiento de expedientes: hasta 20 MB, PDF, Word, Excel, PNG, JPG y WebP.

## Gastos anteriores y reemplazos

- La lista distingue `AVAILABLE`, `MISSING`, `LEGACY` y `NONE`. Son estados derivados, no columnas nuevas.
- Un comprobante anterior con URL simulada se muestra como **Comprobante anterior sin archivo verificable** y no como un enlace de descarga.
- El contenido que nunca se guardó no puede recuperarse desde esa URL: hay que seleccionar y cargar nuevamente el original.
- Cada gasto permite cargar o reemplazar su comprobante. El servidor exige la versión `updatedAt` recibida en la lista y rechaza una versión anterior con 409, limpiando la nueva carga incompleta.
- Un archivo actualmente vinculado a un gasto no se puede borrar desde Documentación y Archivos. Después de reemplazarlo, el anterior continúa allí y puede eliminarse si no tiene otros vínculos.
- Si falla un reemplazo, se conserva la referencia y el contenido anteriores.

## API y permisos

- `GET /api/expenses/case/:id`: gastos autorizados, total y estado del comprobante.
- `POST /api/expenses/case/:id`: creación con o sin archivo; el archivo se envía en el campo `file`.
- `POST /api/expenses/:id/receipt`: nuevo archivo en `file` y versión del gasto en `version`.
- `PUT /api/expenses/:id`: edición de datos del gasto; no permite registrar comprobantes mediante una URL arbitraria.
- Lecturas, cambios y cargas usan el acceso compartido por estudio o titular independiente. Los expedientes eliminados quedan excluidos incluso para el superadministrador.
- El permiso se comprueba antes de recibir bytes y de nuevo dentro de la transacción, tomando el usuario activo de la base.
- Las notificaciones se limitan al responsable asignado activo y perteneciente al expediente.

## Verificación

- 29 pruebas nuevas de integración con SQLite y almacenamiento reales.
- 10 pruebas nuevas del cliente: multipart, confirmación real, descarga autenticada, reintentos, enlace antiguo, archivo ausente, progreso, tamaño y aislamiento de respuestas al navegar.
- `npm test` desde la raíz: **209 pruebas del servidor y 41 del cliente aprobadas; 250 en total**.
- `npm run lint`: sin errores ni advertencias.
- Compilación de producción correcta. Continúa la advertencia previa por el tamaño del paquete JavaScript.
- Se comprobaron los regresos de archivos privados y seguimiento documental, incluyendo el bloqueo del borrado de archivos vinculados.

Para reproducir manualmente: crear un gasto con un PDF de prueba, cerrar sesión, ingresar nuevamente y descargarlo desde Gastos. Verificar que los bytes coincidan; probar otra cuenta sin acceso al expediente. En un gasto antiguo, cargar su comprobante real y comprobar que se sustituye el aviso de archivo no verificable por la descarga privada.
