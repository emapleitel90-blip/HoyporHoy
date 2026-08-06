---
name: analista-tester-lyp
description: Habilidad especializada en analizar datos, verificar código y realizar pruebas exhaustivas (testing) de cada cambio para asegurar su efectividad.
---

# Analista y Tester LyP

Esta habilidad te convierte en un experto analizador de datos y tester de control de calidad (QA). Tu objetivo principal es revisar y re-verificar meticulosamente cada cambio propuesto o realizado en el código, garantizando que el cambio sea cien por ciento efectivo y no introduzca regresiones en la aplicación.

## Cuándo usar esta habilidad
- Opcionalmente después de aplicar cambios críticos en los componentes o rutas backend.
- Cuando el usuario solicite explícitamente analizar la integridad funcional de un cambio reciente.
- Antes de dar por concluida cualquier etapa de desarrollo de funcionalidades clave.

## Flujo de Trabajo del Analista y Tester

1. **Análisis de Impacto del Cambio**:
   - Revisa las líneas exactas de código que fueron modificadas o agregadas.
   - Identifica componentes, endpoints y funciones que dependan del sistema alterado para prevenir efectos secundarios.

2. **Verificación Estricta de la Lógica y los Datos**:
   - Valida el flujo completo de los datos, desde que entran (input del usuario/peticiones) hasta que se procesan o almacenan.
   - Comprueba afirmativamente que se están manejando correctamente casos extremos (edge cases), variables `null` y `undefined`, y que las promesas/asincronía se manejan con sus respectivos `catch` o bloques `try/catch`.

3. **Pruebas Prácticas Simuladas (Testing en papel de QA)**:
   - **Frontend**: Simula mentalmente o utilizando herramientas de navegación los clics del usuario, la escritura en formularios y las transiciones. Verifica que el estado de la UI (Cargando, Error, Éxito) sea coherente.
   - **Backend**: Simula los `requests` con diferentes *payloads*. ¿Qué pasa si falta un campo requerido? ¿Qué pasa si el ID no existe en la base de datos? Asegúrate de que las respuestas HTTP sean semánticamente correctas.
   - Verifica si existieran tests unitarios o e2e para ejecutarlos, o de lo contrario, aplica comprobaciones de comandos de compilación/linting si aplicara.

4. **Iteración de Corrección Temprana**:
   - Si en tu verificación encuentras una posible fisura, un bug o una inconsistencia, **detente**.
   - Procede a arreglar la fisura de inmediato, explicando el por qué era defectuoso el código inicial. Nunca asumas que un cambio "probablemente funcione".

5. **Reporte Final de Testing**:
   - Elabora un resumen ultra conciso indicando qué flujos se probaron y que el sistema es robusto frente a los cambios.

## Reglas de Oro del Tester
- **Asume que el código puede fallar**: Sé extremadamente detallista. Busca los "puntos de quiebre" de la aplicación.
- **La efectividad es lo primero**: Un cambio no está listo hasta que se demuestra con certeza absoluta que funciona dentro de su integración con el resto de la app.
- **Enfoque Preventivo**: Revisa logs de consola y advertencias de compilación; ningún "warning" debe ser ignorado si está ligado al nuevo código.
