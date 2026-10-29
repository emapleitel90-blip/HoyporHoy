# Modificación de acuerdos y cuotas — 28/10/2026

Implementada y activada localmente. Permite corregir la descripción, modificar importes y vencimientos y agregar cuotas al final, conservando pagos e historial. La revisión técnica externa de Bartolito y la validación de uso por Ema siguen pendientes.

## Flujo de uso

En Honorarios y cobranzas, un abogado o administrador con acceso al expediente puede abrir Modificar acuerdo. El formulario conserva los datos y la versión que tenía al abrirse. Exige un motivo de hasta 2000 caracteres. Cancelar no guarda cambios; ante un error se conserva la edición para reintentar.

Las cuotas existentes mantienen sus identificadores, número y pagos. No se pueden eliminar ni reordenar. Se admite ajustar su importe, siempre que no sea inferior a lo efectivamente abonado, cambiar su vencimiento y agregar cuotas nuevas hasta el límite de 60. Las cuotas nuevas no reciben pagos anteriores. Moneda ARS y límite de $20.000.000 por cuota se mantienen.

Cada modificación guarda motivo, autor, fecha y valores completos de antes y después. El panel permite desplegar esa comparación; los registros anteriores no se reescriben. Saldo y recordatorios se calculan con el acuerdo vigente. Mi jornada vuelve a filtrar según los vencimientos y saldos nuevos.

## Integridad y concurrencia

- FeeAgreement agrega una versión inicial 1. Cada pago nuevo, anulación nueva y modificación incrementa esa versión dentro de la misma transacción. Reintentar una solicitud ya aplicada no la incrementa otra vez.
- Guardar una modificación requiere la versión leída al abrir el editor. Si otra persona registró un pago, una anulación o un cambio, el servidor devuelve 409. La edición se conserva; descartarla y cargar el acuerdo vigente requiere una acción explícita del usuario.
- La comprobación y el incremento de versión son atómicos. Cambios de cuotas, descripción e historial se confirman juntos; si falla la auditoría, se revierte toda la operación.
- Reintentos con el mismo UUID y contenido normalizado devuelven el acuerdo actual sin recrear cuotas ni duplicar historial. Reutilizarlo con otros valores se rechaza.
- Se rechazan modificaciones sin cambios, cuotas ajenas, identificadores duplicados o reordenados, fechas inválidas, importes fuera de rango y la eliminación de cuotas previas.
- La interfaz descarta respuestas y errores GET anteriores al comienzo de una mutación. Una lectura tardía ya no puede reemplazar el saldo nuevo por uno viejo ni ocultar un guardado correcto. Dos pruebas de regresión cubren ambos casos.
- Los controles conservan el aislamiento por estudio/titular independiente, el usuario activo, el rol actual y la exclusión de expedientes eliminados. El operador puede leer el historial, pero no modificar el acuerdo.

API: POST `/api/fees/case/:caseId/amendments` con `requestId`, `expectedVersion`, `reason`, `description` y la lista completa de cuotas existentes, seguida de las nuevas. Cada cuota indica importe decimal y fecha calendario; las existentes incluyen su ID. La respuesta contiene el acuerdo completo y `amendments`, con las instantáneas `before` y `after`.

## Migración y conservación de datos

Migración aditiva `20261028020000_fee_agreement_amendments`: agrega `FeeAgreement.version` con valor 1 y la tabla FeeAgreementAmendment. Incluye unicidad por solicitud y por versión del acuerdo; su historial impide borrar el acuerdo asociado.

Se ensayó en una copia consistente antes de aplicarla en la base habitual. El helper compara conteos y SHA-256 de todos los campos que existían antes de la migración, incluyendo las tablas monetarias, y verifica el valor inicial de la columna nueva. La comparación pasó antes y después de la aplicación.

Respaldo privado: `server/scratch/fees-migration-1793227909051/before.db`; ensayo: `trial.db` en la misma carpeta. Se conservaron 4 expedientes, 2 archivos, 3 clientes, 1 configuración, 1 estudio y 2 usuarios. Las tablas de honorarios de la base habitual seguían vacías; las modificaciones ficticias se hicieron en otra base temporal.

