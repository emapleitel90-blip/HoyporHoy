---
name: afinador-lyp
description: Habilidad especializada en la finalización, pulido y optimización del proyecto LyP (Legal y Procesal), asegurando coherencia en el diseño, flujo de casos y robustez del backend.
---

# Afinador LyP

Esta habilidad está diseñada para dar los toques finales al proyecto "Ley y Procesal" (LyP).

## Cuándo usar esta habilidad
- Al realizar ajustes finales en la interfaz de usuario (UI) del Dashboard o CaseList.
- Para verificar y pulir la lógica de creación y visualización de casos (CreateCase/ViewCase).
- Para asegurar que los esquemas de Prisma y las rutas del servidor estén alineadas con el frontend.
- Cuando se necesite optimizar el rendimiento o mejorar la experiencia de usuario (UX) en el flujo legal.

## Áreas de Enfoque
1. **Frontend (React + Tailwind)**:
    - Revisar que los componentes en `client/src/components` sean reutilizables y sigan el sistema de diseño.
    - Asegurar que el manejo de estados (Context) sea eficiente.
2. **Backend (Node + Prisma)**:
    - Verificar la integridad referencial en el esquema de Prisma.
    - Validar que las APIs devuelvan errores claros y estructurados.
3. **Flujo de Usuario**:
    - Probar el flujo completo: Login -> Dashboard -> Creación de Caso -> Listado de Casos.

## Instrucciones para el Agente
- Siempre verifica `client/src/pages` antes de sugerir cambios en el flujo de navegación.
- Mantén el estilo de diseño limpio y profesional, adecuado para un entorno legal.
- Asegúrate de que las fechas y estados de los casos se manejen correctamente tanto en el cliente como en el servidor.
