# Biblioteca de modelos de escritos — 29/10/2026

Implementada y activada localmente dentro de Escritos y versiones. La biblioteca guarda textos del estudio clasificados por jurisdicción, fuero y tipo de escrito, con título, autor y fecha. Se filtra por esos datos. Los titulares independientes tienen su propia biblioteca.

Abogados y administradores pueden incorporar modelos. Los operadores pueden consultarlos y preparar escritos nuevos. El servidor deriva el ámbito desde un expediente autorizado, nunca desde un identificador de estudio suministrado en el formulario; vuelve a comprobar cuenta activa, rol y acceso dentro de la transacción de creación. Los modelos de otro estudio o de otro titular independiente no se comparten. Un superadministrador accede a la biblioteca correspondiente al expediente que consulta.

## Uso

Abrir un expediente → Escritos y versiones → Biblioteca de modelos del estudio. Para incorporar uno se completan título, jurisdicción, fuero, tipo y texto. Los límites son 200 caracteres para el título, 120 para cada clasificación y 20.000 para el texto.

Se admiten campos con nombres de letras latinas, números y guion bajo, comenzando con letra o guion bajo: por ejemplo `{{cliente}}`, `{{expediente}}` y `{{objeto}}`. Al preparar un escrito se pide cada valor distinto, se muestra el texto completado y se abre un borrador nuevo. Los valores se tratan como texto, sin interpretar HTML. El borrador debe revisarse y guardarse explícitamente; también puede cancelarse. La expansión no puede superar el límite del editor.

Los modelos guardados se conservan sin sobrescritura. Para corregir un modelo se incorpora una copia nueva. Esta primera versión no incluye edición, archivo o borrado de modelos ni importación de DOCX. El modelo no recibe aprobación jurídica automática y no se generan textos con IA. Las versiones, Word y revisiones del escrito generado siguen el circuito existente.

El UUID conserva los reintentos: una solicitud idéntica devuelve el modelo existente y una reutilización con otros datos devuelve conflicto. El borrador de incorporación se conserva al fallar. Una lectura anterior no reemplaza la lista que acaba de actualizar una creación confirmada.

## Persistencia y migración

La tabla WritingTemplate conserva ámbito, título, contenido, clasificación, autor, fecha y solicitud. GET/POST `/api/writings/templates/case/:caseId` consultan o crean modelos dentro del ámbito derivado del expediente.

Aplicada `20261028060000_writing_templates` tras respaldo consistente, ensayo en copia y comparación de todos los campos y registros anteriores. Respaldo: `server/scratch/fees-migration-1793242554394/before.db`; ensayo `trial.db` en la misma carpeta. Se conservaron también las cuentas, tarea y escrito de demostración existentes. Prisma fue generado y el servidor de desarrollo reiniciado.

Para otra instalación con esta única migración pendiente: desde `server`, ejecutar `node scripts/apply-fees-migration.mjs 20261028060000_writing_templates`, generar Prisma y reiniciar el servidor.

## Verificaciones

- Servidor: 351 pruebas en 18 archivos, todas aprobadas.
- Interfaz: 95 pruebas en 13 archivos, todas aprobadas.
- Total: 446 pruebas. Las nuevas comprobaciones cubren aislamiento, rol, cuenta sin sesión, ámbito forjado, reintentos, reconexión, copia con parámetros y texto literal sin ejecución de HTML.
- ESLint completo correcto. Compilación de producción correcta en carpeta de prueba, conservando el dist anterior. Persiste la advertencia conocida del fragmento de Excel cargado bajo demanda.
- Navegador, compilación de producción y SQLite aislados: crear un modelo ficticio con dos campos, completar valores, abrir un borrador, agregar un ajuste manual y guardar la versión 1. Se comprobó el filtro por Córdoba.
- Consulta posterior de SQLite: el modelo conserva `{{cliente}}` y `{{objeto}}`; el escrito contiene los valores completados y el ajuste manual, sin sobrescribir el modelo. La instancia aislada quedó detenida.

[Evidencia de la biblioteca](<C:/Users/Usuario/.codex/visualizations/2026/10/26/01a178ea-851f-7d61-aee0-d250cd3ed11d/biblioteca-modelos-verificada.png>).

En la base habitual se incorporó además un único modelo claramente marcado **Modelo DEMO · Escrito con campos**, dentro de la biblioteca del expediente de demostración ya creado. Está disponible para las cuentas de operador y abogada de demostración. No contiene un escrito jurídico de uso profesional.

Pendientes: validación de uso por Ema, revisión técnica externa y las ampliaciones de modelos indicadas en el alcance. No se hizo publicación.

## Corrección de campos especiales — 29/10/2026

Los parámetros ahora consultan únicamente valores ingresados por el usuario. Nombres válidos como `constructor`, `toString`, `__proto__` y `hasOwnProperty` ya no toman propiedades heredadas de JavaScript, que podían provocar un error al preparar el escrito. Se conserva la sustitución literal y la obligación de completar cada campo.

