# Actividad y notificaciones — 29/10/2026

Implementada localmente una entrada de menú y una campana con contador de no leídas. El panel permite actualizar, abrir el expediente y marcar una o todas las notificaciones como leídas. La consulta automática se ejecuta cada 30 segundos; la campana también actualiza al recuperar foco y después de marcar avisos.

## Alcance

Se generan avisos por usuario desde los historiales persistentes de tareas (creación, inicio, avance, entrega, correcciones y aprobación), seguimiento documental y compromisos, versiones guardadas de escritos, pagos, anulaciones, modificaciones de acuerdos y comprobantes de pago. Incluyen autor, fecha de Córdoba en formato de 24 horas y expediente; las entregas y aprobaciones incluyen la versión correspondiente.

No es una auditoría universal de todos los campos de la base. Las ampliaciones siguientes incorporan modificaciones del expediente, archivos, vencimientos, gastos, modelos, referencias jurídicas y un resumen de importación masiva; siguen fuera cambios de configuración. No envía notificaciones del sistema operativo ni correo. Se muestran hasta 50 avisos por página y se incorporan hasta 50 eventos recientes de actividad por consulta, tomando candidatos de los últimos 50 eventos de cada fuente. Al primer ingreso se incorporan hechos anteriores disponibles; no significa que todos ocurrieron ahora. El contador incluye todas las notificaciones visibles materializadas sin leer, aunque la página muestre 50.

## Persistencia y permisos

Se reutiliza Notification: cada aviso de actividad tiene un identificador derivado del usuario y evento original. Las lecturas periódicas conservan el estado de lectura y no duplican avisos. Los eventos se seleccionan por el alcance actual del expediente; también se filtran las notificaciones guardadas al listar y marcar como leídas, excluyendo otro estudio, otro titular y expedientes eliminados. Las marcas de lectura son individuales y persistentes. No requiere migración.

La actividad se materializa al consultar notificaciones; no modifica el resultado de la operación original ni sus transacciones. No es una cola de entrega garantizada de todos los eventos históricos. El límite de candidatos requiere paginación adicional si se necesita revisar íntegramente un historial de gran volumen.

## Ampliación: expediente, archivos, vencimientos y gastos

Las nuevas acciones generan avisos dentro de su transacción de escritura, mediante `recordCaseActivity`. Se confirma conjuntamente el cambio y sus avisos. Los destinatarios son los integrantes activos del estudio (o el titular independiente) y el autor de la operación. Se vuelve a comprobar cuenta activa y acceso al expediente dentro de la transacción. Un error revierte ambos; las operaciones rechazadas no generan avisos.

Se registran creación y edición de expediente, incorporación y eliminación de archivo, creación/edición/cumplimiento/eliminación de vencimiento, registro/edición de gasto e incorporación de su comprobante. El expediente informa los nombres de campos modificados, sin copiar sus valores privados. Las ediciones que guardan los mismos valores no generan un aviso nuevo. Las eliminaciones conservan un aviso con el nombre anterior. Los gastos conservan su aviso previo al abogado asignado y el resto de destinatarios recibe actividad sin duplicar ese aviso para el abogado.

Esta ampliación registra operaciones futuras; no reconstruye ediciones o eliminaciones históricas sin registro. No requiere migración ni reescribe datos existentes.

Validación de la ampliación: 329 pruebas aprobadas en 6 archivos en la pasada con un trabajador, límite de 30 segundos por prueba y 60 segundos por preparación. La primera pasada con el límite predeterminado de 5 segundos agotó tiempos y dejó casos posteriores contaminados; se detuvo y se repitió en bases temporales nuevas, sin omitir comprobaciones. Las pruebas nuevas cubren destinatarios, autor, conservación del aviso de eliminación, ausencia de avisos en guardados sin cambios, protección de valores privados y reversión conjunta con actor inactivo. Los avisos automáticos de vencimientos conservan sus comprobaciones separadas por tipo DEADLINE_ALERT.

## Validación

