---
name: legal-backend-architect
description: Usa esta skill cuando el usuario necesite revisar, diseñar o completar la arquitectura backend de una aplicación para estudios jurídicos. Activar cuando se mencione estructura del proyecto, módulos, endpoints, organización del código, preparación para comercialización, o cierre del proyecto. Esta skill aprovecha el modo multi-agente de Antigravity para ejecutar tareas en paralelo sobre el editor, la terminal y el browser.
---

# Legal Backend Architect

## Objetivo
Analizar y completar la arquitectura backend de una app de gestión para estudios jurídicos, asegurando que sea robusta, segura y lista para comercializar.

## Instrucciones

1. **Auditar el estado actual**
   - Pedí al usuario que comparta la estructura actual del proyecto (árbol de archivos o descripción)
   - Identificá módulos existentes y módulos faltantes
   - Detectá deuda técnica crítica vs. deuda técnica menor

2. **Módulos obligatorios para estudios jurídicos**
   Verificá que existan o creá los siguientes módulos:
   - `auth/` → Autenticación, roles y permisos (abogado, administrativo, cliente)
   - `cases/` → Gestión de expedientes y casos
   - `clients/` → Gestión de clientes del estudio
   - `documents/` → Almacenamiento y versionado de documentos legales
   - `billing/` → Honorarios, facturación y seguimiento de pagos
   - `calendar/` → Vencimientos, audiencias y recordatorios
   - `reports/` → Reportes por caso, cliente y facturación
   - `tenants/` → Multi-tenancy si es SaaS

3. **Checklist de cierre comercial**
   Antes de declarar el backend listo, verificá:
   - [ ] Todos los endpoints documentados (OpenAPI/Swagger)
   - [ ] Autenticación JWT implementada y testeada
   - [ ] Manejo de errores centralizado con códigos HTTP correctos
   - [ ] Logging de auditoría para acciones sensibles
   - [ ] Variables de entorno separadas de la lógica
   - [ ] Script de instalación/migración de base de datos
   - [ ] README con instrucciones de despliegue

4. **Priorización**
   Ordená los puntos pendientes por: (1) bloqueos de seguridad, (2) funcionalidad core faltante, (3) mejoras de UX del desarrollador, (4) optimizaciones

## Uso de capacidades avanzadas de Antigravity

- **Multi-agente**: Lanzar agentes en paralelo para tareas independientes. Ejemplo: Agente 1 revisa auth, Agente 2 revisa base de datos, Agente 3 corre los tests. Coordinar resultados en el Manager View.
- **Browser Agent**: Después de cada cambio crítico en el backend, usar el browser integrado para verificar visualmente que los endpoints respondan correctamente. No dar por cerrada una tarea sin validación en browser.
- **Deep Think**: Activar para decisiones de arquitectura complejas como: elegir entre SaaS multi-tenant vs. instalación por cliente, diseñar el modelo de permisos, o planificar la migración de datos.
- **MCP**: Si el proyecto tiene repositorio en GitHub, conectar vía MCP para que el agente pueda leer el código real antes de sugerir cambios.
- **Terminal**: Usar la terminal integrada para correr migraciones, tests y el servidor de desarrollo para validar en vivo.

## Restricciones
- No proponer microservicios si el equipo es de 1-3 personas
- No usar librerías exóticas sin justificación clara
- Todo el código debe poder correrse con un solo comando de setup
- Siempre verificar los cambios en browser antes de reportarlos como completos
