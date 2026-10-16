---
name: deadline-agenda
description: Mejora agenda, vencimientos y Mi Jornada vinculados a expedientes de Córdoba. Usar al trabajar con plazos procesales, recordatorios, fechas, cron, audiencias y alertas.
---

# Agenda y vencimientos confiables

## Alcance
Aprovechar `server/src/skills/deadlineAgent.js`, `deadlineController.js`, `DeadlinePanel.jsx` y `MyDay.jsx`. No crear un segundo agente de vencimientos.

## Reglas jurídicas y operativas
1. Diferenciar audiencia, tarea interna y **plazo procesal**; mostrar tipo, expediente, responsable, fecha/hora y fuente de la fecha cuando corresponda.
2. El usuario registra y confirma la fecha. **No calcular automáticamente vencimientos definitivos** sin jurisdicción, fuero, días hábiles, feriados, notificación y regla procesal verificados.
3. Usar zona horaria `America/Argentina/Cordoba` para presentación; guardar instantes coherentes y probar límites de día, mes y horario.
4. Clasificar vencidos, hoy y próximos 7 días; ordenar por urgencia y permitir marcar cumplido con confirmación.
5. Conservar cron diario a las 07:00; evitar alertas duplicadas, errores silenciosos y avisos a responsables incorrectos.
6. Las notificaciones y endpoints de vencimientos deben aplicar el mismo criterio de tenancy del expediente padre, incluso para usuarios independientes.

## Antipatrón a corregir
No permitir que `studioId=null` habilite a un usuario independiente a leer plazos de otros. No usar un filtro vacío al ejecutar acciones manuales de un usuario común.

## Pruebas mínimas
- Vencimiento ayer/hoy/mañana, límites de fecha local y completados.
- Acceso por ID de otro tenant denegado.
- Duplicados al correr el cron dos veces; asignación a abogado correcto.
- Pantalla vacía, error de red y actualización de datos al marcar cumplido.

## Entrega
Reportar qué cálculos son solo recordatorios operativos y cuáles necesitan validación jurídica humana. No prometer integración con sistemas judiciales sin una fuente real y permisos explícitos.
