---
name: skill-creator
description: Diseña, crea, revisa y mejora skills de Antigravity para HoyporHoy. Usar cuando se pida una habilidad nueva, actualizar SKILL.md, eliminar duplicaciones o convertir un proceso repetible en una skill.
---

# Skill Creator de HoyporHoy

## Objetivo
Transformar pedidos repetibles en habilidades pequeñas, verificables y activables por contexto. Las skills de agente son instrucciones de desarrollo: **no** equivalen a funcionalidades instaladas para usuarios finales.

## Procedimiento
1. Leer `.agent/AGENTS.md`, las skills disponibles en `.agents/skills/` y los archivos reales involucrados. No asumir que la documentación antigua coincide con la rama actual.
2. Determinar si el pedido requiere una skill de agente, código en `server/src/skills/` o ambos. Para una funcionalidad de la app, describir la diferencia.
3. Buscar solapamientos y preferir ampliar una skill existente antes de crear una duplicada. Mantener un propósito concreto por skill.
4. Elegir slug único en minúsculas con guiones. Crear `.agents/skills/<slug>/SKILL.md` con YAML inicial `name` y `description` (cuándo debe activarse, expresado en tercera persona).
5. Escribir el procedimiento ejecutable por un agente: entradas, pasos, archivos relevantes, restricciones, criterios de aceptación y verificación. Enlazar a otra skill si corresponde, sin copiarla entera.
6. Evitar instrucciones que habiliten despliegues, eliminaciones, cambios de permisos o alteraciones de datos reales sin autorización.
7. Revisar el manifiesto, las rutas y que ninguna skill contradiga el aislamiento entre estudios. Actualizar el índice de skills.

## Contrato para toda nueva skill
- Español en instrucciones y UI; nombres de variables y código en inglés.
- Entorno fijo: Node.js/Express ESM, Prisma, React/Vite/Tailwind, JWT/bcryptjs, Vitest/Supertest, docx.
- Contexto jurídico argentino; Córdoba como jurisdicción principal.
- Acceso autenticado con `protect`, aislamiento por `studioId`, permisos por rol y soft delete.
- Mostrar archivos exactos, dependencias `npm install ...`, migraciones `npx prisma migrate dev --name ...` y cambios colaterales **si corresponden**.
- Priorizar MVP funcional frente a abstracciones o dependencias nuevas.

## Validación
- YAML de apertura/cierre correcto; campos `name` y `description` no vacíos.
- Directorio igual al `name`; activación distinguible de las demás.
- Ningún secreto, dato de cliente o credencial en ejemplos.
- Al crear una skill: informar qué problema resuelve, cómo invocarla, qué archivos se tocaron y qué **no** se implementó.
