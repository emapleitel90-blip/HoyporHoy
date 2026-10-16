---
name: mvp-qa
description: Ejecuta y diseña pruebas reales del MVP de HoyporHoy antes de pilotos con estudios jurídicos. Usar para smoke tests, Vitest, Supertest, regresión, criterios de aceptación y detección de controles de seguridad ficticios.
---

# Validación end-to-end del MVP

## Enfoque
Probar el recorrido de negocio y sus barreras de seguridad en vez de conformarse con compilación exitosa.

## Matriz de pruebas
1. Login válido, inválido, usuario desactivado y ruta sin JWT.
2. Estudio A y B: listas, detalle, modificación, adjuntos, plazos, tareas y documentos; probar URLs conocidas cruzadas.
3. Crear expediente y persistir; no aceptar `studioId` arbitrario enviado por cliente.
4. Asignar tarea y concluir ciclo de revisión, cuando el módulo exista.
5. Registrar un vencimiento, verlo en Mi Jornada y marcar cumplido; repetir comprobación tras recargar.
6. Subir/descargar archivo con y sin permisos; bloquear URLs públicas.
7. Generar borrador DOCX, abrirlo y validar campos jurídicos sin suponer presentación real.
8. UI móvil: camino feliz, loading, vacío, error y falta de permiso.
9. Integridad: soft delete, ausencia de filtración de DNI/CUIT en errores/logs y mensajes no engañosos de IA.

## Herramientas
Vitest + Supertest para backend; priorizar pruebas de integración con datos aislados y fixtures ficticios. Compilar cliente con `npm run build`. No incorporar Playwright/Cypress salvo decisión explícita. No usar tests `expect(true).toBe(true)` como evidencia de aislamiento.

## Criterio de salida
P0: cero vulnerabilidades críticas conocidas; suite de aislamiento verde con pruebas auténticas.
P1: flujo completo repetible, sin errores de persistencia.
P2: demo en desktop y móvil, con datos de ejemplo y feedback claro.

## Informe final
Por cada caso: pasos, resultado esperado, observado, evidencia, severidad, archivo relevante y estado PASS/FAIL/BLOCKED. Si solo se agregó documentación, indicar que la aplicación no fue probada.
