# HoyporHoy 2.1 — MVP funcional para estudios jurídicos

## Visión
Un escritorio jurídico colaborativo: expedientes, tareas de abogados juniors, revisión de trabajos, documentos y vencimientos en un mismo lugar. Córdoba, Argentina como primer contexto. Priorizar funcionalidad real antes que branding o formularios extensos.

## Responsabilidades
- **Producto y funcionalidades (nuestro equipo):** flujos de usuarios, interfaz, priorización, implementación incremental de módulos y pruebas de funcionamiento.
- **Bartolito:** auditoría de seguridad, autenticación, aislamiento multi-tenant, archivos, revisión de migraciones y despliegue.
- No desactivar protecciones existentes. Hasta validación de Bartolito, trabajar con información ficticia. El desarrollo puede avanzar sin declarar segura la plataforma.

## Flujo principal de una jornada
1. Titular entra y ve pendientes, vencimientos y trabajos enviados a revisión.
2. Abre la ficha de un expediente y revisa carátula, cliente, fuero, estado, abogado responsable, documentos y actividad.
3. Crea una tarea «Preparar borrador de escrito» y asigna a un junior.
4. Junior entra a su bandeja, inicia la tarea, adjunta borrador o comentario y marca «Enviar a revisión».
5. Titular abre el borrador, deja observación y devuelve a corrección o aprueba.
6. Junior recibe estado y vuelve a trabajar si corresponde.
7. Mi Jornada separa fechas de tareas internas de plazos procesales.

## Incremento 1 (primera construcción): Tareas y revisión

### Modelo conceptual
Propuesta de `Task`, aún NO implementada:
- `id`, `caseId`, `studioId`, `title`, `description`, `assignedToId`, `createdById`
- `status`: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`
- `priority`, `dueDate` opcional, `createdAt`, `updatedAt`
- Comentario/observación y actividad: reutilizar `TimelineEvent` si alcanza; si no, planificar entidad de comentarios.
- Adjuntos: reutilizar `CaseFile`; versión y relación directa con tarea quedan sujetos a diseño.

### UI propuesta
- En `ViewCase.jsx`, pestaña o panel «Tareas» con botón «Nueva tarea», tarjetas por estado y asignado.
- En `MyDay.jsx`, dos secciones distintas: «Mis tareas» y «Vencimientos procesales».
- Detalle de tarea: datos, responsable, estado, historial, comentarios, adjuntos, botón «Enviar a revisión» y acciones «Aprobar» / «Solicitar correcciones» según rol.
- Si no hay tareas, estado vacío con CTA clara.

### Contratos de API tentativos
- `GET /api/cases/:id/tasks`: listar del expediente.
- `POST /api/cases/:id/tasks`: crear y asignar.
- `PATCH /api/tasks/:id`: editar/actualizar estado.
- `POST /api/tasks/:id/review`: aprobar o devolver con observación.
- `GET /api/tasks/mine`: bandeja personal.
Todos requieren `protect`, alcance por estudio y permisos, para revisión de Bartolito.

### Criterios de aceptación
- Titular asigna trabajo a junior del mismo estudio y la tarea aparece al recargar.
- Junior inicia, comenta, envía a revisión; titular aprueba o devuelve.
- Queda identificable quién hizo qué y cuándo, y el expediente muestra estado actual.
- No se confunde fecha interna de tarea con plazo procesal.
- Se prueban errores, falta de datos, interfaz móvil y aislamiento de dos estudios (validación técnica de Bartolito).

## Incrementos siguientes
2. Alta rápida + ficha integral de expediente, aprovechando `Case` y componentes existentes.
3. Mi Jornada enriquecida con tareas y fechas judiciales separadas.
4. Documentación con borrador DOCX, revisión y descargas autenticadas.
5. Panel y demo de 10 minutos para 5–6 estudios piloto con expedientes y clientes ficticios.

## Archivos candidatos del primer módulo
- Nuevo: `server/src/controllers/taskController.js`
- Nuevo: `server/src/routes/taskRoutes.js`
- Modificar: `server/src/index.js` (registro de rutas).
- Modificar: `server/prisma/schema.prisma` (modelo Task; **requiere revisión de Bartolito**).
- Modificar: `client/src/pages/ViewCase.jsx`, `client/src/pages/MyDay.jsx`.
- Nuevos candidatos: `client/src/components/TaskPanel.jsx`, `client/src/components/TaskDetail.jsx`.
- Agregar tests en `server/src/tests/`.

**Migración propuesta al implementar**, desde `server/`: `npx prisma migrate dev --name add_case_tasks`. No ejecutar hasta acordar el schema.
**Dependencias:** ninguna prevista; reutilizar las instaladas.
**Estado:** especificación funcional únicamente. No hay módulo Task creado, tests corridos ni migraciones ejecutadas.
