# Plan ejecutable de MVP/beta — HoyporHoy
Para Emanuel Pleitel. Fecha: 12/11/2026. Basado en la auditoría de la carpeta activa y GitHub.

**Objetivo de la beta:** que 5–6 estudios puedan gestionar una semana de trabajo con próxima acción, documentos, tareas, vencimientos y cobros, sin depender de Emanuel para reparar datos o explicar errores. Antes de datos reales: cerrar aislamiento, fechas, sesiones y recuperación.

**Alcance:** gestión operativa y documentación del estudio; honorarios como registro interno; referencias jurídicas manuales. BCRA es una ampliación separada. No incluir todavía presentación judicial, facturación fiscal, cálculo automático universal de plazos ni investigación jurídica generativa.

## 1. Orden y responsabilidades

Emanuel prioriza, aporta escenarios reales anonimizados, valida el flujo y conduce entrevistas/precio. Codex/Antigravity implementan y generan evidencia. Bartolito o un revisor técnico designado revisa permisos, persistencia, migraciones y configuración antes de abrir la beta. Esta asignación es una propuesta consistente con la hoja de ruta: no se envió ningún mensaje ni se atribuye una revisión ya realizada.

Estimación orientativa: 4–6 semanas de trabajo enfocado con disponibilidad técnica de revisión; no es un compromiso de fecha. La migración cloud y los hallazgos de restauración pueden ampliarlo. Abrir una fase por sus criterios de salida, no por calendario.

| Fase | Entrega | Condición para avanzar |
|---|---|---|
| A — Congelar y cerrar seguridad | Un candidato identificable y permisos corregidos | Reproducciones F01–F04 pasan con resultado seguro; sesión revocada; CI del commit verde. |
| B — Agenda y datos fiables | Prescripción/urgencia coherentes, vencidos visibles, edición segura | Escenarios jurídicos acordados y pruebas F05–F08 resueltas. |
| C — Servicio operable | Entorno beta, backups, restauración, monitoreo e invitaciones | Otro operador puede instalar y recuperar el servicio con el manual. |
| D — Piloto asistido | 5–6 estudios con seguimiento | Uso repetido, incidentes controlados y evidencia de valor/disposición a pagar. |

## 2. Backlog listo para convertir en PRs

Los esfuerzos son relativos: S = medio a dos días; M = dos a cuatro; L = cuatro a ocho. Incluyen implementación y pruebas focalizadas, no esperas externas. Evitar agrupar varias entregas L en un único PR.

