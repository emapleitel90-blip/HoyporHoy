# Séptima etapa: carga del cliente

Implementada localmente el 28/10/2026. Esta numeración corresponde a las correcciones técnicas del chat, no a las entregas funcionales de la hoja de ruta.

## Cambios

- Las nueve pantallas protegidas se cargan al abrir su ruta mediante React.lazy. Login, autenticación y estructura de navegación permanecen en la entrada.
- Suspense muestra un estado de carga dentro del contenido: el menú sigue disponible. Ante errores de descarga o renderizado se puede navegar a otra sección o recargar. El estado de error se reinicia al cambiar de ruta.
- SheetJS se importa solo al leer XLS/XLSX. Abrir la lista, abrir el importador o leer CSV ya no requiere descargar la biblioteca de Excel.
- Se conservan formatos, rutas, parámetros, autenticación y aislamiento. No se modificaron backend, esquema, dependencias ni la configuración del límite de advertencias de Vite.
- Hoja de ruta actualizada para reflejar la decisión de jurisprudencia sin IA y su alcance parcial.

## Resultado de compilación

Comparación con la compilación de la etapa anterior, usando Vite 6.4.5; tamaños decimales del JavaScript minificado:

| Archivo | Antes | Ahora |
|---|---:|---:|
| Entrada principal | 1221,76 kB (368,71 kB gzip) | 263,94 kB (88,65 kB gzip) |
| Dashboard y gráficos | Incluido en la entrada | 423,71 kB, bajo demanda |
| Excel | Incluido en la entrada | 500,05 kB, al seleccionar XLS/XLSX |

La entrada disminuye aproximadamente un 78,4 % en bytes minificados y un 76 % con gzip. Esto mide tamaño, no tiempo de carga en una conexión real. Al abrir Dashboard se descarga también su archivo; no se afirma que el total de toda la aplicación haya disminuido en ese porcentaje.

Persiste una advertencia por el archivo individual de Excel, apenas superior a 500 kB. Queda fuera de la carga inicial. No se redujo la compatibilidad de formatos ni se elevó el umbral para ocultar la advertencia. Hay más archivos y solicitudes cuando se visitan nuevas pantallas.

## Validación y reproducción

- `npm --prefix client test -- --maxWorkers=1`: 48 pruebas aprobadas en 6 suites. Incluye navegación con sesión, detalle y edición con ID, importación real CSV/XLS/XLSX, más tres pruebas nuevas de carga pendiente, descarga fallida y navegación después de un error.
- La prueba de apertura de la lista espera hasta 5 segundos para incluir la carga del módulo real antes de la petición de datos.
- `npm run lint`: sin errores ni advertencias.
- `npm --prefix client run build -- --outDir <carpeta-temporal> --manifest`: compilación correcta. Se usó una carpeta temporal para conservar el dist existente del usuario.
- Backend sin cambios; su última ejecución registrada en la etapa anterior aprobó 221 pruebas. No se presenta ese resultado como una ejecución nueva.

La revisión técnica de Bartolito continúa pendiente. En un despliegue deben conservarse los archivos estáticos de la versión anterior mientras haya sesiones abiertas, o una pestaña antigua podría necesitar recargar al intentar descargar una pantalla. No se realizó despliegue ni se atribuye aprobación técnica a terceros.

## Verificación posterior en navegador — 28/10/2026

Se agregó `server/scripts/verify-client-browser.mjs`, ejecutable desde la raíz. Construye el cliente con NODE_ENV de producción, crea una base SQLite temporal con todos los modelos actuales y datos ficticios, y sirve cliente y rutas reales de la API solo en 127.0.0.1:4317. No usa la base habitual ni ejecuta cron. `--faults` introduce 800 ms de demora por archivo JavaScript y un único HTTP 503 para la descarga de Ayuda. Es una simulación de latencia y fallo, no una medición con ancho de banda limitado.

Se comprobó en el navegador:

- Ruta protegida sin sesión → login; ingreso real; dashboard con el caso ficticio; detalle y edición con el mismo ID.
- Estado de carga y navegación disponibles durante las descargas.
- Error de Ayuda con opción de recarga, salida por otra sección y recuperación con HTTP 200 tras recargar.
- Selección real de XLSX mediante el selector de archivos, descarga de SheetJS en ese momento, vista previa y POST `/api/cases/import` con HTTP 201.
- El expediente importado permanece al recargar. Consulta final a la base temporal: 2 casos, 1 con el título importado.
- Menú visible en escritorio a 1280 × 900 y cierre de sesión. La vista inicial del navegador era angosta, aproximadamente 500 píxeles.

La vista angosta reveló un defecto: el menú comenzaba abierto y se superponía a los controles de contenido. Corregido en Layout: cerrado inicialmente en móvil, visible por CSS en escritorio, cierre al seleccionar una sección, botón de cierre, fondo y tecla Escape. Se verificó en navegador el cierre automático y la importación después de la corrección. Dos pruebas nuevas cubren los controles del menú.

Validación posterior: 50 pruebas de cliente aprobadas con `--maxWorkers=1 --testTimeout=15000`; ESLint sin observaciones y compilación de producción correcta. Entrada actual: 264,39 kB (88,82 kB gzip), aproximadamente 78 % menor que el punto de partida. Una ejecución concurrente agotó el límite original de 5 segundos de la prueba de navegación; la repetición con margen suficiente pasó completa.

Evidencia visual local: `C:/Users/Usuario/.codex/visualizations/2026/10/26/01a178ea-851f-7d61-aee0-d250cd3ed11d/importacion-escritorio.png` y `importacion-verificada.png` en la misma carpeta. El servidor de prueba quedó detenido al finalizar y la base ficticia se conservó en su carpeta temporal para revisión.
