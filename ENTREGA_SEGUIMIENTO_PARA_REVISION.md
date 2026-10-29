# Entrega: documentación pendiente y seguimiento del cliente

19/10/2026. Implementación y activación local completadas. Pendientes: validación de Ema y revisión técnica de Bartolito; este material no acredita envío ni aprobación.

Base de trabajo: rama `feature/tasks-review`, HEAD `ec0e4c8`, con los cambios locales anteriores conservados y sin commit, push ni despliegue en esta entrega. La revisión debe incluir los archivos nuevos además del diff de los archivos seguidos por Git.

## Resultado funcional

Cada expediente permite registrar documentación pendiente, compromisos del cliente y motivos de bloqueo con responsable, fecha, detalle e historial. El bloqueo se gestiona por separado del estado procesal.

- Documentación: pendiente → recibido → verificado; el revisor también puede pedir corrección. Recibir exige seleccionar un archivo privado existente del mismo expediente y comprobar su contenido físico.
- Compromisos y bloqueos: pendiente → cumplido / resuelto, con observaciones obligatorias. Se pueden reabrir dejando motivo.
- El responsable puede editar y trabajar sus seguimientos. Abogados y administradores con acceso al expediente pueden intervenir y verificar documentos. Los operadores no verifican ni piden corrección. Reabrir un documento verificado exige rol de revisión.
- Mi Jornada muestra seguimientos abiertos a cargo del usuario y una bandeja de documentos recibidos para los roles de revisión. Los verificados y cumplidos salen de los pendientes y conservan su historial en el expediente.
- Los recordatorios son borradores editables para copiar a WhatsApp. Se ofrecen para documentación pendiente o con corrección y para compromisos abiertos; un documento recibido deja de generar un pedido al cliente. No se agregó envío ni una integración de mensajería.
- Un archivo actualmente vinculado no se puede borrar. Reabrir desvincula el archivo y registra la acción; el historial conserva la identidad anterior.
- Ediciones y acciones comprueban la versión `updatedAt` y se guardan junto con el evento en una transacción. Una versión desactualizada devuelve 409.

La verificación documental es una acción del usuario; no representa una revisión jurídica automática ni una evaluación del contenido por IA.

## Archivos y API

- [Esquema](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/prisma/schema.prisma>): modelos FollowUp y FollowUpEvent, relaciones con expediente, usuarios y archivo.
- [Controlador](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/followUpController.js>) y [rutas](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/routes/followUpRoutes.js>).
- [Panel de seguimiento](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/components/FollowUpPanel.jsx>), integrado en ViewCase y MyDay.
- [Panel de archivos](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/components/CaseFilePanel.jsx>): comunica las cargas al expediente para poder seleccionarlas sin recargar y conserva las actualizaciones concurrentes de la lista.
- [Descarga compartida](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/utils/caseFiles.js>) y protección de borrado en caseFileController.
- [Pruebas](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/tests/followUps.integration.test.js>).

Rutas autenticadas bajo `/api/follow-ups`: GET `/mine`, GET `/to-review`, GET y POST `/case/:caseId`, PATCH `/:id`, POST `/:id/actions`. Todas conservan el aislamiento de estudios, titulares independientes y expedientes eliminados. Si faltan las tablas nuevas, se informa 503 sin bloquear el resto de la aplicación.

## Base local y migraciones

Se encontró la migración inicial restaurada y el registro previo de la migración de tareas, pero faltaban cuatro índices de tareas. Se agregó `20261018000000_reconcile_task_indexes` con operaciones idempotentes; `20261019000000_client_followups` crea las tablas e índices nuevos en una transacción.

Antes de activar se creó una copia consistente con `VACUUM INTO`, se ensayaron las migraciones en otra copia y Prisma comprobó que el esquema resultante coincidiera con el esperado. Se comparó una huella de todos los registros de las 12 tablas anteriores, sin imprimir datos. La comparación se repitió después de aplicar a la base habitual y resultó idéntica.

Respaldo usado para la activación: [before-followups-2026-10-20T02-51-46.092Z-4f14a26d.db](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/prisma/backups/before-followups-2026-10-20T02-51-46.092Z-4f14a26d.db>). Las fechas del nombre están en UTC. El respaldo está excluido de Git; los documentos físicos siguen en su almacenamiento privado habitual.

[upgrade-followups.mjs](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/scripts/upgrade-followups.mjs>) permite reproducir la comprobación desde server:

