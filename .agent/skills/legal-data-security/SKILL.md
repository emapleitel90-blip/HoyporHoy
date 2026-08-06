---
name: legal-data-security
description: Usa esta skill cuando el usuario necesite implementar o auditar seguridad, privacidad de datos, autenticación, autorización o cumplimiento normativo en una aplicación para estudios jurídicos. Activar ante menciones de login, permisos, roles, datos sensibles, privacidad o encriptación. Usar Deep Think de Antigravity para decisiones de seguridad críticas. Usar el browser integrado para verificar visualmente que los flujos de autenticación funcionen correctamente.
---

# Legal Data Security

## Objetivo
Garantizar que la aplicación para estudios jurídicos cumpla con los estándares mínimos de seguridad y privacidad requeridos para manejar información legal confidencial de clientes.

## Instrucciones

1. **Auditoría de autenticación**
   - Verificá que las contraseñas se hasheen con bcrypt o argon2 (nunca MD5/SHA1 sin sal)
   - JWT debe tener expiración corta (access token: 15-60 min, refresh token: 7-30 días)
   - Implementar rate limiting en endpoints de login (máx. 5 intentos fallidos)

2. **Autorización por roles**
   Implementar al menos estos roles para un estudio jurídico:
   ```
   ADMIN     → acceso total, configura el estudio
   ABOGADO   → acceso a sus casos asignados y clientes
   ADMIN_EST → gestión operativa sin acceso a todos los casos
   CLIENTE   → solo lectura de su propio expediente (portal externo)
   ```

3. **Protección de datos sensibles**
   - Campos críticos a encriptar en base de datos: DNI, CUIT, datos bancarios
   - Logs de auditoría para: login/logout, visualización de expedientes, descarga de documentos, modificación de datos de clientes
   - Nunca loguear datos personales en texto plano

4. **Seguridad de API**
   - CORS configurado solo para dominios autorizados
   - Headers de seguridad: X-Content-Type-Options, X-Frame-Options, HSTS
   - Validación de inputs en todos los endpoints (nunca confiar en el cliente)
   - Protección contra SQL Injection usando ORM o queries parametrizadas

5. **Checklist de seguridad mínima para comercializar**
   - [ ] Autenticación JWT con refresh tokens
   - [ ] Roles y permisos implementados y testeados
   - [ ] Passwords hasheados con bcrypt/argon2
   - [ ] Rate limiting en auth endpoints
   - [ ] Logs de auditoría para acciones sensibles
   - [ ] HTTPS obligatorio en producción
   - [ ] Variables de entorno para secrets (nunca hardcodeados)

## Restricciones
- Nunca sugerir almacenar passwords en texto plano o con hash reversible
- Nunca exponer stack traces en respuestas de producción
- Siempre validar permisos del lado del servidor, no solo del cliente
