# Próxima acción y advertencias de coincidencias

## Próxima acción por expediente

El detalle incorpora un bloque “Próxima acción”, con descripción, responsable y fecha. También se muestra en la lista de expedientes, bajo el consultante. Si está atrasada se distingue visualmente; si falta definirla, la lista ofrece abrir el expediente para hacerlo.

Se reutiliza `Task`: la acción es una tarea simple del expediente y aparece en el cronograma. Su responsable puede cumplirla desde el detalle o el calendario. Una vez cumplida se puede definir el siguiente paso, creando una tarea nueva y conservando la anterior y su historial. Las tareas con revisor mantienen su circuito propio.

Los administradores pueden asignar responsables activos del ámbito del expediente. Los demás integrantes pueden definir una acción a su cargo; para editar una acción existente deben ser su responsable o creador. El servidor comprueba de nuevo usuario, estudio, estado y versión dentro de la transacción. Las ediciones simultáneas devuelven un conflicto y conservan el formulario para revisar los datos.

La relación se guarda en `Case.nextActionId`, separada del JSON de admisión: editar datos del consultante no sobrescribe la próxima acción. No se inventan próximas acciones para los expedientes anteriores; el profesional define su siguiente paso.

## Posibles duplicados y cruces

El formulario comprueba coincidencias al ingresar nombre, DNI/CUIT, número judicial de expediente o contraparte, y repite la comprobación antes de guardar. Presenta el motivo de la coincidencia y un enlace al caso existente que abre otra pestaña.

Se detectan coincidencias normalizadas exactas: separadores de DNI/CUIT, mayúsculas, acentos, espacios y puntuación. También se advierte si un consultante figura como contraparte o viceversa en otro expediente. Esto señala información para revisar; no determina por sí solo que exista un conflicto profesional o un duplicado.

Cuando existen coincidencias, el usuario puede revisarlas y elegir guardar de todos modos si corresponde a otro caso legítimo. Si falla la consulta, se informa que no fue posible verificar y se ofrece reintentar o continuar explícitamente sin esa comprobación. Se descartan respuestas antiguas cuando cambian los datos del formulario. Los formularios conservan su información ante un error.

La búsqueda usa exclusivamente expedientes accesibles del mismo estudio o titular independiente. La edición excluye el propio expediente. Para el superadministrador, editar un caso limita la comprobación al ámbito de ese caso; un alta independiente se comprueba dentro de su propio ámbito. El cliente no elige un estudio arbitrario para esta búsqueda.

Alcance: revisión durante creación y edición manual. La comparación se hace sobre los datos de consultantes y contrapartes registrados en expedientes existentes; no implementa una ficha única de clientes ni cambios en el importador. No hay comparación difusa de nombres ni equivalencia automática entre un DNI y un CUIT con distinta cantidad de dígitos. Se muestran hasta 20 resultados con su total. La búsqueda normaliza el conjunto del estudio en el servidor; un volumen de expedientes considerable requerirá índices específicos.

## Migración y respaldo

Migración: `server/prisma/migrations/20261106010000_case_next_action/migration.sql`. Agrega la relación opcional y única entre un caso y su tarea principal. En SQLite se copia la tabla de casos conservando los datos y se recrean sus índices.

Antes de aplicarla se guardó una copia consistente mediante `VACUUM INTO`, en `server/scratch/before-next-action-*.db`. La comparación posterior de las 24 tablas de datos contra ese respaldo confirmó que los datos anteriores se conservaron y que `PRAGMA foreign_key_check` no encontró referencias inválidas. La migración ya está aplicada en esta instalación.

En otra instalación: respaldar SQLite, ejecutar `npx prisma migrate deploy` y `npx prisma generate` desde `server`, y reiniciar el backend.

## Archivos de esta mejora

- `server/src/controllers/caseWorkflowController.js`: acciones, participantes, concurrencia y búsqueda de coincidencias.
- `server/src/routes/caseRoutes.js`: endpoints protegidos del expediente.
- `server/src/controllers/caseController.js`: incorpora la próxima acción a la lista.
- `server/prisma/schema.prisma` y la migración indicada.
- `client/src/components/NextActionPanel.jsx`: consulta, definición, edición y cumplimiento.
- `client/src/components/CaseDuplicateCheck.jsx`, `client/src/utils/caseDuplicates.js`: consulta con cancelación, advertencias y revisión antes de guardar.
- `client/src/pages/CreateCase.jsx`, `ViewCase.jsx`, `CaseList.jsx`, `client/src/config/api.js`: integración.
- `server/src/tests/caseWorkflow.integration.test.js`: migración y flujos con SQLite real; `tasks.integration.test.js`: adapta el orden del fixture a la nueva relación.
- `client/src/tests/NextActionPanel.test.jsx`, `CreateCaseActivity.test.jsx`: formularios, concurrencia y revisión de coincidencias; `ViewCaseLoading.test.jsx`: aísla el nuevo panel, como los demás paneles, al probar la recuperación de la consulta principal.

## Validación

- Servidor: 20 archivos, 372 pruebas aprobadas con Node 24.22.1 incluido en Codex, un trabajador y las comprobaciones completas del proyecto.
- Cliente: 25 archivos, 150 pruebas aprobadas con un trabajador.
- ESLint y compilación de producción aprobados. La compilación mantiene el aviso de tamaño del paquete de SheetJS.
- Revisión en la app: bloque y formulario de próxima acción en el detalle; advertencia por coincidencia con un consultante ya existente durante un alta, sin guardar otro expediente ni crear tareas ficticias en la base del estudio.
