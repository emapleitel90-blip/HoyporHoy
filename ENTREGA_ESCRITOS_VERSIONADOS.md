# Escritos manuales con versiones — 28/10/2026

Primera parte de la entrega 3 implementada y activada localmente: escritos de texto plano guardados por expediente, versiones independientes, comparación y exportación a Word de una versión seleccionada. Verificadas 441 pruebas completas, compilación y circuito en navegador. La vinculación con entregas de tareas y la aprobación de una versión concreta se implementaron en la ampliación posterior, documentada al final. Esta entrega no genera contenido jurídico con IA ni presenta documentos ante organismos.

## Uso y alcance

En el expediente, el panel Escritos y versiones permite crear un escrito con título, contenido y nota inicial opcional. Una nueva versión requiere un motivo. Cada versión conserva título, texto, motivo, autor y fecha; no hay rutas para editarla ni borrarla. El listado carga solo metadatos y el texto se consulta al seleccionar una versión.

Se puede iniciar una versión nueva desde la seleccionada, incluida una anterior. Si el contenido histórico difiere del último, guardarlo con motivo crea otra versión; el historial original permanece intacto. Un cambio solo de motivo, sin modificar título ni texto respecto del último contenido guardado, se rechaza.

La comparación muestra dos versiones guardadas completas en paralelo, o una debajo de la otra en pantallas angostas. Es una comparación visual de textos, sin cálculo automático de diferencias. La descarga siempre corresponde a una versión guardada, aunque el formulario contenga cambios sin guardar.

Límites: título de hasta 200 caracteres en una línea, contenido de hasta 20.000 y motivo de hasta 2.000. Se conserva la sangría y los saltos de línea del texto plano; CRLF y CR se normalizan a LF. No se interpreta HTML ni se importan formatos de Word o PDF al editor.

## Permisos e integridad

Operadores, abogados y administradores con acceso al expediente pueden crear y versionar escritos de trabajo. Guardarlos o exportarlos no implica aprobación profesional ni presentación judicial. Las aprobaciones anteriores de tareas no se atribuyen a estos escritos.

Se aplica el alcance habitual por estudio o por titular independiente, excluyendo expedientes eliminados. Antes de guardar se relee dentro de la transacción la cuenta activa, su rol y su estudio; autor y fecha proceden del servidor. Un cambio simultáneo de versión devuelve un conflicto y no sobrescribe el trabajo de otra persona.

Cada solicitud tiene un UUID. Reintentar el mismo identificador y los mismos datos devuelve la versión ya guardada, incluso si luego se guardaron otras; cambiar sus datos se rechaza. El formulario conserva el borrador, la versión de origen y la solicitud al fallar. Actualizar no reescribe ese borrador y una lectura anterior no reemplaza el resultado de un guardado.

La creación del escrito, su primera versión y los incrementos posteriores se confirman mediante transacciones y restricciones únicas. Las relaciones con el expediente y entre escrito y versiones impiden borrar esos registros referenciados por una eliminación directa. El expediente conserva su eliminación lógica habitual.

## Exportación Word

El Word se genera exclusivamente desde el título y texto de la versión elegida; no usa las plantillas anteriores de cédula ni los datos actuales del expediente para reconstruir un texto histórico. La salida usa A4, Times New Roman, párrafos y tabulaciones, con número de versión y página al pie. Es texto editable y no una representación firmada ni un archivo presentado.

La descarga requiere sesión y acceso al expediente, con `private, no-store`, `nosniff` y un nombre seguro. Se rechazan caracteres incompatibles con XML en el texto ingresado; si un nombre histórico de usuario los contiene, solo se limpian del metadato del Word. El nombre de autor registrado en la versión no se modifica.

## API

- GET/POST `/api/writings/case/:caseId`: listado o creación.
- GET `/api/writings/:id`: última versión y metadatos del historial.
- GET `/api/writings/:id/versions/:number`: una versión histórica y metadatos.
- POST `/api/writings/:id/versions`: nueva versión con `expectedVersion`, título, contenido, motivo y UUID.
- GET `/api/writings/:id/versions/:number/word`: descarga del Word seleccionado.

Las consultas de detalle y los guardados devuelven `selectedVersion` con texto y `versions` con metadatos. En un reintento, `selectedVersion` identifica la versión creada por esa solicitud; `currentVersion` sigue indicando la última.

## Migración y datos locales

Aplicada `20261028040000_writings`, que agrega Writing y WritingVersion. Se ensayó primero en una copia consistente y se compararon todos los campos y registros de las 20 tablas anteriores. La base habitual conservó sus datos y quedó sin escritos ficticios.