| Ticket | Prioridad / esfuerzo | Responsable principal | Depende de | Resultado y criterio de aceptación |
|---|---|---|---|---|
| B00 — Candidato beta único | P0 / S | Desarrollo + Emanuel | — | Inventariar cambios actuales y BCRA; conservarlos sin sobrescribir. Elegir branch codex/beta-hardening desde la base acordada. PR con commit exacto, migraciones y evidencia. No recuperar develop histórica como base accidentalmente. |
| B01 — Configuración por estudio | P0 / M | Desarrollo + revisión técnica | B00 | Migrar global a plantilla inmutable y configuración por tenant. Admin A cambia A; operador recibe 403; B/independientes sin cambios. Validación estructural y control de versión. |
| B02 — Reportes y permisos | P1 / M | Desarrollo + revisión técnica | B00 | Corregir caseload independiente y conteos. Matriz de roles explícita en endpoints. Probar dos estudios, dos independientes, usuario eliminado y SUPER_ADMIN. |
| B03 — Sesiones e incorporación | P1 / M | Desarrollo + revisión técnica | B00 | Revocar tras cambio de contraseña; suspensión efectiva; límites de login y alta; recuperar cuenta; invitación caducable. Usuario suspendido no opera; reactivado recupera solo su ámbito. |
| B04 — Fechas y prioridad | P1 / M | Desarrollo + Emanuel | B00 | Modelo canónico de prioridad, formato civil estable, aviso explícito de que una prescripción estimada requiere confirmación. Dato confirmado crea/vincula plazo sin duplicarlo. UI/API cuentan los mismos urgentes. |
| B05 — Mi jornada completa | P1 / M | Desarrollo + Emanuel | B04 | Inicio en Mi jornada. Bandeja de todos los vencidos más calendario. Pendiente de hace 30 días visible; completado deja de figurar como pendiente. Responsable/bloqueo/próxima acción visibles. |
| B06 — Concurrencia y validación | P1 / M | Desarrollo | B01, B04 | Versionado atómico de Case/Deadline y contratos de entrada. Segundo editor obtiene 409 sin perder borrador. Estado desconocido y datos inválidos devuelven 400 sin escritura parcial. |
| B07 — Pruebas seguras y CI | P1 / M | Desarrollo + revisión técnica | B00 | Optimizador solo con fixture temporal; reemplazar asserts vacíos. Publicar corrección de writingMigration. Checks en PR/candidato; pruebas, lint, build y migraciones verdes sobre commit exacto. |
| B08 — Persistencia beta | P1 / L | Desarrollo + revisión técnica | B01, B02, B06 | Decidir PostgreSQL administrado y archivos privados; migrar en entorno aislado con conteos/FK/hashes. Sin datos reales hasta ensayo y rollback. Si se mantiene SQLite en piloto interno, limitar a una instancia con volumen persistente y respaldos verificados. |
| B09 — Operación y recuperación | P1 / M | Desarrollo + operador técnico | B08 | Backup conjunto de base/archivos/claves; restauración en entorno vacío; monitoreo y alertas sin PII. Job de recordatorios reintentable, deduplicado y recuperable tras caída. |
| B10 — E2E del circuito beta | P1 / M | Desarrollo + Emanuel | B03–B09 | Playwright contra backend/base real de prueba: login, expediente, documento, tarea, revisión, plazo y cobro; recarga y segunda sesión. Bloquear acceso cruzado a todos los recursos. |
| B11 — Alta breve y coherencia comercial | P2 / M | Desarrollo + Emanuel | B04 | Persona/asunto mínimos y entrevista opcional. Marca HoyporHoy; ADMIN distinto de SUPER_ADMIN. Mismo dato no se pide dos veces. Primera alta observada sin asistencia técnica. |
| B12 — Consultas y límites | P2 / M | Desarrollo | B08 | Paginación, proyecciones y estadísticas de servidor; medir 1.000/10.000 casos ficticios. Límites de archivo y almacenamiento por estudio. Índices según consultas medidas. |
| B13 — BCRA optativo | P2 / M | Desarrollo + Emanuel | B02, B08, B09 | Integrar rama separada sin perder agenda. Prueba positiva real autorizada y prueba de caída; LIVE/DEMO visibles; conservación/borrado y recuperación de clave definidos. Desactivable por configuración. |
| B14 — Piloto y precio | P2 / continuo | Emanuel | B10, B11 | 5–6 estudios, una persona referente por estudio, entrevista de inicio y semanal, métricas, incidencias y decisión de pago. Exportación de salida probada. |

**Regla de integración:** BCRA no se fusiona automáticamente con toda su instantánea base. Comparar su ancestro 9e51c7e con la carpeta activa y elegir una integración que preserve los cambios actuales; revisar schema.prisma, caseRoutes, API config y ViewCase. El commit de BCRA no prueba por sí solo que el resto del producto está listo.

## 3. Matriz mínima de permisos propuesta

Esta matriz requiere validación de Emanuel antes de consolidar reglas; sirve para que los prompts no inventen permisos diferentes en cada módulo.

