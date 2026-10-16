---
name: demo-pilot
description: Prepara demostración comercial y piloto controlado de HoyporHoy para estudios jurídicos de Córdoba. Usar al armar demo, datos ficticios, guion comercial, onboarding, feedback o checklist de salida a pilotos.
---

# Demo y piloto jurídico

## Objetivo
Mostrar una jornada de estudio jurídico comprensible en 8–12 minutos sin vender funciones aún inexistentes.

## Escenario de demostración
- Estudio ficticio «Estudio Demo Córdoba», abogado titular y colaborador junior; expedientes y clientes 100% ficticios.
- Iniciar sesión; ver panel y urgencias; crear expediente de prueba; asignar responsable; registrar actividad o tarea; adjuntar documento; generar borrador de escrito; crear vencimiento; abrir Mi Jornada; titular revisa trabajo.
- Para cada paso comprobar que está implementado. Si falta, marcar «en desarrollo» y no simularlo como operativo.

## Antes del piloto
1. Validación P0 de seguridad con `tenant-security` y `mvp-qa`.
2. Datos semilla sintéticos separados por estudio; sin DNI, CUIT o expedientes reales. No usar passwords públicas, por defecto o impresas en README.
3. Crear cuenta individual de prueba con permisos mínimos; no facilitar cuenta SUPER_ADMIN a invitados.
4. Revisar respaldo, restauración, borrado/retención, acceso a adjuntos, gestión de incidencias y mecanismo de feedback.
5. Probar recorrido en móvil y una conexión de red normal; gestionar errores de servidor sin perder datos.
6. Presentar claramente límites de cálculo de plazos, generación de escritos e IA de jurisprudencia.
7. Recopilar problemas reales: tiempo de alta, tareas repetidas, búsquedas, dificultades y disposición a seguir usándolo.

## Criterio de éxito piloto
El estudio carga expedientes, organiza responsabilidades, consulta vencimientos y localiza documentos sin depender de soporte constante. Medir ejecución real, no solo comentarios sobre la estética.

## No hacer
No conectar sistemas judiciales, enviar datos a proveedores de IA o habilitar producción con información real como atajo de demo.
