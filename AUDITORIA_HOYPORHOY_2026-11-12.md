# Auditoría de HoyporHoy — Emanuel Pleitel
Fecha de corte: 12 de noviembre de 2026, Argentina. Repositorio: emapleitel90-blip/HoyporHoy.

**Conclusión ejecutiva**

HoyporHoy tiene una base funcional suficiente para preparar una beta privada de gestión jurídica. Todavía no recomendaría admitir varios estudios con datos reales: hay fallas reproducidas de aislamiento y de representación de fechas, además de una brecha entre lo probado localmente y lo publicado. La inversión inmediata debe concentrarse en confianza operativa, permisos, agenda y entrega reproducible.

El desarrollo por prompts ya produjo capacidades valiosas: archivos privados, cobros parciales y rectificaciones, versiones de escritos, revisión de entregas y seguimiento documental. Tu oportunidad como Emanuel Pleitel es convertir tu conocimiento comercial y del trabajo del estudio en un flujo que se use todos los días. Agregar frameworks o IA sin cerrar ese circuito aumentaría el mantenimiento.

Este informe es una auditoría técnica y de producto basada en código, pruebas y fuentes públicas. No acredita que una instalación productiva esté comprometida ni constituye una certificación de cumplimiento normativo.

## 1. Qué se auditó realmente

| Estado | Versión verificada | Interpretación |
|---|---|---|
| Rama develop local | dd7d920f1b11f90ae3816e629785457e43b4780a, 14/10 | Foto histórica; conserva errores posteriormente corregidos. |
| Referencia local origin/develop/hoyporhoy-2.0 | ec0e4c8629232f778621f4e5abcf0e7502b801aa | Referencia almacenada, no prueba de existencia remota actual. |
| GitHub develop/hoyporhoy-2.0 | No aparece en listado paginado; consulta del ref devuelve 422 | No corresponde tratarla como rama remota vigente. |
| GitHub main y codex/ui-taste-review | 27adfbe727237ce7e214a6f908a661d7483060e9 | Último commit del 01/11 en hora argentina. PR #2 fusionado el 06/11. |
| GitHub codex/shadcn-legal-ui | 6f81db9894ecb131aa2d99198bbd6d567cd12a83, 06/11 | Rama publicada más reciente entre las devueltas por GitHub; 11 commits por delante de ec0e4c8. |
| Carpeta activa | 6f81db9 + modificaciones previas sin commit | Agenda, próxima acción, coincidencias, reorganización de admisión y ajustes de pruebas. |
| Otra rama local activa | codex/bcra-informe, 7a6de9f79b170423463319fb64e2de8268d5679c, 12/11 | Integración BCRA en otra copia de trabajo. No está fusionada en la carpeta auditada ni apareció entre las ramas remotas. |

Las referencias origin/main y main de esta carpeta estaban atrasadas respecto de GitHub. Se consultó el conector de GitHub: la consulta Git por consola no resolvió el dominio. No se cambiaron ramas, no se fusionó trabajo y no se publicó código.

Se recuperó el chat «Analizar y mejorar app», se revisaron chats recientes de desarrollo y arranque, documentos de entrega, hoja de ruta y reglas de .agent. Las declaraciones históricas de “pruebas aprobadas” se tomaron como antecedentes, no como validación de esta versión. Los commits identifican autores; no permiten inferir con qué herramienta se escribió cada línea ni una aprobación de seguridad de Bartolito.

**Límites:** revisión estática transversal, ejecuciones locales con bases ficticias y consulta de CI. No se auditó una base productiva, cuentas cloud, políticas realmente desplegadas, restauración productiva ni carga concurrente a escala. El control del navegador agotó el tiempo de espera dos veces: la evaluación UX actual se basa en componentes y pruebas, no en una nueva sesión visual completa. BCRA tuvo revisión focalizada de código y entrega; no se repitió su suite ni una consulta positiva real.

## 2. Arquitectura y madurez