- Pruebas de servidor vinculadas a escritos/actividad: 133 aprobadas en la ejecución de 2 archivos; se comprobó aviso con autor, idempotencia, lectura individual, otro estudio, titular independiente y retiro de acceso por expediente eliminado.
- Dos pruebas de interfaz aprobadas: autor/versión, enlace, confirmación de lectura, formato horario y recuperación de fallos.
- ESLint completo aprobado. Compilación en carpeta separada de prueba; no se sobrescribe client/dist.
- API habitual: la cuenta de abogada recibió 12 avisos, entre ellos su aprobación de «ver tribunales» sobre la versión 1. Navegador: panel, menú, campana y avisos comprobados; no se marcaron como leídos los avisos del usuario durante esta comprobación.
- Evidencia: `actividad-notificaciones-verificada.png` en la carpeta de evidencias de la sesión. No se repitió toda la suite ni se publicó esta ampliación en GitHub.

ESLint completo y compilación de producción aprobados para esta ampliación. Salida: server/scratch/activity-expanded-client-build, conservando client/dist. Persiste la advertencia conocida de tamaño del módulo Excel. No se repitió una prueba de navegador para estas nuevas acciones; su persistencia y permisos se comprobaron con las pruebas de integración.

## Modelos y referencias jurídicas

La incorporación de un modelo a la biblioteca y el registro de una referencia jurídica generan avisos dentro de la misma transacción que el contenido. Se informa autor y título, conservando el texto del modelo y las notas de lectura en su sección correspondiente. El enlace del aviso lleva al expediente desde el que se incorporó el modelo; no se agrega una relación de versiones ni de aprobación al modelo.

Un reintento idéntico del modelo devuelve el registro existente sin duplicar avisos. Una referencia jurídica conserva su comportamiento de creación: no tiene identificador de reintento y dos guardados independientes pueden crear dos referencias. Se mantienen los controles de fuentes oficiales sin IA y acceso por estudio/titular.

Verificación específica: 4 pruebas aprobadas en 4 archivos con filtro por nombre, 311 pruebas no seleccionadas. Se comprobaron destinatarios, autor, exclusión de otra organización y cuentas inactivas, privacidad del extracto y no duplicación al reintentar modelos. No se repitió la suite completa ni una prueba en navegador para esta ampliación. No requiere migración. Los avisos nuevos cubren incorporaciones futuras, sin reconstruir las anteriores.

## Filtros de actividad

Se pueden combinar palabras de título, autor, versión o expediente con un selector de expediente y la opción «Solo sin leer». La búsqueda no distingue mayúsculas ni acentos. Se informa la cantidad de coincidencias dentro de los avisos cargados; no consulta el historial completo más allá del límite de 50. Las actualizaciones conservan los filtros y un aviso leído deja de aparecer en «Solo sin leer» tras confirmarse su estado en el servidor.

La acción global de marcar todas como leídas se oculta mientras hay filtros para evitar marcar avisos que no están visibles. «Limpiar filtros de actividad» recupera la lista completa cargada. No requiere cambios de API ni migración.

Verificación: 3 pruebas de interfaz aprobadas, incluido filtro combinado sin acentos, ausencia de resultados, lectura individual y recuperación de la lista sin alterar avisos ocultos. ESLint completo correcto. En navegador se comprobó la combinación «APROBADA», expediente DEMO y «Solo sin leer»: una coincidencia entre 12 avisos; no se marcaron avisos reales del usuario. Evidencia: `filtros-actividad-verificados.png` en la carpeta de evidencias de la sesión.

Compilación de producción de filtros aprobada: server/scratch/activity-filters-client-build. Se conserva client/dist y persiste la advertencia conocida del módulo Excel de 500 kB.

## Consulta de avisos anteriores

Se puede avanzar con «Ver avisos más antiguos» y regresar a la primera página con «Volver a los más recientes». Cada página contiene hasta 50 avisos guardados. Los filtros buscan únicamente dentro de esa página y conservan sus valores al navegar. La lectura individual mantiene la posición; «Actualizar actividad» vuelve a la primera página. La actualización automática funciona solo en la primera página para no mover la posición al consultar avisos antiguos. Marcar todas como leídas se ofrece únicamente en la primera página sin filtros y conserva su alcance global sobre las notificaciones autorizadas.

