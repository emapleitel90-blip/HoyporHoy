---
name: mvp-legal-architect
description: Define alcance, prioridades y criterios de aceptación del MVP de HoyporHoy para estudios jurídicos argentinos. Usar al planificar funcionalidades, ordenar roadmap, evaluar ideas o preparar pilotos comerciales.
---

# Arquitectura de producto MVP — HoyporHoy

## Propósito
Construir un espacio operativo compartido para abogados, no un catálogo de formularios. La demostración debe recorrer un trabajo jurídico real de principio a fin.

## Flujo mínimo demostrable
1. ADMIN crea o administra usuarios del estudio; LAWYER y OPERATOR ingresan según permisos.
2. Se registra un consultante y un expediente con carátula, fuero, jurisdicción, número judicial si existe y abogado responsable.
3. Se asigna una tarea/escrito a un colaborador; se visualiza el avance y se revisa el resultado.
4. Se adjunta y recupera documentación autorizada; se genera un borrador .docx vinculado al expediente.
5. Se agenda un vencimiento con fuente/fecha verificadas y se consulta desde Mi Jornada.
6. ADMIN obtiene una vista consolidada del estudio sin revelar datos de otros tenants.

## Prioridades
- **P0 seguridad bloqueante:** `studioId` derivado del usuario autenticado, acceso seguro a archivos, secretos, autorización y tests de aislamiento auténticos. No demos con expedientes reales antes de resolverlo.
- **P1 flujo de valor:** expediente rápido, responsable, tareas/revisión, documentos y agenda vinculados.
- **P2 experiencia comercial:** panel claro, datos ficticios, recorrido de demo, onboarding corto, responsive.
- **Fuera del MVP:** integraciones judiciales automáticas, cálculo jurídico definitivo de plazos, facturación completa, portal de clientes, chat en tiempo real e IA autónoma que formule actos procesales.

## Método de trabajo
1. Inspeccionar componentes, endpoints, esquema y tests existentes antes de proponer entidades nuevas.
2. Redactar historia de usuario: «Como [rol], quiero [acción] para [resultado]».
3. Dibujar recorrido en pantalla y contratos de API; definir permisos por rol y `studioId`.
4. Separar reutilización, bug, nuevo desarrollo y futura fase.
5. Especificar criterios de aceptación visibles, casos vacíos, errores y tests.
6. Implementar en incrementos demostrables; nunca presentar una pantalla simulada como módulo operativo.

## Entregable
Tabla breve: necesidad del estudio, estado actual verificado, brecha, prioridad, archivos afectados, esfuerzo relativo, dependencias y prueba de aceptación. Señalar «propuesta» vs. «implementado».

## Base técnica
Mantener Node 18+/Express ESM/Prisma (SQLite dev; PostgreSQL prod), React 18/Vite/Tailwind, JWT y Vitest/Supertest. Respetar `.agent/AGENTS.md` y las skills de seguridad, expedientes y QA.