La arquitectura efectiva es una SPA React 18/Vite, con Tailwind y componentes locales shadcn, que consume una API Express. La autenticación es propia: bcrypt, JWT y sesión persistida en el navegador. Prisma utiliza SQLite. Los adjuntos actuales se guardan en disco privado y se descargan mediante la API. Un cron dentro del proceso Node genera avisos.

Supabase está instalado y hay un SQL histórico, pero el cliente de Supabase no aparece importado por el flujo activo. Tener esos archivos no significa que la aplicación esté utilizando PostgreSQL, Supabase Auth o RLS. La configuración de Vercel describe el frontend; no resuelve el alojamiento de la API, la persistencia de SQLite ni el disco de documentos.

**Conservaría el monolito**, organizándolo por dominios: acceso/estudios, personas, expedientes, trabajo diario, documentos y honorarios. Los controladores contienen directamente reglas, consultas, validación y serialización; conviene extraer servicios gradualmente allí donde una misma regla se repite. No hay una necesidad demostrada de microservicios.

| Capacidad | Estado observado | Brecha principal |
|---|---|---|
| Expedientes y admisión | Implementados, formulario configurable y campos jurídicos | Reglas duplicadas, estados poco controlados y datos operativos escondidos en JSON. |
| Archivos y comprobantes | Multipart real, límite, validación de firma, descarga autorizada | Operación cloud, cuotas, recuperación y ciclo de vida. |
| Tareas y revisión | Responsable/revisor, eventos, versiones vinculadas | Unificar reglas de permisos, tareas simples y visibilidad de equipo. |
| Agenda y próxima acción | Implementadas localmente | Vencidos antiguos, prescripción e integración en versión publicada. |
| Seguimiento del cliente | Requisitos, compromisos y bloqueos | Comunicación manual; todavía no hay portal de cliente. |
| Honorarios | ARS, cuotas, pagos parciales, anulaciones y comprobantes | Alcance monetario y operativo limitado; no confundir con facturación fiscal. |
| Escritos | Versionado, comparación, Word y revisión exacta | No equivale a firma ni presentación judicial. |
| Jurisprudencia | Portales oficiales y referencias ingresadas por usuario | No hay recuperación ni verificación automática de fallos. |
| BCRA | Rama separada con identidad, cifrado y distinción LIVE/DEMO | Integración, política de conservación y prueba positiva con proveedor real. |
| SaaS comercial | Estudios, usuarios y etiqueta de plan | Alta asistida, recuperación de cuenta, suspensión efectiva, soporte y operación. |

**Avances históricos que sí deben reconocerse.** En dd7d920 el registro aceptaba role y studioId desde el cuerpo; ahora los rechaza y crea OPERATOR independiente. La creación de expedientes dejó de confiar en studioId arbitrario del cliente, y valida al abogado asignado. Hay pruebas reales de archivos, seguimiento, tareas y honorarios. La jornada utiliza límites de día argentinos y el frontend tiene carga diferida de pantallas. El antiguo diagnóstico de “no hay tareas ni documentos reales” ya no describe esta versión.

Evidencia: [registro actual](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/authController.js:11>), [asignación y tenant](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/caseController.js:97>), [archivos privados](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/caseFileController.js:41>), [rutas diferidas](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/App.jsx:9>).

## 3. Hallazgos prioritarios

P0 significa bloquear una beta multiestudio hasta corregirlo. P1: resolver antes de datos reales o del flujo afectado. P2: siguiente iteración. “Reproducido” significa comprobado contra una base creada para la auditoría; no se usaron expedientes reales.

### F01 — P0. Un operador puede alterar el formulario de todos los estudios
**Reproducido.** POST y reset solo exigen autenticación. El controlador siempre escribe scope global. Un operador del estudio A modificó las secciones y un administrador del estudio B recibió esas mismas secciones, con HTTP 200. No necesita acceso a la pantalla de configuración: alcanza la API.

Evidencia: [rutas, líneas 7–11](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/routes/formConfigRoutes.js:7>), [lectura global, línea 153](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/formConfigController.js:153>), [escritura global, líneas 171–179](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/formConfigController.js:171>).

