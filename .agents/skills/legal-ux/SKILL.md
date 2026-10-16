---
name: legal-ux
description: Mejora experiencia visual y recorridos de HoyporHoy para abogados que operan desde escritorio y celular. Usar al trabajar en dashboard, Mi Jornada, carga rápida, navegación, diseño responsive y usabilidad de demostración.
---

# UX para estudio jurídico — simple y confiable

## Principios
Diseñar para el día laboral del abogado: saber qué vence, qué expediente cambió, qué trabajo debe revisar y quién es responsable. Conservar React 18, Vite, Tailwind y Recharts; no introducir otra librería UI sin necesidad.

## Prioridades UX
1. Dashboard: vencimientos urgentes reales, tareas pendientes de revisión, expedientes recientes, botón «Nuevo expediente» y búsqueda.
2. Alta rápida: pocos campos obligatorios; detalles opcionales después. No eliminar el formulario avanzado sin validar su uso.
3. Ficha de expediente: resumen, responsables, agenda, documentación, actividad y tareas; una acción primaria clara por sección.
4. «Mi Jornada»: lista accionable de vencimientos y trabajos; distinguir plazo jurídico de fecha interna.
5. Responsive: probar ancho móvil, tap targets, navegación con teclado, labels, mensajes accesibles y acciones de guardado/cancelación.
6. Estados: loading, vacío, error de red, falta de permiso, éxito persistido; no usar contadores o botones simulados como hechos reales.
7. Terminología argentina: carátula, expediente, fuero, escrito, cédula, oficio y plazo procesal.

## Implementación
Inspeccionar `client/src/App.jsx`, `Layout.jsx`, `Dashboard.jsx`, `CreateCase.jsx`, `ViewCase.jsx`, `MyDay.jsx`. Reusar componentes, clases y tokens existentes antes de modificar tema o branding. Un cambio UI debe tener soporte real en API cuando implica persistencia.

## Aceptación
Un abogado invitado comprende dónde crear, asignar, revisar y ver vencimientos sin explicación técnica. El flujo clave funciona desde 375px de ancho y escritorio. No filtrar información de otro estudio al cambiar vista.
