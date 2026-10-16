---
name: tenant-security
description: Audita y corrige fallas críticas de autenticación, roles, aislamiento entre estudios, archivos, credenciales y protección de datos en HoyporHoy. Usar en cambios de Prisma, Express, middleware, permisos, uploads o preparación de pilotos.
---

# Seguridad y aislamiento — gate bloqueante

## Riesgos presentes al crear esta skill
En la rama de desarrollo revisada: `caseController.js` acepta `studioId` del body al crear expedientes; `src/index.js` expone `/uploads` estáticamente; el buscador IA recibe API key por parámetro; hay controles de estudio que pueden igualar dos valores `null`. Las pruebas anteriores informaron placeholders en algunos casos. Son bloqueos, no hallazgos resueltos.

## Política obligatoria
1. Toda ruta privada usa `protect`; permisos `SUPER_ADMIN`, `ADMIN`, `LAWYER`, `OPERATOR` validados en servidor.
2. El `studioId` se deriva de `req.user`; **nunca** del body/query, salvo operaciones expresamente autorizadas a SUPER_ADMIN con validación separada.
3. En casos y relaciones aplicar `tenantWhere(user)` o una función compartida equivalente, con `deletedAt: null` donde corresponda. El perfil independiente requiere propiedad explícita por `createdById`; prohibido autorizar con igualdad `null === null`.
4. Comprobar la relación padre-hijo en plazos, gastos, documentos, adjuntos y tareas; consultas por ID siempre autorizadas, incluso escritura y descarga.
5. Proteger archivos mediante endpoint autenticado, validación de tipo y tamaño, ruta de almacenamiento no pública, nombres seguros y acceso limitado por expediente.
6. Exigir secretos robustos por configuración; no exponer JWT, API keys, DNI, CUIT o contenido sensible en logs. No commitear `.env`. Rotar cualquier credencial comprometida y revisar historial Git.
7. Mantener soft delete para User y Case. Proteger datos personales conforme a Ley argentina 25.326; limitar exposición de información y accesos.
8. No eliminar datos, reescribir historial, rotar secretos o desplegar sin aprobación explícita.

## Pruebas que demuestran seguridad
Crear estudio A, estudio B y usuario independiente; usar expedientes y documentos reales de prueba separados. Para listados, lecturas, actualizaciones, descargas y generador: comprobar 200 autorizado, 401 sin login y 403/404 cross-tenant. Verificar que SUPER_ADMIN opere solo según su rol y que los usuarios eliminados pierdan acceso.

## Resultado esperado
Informe reproducible: ruta/línea, severidad, escenario de explotación, arreglo mínimo, test que falla antes y pasa después, riesgo residual. No dar por seguro el producto por tests ficticios.