Resolver: configuración por estudio o propietario independiente, plantilla global solo de lectura, mutaciones limitadas al administrador correspondiente, esquema de validación y versión. Prueba de aceptación: operador rechazado; admin A modifica solo A; B e independientes permanecen iguales; payload inválido no rompe la admisión. Está presente también en la rama histórica.

### F02 — P1. El reporte de carga revela otros abogados independientes
**Reproducido.** Para un usuario sin estudio, el filtro es studioId:null. Devuelve id, nombre y cantidad de casos abiertos de todos los LAWYER independientes. No se demostró acceso al contenido de sus expedientes.

Evidencia: [reporte, líneas 64–78](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/reportController.js:64>), [ruta protegida solo por sesión](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/routes/reportRoutes.js:8>).

Resolver: independiente limitado a su id; aplicar el alcance de expedientes también al conteo y excluir eliminados. Decidir qué roles del estudio ven productividad ajena. Está presente también en develop histórica.

### F03 — P1. Cambiar la contraseña no invalida una sesión robada
**Reproducido.** Un JWT emitido antes del cambio siguió accediendo a /api/auth/me. Los tokens duran 30 días y el cambio actualiza únicamente el hash de contraseña. Logout borra el almacenamiento local, sin revocar el token en el servidor.

Evidencia: [duración](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/authController.js:5>), [cambio de contraseña](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/authController.js:108>), [validación de sesión](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/middleware/authMiddleware.js:12>), [logout](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/context/AuthContext.jsx:62>).

Resolver primero con versión de sesión/tokenVersion o sesiones revocables y expiración corta; luego evaluar autenticación administrada. La baja de usuario sí se revisa en cada petición: esa protección ya existe. Cookies HttpOnly pueden reducir exposición a scripts, pero exigirán un diseño explícito de CSRF y despliegue; no son un reemplazo automático.

### F04 — P1. Suspender un estudio no bloquea su acceso
**Reproducido.** Cambiar Studio.status a SUSPENDED no impidió que sus usuarios consultaran /api/cases. protect revisa deletedAt del usuario, no el estado del estudio.

Evidencia: [suspensión](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/studioController.js:83>), [autorización](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/middleware/authMiddleware.js:15>).

Definir estados válidos y hacer efectiva la política en login y peticiones. El bloqueo debe distinguir suspensión comercial, incidente y exportación de salida: no improvisar la retención de datos ante una deuda.

### F05 — P1. La admisión no alimenta correctamente la operación
**Reproducido parcialmente por API y confirmado en componentes.** La prioridad enviada como URGENT queda MEDIUM; urgencia vive en details. La prescripción ingresada queda almacenada pero no crea un Deadline. El dashboard cuenta HIGH o score>70, mientras el servidor cuenta URGENT; el score habitual tiene diez ítems de 1/3/5, por lo que llega a 50. ViewCase busca nivelUrgencia y el formulario usa urgencia.

Evidencia: [payload de admisión](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/pages/CreateCase.jsx:399>), [persistencia](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/caseController.js:90>), [contador del dashboard](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/pages/Dashboard.jsx:65>), [score](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/components/CreateCaseForms.jsx:72>), [ficha](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/pages/ViewCase.jsx:319>).

Resolver con una prioridad canónica y un contrato compartido. Una fecha jurídica debe permitir crear un vencimiento vinculado, confirmado por el abogado, con procedencia; no convertir automáticamente una estimación en un cálculo legal validado. El indicador debe contar los mismos registros en pantalla y servidor.

### F06 — P1. Los vencidos antiguos desaparecen de la vista inicial de Mi jornada
**Regresión local; reproducción del filtro API y verificación estática del render.** MyDay reemplazó las listas de vencidos/hoy/próximos por LegalTimeline. El rango inicial comienza tres días antes de hoy; no hay allí una bandeja de todos los atrasos. Un vencimiento pendiente anterior al rango no aparece en la respuesta. Puede encontrarse navegando hacia atrás, pero la apertura diaria ya no lo destaca.

Evidencia: [MyDay](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/pages/MyDay.jsx:33>), [inicio del cronograma](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/components/LegalTimeline.jsx:28>), [rango de consulta](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/agendaController.js:56>).

