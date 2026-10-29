# Prueba integral local — 29/10/2026

Resultado: circuito funcional comprobado con datos ficticios y dos roles, mediante API real y comprobación posterior en navegador con compilación de producción. No sustituye la validación de uso de Ema ni la revisión técnica externa.

## Escenario y resultados

- Estudio separado, abogada revisora y operador responsable. Base temporal `C:/Users/Usuario/AppData/Local/Temp/lyp-browser-cUmpax/test.db`; la base habitual se conservó.
- Documentación: creación de requisito, presencia en pendientes del operador, archivo privado PNG, recepción por el operador, rechazo de verificación por ese rol (403), aparición para revisión del abogado, verificación y retiro del pendiente. Tres eventos conservados.
- Escritura: creación de tarea con escrito obligatorio, inicio, versión 1 y entrega, pedido de corrección, reinicio, versión 2 y segunda entrega. Se creó una versión 3 antes de aprobar. La aprobación quedó vinculada exclusivamente a la versión 2 y desapareció de pendientes de revisión. Siete eventos conservados.
- Cobranza: acuerdo de $100,25 con vencimiento del día, aparición en pendientes, pago de $40,10, saldo de $60,15, segundo pago de $60,15 y saldo cero. Se conservaron ambos pagos y se retiró la cuota pendiente. Se volvió a ingresar y consultar el acuerdo, con el mismo resultado.
- Navegador con ingreso nuevo como abogada: documento verificado con fecha 29/10/2026 a las 18:00, tarea aprobada sobre versión 2, escrito disponible en versión 3, acuerdo cancelado y pagos visibles. Mi jornada muestra «Sin cuotas pendientes en este período».

## Corrección durante la prueba

Se corrigió el horario de seguimientos para usar Córdoba y formato de 24 horas en carga, edición y visualización. La prueba específica de conversión pasó y la compilación usada en esta pasada incorporó la corrección. El navegador mostró las 18:00 correctamente. No se alteraron fechas históricas.

## Reproducción

Desde la raíz, con dependencias y Prisma generado:

1. Ejecutar `node server/scripts/verify-client-browser.mjs --full-flow`. Crea una instancia temporal solo en 127.0.0.1:4317 y muestra su directorio.
2. En otra terminal ejecutar `node server/scripts/check-full-flow.mjs` una sola vez sobre esa base nueva. El script usa exclusivamente esa dirección y credenciales ficticias; termina ante cualquier aserción fallida. No repetir contra la misma base porque el escenario crea un acuerdo único por expediente.
3. Ingresar en esa instancia con la cuenta ficticia del verificador y consultar el expediente y Mi jornada.

La ejecución aprobó las tres etapas del script. Las transiciones se realizaron por API autenticada; esta pasada no representa una ejecución manual de cada botón por ambos roles. Se verificaron los resultados finales en pantalla. No se enviaron mensajes, no hubo pagos reales ni publicación.

Evidencia visual: `prueba-integral-documentacion-cobro.png` en la carpeta de evidencias de esta sesión. Persiste la advertencia conocida de tamaño del módulo Excel durante la compilación.