Respaldo: `server/scratch/fees-migration-1793233721763/before.db`. Ensayo: `trial.db` en la misma carpeta. Para otra instalación con esta única migración pendiente, el helper existente admite `node scripts/apply-fees-migration.mjs 20261028040000_writings` desde `server`; generar Prisma y reiniciar el servidor con el código nuevo.

## Verificación

- Servidor: 348 pruebas en 18 archivos, todas aprobadas con Node 24.22.1, ejecutor habitual `forks` y un trabajador (150,47 segundos).
- Cliente: 93 pruebas en 11 archivos, todas aprobadas con Node 24.22.1 y un trabajador (54,55 segundos).
- Total: 441 pruebas. Esta parte agrega 66 de servidor y 15 de interfaz sobre las 360 anteriores. Se verifican permisos, aislamiento, datos inválidos, reintentos, concurrencia, conservación, migración, Word histórico y recuperación del contexto del expediente.
- ESLint completo sin errores. Compilación de producción final correcta (42,64 segundos), en una carpeta temporal para conservar el `client/dist` anterior. Persiste la advertencia previa del fragmento de Excel de aproximadamente 500 kB, cargado bajo demanda.
- Prisma generado; las nueve migraciones figuran aplicadas. La migración de escritos conservó los registros previos según el ensayo y la comparación documentados arriba.

Las ejecuciones finales no modificaron tiempos de espera ni omitieron pruebas. Un intento previo del servidor coincidió con compilación y pruebas de interfaz: agotó la preparación de la suite de registro y se detuvo para repetir los controles sin esas tareas pesadas en paralelo. No se cuenta ese intento como aprobado. Las ejecuciones secuenciales completas anteriores terminaron con código de salida 0.

### Circuito en navegador

Se utilizó una compilación de producción con un expediente y una abogada ficticios, SQLite y almacenamiento separados de la base habitual. Reproducción desde la raíz: `node server/scripts/verify-client-browser.mjs --writings`.

1. Crear un escrito con texto original, salto de línea, tabulación y nota inicial; respuesta 201 y versión 1 visible.
2. Guardar una aclaración como versión 2, con motivo; la comparación muestra el original y la aclaración en sus versiones correspondientes.
3. Consultar la versión 1 después del cambio; su texto permanece original. La ruta Word histórica responde 200.
4. Crear desde la versión 1 una versión 3 con motivo de restauración, sin cambiar el texto histórico; la versión 2 permanece disponible.
5. Descargar el Word de la versión 3 desde la pantalla. Se obtuvo un DOCX de 9600 bytes: todos sus XML y relaciones se analizaron correctamente; conserva texto original y tabulación, omite la aclaración de la versión 2 y lleva versión 3 al pie.
6. Recargar la app y volver a abrir el escrito; siguen las tres versiones. La comparación 2 contra 3 muestra la aclaración solo en la versión 2.

Consulta final de SQLite: un escrito, versión actual 3, historial 1/2/3, contenido de la versión 3 igual al de la 1, y motivo y autor de cada versión conservados. No se crearon tareas ni aprobaciones como consecuencia de guardar escritos. La instancia ficticia quedó detenida.

Los dos errores de consola observados corresponden al arranque con la sesión de una instancia ficticia anterior, cuya firma dejó de ser válida. Después de cerrar esa sesión e ingresar con la nueva cuenta ficticia no hubo errores del circuito de escritos.

[Evidencia de restauración y comparación](<C:/Users/Usuario/.codex/visualizations/2026/10/26/01a178ea-851f-7d61-aee0-d250cd3ed11d/escritos-versiones-verificados.png>).

### Corrección de navegación incluida

El botón Reintentar del detalle del expediente ahora efectúa otra consulta. Al cambiar de expediente se limpia el contexto anterior y se ignoran sus respuestas o errores demorados; el contenido de un expediente distinto no se muestra bajo la URL nueva. Tres pruebas específicas verifican recuperación y las dos carreras. El panel de escritos también limpia la consulta anterior al abrir un escrito nuevo, conserva borradores ante errores y evita que una consulta vieja sustituya un guardado confirmado.

## Continuación

Ampliación posterior: ya se implementó la [revisión de entregas sobre versiones concretas](ENTREGA_REVISION_VERSIONES.md). El estado y las verificaciones de esa ampliación se registran por separado.

La vinculación de entregas, correcciones y aprobaciones con una versión exacta ya está implementada y verificada en navegador. Sigue pendiente la biblioteca parametrizada de modelos. También siguen pendientes la validación de uso por Ema y la revisión técnica externa de Bartolito.

No se hizo publicación ni se enviaron documentos o mensajes a terceros.