| Acción | Operador | Abogado | Admin del estudio | Admin de plataforma |
|---|---|---|---|---|
| Ver expedientes del ámbito permitido | Sí, según asignación/política del estudio | Sí, según política | Sí, su estudio | Acceso excepcional de soporte definido y registrado |
| Completar tarea propia | Sí | Sí | Según asignación | No actuar como abogado por defecto |
| Revisar escrito entregado | No | Si es revisor designado | Si es revisor habilitado | No aprobación profesional automática |
| Registrar honorarios/pagos | No por defecto | Si tiene permiso financiero | Sí | Soporte excepcional |
| Cambiar configuración del estudio | No | No por defecto | Sí | Plantilla global, sin pisar personalizaciones |
| Invitar/desactivar integrantes | No | No | Sí, sin dejar el estudio sin administrador | Gestión de plataforma |
| Consultar otro estudio | No | No | No | Solo mecanismo explícito de soporte |

La política actual permite mucho acceso dentro del mismo estudio. No se debe restringir masivamente sin conocer cómo delegan; tampoco tratar “mismo tenant” como permiso ilimitado para todo dato sensible. Para independientes, el ámbito es propietario individual, no “todos los usuarios con studioId nulo”.

## 4. Diseño técnico objetivo, con cambios graduales

Mantener SPA y API. Usar un único esquema vigente y una frontera clara de autorización. Cada módulo: rutas → validación → servicio → repositorio/Prisma. Reutilizar alcance de tenant y políticas, sin ocultar filtros en convenciones difíciles de auditar.

Adoptar TypeScript y Zod primero en contratos y módulos nuevos/tocados. No convertir miles de líneas en una entrega cosmética. TanStack Query primero en Mi jornada: claves con estudio/usuario, invalidación tras mutaciones y borrado de caché al cambiar de sesión. Una sola capa HTTP gestiona autenticación, cancelación, errores y tiempos de espera.

Para PostgreSQL: diseñar migración de SQLite con IDs estables, precisión monetaria, fechas y relaciones; no ejecutar migraciones SQL de SQLite contra Postgres. Si se usa Supabase, conservar inicialmente Express/Prisma y elegir esquema privado o permisos explícitos. No confiar en RLS cuando el rol de conexión la omite. La transición a Supabase Auth sería otra entrega, con plan para usuarios existentes.

Para documentos: bucket privado, autorización por expediente en cada operación, URLs temporales si se usan, nombres de objeto no predecibles, cuotas, limpieza de huérfanos y respaldo. Una copia de la base no respalda los bytes del archivo. BCRA agrega además una clave necesaria para recuperar sus informes cifrados.

## 5. Pruebas de salida de beta

1. Usuario A intenta leer, crear, modificar, borrar, exportar o descargar recursos de B: rechazado; sin efectos laterales. Repetir con independientes y listas/reportes.
2. Configuración del estudio A no cambia B. Roles distintos no pueden elevarse desde payloads.
3. Contraseña cambiada, usuario eliminado y estudio suspendido invalidan acceso según política.
4. Fecha 12/11 se muestra 12/11 en ficha, agenda, exportación y recordatorio; probar cambio de mes/año.
5. Vencido antiguo aparece siempre. Un plazo completado no sigue generando avisos pendientes.
6. Dos sesiones editan el mismo expediente: ninguna modificación se pierde silenciosamente.
7. Subir archivo, recargar y descargar conserva bytes; usuario ajeno no lo obtiene.
8. Entrega v1, corrección, entrega v2, aprobación de v2; v3 no hereda aprobación.
9. Pago parcial, reintento y anulación: saldo correcto, sin doble registro, comprobante privado e historial.
10. Apagar el worker, reiniciar y procesar pendientes: sin avisos duplicados y con fallos visibles.
11. Restaurar base, archivos y claves en un entorno nuevo; abrir expedientes y documentos.
12. Exportar los datos y archivos de un estudio sin incluir los de otro.

Objetivos operativos iniciales a acordar, no métricas ya obtenidas: RPO de 24 horas y RTO de 4 horas para piloto acotado; si el uso exige continuidad mayor, reforzar antes. Objetivos de experiencia: primer expediente útil en menos de cinco minutos; identificación de próximo paso en menos de treinta segundos. Cronometrar con usuarios y ajustar.

