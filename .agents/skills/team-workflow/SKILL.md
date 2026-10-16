---
name: team-workflow
description: Diseña colaboración entre abogados titulares, juniors y operadores para asignar trabajos, revisar borradores y registrar avances por expediente. Usar al agregar tareas, aprobaciones, comentarios, historial o supervisión del equipo jurídico.
---

# Trabajo colaborativo del estudio

## Resultado buscado
Que un abogado titular pueda abrir un expediente, asignar trabajo a un junior, revisar su entrega y conocer qué falta, sin intercambiar múltiples versiones por WhatsApp.

## Flujo MVP
1. Crear tarea asociada al expediente: título, descripción, responsable, fecha objetivo opcional y prioridad.
2. Estados simples: `TODO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`; permitir devolver a `IN_PROGRESS` con observación.
3. Colaborador deja comentario, actividad o archivo autorizado; titular revisa y aprueba o solicita corrección.
4. Timeline del expediente registra autor, acción, fecha y relación con tarea o documento, sin exponer información en logs.
5. «Mi Jornada» puede mostrar tareas asignadas junto con vencimientos, pero sin equiparar una tarea interna a un plazo procesal.

## Implementación incremental
- Revisar si `TimelineEvent`, `CaseFile`, `Case` y modelos existentes bastan; si no, proponer `Task` mínima con `caseId`, `studioId`, `assignedToId`, `createdById`, `status` y fechas. Evitar arquitectura de eventos o mensajería externa en MVP.
- El servidor valida que el expediente, asignado y autor pertenecen al mismo tenant; la UI no autoriza por sí sola.
- Definir permisos de ADMIN, LAWYER, OPERATOR sin privilegios implícitos; SUPER_ADMIN es excepcional.
- Todo acceso por ID cruza permiso + pertenencia; considerar soft delete y efecto de una desactivación de usuario.
- Documentos se generan como borradores editables y con revisión humana, nunca como presentados ante tribunal.

## Criterios de aceptación
Titular asigna → junior trabaja → titular devuelve → junior corrige → titular aprueba. Cambio visible en detalle y bandeja personal después de recargar. Un operador de otro estudio no puede consultar la tarea aunque conozca su ID.

## Antes de programar
Entregar propuesta de schema, rutas, pantallas, rol autorizado y pruebas; aplicar migración solo si se aprueba el cambio funcional.
