# Jurisprudencia con fuentes oficiales, sin IA

Esta entrega reemplaza la generación de sugerencias de fallos por acceso a portales oficiales y registro manual de documentos consultados. No utiliza OpenAI ni solicita, lee o transmite claves de OpenAI para jurisprudencia. Las claves antiguas que el usuario hubiera guardado en el navegador ya no son utilizadas por este panel.

## Comportamiento

- Accesos a SAIJ y al portal de jurisprudencia del Poder Judicial de Córdoba. Son enlaces a portales, no resultados de búsqueda ni documentos verificados. El buscador externo de Córdoba tiene su propia tecnología semántica.
- Registro por expediente de título, tribunal, fecha, enlace y extracto o notas opcionales. El servidor agrega usuario, fecha de registro y procedencia.
- Solo se admiten enlaces HTTPS de saij.gob.ar y justiciacordoba.gob.ar (con o sin www), sin credenciales ni puertos adicionales. No se descarga la URL desde el servidor.
- Las referencias se identifican como ingresadas por el usuario, sin verificación automática del contenido. Los registros históricos permanecen visibles como no verificados y sin convertir su texto en enlaces activos.
- Listado y guardado respetan estudio, titularidad de usuarios independientes y expedientes eliminados. El formulario conserva datos ante errores y permite reintentar.
- El endpoint anterior de búsqueda conserva compatibilidad devolviendo modo OFFICIAL_PORTALS, portales y una lista vacía de resultados. Valida la consulta y nunca inventa fallos.

## Límites y fuentes consultadas

No se implementa extracción automática: la consulta automatizada a SAIJ devolvió HTTP 403 y el portal de Córdoba agotó el tiempo de espera durante esta revisión. Esto no demuestra que los portales estén indisponibles para el navegador del usuario. No se verificó una API pública estable.

- SAIJ: https://www.saij.gob.ar/buscador/
- Descripción oficial del servicio: https://www.argentina.gob.ar/buscar-informacion-juridica
- Portal Córdoba: https://www.justiciacordoba.gob.ar/Jurisprudencia/home
- Presentación oficial: https://www.justiciacordoba.gob.ar/justiciacordoba/Inicio/indexDetalle.aspx?codNovedad=44315

No hay migraciones de esquema ni nuevas dependencias. Los datos se conservan en TimelineEvent, con formato versionado para las nuevas referencias. Las restantes funciones de la app que usan OpenAI no cambian en esta entrega.

## Validación

- Servidor: 221 pruebas aprobadas, ejecutadas con `npm --prefix server test -- --maxWorkers=1 --testTimeout=15000`.
- Cliente: 45 pruebas aprobadas con `npm --prefix client test -- --maxWorkers=1`.
- Esta entrega agrega 12 pruebas del servidor y 4 de interfaz: persistencia, autorización, enlaces inválidos, fechas, registros históricos, ausencia de claves en la solicitud, reintentos y descarte de respuestas al cambiar de expediente.
- ESLint sin errores ni advertencias. Compilación de producción correcta en una carpeta temporal; persiste la advertencia por tamaño del paquete JavaScript.
- Las primeras ejecuciones concurrentes agotaron tiempos de prueba/preparación y produjeron errores de limpieza de bases temporales. La ejecución final del servidor, sin otros controles en paralelo, aprobó las 13 suites sin errores.

## Filtros de referencias guardadas — 29/10/2026

El panel permite buscar por título, tribunal, fecha, fuente y notas, sin distinguir mayúsculas ni acentos. El texto se combina con un selector de referencias oficiales ingresadas por el usuario o registros históricos sin verificar. Se muestra el número de coincidencias y una acción para limpiar los filtros. Cambiar de expediente reinicia la búsqueda.

Se filtra únicamente la lista ya cargada del expediente autorizado. No se agregan consultas a portales, IA ni verificación automática del contenido. Se mantienen las advertencias y los enlaces de cada registro. La recuperación automática desde fuentes oficiales sigue pendiente.

Validación: 5 pruebas del panel aprobadas y ESLint completo correcto. La nueva prueba comprueba acentos, filtros combinados, ausencia de resultados, limpieza y ausencia de solicitudes adicionales al filtrar. No requiere migración. No se repitió la suite completa ni el recorrido en navegador en esta ampliación.