Restaurar una bandeja persistente de vencidos, separada del rango visual, con contador y responsable. Caso de aceptación: pendiente de hace treinta días visible al iniciar; cumplido retirado de la bandeja sin borrar historial.

### F07 — P1. Algunas fechas jurídicas se muestran un día antes
**Reproducido con la expresión usada por la ficha.** Date('2026-11-12') se interpreta a medianoche UTC; al formatear en Argentina aparece 11/11/2026. Afecta prescripción, audiencia y otros campos date-only.

Evidencia: [ViewCase, líneas 319–326](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/pages/ViewCase.jsx:319>); también nacimiento y hitos en líneas 229 y 263.

Usar un formato único de fecha civil, sin convertirlo inadvertidamente en instante UTC. Mantener diferenciados fecha civil, evento con hora y zona horaria. Probar borde de mes/año en zonas distintas.

### F08 — P1. Ediciones simultáneas pueden pisar datos de un expediente o plazo
**Confirmado por estructura del código; no se ejecutó estrés concurrente.** updateCase y updateDeadline leen un registro y luego actualizan por id, sin expectedVersion. La admisión reenvía details completo. Dos personas editando desde una misma versión pueden perder modificaciones sin aviso.

Evidencia: [updateCase](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/caseController.js:147>), [updateDeadline](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/deadlineController.js:76>). Contraste positivo: agenda, honorarios y escritos ya utilizan controles de concurrencia.

Añadir versión y actualización condicional atómica. Segundo guardado obsoleto devuelve 409 y conserva borrador para comparar; no basta deshabilitar el botón en una pestaña.

### F09 — P1. Una prueba de “optimización” limpia el repositorio real
**Confirmado por código; excluida de la ejecución válida.** runFileOptimizer recorre la raíz y borra carpetas llamadas temp/tmp/.cache y archivos .log, salvo server.log. El test llama esa función directamente. No debe formar parte de una suite que un fundador ejecuta confiando en que solo verifica.

Evidencia: [borrado](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/skills/fileOptimizer.js:49>), [raíz real](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/skills/fileOptimizer.js:79>), [test](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/tests/optimizador.test.js:7>).

Extraer una raíz explícita, usar únicamente fixtures temporales y simulación previa. Retirar mantenimiento del repositorio de la API de producto. La ruta exige SUPER_ADMIN: no es una operación accesible a cualquier usuario.