La API agrega `nextCursor`. El cursor debe corresponder a un aviso del usuario dentro de su acceso actual; se rechazan cursores ajenos o inválidos. Se ordena por fecha descendente e identificador ascendente, utilizando ambos para continuar sin repetir empates de fecha. Si se pierde el acceso al aviso de referencia, la pantalla informa el error y permite regresar a recientes. La paginación recorre notificaciones ya guardadas; no reconstruye los eventos antiguos que nunca fueron materializados.

Verificación: una prueba específica de servidor aprobada (133 no seleccionadas) con 53 avisos de fecha idéntica, continuidad sin duplicados y cursores inválidos/ajenos; 5 pruebas de interfaz aprobadas, incluidas navegación, retorno y recuperación ante error. ESLint y compilación correctos; salida server/scratch/activity-pages-client-build, con la advertencia conocida de Excel. No se repitió la suite completa ni se hizo una prueba manual de navegación con más de 50 avisos en el navegador. No requiere migración.

## Resumen de importación

Importar expedientes desde Excel/CSV registra un aviso por destinatario con autor y cantidad incorporada, sin copiar nombres de clientes ni descripciones. El enlace «Ver expedientes» abre la lista general. Se notifica a los participantes activos del estudio o al titular independiente y al autor; el aviso está asociado al primer expediente del lote para conservar el filtro de acceso y se oculta si ese expediente deja de estar disponible. No se crean avisos independientes por cada fila ni un historial de lote navegable.

La importación vuelve a comprobar la cuenta activa dentro de una transacción y deriva el estudio de esa cuenta, ignorando estudios enviados en las filas. El lote y sus avisos se confirman juntos; cualquier fallo revierte ambos. Se rechazan arreglos vacíos y filas que no sean objetos. Los nuevos números de expediente usan UUID para evitar colisiones entre filas. La transacción admite hasta 30 segundos de ejecución; no se modificó el límite general del servidor.

La ampliación inicial conservaba la semántica de creación. Desde el 31/10/2026, los reintentos con requestId se deduplican mediante la migración documentada en ENTREGA_REINTENTOS_IMPORTACION.md. Clientes sin requestId siguen sin esa protección. No se reconstruyen avisos de importaciones anteriores.

Prueba específica del servidor aprobada (60 no seleccionadas): lote de dos expedientes, aviso por destinatario, ausencia de datos privados, estudio forjado ignorado, reversión ante fila inválida, rechazo de lote vacío y aislamiento del titular independiente. No se repitió la suite completa ni se realizó una importación manual en el navegador para esta ampliación.

Para el resumen de importación también pasaron las 6 pruebas del panel, ESLint completo y la compilación de producción en server/scratch/activity-import-client-build. Se conserva client/dist; persiste la advertencia conocida del módulo Excel.

Actualización final del 31/10/2026: se agregó protección de reintentos con requestId, documentada en ENTREGA_REINTENTOS_IMPORTACION.md. La suite completa de fuentes actuales aprobó 359 pruebas de servidor y 112 de interfaz. La configuración del servidor ahora excluye las copias archivadas de scratch; los totales dirigidos anteriores no sustituyen esta validación final.

## Campana después de guardar — 01/11/2026

Los paneles de archivos, seguimiento y honorarios emiten notifications-updated solo después de una operación confirmada por el servidor, incluidos comprobantes de pagos. El evento no crea notificaciones ni modifica su lectura: solicita que la campana vuelva a consultar el recuento autorizado. Otros circuitos y otras ventanas conservan la actualización periódica y al recuperar el foco.

Si el aviso llega durante una consulta, la campana conserva una actualización pendiente y agrupa las señales simultáneas en una sola consulta posterior. Al cambiar de usuario o desmontar, descarta las respuestas antiguas y limpia los listeners. El contador rechaza valores negativos o que no sean enteros seguros.

Validación específica: 29 pruebas aprobadas en seis archivos de interfaz, incluidos carga fallida/confirmada, aviso durante consulta, cambio de usuario, limpieza, seguimiento, honorarios, comprobantes y listado de actividad. ESLint y compilación de producción aprobados; continúa la advertencia conocida del módulo Excel. Esta etapa no incluye una nueva prueba manual con cambios en la base de demostración ni cambios del servidor.