Verificación de esta corrección: las 2 pruebas de WritingTemplateLibrary y ESLint completo pasaron. La nueva regresión comprueba campos inicialmente vacíos, nombres especiales, parámetros repetidos, valores con `$&` y llaves literales, conservación del modelo y limpieza al volver a prepararlo. No requirió cambios de base ni migración. Los totales anteriores corresponden a la validación completa de la entrega original; no se volvió a ejecutar toda la suite en esta corrección puntual.

## Recuperación de la biblioteca — 29/10/2026

La carga muestra su estado y diferencia una biblioteca vacía de un fallo de conexión. El botón «Reintentar carga de modelos» conserva el borrador de incorporación y los parámetros ya completados. El error de carga es independiente del error al guardar. Las respuestas incompletas se rechazan antes de presentar modelos que podrían romper la preparación; una búsqueda sin coincidencias muestra un mensaje específico.

Al cambiar de expediente se reinicia la biblioteca, incluidos borradores y selección, y las respuestas tardías del expediente anterior se descartan. Durante una carga se impide guardar un modelo, y durante el guardado se impide cerrar la biblioteca, evitando que una nueva lectura reemplace una creación en curso. No cambia la API ni requiere migración.

Las 5 pruebas específicas pasaron: incluyen fallo y reintento con borrador conservado, respuesta incompleta, recuperación con parámetros conservados, filtro sin coincidencias y cambio de expediente con respuesta tardía, además de las comprobaciones de copia literal y nombres especiales anteriores.

ESLint completo y compilación de producción correctos. Salida de prueba: `server/scratch/templates-recovery-client-build`, sin sobrescribir `client/dist`. Persiste la advertencia conocida de tamaño del módulo Excel. No se repitió la suite completa ni el circuito en navegador para esta corrección.

## Copia para corrección — 29/10/2026

Abogados y administradores disponen de «Copiar para corregir» en cada modelo. Copia título, clasificación y texto con sus parámetros al formulario de incorporación y enfoca el título para facilitar la diferenciación. No guarda automáticamente ni modifica el original; al guardar utiliza la creación existente con una solicitud nueva. No agrega una relación de versiones entre modelos.

Si existe un borrador, la copia se bloquea con un mensaje. El usuario puede guardarlo o usar «Descartar borrador del modelo», que pide confirmación antes de eliminar los cambios locales. Los operadores conservan únicamente la preparación de escritos desde modelos, sin acciones de incorporación o copia para corrección.

Validación: 7 pruebas específicas aprobadas. Las nuevas comprueban conservación del modelo original, copia sin guardado automático, retención del borrador y la misma solicitud después de un fallo de guardado, protección contra sobrescritura y descarte cancelado/confirmado. No requiere migración ni cambios en la API. No se repitió la suite completa ni la verificación en navegador en esta ampliación.

## Modelo desde un escrito guardado — 29/10/2026

Al seleccionar una versión de un escrito, abogados y administradores disponen de «Crear modelo desde versión N guardada» junto a la biblioteca. Abre el formulario con el título y texto exactos de esa versión, también si es histórica. Jurisdicción, fuero y tipo quedan vacíos para completarlos antes de guardar. La interfaz recuerda reemplazar los datos particulares del expediente por parámetros, dado que el modelo será reutilizable en la biblioteca del estudio.

La acción no guarda automáticamente, no modifica el escrito y no transporta aprobaciones ni historial al modelo. Tampoco crea una relación de procedencia persistente: es una copia manual para adaptar. Se bloquea durante la edición de un escrito y no se ofrece durante la carga o el fallo de consulta de la versión. Un borrador de modelo existente se conserva y se informa cómo continuar. El operador no dispone de esta acción.

Validación: 21 pruebas aprobadas entre escritos y biblioteca, incluido el inicio sin selección, la copia histórica exacta, protección del borrador, permisos del operador y carga pendiente de otra versión. ESLint completo aprobado. Se aplicó la revisión de componentes de la skill React Best Practices, conservando eventos explícitos para la copia y el aislamiento por expediente. No requiere migración. No se repitió la suite completa ni la prueba en navegador en esta ampliación.

## Verificación conjunta — 29/10/2026

Pasaron las suites completas: 351 pruebas del servidor en 18 archivos y 103 del cliente en 13 archivos (454 en total). En el navegador local, con la abogada ficticia, se comprobó la copia del escrito de demostración al formulario de modelo y el rechazo de otra copia mientras existe ese borrador. No se guardaron modelos adicionales ni se modificaron escritos o tareas. Evidencia: `modelo-desde-escrito-verificado.png`, en la carpeta de evidencias de esta sesión.

Después de esa ejecución se sustituyó la confirmación nativa de descarte por dos acciones dentro del formulario: «Seguir editando el modelo» y «Confirmar descarte del modelo». Las 7 pruebas de biblioteca se repitieron y pasaron sobre este ajuste; la suite completa anterior no se repitió. La pestaña de prueba dejó de estar disponible al retomar la sesión, por lo que este último ajuste no tiene una nueva comprobación en navegador.

ESLint y compilación final aprobados sobre el ajuste de descarte. Salida: server/scratch/library-final-client-build; se conserva client/dist. Sigue la advertencia conocida del módulo Excel de 500 kB.
