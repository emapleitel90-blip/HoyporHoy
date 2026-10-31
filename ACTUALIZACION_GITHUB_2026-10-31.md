# Actualización para revisión — 31/10/2026

Rama paralela: `codex/revision-integral-20261029`. Pull request: https://github.com/emapleitel90-blip/HoyporHoy/pull/2. Se conserva main sin fusionar. Esta actualización continúa la entrega original; el ZIP con manifiesto del 29/10 no representa estos cambios posteriores.

## Cambios incorporados

- Actividad con autor, fecha, expediente y estado de lectura por usuario. Contador en campana y acceso desde menú; actualización periódica de 30 segundos en avisos recientes.
- Avisos desde tareas, entregas y aprobaciones de versiones exactas, seguimientos, escritos, pagos, anulaciones, acuerdos y comprobantes.
- Avisos transaccionales para creación/edición de expedientes, archivos, vencimientos, gastos, modelos y referencias jurídicas. Exclusión de integrantes inactivos y filtro de acceso actual al expediente.
- Búsqueda por texto sin acentos, selección de expediente y filtro de no leídas. Lectura individual y protección frente a marcar avisos ocultos mediante la acción global.
- Consulta de avisos antiguos por cursor, sin duplicar empates de fecha. Validación del cursor por usuario y acceso actual, recuperación ante errores y posición estable al consultar páginas antiguas.
- Importación con aviso de resumen, estudio derivado de la cuenta activa, números de expediente con UUID y confirmación conjunta del lote y sus avisos. Una fila inválida revierte la importación.

## Comprobaciones y límites

Las verificaciones se realizaron por etapas y no deben sumarse como una suite única. La ejecución de archivos afectados por avisos transaccionales aprobó 329 pruebas en 6 archivos, con un trabajador y límites de 30 s por prueba/60 s por preparación tras una primera pasada que agotó tiempos. También pasaron las pruebas específicas de modelos/referencias, paginación y reversión de importaciones. La última ejecución del panel aprobó sus 6 pruebas. ESLint y las compilaciones de producción por etapa pasaron, con la advertencia conocida del fragmento Excel de 500 kB. No se ejecutó una nueva suite completa durante esta publicación.

Los detalles y evidencias de navegador disponibles están en `ENTREGA_ACTIVIDAD_NOTIFICACIONES.md`. No se probaron manualmente todos los botones de cada ampliación. La paginación recorre avisos guardados y los filtros actúan sobre la página cargada; no es una auditoría universal de todos los campos ni una reconstrucción de eventos sin historial. Configuración sigue fuera del registro de actividad.

Pendiente importante: idempotencia de importaciones. Repetir una petición de importación confirmada todavía crea otro lote. La actualización no agrega esa protección ni representa aprobación externa o autorización para producción.

Se excluyen de la publicación bases SQLite, respaldos, archivos de usuarios, secretos reales, carpetas de pruebas temporales y compilaciones locales.
