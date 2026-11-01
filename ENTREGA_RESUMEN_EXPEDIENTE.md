# Resumen del expediente — 01/11/2026

La cabecera del expediente muestra archivos registrados, requisitos documentales sin verificar, documentos recibidos para revisar, compromisos y bloqueos pendientes, y saldo de honorarios. Incluye accesos directos a archivos, seguimiento y honorarios.

El seguimiento y el saldo se consultan al abrir, cada 30 segundos, al recuperar el foco y mediante Actualizar resumen. El contador de archivos usa los datos del expediente cargado. Un archivo adjunto no equivale a un requisito verificado. La ausencia de acuerdo y los errores de consulta tienen mensajes distintos del saldo cero. Las respuestas tardías de otro expediente se descartan y las consultas se cancelan al desmontar.

## Validación

- Seis pruebas específicas aprobadas en CaseProgressSummary.test.jsx y ViewCaseLoading.test.jsx con Vitest, pool threads y un trabajador. El primer intento con procesos separados sufrió un tiempo de espera al iniciar un trabajador; la repetición con threads terminó correctamente.
- ESLint y compilación de producción aprobados. Continúa la advertencia conocida de tamaño del módulo Excel. La salida temporal de compilación permanece en scratch.
- Comprobación en navegador con la cuenta de abogada de demostración: 0 archivos, sin requisitos documentales, 1 compromiso pendiente y saldo de $125.000, coincidentes con las secciones del mismo expediente. Verificado el enlace al seguimiento.
- Revisión de efectos, limpieza, consultas paralelas, estados de carga/error y accesos semánticos siguiendo la skill React Best Practices.

La etapa modifica la interfaz y sus pruebas; no registra pagos, archivos ni cambios de seguimiento. No se repitió la suite completa del servidor porque no se modificó su código. La pasada integral anterior de 471 pruebas corresponde al 31/10/2026.

## Actualización al confirmar cambios

El resumen vuelve a consultar seguimiento y saldo después de crear o editar un seguimiento, realizar sus transiciones, crear o modificar un acuerdo, registrar un pago o anularlo desde el expediente. La confirmación se propaga al padre mediante callbacks; los intentos fallidos no disparan esa actualización. Se conserva el intervalo para cambios realizados en otras ventanas. Los archivos ya se reflejan mediante el estado compartido del expediente.

Se verificaron los callbacks después del éxito y su ausencia ante errores, incluyendo una recarga de seguimiento fallida después de una operación confirmada. También se comprobó la conexión de ambos paneles con la versión de actualización del resumen y la cancelación de consultas anteriores. La validación específica comprende 20 pruebas distintas en cuatro archivos. No se registraron pagos ni transiciones en la base de demostración para esta ampliación.