### F10 — P1. La versión publicada no tiene una validación verde demostrada
El workflow existe y reemplaza la antigua configuración inoperante de ci/ci.yml. Pero solo dispara push para main/develop y PR hacia esas ramas, no para codex/* ni develop/hoyporhoy-2.0. La última ejecución de PR recuperada para 27adfbe falló en ambas versiones de Node al probar el servidor; cliente y build quedaron omitidos.

En Node 22: 358 pruebas aprobadas y una fallida en writingMigration.test.js, “cannot commit - no transaction is active”. Hay un ajuste local sin publicar que fija connection_limit=1; la suite local con ese ajuste pasó. No equivale a CI verde en GitHub.

Evidencia: [workflow](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/.github/workflows/ci.yml:3>), [ajuste local](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/tests/writingMigration.test.js:8>), [ejecución GitHub](https://github.com/emapleitel90-blip/HoyporHoy/actions/runs/41370305554).

La consulta de estados clásicos para 6f81db9 devolvió vacío; eso por sí solo no prueba ausencia de check runs. Requerir checks del commit candidato exacto, migración desde cero y actualización de una base anterior.

### F11 — P1 para migrar; P2 mientras permanezca inactivo. El SQL histórico de Supabase no es una migración utilizable del sistema actual
El SQL contiene solo el esquema temprano, otra convención de nombres, perfiles ligados a auth.users y políticas amplias. La política de User consulta la misma tabla protegida, patrón que requiere revisar recursión; las políticas no expresan la matriz de permisos actual y FormConfig permite lectura global a autenticados. No se ejecutó contra PostgreSQL: no se afirma exposición cloud efectiva.

Evidencia: [políticas](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/supabase/migrations/20260710233000_init.sql:144>), [esquema activo SQLite](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/prisma/schema.prisma:5>), [cliente sin integración activa](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/lib/supabaseClient.js:1>).

Construir la migración desde el esquema vigente, elegir una sola autoridad de identidad y probar con roles reales de base. RLS no protege consultas que usan una conexión privilegiada que la omite. [Documentación de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

### F12 — P2. Listados y estadísticas cargan más datos de los necesarios
getCases no pagina y devuelve details y relaciones; Dashboard descarga todos los expedientes para agregarlos en el navegador. Agenda y detección de coincidencias leen todos los detalles del estudio. Case y Deadline carecen de índices específicos para varios filtros frecuentes.

Evidencia: [listado](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/caseController.js:36>), [dashboard](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/pages/Dashboard.jsx:54>), [agenda](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/agendaController.js:64>), [coincidencias](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/caseWorkflowController.js:87>), [esquema](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/prisma/schema.prisma:49>).

Paginar, devolver proyecciones mínimas, usar estadísticas del servidor y normalizar campos buscables. Medir con 1.000 y 10.000 expedientes ficticios antes de elegir índices; no hay benchmark que demuestre hoy una caída a esa escala.

### F13 — P1 de verificación. Higiene de secretos y almacenamiento histórico incompleta
client/.env sigue versionado; server/.env existió en el historial y se retiró después. Esto demuestra presencia de archivos de configuración, no que cada valor sea secreto activo. Una clave pública de frontend tampoco se vuelve secreta por estar en .env. Se evitaron imprimir valores.

Además persiste /uploads estático sin sesión en index.js, aunque los adjuntos actuales usan otra carpeta privada. Sin un inventario de contenido no corresponde afirmar que hoy expone expedientes.

Evidencia: historial Git de esos paths; [montaje legado](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/index.js:58>), [almacenamiento nuevo](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/utils/caseFileStorage.js:6>).

Inventariar categorías de claves, rotar las secretas que hayan sido expuestas, verificar historial y accesos; reemplazar archivos reales por ejemplos. Revisar/migrar contenido legado y retirar la ruta si no tiene uso.

### F14 — P1. Faltan garantías operativas demostradas para SaaS
SQLite, disco local y cron en proceso pueden servir en una instancia controlada. No están demostrados backups automáticos consistentes de base y adjuntos, restauración, monitoreo ni recuperación de recordatorios tras una caída. El cron de las 7 no se recupera automáticamente si el proceso estaba detenido; su comprobación y creación de avisos no tienen una clave única que prevenga carreras entre réplicas.

Evidencia: [cron](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/index.js:87>), [deduplicación por consulta](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/skills/deadlineAgent.js:50>), [deploy frontend](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/vercel.json:1>), [API localhost por defecto](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/config/api.js:4>).

Elegir hosting explícito para frontend/API/datos/archivos, job durable con idempotencia y restauración ensayada. SQLite no es por sí mismo una falla de seguridad ni incapaz de multiusuario; la recomendación de PostgreSQL deriva de la operación SaaS y concurrencia previstas. [Criterios oficiales de SQLite](https://www.sqlite.org/whentouse.html).

### F15 — P1 antes de exposición pública. Login y alta necesitan límites y recuperación
No se encontró rate limiting en login/registro; las contraseñas admiten seis caracteres. No hay flujo de recuperación/verificación en las rutas actuales. El registro público crea un OPERATOR sin estudio, y las altas de estudio dependen de SUPER_ADMIN: existe una brecha comercial de incorporación, no una escalada de privilegios actual.

Evidencia: [rutas de autenticación](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/routes/authRoutes.js:16>), [alta pública](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/authController.js:30>), [alta de estudio](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/studioController.js:22>).

Para beta: invitación asistida, caducidad de invitación, contraseña inicial renovable, recuperación y límites por cuenta/IP. Evitar bloqueos que permitan a terceros denegar acceso a una cuenta. La UI reconstruye permisos desde localStorage y no consulta /me al cargar: añadir reconciliación y tratamiento uniforme de 401.

### F16 — P2. El modelo de datos aún refleja un formulario, más que un CRM jurídico
Client existe, pero la creación actual almacena clientName y details sin vincular un cliente. Datos de identidad, parte contraria, tribunal, actuaciones y audiencia quedan en JSON. El aislamiento se aplica mayormente en código y está duplicado entre controladores; no hay garantías de tenant compuesto para todas las relaciones.

Evidencia: [Client](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/prisma/schema.prisma:117>), [Case](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/prisma/schema.prisma:49>), [creación](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/caseController.js:118>).

Normalizar progresivamente Persona/Parte, relación con expediente, identidad, jurisdicción y eventos. Conservar campos personalizados en JSON validado y versionado. No duplicar todo el formulario en nuevas tablas de una vez. Las coincidencias actuales son avisos de posible duplicado o conflicto, no una certificación de ausencia de conflicto de intereses.

## 4. Calidad, pruebas y evidencia

**Resultados de esta auditoría:**

- Servidor: 19 archivos, 370 pruebas aprobadas, excluyendo los dos tests del optimizador por operar sobre la raíz real.
- Cliente: primera ejecución válida, 147 aprobadas y 3 fallidas en AppRouting, sobre 150. Repetición aislada: las 9 pruebas de AppRouting aprobadas. Esto deja todos los casos cubiertos con resultado exitoso en ejecuciones separadas, pero no una pasada completa limpia del cliente.
- Los primeros intentos restringidos fallaron por permisos temporales/ejecución en Windows; no se contaron como errores funcionales. Se ejecutaron después las pruebas con los permisos necesarios.
- ESLint y build: salida 0. Advertencia de tamaño: chunk xlsx aproximadamente 500 kB minificado; índice inicial aproximadamente 372 kB y Dashboard 423 kB. No son tiempos de carga medidos.
- npm audit --omit=dev: cero vulnerabilidades conocidas informadas, tanto cliente como servidor. No cubre defectos propios, todas las herramientas de desarrollo ni garantiza ausencia de problemas en dependencias fuera del registro.
- Siete comprobaciones de auditoría contra una base ficticia: reproducidas. No se modificaron cuentas ni expedientes reales.
- Instalación limpia: las 14 migraciones Prisma se aplicaron correctamente en una base nueva y vacía creada para la auditoría. Esto no sustituye probar una actualización con datos previos y una restauración. [Registro](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/scratch/audit-migrations.txt>).
- GitHub CI histórico: fallo descrito en F10; auditorías de dependencias de ese run aprobadas.

Los dos expect(true).toBe(true) siguen en [cases.test.js](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/tests/cases.test.js:5>); no demuestran aislamiento. Hay, sin embargo, abundantes pruebas de integración reales en módulos nuevos, con SQLite temporal, sesiones, archivos, concurrencia y migraciones. Sería incorrecto decir que “no hay tests”.

No se encontró suite E2E de navegador como control de entrega. Los tests de componentes simulan páginas y peticiones; no reemplazan frontend → API → base → recarga. Tampoco se midió cobertura; cantidad de pruebas no equivale a porcentaje ni calidad total.

Evidencias locales: [reproducciones](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/scratch/audit-proof-results.json>), [servidor](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/scratch/audit-server-verified.txt>), [cliente](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/scratch/audit-client-verified.txt>), [repetición de navegación](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/scratch/audit-routing-recheck.txt>), [compilación](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/scratch/audit-build.txt>). El archivo audit-proof.mjs conserva una reproducción con datos ficticios; confirma el comportamiento defectuoso actual, no es una prueba de seguridad ya corregida.

## 5. UX y oportunidad jurídica argentina

La mejor puerta de entrada comercial es **estudios litigantes pequeños, inicialmente una jurisdicción donde puedas validar reglas y uso personalmente**. “Gestión jurídica para toda Argentina con IA” abarca demasiadas promesas para la etapa actual.

Flujo recomendado: abrir Mi jornada → identificar todos los atrasos → abrir expediente → ver próxima acción, responsable y bloqueo → recibir documento → producir y revisar versión → registrar cobro. Ese circuito ya tiene buena parte del código.

Cambios de producto prioritarios:

1. Mi jornada como inicio por defecto, con vencidos sin límite de antigüedad, hoy y próximos; el cronograma como complemento.
2. Alta breve de persona y asunto; entrevista extendida progresiva según fuero. El formulario actual tiene 712 líneas y definiciones duplicadas en frontend/backend.
3. Encabezado de expediente con próximo paso, responsable, plazo, bloqueo y saldo; historial que permita reconstruir cambios.
4. Separar estado del expediente, estado de admisión, prioridad y viabilidad. El score mezcla plazos, prueba, solvencia y “confiabilidad del cliente”; no debe presentarse como predicción de éxito.
5. Campos psicológicos/socioeconómicos opcionales, pertinentes al servicio y con acceso restringido cuando corresponda. No son una ficha universal necesaria para todo juicio.
6. Unificar marca HoyporHoy. La UI aún dice LyP y llama “Socio principal” al SUPER_ADMIN, que técnicamente puede acceder a todos los estudios. Un socio de un estudio debe ser ADMIN de ese estudio.
7. Clientes y partes reutilizables, exportación completa y trazabilidad de importaciones. Facilitar salir del sistema es parte de la confianza comercial.
8. No prometer cómputo automático de plazos: requiere jurisdicción, fuero, notificación, calendario, suspensiones, reglas y revisión. La fecha manual actual no implementa ese motor.

La Ley 25.326 exige pertinencia de los datos, seguridad y confidencialidad; el diseño debe contemplar acceso/rectificación y reglas específicas para información crediticia. Documentar finalidad, conservación, permisos y contratos del servicio antes de usar datos reales. No corresponde tratar un nombre similar o “sin resultados” como certeza de identidad o inexistencia de causas. [Texto oficial actualizado](https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion).

Para cloud y futuros servicios externos, elegir región y revisar subencargados y mecanismo de transferencia internacional; no asumir ni que toda nube exterior está prohibida ni que contratarla resuelve automáticamente el cumplimiento. [AAIP](https://www.argentina.gob.ar/transferencias-internacionales).

## 6. Competitividad: comparación verificable, no promesas

Se consultó información comercial pública, sin probar cuentas privadas de competidores. Las capacidades siguientes son declaraciones de cada proveedor, no verificaciones de calidad.

| Referencia | Oferta pública observada | Consecuencia para HoyporHoy |
|---|---|---|
| Argus Legal | Redacción, jurisprudencia, análisis y conexión judicial. Planes publicados desde ARS 29.000/mes al consultar; varían por paquete y límites. | No competir con “también tenemos IA”. Integración real, fuentes y revisión requieren inversión propia. |
| Lex-Doctor | Gestión de causas, control, auditoría y herramientas de procuración; oferta para estudios y organizaciones. | La madurez operativa, migración de datos y confianza pesan tanto como el diseño visual. |
| Planillas, agenda y WhatsApp del propio estudio | Alternativa cotidiana que hay que observar en entrevistas. | La hipótesis a probar es menos seguimiento manual y menos pendientes olvidados. No hay medición actual de ahorro. |

Fuentes: [planes Argus](https://www.arguslegal.ai/planes), [Lex-Doctor](https://www.lex-doctor.com/). El precio publicado sirve como referencia temporal; no es una recomendación de precio para HoyporHoy ni valida disposición a pagar.

**Posicionamiento propuesto:** “El trabajo del estudio, ordenado por próxima acción: qué falta, quién lo hace y para cuándo”. La cadena documento → tarea → versión revisada → seguimiento → cobro puede ser un diferencial si funciona con menos esfuerzo. No se afirma que los competidores carezcan de ella.

Beta con 5–6 estudios: entrevistar, importar una muestra, observar primera semana, medir repetición y preguntar qué reemplazaron. Probar abono por estudio con integrantes y almacenamiento incluidos; mantener separado cualquier costo variable de futuras consultas/documentos. No fijar precio por intuición ni por copiar el más barato.

## 7. Tecnologías recomendadas para un fundador que desarrolla por prompts

| Tecnología o decisión | Prioridad | Beneficio específico y condición |
|---|---|---|
| React/Vite + Express + Prisma actuales | Mantener | Evita reescritura y conserva las pruebas. Mejorar límites entre módulos. |
| TypeScript gradual + Zod | Próxima | Contratos verificables y validación compartida para prioridad, fechas, roles y formularios. Empezar por módulos tocados y fronteras API. |
| TanStack Query | Próxima | Centralizar carga, errores, invalidación y caché. Claves incluyen estudio/usuario; limpiar caché al salir y revalidar permisos. |
| Playwright | Antes de beta | Escenarios completos con dos estudios, independientes, archivo privado y sesión caducada. |
| PostgreSQL administrado | Antes de SaaS compartido sostenido | Concurrencia, operación y mejores restricciones. Migración ensayada con recuentos, relaciones y rollback. |
| Supabase Database y Storage privados | Candidato preferente para evaluar | Reúne servicios administrados; mantener API como frontera inicialmente. No activar el SQL antiguo ni migrar Auth simultáneamente sin necesidad. |
| Autenticación administrada | Evaluación separada | Puede reducir mantenimiento de recuperación/MFA; exige migración de identidades y permisos. Corregir revocación actual primero. |
| Sentry o equivalente + health checks | Antes de beta | Detectar fallos reales sin esperar una captura del usuario. Redactar datos personales; evitar replay de expedientes por defecto. |
| Cola/jobs persistentes con idempotencia | Cuando se automaticen avisos/OCR | Reintentos, historial y recuperación tras caída; empezar con una tabla outbox y worker si basta. |
| OCR/extracción con página de origen | Después de estabilizar operación | Ahorra carga de datos; toda extracción es propuesta revisable. Evaluar con documentos representativos y errores medidos. |
| n8n | Opcional después | Automatización periférica supervisada. No trasladar allí autorización, ledger de pagos ni reglas críticas de plazo. |
| RAG/vector search/IA jurídica | Postergar | Solo con corpus autorizado, referencias comprobables y evaluación. Mantener la decisión histórica de jurisprudencia oficial sin IA hasta que se redefina. |

Fuentes técnicas: [migración gradual a TypeScript](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html), [Zod](https://zod.dev/), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview), [Playwright](https://playwright.dev/docs/intro), [Storage privado](https://supabase.com/docs/guides/storage/security/access-control), [Sentry React](https://docs.sentry.io/platforms/javascript/guides/react/), [operación de n8n](https://docs.n8n.io/hosting/).

Estas son recomendaciones de arquitectura, no presupuestos contratados. Comparar costo total: base, backups, archivos, tráfico, correo, monitoreo, soporte y tiempo de mantenimiento. No iniciar una migración a Next.js, microservicios, Kubernetes o múltiples herramientas de agentes sin una necesidad medible.

## 8. Gobierno del producto y propiedad comercial

Como fundador, tu responsabilidad más valiosa es definir problema, alcance, aceptación y precio; no necesitas revisar cada línea para dirigir bien el producto. Sí necesitás evidencia independiente en autenticación, tenants, dinero y migraciones.

Cada cambio por prompts debe terminar con: versión base, cambios concretos, prueba que fallaba y ahora pasa, migración reversible, riesgos y validación de uso. Una única carpeta o rama por entrega, PR pequeño y revisión sobre el mismo commit. Los documentos de entrega deben declarar “implementado”, “probado”, “revisado” y “publicado” por separado.

El repositorio aún describe Lamberti & Pleitel, author vacío y license ISC en package.json. Eso no decide titularidad jurídica, pero requiere alinear identidad comercial, licencias, aportes de colaboradores y contratos con tu proyecto. No asumir exclusividad solo porque la idea y los prompts son propios; documentar los acuerdos aplicables y licencias de terceros.

El plan de ejecución, responsables, dependencias, criterios de aceptación y prompts de trabajo están en [PLAN_BETA_HOYPORHOY_2026-11-12.md](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/PLAN_BETA_HOYPORHOY_2026-11-12.md>).
