---
name: expedientes-core
description: Diseña e implementa el ciclo de vida del expediente jurídico de HoyporHoy, desde alta y búsqueda hasta seguimiento, asignación y cierre. Usar cuando se trabaje en casos, carátulas, fueros, clientes, estados o detalle de expediente.
---

# Expedientes 360 — núcleo del MVP

## Objetivo funcional
Una ficha única concentra información y acciones de cada expediente para el estudio. Evitar que el formulario de 13 secciones impida una carga rápida.

## Recorrido obligatorio
1. Alta rápida con título/carátula, cliente, fuero, jurisdicción, estado y responsable; ampliar datos optativamente después.
2. Distinguir identificador interno `caseNumber` de número judicial real: no inventar número de expediente judicial. Si se requiere nuevo campo, planificar migración.
3. Listado con búsqueda por carátula, cliente y número, filtros por fuero/responsable/estado, orden por última actualización y estados vacíos.
4. Ficha con datos, plazos, archivos, actuaciones, tareas y persona responsable; enlaces reales, no botones decorativos.
5. Modificación con historial o evento de actividad; cierre/reapertura sin perder la trazabilidad. Borrado lógico `deletedAt`.

## Integridad y permisos
- Inspeccionar `server/prisma/schema.prisma`, `server/src/controllers/caseController.js`, `server/src/routes/caseRoutes.js`, `client/src/pages/CreateCase.jsx` y `ViewCase.jsx`.
- En cada operación usar el filtro de tenancy; el cliente nunca define `studioId` ni asigna usuarios de otro estudio.
- Validar que cliente, abogado y expediente pertenecen al mismo estudio. Para usuarios sin estudio, usar política explícita de propiedad individual; no inferir autorización a partir de `null === null`.
- Respetar `protect`, roles y soft delete. La eliminación no debe filtrar resultados ni dejar accesible documentación.
- No mostrar DNI, CUIT ni descripciones sensibles en logs.

## Criterios de aceptación
- Abogado A no ve ni edita expediente, cliente, plazos o archivos del estudio B por URL o API.
- Alta desde móvil en pocos pasos; dato incompleto se puede completar luego.
- Edición y asignación válidas persisten al recargar.
- Un expediente cerrado sigue consultable con permisos y no se confunde con eliminado.
- Pruebas con dos estudios y con usuario independiente cubren accesos permitidos y denegados.

## Entrega técnica
Indicar ruta exacta por archivo cambiado, endpoints, imports, validaciones, migración Prisma y comandos para reproducir tests. No reescribir todo el wizard sin motivo.
