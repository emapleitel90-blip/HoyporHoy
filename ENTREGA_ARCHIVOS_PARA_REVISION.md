# Entrega: archivos privados del expediente

Continuación del proyecto: 19/10/2026.

Estado: implementación local y pruebas automatizadas completadas; revisión de Bartolito pendiente. Este documento prepara la revisión y no acredita que ya se haya enviado o aprobado.

Base de trabajo comprobada: rama local `feature/tasks-review`, HEAD `ec0e4c8`, con cambios locales sin commit que incluyen los avances anteriores de tareas. No se creó una rama nueva ni se publicó una versión en esta entrega; al compartirla se debe identificar el diff completo que recibirá el revisor.

## Problema y resultado

La interfaz anterior registraba un nombre y una URL simulada al seleccionar un archivo. Ahora envía el contenido real mediante multipart; el servidor lo guarda fuera de las carpetas públicas y registra una ruta de descarga autenticada.

Los registros anteriores se conservan. Los enlaces externos válidos siguen identificados como enlaces anteriores sin carga privada verificada. Las URLs simuladas conocidas se muestran como registros sin archivo disponible. No se atribuye contenido físico a esos registros.

## Comportamiento implementado

- `POST /api/cases/:id/files`: recibe un único archivo en el campo multipart `file`. Verifica acceso antes de escribir y vuelve a comprobar usuario y expediente al guardar los metadatos.
- `GET /api/cases/files/:fileId/download`: verifica sesión y acceso al expediente; descarga como adjunto con caché desactivada y `nosniff`.
- `DELETE /api/cases/files/:fileId`: elimina los metadatos autorizados y el contenido privado. Si falla la limpieza física, informa que queda pendiente; los bytes sin registro no pueden descargarse mediante esta API.
- PDF, DOC/DOCX, XLS/XLSX, PNG, JPG/JPEG y WebP; límite de 20 MB por archivo. Se validan extensión, tipo declarado, contenido no vacío y firma básica del formato.
- Identificadores aleatorios para almacenamiento, separados del nombre original. Dos archivos con el mismo nombre no se sobrescriben.
- Limpieza de cargas rechazadas o cuya transacción de metadatos falla.
- Respuestas de error visibles en la interfaz, incluido el motivo de un rechazo; no se muestra una carga exitosa cuando el servidor la rechaza.

También se reutilizó el aislamiento de expedientes en la generación de documentos y el guardado de jurisprudencia: comparar únicamente `studioId` permitía confundir titulares independientes cuando ambos estudios eran nulos. Ahora se comprueba el titular y se excluyen expedientes eliminados.

## Archivos principales para revisar

- [Rutas](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/routes/caseRoutes.js>).
- [Recepción y autorización](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/middleware/caseFileUpload.js>).
- [Almacenamiento y validaciones](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/utils/caseFileStorage.js>).
- [Controlador de archivos](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/caseFileController.js>).
- [Interfaz](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/components/CaseFilePanel.jsx>).
- [Pruebas de integración](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/tests/caseFiles.integration.test.js>).

Los exports anteriores de carga y borrado se conservan como reexports del nuevo controlador. Se mantienen las rutas de subida y borrado; la subida deja de aceptar un JSON que simule una carga y requiere contenido multipart.

## Instalación y conservación de datos

No requiere cambios de esquema ni una migración nueva. El servidor usa `server/storage/case-files` por defecto, con la carpeta excluida de Git. `CASE_FILES_DIR` permite configurar otra ubicación privada y persistente; se consulta al usar el almacenamiento, después de cargar el entorno.

Para instalar en hosting se debe proporcionar almacenamiento persistente y respaldo coordinado de base y archivos. No se montó esta carpeta como contenido público. El módulo de comprobantes de gastos y sus enlaces externos no se migró en esta entrega.

No se modificó la base habitual. Continúa pendiente reconciliar las migraciones históricas señaladas en [ESTADO_TAREAS.md](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/ESTADO_TAREAS.md>).

## Verificación automatizada

21 pruebas nuevas con SQLite y almacenamiento temporales. La suite completa pasó: 8 archivos y 84 pruebas. Parte de la suite antigua contiene marcadores sin comprobaciones reales; las pruebas nuevas comprueban las operaciones con datos y archivos reales de prueba.

Se verificaron bytes idénticos después de desconectar y reconectar a la base, descarga con nueva sesión, acceso por otro integrante del estudio, rechazo sin sesión y con usuario inactivo, aislamiento entre estudios e independientes, casos eliminados, cambio de estudio, formatos inválidos, archivos vacíos, carga múltiple, límite de tamaño, limpieza de errores, nombres repetidos, registros anteriores y borrado.

Para reproducir desde `server`:

```powershell
npm test -- --pool=threads --maxWorkers=1 src/tests/caseFiles.integration.test.js
```

La prueba crea y elimina sus propios datos temporales; necesita conexiones HTTP de localhost. En Codex se ejecutó con el permiso necesario para esas conexiones.

La compilación del cliente pasó. Continúan las advertencias anteriores sobre Browserslist y tamaño del paquete.

Verificación en navegador con cuenta, expediente y base ficticios: carga de un PDF, descarga mediante el botón autenticado, cierre y nuevo inicio de sesión, y conservación del archivo en el expediente. El SHA-256 del PDF descargado fue idéntico al del original. El registro anterior simulado permaneció visible con su estado de contenido no disponible.

Evidencia: [captura del panel después de volver a iniciar sesión](<C:/Users/Usuario/.codex/visualizations/2026/10/16/01a145ee-0749-7b13-bd29-11e8c95d6cfe/archivos-privados-verificados.png>).

## Puntos para la revisión técnica

- Revisar el almacenamiento privado, las autorizaciones antes y después de recibir el archivo y los controles de descarga/borrado.
- La comprobación de firmas es básica; no equivale a antivirus ni a validación completa del contenido de un PDF o archivo Office. Los contenedores DOCX/XLSX se reconocen por su firma ZIP.
- Si falla el borrado físico después de eliminar los metadatos, queda almacenamiento privado pendiente de limpieza. La respuesta y el log lo indican; todavía no hay una cola persistente de reintentos.
- Los registros y enlaces anteriores no se convierten automáticamente en documentos privados.
- El historial incompleto de migraciones continúa como punto de instalación pendiente, independiente de esta entrega sin cambios de esquema.

## Próximo incremento funcional

Sobre esta carga real de archivos, implementar requisitos de documentación, compromisos del cliente, motivos de bloqueo y seguimiento en Mi Jornada. La búsqueda asistida en SAIJ y Poder Judicial de Córdoba quedó incorporada a la entrega de fuentes jurídicas de la [hoja de ruta](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/HOJA_DE_RUTA_PRODUCTO.md>); no se implementó ni se probaron consultas de IA a esas fuentes en esta entrega.