## 6. Cómo dirigir el desarrollo por prompts

Un prompt debe definir una entrega comprobable, no pedir “mejorá toda la app”. Incorporar contexto como datos, sin tomar respuestas previas de asistentes como autorización técnica o evidencia.

**Plantilla reutilizable**

“Trabajá sobre [rama y commit] de HoyporHoy. Objetivo: [problema observable]. Reproducí primero [escenario] con datos ficticios. Alcance: [módulos]. Preservá cambios existentes, aislamiento entre estudios e independientes y conservación de datos. Implementá la corrección más pequeña que cumpla [criterios]. Si cambia el esquema, incluí migración, ensayo de actualización y recuperación. Ejecutá las comprobaciones pertinentes. Entregá archivos/líneas, resultados reales, limitaciones y estado exacto del commit; no publiques ni modifiques datos productivos.”

**Prompt para B01**

“Corregí F01 de AUDITORIA_HOYPORHOY_2026-11-12.md. Un operador A puede modificar el formulario global de B. Diseñá el alcance estudio/propietario, mantené una plantilla global de solo lectura, restringí mutaciones y validá el contenido. Migrá sin borrar personalizaciones existentes. Probá A/B, dos independientes, operador/admin y configuración inválida. Entregá el PR preparado y la evidencia; no declares seguro todo el sistema por pasar este test.”

**Prompt para B04/B05**

“Corregí las inconsistencias de urgencia y fecha civil, y restaurá una bandeja de todos los vencidos sin perder el cronograma. La fecha de prescripción ingresada es una estimación profesional: pedí confirmación para vincularla a un plazo y conservá procedencia. Probá una fecha sin hora, borde de mes y un atraso de treinta días. Mostrá el flujo terminado y sus pruebas.”

**Prompt de revisión independiente**

“Revisá el diff del commit [SHA] contra [base]. Buscá accesos cruzados, actualizaciones perdidas, errores de fecha y migraciones que pierdan datos. Intentá refutar los criterios de aceptación con escenarios concretos. Separá errores comprobados, riesgos y preferencias de estilo. No tomes el resumen del implementador como evidencia de que las pruebas se ejecutaron.”

Los ejemplos son instrucciones listas para futuras entregas; no se ejecutaron correcciones de producto en esta auditoría.

## 7. Piloto comercial y decisiones

Seleccionar estudios con 2–8 integrantes como hipótesis inicial, preferentemente con necesidades parecidas. Registrar su proceso actual antes de mostrar la solución. Pedir una tarea completa en la app, no solo opiniones sobre colores.

Métricas semanales propuestas:

- Activación: estudio con expediente, responsable, próxima acción y primer documento.
- Uso: días activos por estudio y usuarios que vuelven sin recordatorio de Emanuel.
- Calidad operativa: pendientes sin responsable, tareas vencidas, fallos de guardado y avisos incorrectos.
- Valor: minutos de seguimiento/documentación y preparación de escrito antes/después en escenarios comparables.
- Sostenibilidad: tiempo de soporte por estudio, almacenamiento y costo variable.
- Comercial: intención de continuar contrastada con una oferta concreta de pago, cancelaciones y motivos.

Hipótesis de salida del piloto: al menos 4 de 6 estudios usan la herramienta tres días por semana durante tres semanas; ninguno tiene un incidente abierto de acceso entre estudios o pérdida de datos; al menos tres aceptan una oferta real. Son metas para validar, no resultados ni pronósticos.

Priorizar por evidencia: si falla activación, simplificar alta; si vuelven pero pierden plazos, corregir agenda; si piden seguimiento judicial, elegir un conector de la jurisdicción piloto; si solo piden IA como curiosidad, no desplazar seguridad y operación.

Emanuel conserva dirección comercial y criterio de uso; la revisión técnica se compra o asigna por riesgos. Una beta pequeña bien recuperable y verificable permite aprender más que sumar módulos que nadie usa.