```powershell
node scripts/upgrade-followups.mjs
# Con --apply ensaya, respalda y después aplica a la base local.
```

Una instalación desde una base vacía también aplicó las cuatro migraciones y produjo un diff de esquema vacío. El archivo SQLite debe existir antes de ejecutar migrate deploy con este Prisma; en la prueba se creó vacío.

Se conserva una diferencia histórica: el SQL inicial restaurado tiene SHA-256 `e310407b9865d44875aaf90f5690f8e8bb556220bc33574608de3f85fa0e8e1d`, mientras su registro previo indica `4016c63432f8e1e02f605c3feaa11004b14c7edc8455766905fcec30248f3178`. No se reescribió ese registro ni se usó reset. Bartolito debe revisar su procedencia antes de normalizar el historial de desarrollo.

## Verificación

La suite completa pasó: 109 pruebas en 9 archivos. Las 25 nuevas usan SQLite, archivos y solicitudes HTTP temporales; comprueban transiciones, historial, asignación, concurrencia mediante versiones, permisos, aislamiento, archivos ausentes/ajenos/anteriores, protección de borrado, bandejas, campos inválidos y conservación de datos durante la reparación de índices y la migración. Parte de la suite antigua tiene marcadores sin aserciones reales.

```powershell
# Desde server
npm test -- --pool=threads --maxWorkers=1 src/tests/followUps.integration.test.js
```

La compilación del cliente pasó. Persisten los avisos previos de Browserslist desactualizado y tamaño del paquete; no se actualizaron dependencias para resolverlos.

Navegador con base y cuentas ficticias: el operador creó un requisito con responsable y fecha, lo vio en Mi Jornada, preparó el borrador y vinculó el PDF. Tras cambiar de sesión, la abogada lo encontró en documentos para verificar, lo verificó y desapareció de la bandeja. El estado verificado y sus tres eventos persistieron al volver al expediente. También se registró un bloqueo con su próxima acción, conservando el expediente abierto.

Evidencia: [Mi Jornada con requisito y borrador](<C:/Users/Usuario/.codex/visualizations/2026/10/16/01a145ee-0749-7b13-bd29-11e8c95d6cfe/seguimiento-mi-jornada.png>) y [expediente con documento verificado y bloqueo](<C:/Users/Usuario/.codex/visualizations/2026/10/16/01a145ee-0749-7b13-bd29-11e8c95d6cfe/seguimiento-expediente-verificado.png>). La consola de la última sesión no mostró errores ni advertencias.

## Revisión y próximo incremento

Bartolito debe revisar permisos por rol y estudio, transacciones, concurrencia, integridad del archivo vinculado, migraciones y diferencia histórica del checksum. Ema valida si los campos y el recorrido reflejan el trabajo del estudio. No se atribuye a ninguno una revisión que todavía no ocurrió.

Después de validar esta entrega y corregir observaciones, sigue honorarios y cobranzas: acuerdo, cuotas, pagos parciales, saldo y avisos coherentes con lo efectivamente adeudado. SAIJ y Poder Judicial de Córdoba siguen previstos en la etapa de fuentes jurídicas; este incremento no realiza búsquedas de IA.

## Primera pasada del circuito integral — 29/10/2026

Instancia aislada de producción en localhost:4317, base temporal lyp-browser-UpIAzt/test.db. Se agregó --full-flow al verificador para crear estudio, abogada y operador ficticios, sin modificar la base habitual. Se verificaron ingreso como abogada, creación de tarea delegada con escrito obligatorio y creación de requisito documental asignado al operador. El guardado produjo historial y conservó responsable/revisor.

Se detuvo la pasada al detectar una ambigüedad horaria: un control con 18:00 se mostraba como 06:00. El formato regional de 12 horas no presentaba claramente el período; además, la conversión de formularios dependía de la zona del equipo. Se corrigió el panel para interpretar y editar en Córdoba (-03:00) y mostrar en 24 horas. Prueba de ida y vuelta, cruce de día y valores vacíos aprobada; ESLint aprobado. La corrección no modifica registros existentes.

Pendiente de esta pasada: volver a comprobar el horario corregido en navegador y continuar recepción/verificación documental, ejecución y revisión del escrito con ambos roles, cobranzas y retiro de pendientes. Esta pasada no acredita aprobación integral. La base temporal conserva la evidencia de la tarea y del requisito creados; el servidor aislado fue detenido.
