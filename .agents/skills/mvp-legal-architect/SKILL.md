---
name: mvp-legal-architect
description: Define alcance, prioridades y criterios de aceptación del MVP de HoyporHoy para estudios jurídicos argentinos. Usar al planificar funcionalidades, ordenar roadmap, evaluar ideas o preparar pilotos comerciales.
---

# Arquitectura funcional del MVP — HoyporHoy

## Propósito
Transformar HoyporHoy en el entorno de trabajo cotidiano de un estudio, no en un formulario extenso. **Nuestro carril es producto, experiencia y funcionalidad.** Bartolito es responsable del análisis de seguridad y revisión de cambios técnicos sensibles.

## Flujo de valor
1. El abogado abre la plataforma y consulta Mi Jornada.
2. Encuentra o crea un expediente con carátula, fuero, cliente, responsable y estado.
3. Asigna una tarea o borrador al abogado junior.
4. El junior actualiza avance, adjunta trabajo y lo envía a revisión.
5. El titular aprueba o devuelve con observaciones. Se conserva la trazabilidad.
6. Ambos consultan documentación y plazos asociados al expediente.

## Prioridad de desarrollo funcional
- **F1 — ficha y carga rápida:** expediente claro y recuperable, sin obligar a completar 13 secciones.
- **F2 — colaboración (primer módulo nuevo):** tareas por expediente, estados, asignación, revisión y actividad.
- **F3 — jornada integrada:** vencimientos judiciales y tareas internas diferenciados, responsables visibles.
- **F4 — documentos:** generar borradores DOCX, adjuntarlos y revisarlos desde el expediente.
- **F5 — demo:** UX desktop/móvil, datos ficticios y recorrido repetible para abogados.
- **Más adelante:** portal clientes, integraciones judiciales, facturación completa, chat simultáneo, IA autónoma.

## Acuerdo sobre seguridad
No se asume que seguridad está resuelta; Bartolito revisa `tenant-security` y las pruebas de aislamiento. Nosotros **no** alteramos middleware de protección, reglas de roles o filtrado de estudio como atajo. Todo endpoint/modelo nuevo deberá respetar `studioId`, `protect` y los permisos existentes y ser revisado antes de un piloto real. Desarrollo y demostración inicial solo con datos ficticios.

## Método
1. Comprobar el código existente antes de proponer cambios; leer `docs/MVP_FUNCIONAL.md`.
2. Formular historia de usuario (rol, acción, resultado), flujo UI y criterio de aceptación observable.
3. Diseñar el cambio mínimo en componentes, endpoints y entidades, reutilizando `Case`, `TimelineEvent`, `Deadline` y `CaseFile` cuando corresponda.
4. Separar claramente tarea interna de actuación judicial y plazo procesal.
5. Identificar cambios de Prisma/permisos para revisión técnica de Bartolito antes de implementarlos.
6. Implementar por incrementos funcionales y validarlos con datos sintéticos; no vender una pantalla simulada como funcionalidad real.

## Entregable
Para cada función: pantalla, comportamiento, dato guardado, archivos exactos, requerimiento de migración, tests y demo de aceptación. Marcar PROYECTADO / IMPLEMENTADO / VERIFICADO.

## Stack invariable
Node 18+/Express ESM, Prisma SQLite dev/PostgreSQL prod, React 18/Vite/Tailwind, JWT, docx, Vitest/Supertest. Seguir `.agent/AGENTS.md` sin introducir dependencias o refactors innecesarios.