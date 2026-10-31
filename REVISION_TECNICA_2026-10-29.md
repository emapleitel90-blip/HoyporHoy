# Paquete para revisión técnica — 29/10/2026

Estado actualizado el 31/10/2026: publicado para revisión en la rama `codex/revision-integral-20261029`, PR #2. No se recibió aprobación de Bartolito. Para revisar la entrega de GitHub usar el commit actual del PR; el `MANIFEST.json` del ZIP local identifica únicamente el paquete original del 29/10 y no incluye las ampliaciones posteriores. La carpeta de trabajo mantiene cambios sin commit local.

La actualización de actividad y notificaciones se describe en `ACTUALIZACION_GITHUB_2026-10-31.md` y `ENTREGA_ACTIVIDAD_NOTIFICACIONES.md`.

## Qué revisar primero

1. Aislamiento por estudio y titular: `server/src/utils/caseAccess.js`, middleware de autenticación y todos los controladores de tareas, seguimiento, archivos, honorarios y escritos. Probar otro estudio, otro independiente, expediente eliminado y cuenta desactivada.
2. Revisión exacta de escritos: `taskController.js`, `writingController.js` y las migraciones de escritos y entregas. La aprobación debe apuntar a la entrega y versión exactas; una versión posterior no hereda aprobación. Verificar reintentos y cambios simultáneos.
3. Archivos privados: autorización previa a carga y descarga, validación de formato/tamaño, conservación de comprobantes, limpieza ante fallos y ausencia de acceso público por URL.
4. Dinero: cálculos en centavos, protección contra sobrepago y duplicados, anulación con motivo, control de versión del acuerdo y conservación del historial.
5. Biblioteca: ámbito derivado del expediente autorizado, creación limitada por rol y actor activo dentro de la transacción, texto tratado literalmente, copia sin modificar originales y protección del borrador.
6. Seguimientos: conversión explícita de Córdoba y formato de 24 horas en `client/src/utils/followUpTime.js`; verificar equipos con distintas zonas horarias. La corrección no reescribe datos históricos.

## Evidencia disponible

- Validación conjunta anterior: 351 pruebas del servidor y 103 del cliente. Las ampliaciones posteriores tienen comprobaciones específicas documentadas en cada entrega; no presentar esos totales como una nueva ejecución sobre todos los archivos del paquete.
- Prueba funcional integral: `PRUEBA_INTEGRAL_2026-10-29.md`, con reproducción y límites. Pasó el circuito de documentación, correcciones y aprobación de v2 con v3 existente, dos pagos y retiro del pendiente. Las transiciones se hicieron por API real con ambos roles, con comprobación posterior en navegador.
- `server/scripts/verify-client-browser.mjs --full-flow` crea una base temporal y compila el cliente. `server/scripts/check-full-flow.mjs` ejecuta el escenario únicamente contra localhost:4317. Usar una instancia nueva para cada pasada.
- La migración local y sus respaldos se describen en las entregas; no copiar una base de desarrollo como mecanismo de instalación.

## Cómo ejecutar

Con dependencias instaladas y Prisma generado: `npm run lint`, `npm --prefix server test -- --maxWorkers=1`, `npm --prefix client test -- --maxWorkers=1` y `npm run build`. En esta máquina Windows se usó Node 24.22.1 para Vitest, debido al cierre inesperado observado con Node 24.15.0. La CI está configurada en Node 22 y 24; no se afirma una ejecución remota nueva.

Para una instalación de revisión, configurar una base SQLite nueva y un secreto JWT propio en el servidor; consultar `.env.example`. No usar claves o cuentas reales. Los dos scripts del escenario usan cuentas ficticias en una instancia aislada.

## Registro de observaciones

Por cada hallazgo indicar archivo y línea, comportamiento observado, reproducción, impacto y resultado esperado. Clasificar como bloqueante, importante o mejora. Registrar la huella del archivo revisado y repetir la comprobación después de corregirlo.

La entrega no incluye una auditoría externa completada ni autorización para producción. Permanecen la validación de uso de Ema, la revisión de Bartolito y la preparación de publicación. Jurisprudencia conserva el alcance acordado de fuentes oficiales sin IA.