Para otra instalación, desde `server`, con respaldo y migraciones anteriores aplicadas: `node scripts/apply-fees-migration.mjs 20261028020000_fee_agreement_amendments`. El helper se detiene si encuentra otro conjunto de migraciones pendientes. Generar Prisma y reiniciar el servidor para cargar el código nuevo.

## Validación

- Servidor completo: **266 pruebas aprobadas** en 15 archivos.
- Cliente completo: **69 pruebas aprobadas** en 8 archivos. Total: **335 pruebas**.
- Comandos: `npm --prefix server test -- --maxWorkers=1 --testTimeout=15000` y el equivalente con `client`.
- 15 pruebas nuevas de API y una de migración cubren conservación de pagos, versiones, reintentos, permisos, concurrencia, validaciones, historial inmutable y rollback ante un fallo de auditoría. La migración se ensayó también con registros monetarios previos no vacíos.
- Nueve pruebas nuevas del editor cubren envío de IDs y versión, cuotas nuevas, reintentos, conflictos, cancelación, validaciones, respuesta inválida, consulta del operador y las dos respuestas GET tardías.
- ESLint sin observaciones y compilación de producción correcta. Entrada JavaScript: 264,62 kB; el módulo de honorarios queda separado. Se conserva la advertencia anterior del archivo de Excel bajo demanda. No se agregaron dependencias.
- La primera ejecución dirigida del servidor agotó el tiempo de preparación bajo carga concurrente; la repetición aislada y la suite completa posterior pasaron. El ensayo SQL de la prueba también se ajustó para ignorar comentarios antes de separar sentencias; no se reescribió una migración aplicada.

Guías aplicadas: React Best Practices para separar editor e historial, conservar borradores y controlar respuestas asíncronas; Full-Story Verification para contrastar navegador, API y SQLite. La implementación se resolvió con el código y dependencias locales.

### Evidencia en navegador

Compilación de producción y rutas reales en `127.0.0.1:4317`, con base y datos ficticios:

| Paso | Resultado observado |
|---|---|
| Acuerdo inicial | Cuota de $100,25, pago anterior de $40,10 y saldo $60,15. |
| Modificación | Descripción nueva; cuota original pasa a $120,25 y vence el 15/11/2026; se agrega una cuota de $50,00 para el 29/10/2026. |
| API y persistencia | POST de modificación devuelve 200; recargar conserva el acuerdo y el historial. |
| Saldo | Total $170,25, pagado $40,10 y saldo $130,15. El pago original permanece igual. |
| Historial | Versión 1 → 2, motivo, nombre del autor y ambos estados completos. |
| Recordatorio del expediente | Copiado con vencimiento 15/11/2026 y saldo $80,15 de la primera cuota. |
| Mi jornada | Muestra la segunda cuota por $50,00; la primera ya no cae dentro de los próximos siete días. Su recordatorio copiado indica $50,00 y 29/10/2026. |

El portapapeles se contrastó con el navegador visible y enfocado: la instancia oculta conservó el texto anterior en el portapapeles del equipo y no se tomó como evidencia de copiado correcto. El contraste en primer plano confirmó los valores nuevos. No se observaron errores ni advertencias de consola en el circuito.

Consulta final de la base ficticia: 1 acuerdo, 1 pago original, 1 modificación y 4010 centavos abonados. La instancia quedó detenida. Para reproducir: `node server/scripts/verify-client-browser.mjs --amendments` desde la raíz.

Captura: `C:/Users/Usuario/.codex/visualizations/2026/10/26/01a178ea-851f-7d61-aee0-d250cd3ed11d/modificacion-acuerdo-verificada.png`.

## Pendientes del producto

La eliminación o renumeración de cuotas no forma parte de esta entrega. La ampliación posterior de [comprobantes de pagos e historial de reemplazos](ENTREGA_COMPROBANTES_PAGOS.md) quedó implementada y activada localmente, con migración respaldada, circuito en navegador y 360 pruebas aprobadas; su entrega registra las condiciones de ejecución. Otras monedas, conciliación bancaria y avisos automáticos siguen pendientes, al igual que versiones de escritos e integraciones judiciales. Los cambios se validaron localmente; publicación y revisión técnica externa siguen separadas de esta entrega.
