---
name: legal-api-design
description: Usa esta skill cuando el usuario necesite diseñar, revisar o completar endpoints de una API REST para una aplicación de gestión de estudios jurídicos. Activar ante menciones de rutas, endpoints, controladores, request/response, o documentación de API. Usar el browser integrado de Antigravity para testear los endpoints en vivo contra Swagger UI. Usar multi-agente para generar y testear múltiples recursos en paralelo.
---

# Legal API Design

## Objetivo
Diseñar endpoints REST claros, consistentes y completos para cubrir todas las operaciones de un estudio jurídico, siguiendo convenciones que faciliten la integración con frontends y terceros.

## Instrucciones

1. **Convenciones de naming obligatorias**
   - Recursos en plural y kebab-case: `/api/v1/expedientes`, `/api/v1/clientes`
   - Versioning siempre en la URL: `/api/v1/`
   - Verbos HTTP correctos: GET (leer), POST (crear), PUT (reemplazar), PATCH (actualizar parcial), DELETE (eliminar)

2. **Endpoints core para un estudio jurídico**

   **Autenticación**
   ```
   POST   /api/v1/auth/login
   POST   /api/v1/auth/logout
   POST   /api/v1/auth/refresh
   POST   /api/v1/auth/recuperar-password
   ```

   **Expedientes**
   ```
   GET    /api/v1/expedientes              → lista paginada
   POST   /api/v1/expedientes              → crear expediente
   GET    /api/v1/expedientes/:id          → detalle
   PATCH  /api/v1/expedientes/:id          → actualizar
   GET    /api/v1/expedientes/:id/documentos
   GET    /api/v1/expedientes/:id/movimientos
   ```

   **Clientes**
   ```
   GET    /api/v1/clientes
   POST   /api/v1/clientes
   GET    /api/v1/clientes/:id
   PATCH  /api/v1/clientes/:id
   GET    /api/v1/clientes/:id/expedientes
   ```

   **Facturación**
   ```
   GET    /api/v1/honorarios
   POST   /api/v1/honorarios
   PATCH  /api/v1/honorarios/:id/estado    → marcar pagado/pendiente
   GET    /api/v1/reportes/facturacion
   ```

   **Calendario**
   ```
   GET    /api/v1/vencimientos             → filtrable por fecha y expediente
   POST   /api/v1/vencimientos
   PATCH  /api/v1/vencimientos/:id
   DELETE /api/v1/vencimientos/:id
   ```

3. **Formato de respuestas estándar**
   Todas las respuestas deben seguir este formato:
   ```json
   {
     "success": true,
     "data": { ... },
     "meta": { "page": 1, "total": 50 },
     "error": null
   }
   ```
   En error:
   ```json
   {
     "success": false,
     "data": null,
     "error": { "code": "EXPEDIENTE_NOT_FOUND", "message": "El expediente no existe" }
   }
   ```

4. **Documentación automática**
   - Implementar Swagger/OpenAPI desde el primer endpoint
   - Incluir ejemplos de request y response en cada endpoint
   - Exponer la documentación en `/api/docs` solo en entornos no-producción

## Restricciones
- Nunca devolver stacks de error en producción
- Siempre paginar listas (máx. 100 items por página)
- Nunca exponer IDs secuenciales al exterior (usar UUIDs)
