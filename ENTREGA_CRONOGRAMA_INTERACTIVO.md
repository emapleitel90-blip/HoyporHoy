# Cronograma jurídico en Mi jornada

Integrado en `/mi-jornada`, debajo del encabezado y antes de “Mis tareas y revisiones”.

El cronograma es la única agenda de fechas en la jornada: se retiraron los contadores y listados inferiores de Vencidos, Hoy y Próximos 7 días. Las actividades permanecen en la base y se consultan desde el cronograma.

## Uso

- Franja horizontal de 21 días, desplazable con mouse o dedo. Las flechas avanzan o retroceden siete días; el selector de fecha permite saltar a cualquier día y “Hoy” vuelve a la fecha argentina actual.
- Altura de las barras: cantidad real de actividades. Color: mayor prioridad pendiente. La selección y el día actual tienen marcas independientes de la prioridad.
- Al elegir una fecha se ven título, tipo, estado, prioridad, responsable, descripción y expediente vinculado cuando corresponda.
- “Agregar tarea” guarda una tarea pendiente en SQLite, con fecha, hora argentina opcional, descripción y prioridad. Puede tener expediente o ser personal. Los administradores pueden asignarla a integrantes activos del ámbito permitido.
- Las tareas simples se completan y reabren desde el cronograma por su responsable. Se pueden editar y reprogramar mientras estén abiertas; se detectan ediciones simultáneas mediante `updatedAt`.
- Las tareas que ya tienen revisor siguen su circuito original: no se aprueban ni se completa un escrito desde el cronograma. Se permite editar/reprogramar antes de su entrega, por el creador o responsable.
- “Nuevo plazo” reutiliza `DeadlinePanel` y los endpoints de vencimientos existentes; precarga la fecha elegida y exige un expediente. Los plazos conservan su modelo y estado propios.
- Las audiencias registradas como vencimiento aparecen con su fecha y pueden gestionarse como plazo. La próxima audiencia cargada en el formulario del expediente también se consulta; su edición se realiza desde ese expediente y no se convierte automáticamente en otra actividad.
- Cada mutación confirmada refresca las actividades y las secciones afectadas mediante el evento de actualización existente. La consulta también se actualiza al recuperar el foco.

Las tareas simples se reúnen en el cronograma; “Mis tareas y revisiones” conserva las tareas del circuito con revisor. Las tareas sin fecha no se representan en la franja hasta que tengan una fecha asignada.

## Persistencia y permisos

Se amplió `Task` en lugar de crear otro modelo: `caseId` y `reviewerId` admiten nulos para las tareas simples, y se incorporaron `priority`, `studioId` e índice de fecha. El estudio se deriva en el servidor del usuario o expediente; nunca del cuerpo enviado por el cliente. Los datos anteriores conservan sus referencias, estados e historial.

Migración: `server/prisma/migrations/20261106000000_agenda_tasks/migration.sql`. En SQLite se reconstruye `Task` copiando todos los registros y recreando sus índices. La prueba de migración conserva una tarea anterior aprobada y su evento. Se creó un respaldo consistente con `VACUUM INTO` en `server/scratch/before-agenda-*.db` antes de aplicar la migración a la base local.

Para otra instalación, respaldar la base y ejecutar desde `server`:

```sh
npx prisma migrate deploy
npx prisma generate
```

Reiniciar el servidor después. En esta copia local ya se aplicó la migración y se regeneró Prisma.

## Archivos del cronograma

- `client/src/components/LegalTimeline.jsx`: navegación, barras, actividades y formularios.
- `client/src/components/AgendaDialog.jsx`: diálogo adaptable, teclado y restauración del foco.
- `client/src/utils/agendaDates.js`: fecha civil y hora de Argentina.
- `client/src/pages/MyDay.jsx`: integración en la jornada.
- `client/src/components/DeadlinePanel.jsx`: precarga opcional de fecha y aviso tras guardar.
- `client/src/components/TaskPanel.jsx`: actualización de tareas ante cambios confirmados.
- `client/src/config/api.js`, `client/src/index.css`: rutas y estilo de la franja.
- `server/src/controllers/agendaController.js`, `server/src/routes/agendaRoutes.js`, `server/src/index.js`: consulta unificada, opciones, creación y modificación.
- `server/src/controllers/taskController.js`: preserva el circuito de tareas con revisor y evita transiciones de revisión para tareas simples.
- `server/prisma/schema.prisma` y la migración indicada.
- `client/src/tests/LegalTimeline.test.jsx`, `server/src/tests/agenda.integration.test.js`, `server/src/tests/tasks.integration.test.js`: pruebas de interacción, persistencia, permisos y migración.
- `server/src/tests/writingMigration.test.js`: una conexión SQLite en el fixture para que la desactivación y reactivación temporal de claves foráneas afecten a la misma conexión; conserva todas las aserciones de integridad.

## Límites explícitos

No se calcularon días hábiles judiciales, feriados ni plazos legales. El cronograma muestra las fechas registradas; no sustituye la validación profesional del vencimiento. No se agregaron notificaciones push, correo, SMS ni sincronización con calendarios externos. No requiere infraestructura adicional: usa el backend y SQLite existentes.

## Verificación

Validación final: 365 pruebas del servidor y 146 del cliente aprobadas (511 en total). ESLint y compilación de producción aprobados. Las siete pruebas del cronograma se repitieron tras el ajuste final de textos y aprobaron. Revisión visual en escritorio (1440 px) y móvil (390 px), con temas oscuro y claro. En móvil, ancho de contenido y viewport coinciden (375 px útiles), sin desborde horizontal de la página; la fecha elegida permanece visible al cambiar el ancho. La recarga final no registró nuevos errores de consola y el endpoint local respondió HTTP 200.

La ejecución completa del servidor se verificó con Node 24.22.1, ya incluido en Codex, ejecutor habitual y un trabajador, sin cambiar Node global. Bajo Node 24.15.0, `forks` cerró un trabajador inesperadamente y `threads` tampoco finalizó; esas ejecuciones incompletas no se consideran aprobadas. En Node 24.22.1 apareció una inconsistencia de la prueba de migración de escritos con `PRAGMA foreign_keys`, que es local a cada conexión. Se fijó el fixture a una conexión y la suite completa finalizó con 19 archivos y 365 pruebas aprobadas, código de salida 0.

Comprobación de la base local contra su respaldo: las cuatro tareas previas y sus nueve eventos se conservaron sin cambios.

Las pruebas cubren persistencia, reprogramación, control de versiones, reapertura, aislamiento entre estudios e independientes, responsables inactivos, conservación del circuito de revisión, formularios con errores y fechas cercanas a la medianoche argentina. El historial y los datos del estudio local no se usaron para crear actividades ficticias durante la revisión visual.
