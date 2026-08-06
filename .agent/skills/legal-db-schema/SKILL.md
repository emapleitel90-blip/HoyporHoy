---
name: legal-db-schema
description: Usa esta skill cuando el usuario necesite diseñar, revisar o migrar el esquema de base de datos de una aplicación para estudios jurídicos. Activar ante menciones de tablas, modelos, relaciones, migraciones, ORM o estructura de base de datos. Activar modo Deep Think de Antigravity para decisiones de esquema complejas. Usar MCP con conexión a la base de datos real para leer el esquema existente antes de sugerir cambios.
---

# Legal DB Schema

## Objetivo
Diseñar un esquema de base de datos relacional completo, normalizado y eficiente para la gestión de un estudio jurídico, preparado para multi-tenancy si el producto es SaaS.

## Instrucciones

1. **Entidades core y sus relaciones**

   ```
   tenants (estudios jurídicos)
   └── users (abogados, administrativos)
   └── clientes
       └── expedientes
           ├── documentos
           ├── movimientos_procesales
           ├── vencimientos
           └── honorarios
   ```

2. **Tablas obligatorias**

   **tenants** (si es SaaS multi-estudio)
   - id (UUID, PK)
   - nombre, dominio, plan_suscripcion, activo
   - created_at, updated_at

   **users**
   - id (UUID, PK)
   - tenant_id (FK), email (único por tenant), password_hash
   - nombre, apellido, rol (ENUM: admin, abogado, administrativo)
   - activo, ultimo_login
   - created_at, updated_at

   **clientes**
   - id (UUID, PK)
   - tenant_id (FK), tipo (persona_fisica / juridica)
   - nombre, apellido, razon_social, dni_cuit
   - email, telefono, domicilio
   - created_at, updated_at

   **expedientes**
   - id (UUID, PK)
   - tenant_id (FK), cliente_id (FK), abogado_id (FK)
   - numero_expediente, caratula, fuero, juzgado
   - estado (ENUM: activo, archivado, cerrado)
   - fecha_inicio, fecha_cierre
   - created_at, updated_at

   **documentos**
   - id (UUID, PK)
   - expediente_id (FK), subido_por (FK → users)
   - nombre_archivo, tipo_mime, ruta_almacenamiento, tamaño_bytes
   - version, descripcion
   - created_at

   **vencimientos**
   - id (UUID, PK)
   - expediente_id (FK), asignado_a (FK → users)
   - descripcion, fecha_vencimiento, tipo (audiencia, presentacion, otro)
   - estado (ENUM: pendiente, completado, vencido)
   - notificado, created_at, updated_at

   **honorarios**
   - id (UUID, PK)
   - expediente_id (FK), cliente_id (FK)
   - concepto, monto, moneda (ARS/USD)
   - estado (ENUM: pendiente, pagado, anulado)
   - fecha_emision, fecha_pago
   - created_at, updated_at

3. **Índices críticos para performance**
   ```sql
   CREATE INDEX idx_expedientes_cliente ON expedientes(cliente_id);
   CREATE INDEX idx_expedientes_abogado ON expedientes(abogado_id);
   CREATE INDEX idx_vencimientos_fecha ON vencimientos(fecha_vencimiento);
   CREATE INDEX idx_honorarios_estado ON honorarios(estado);
   -- Si es multi-tenant: índice en tenant_id en todas las tablas
   ```

4. **Migraciones**
   - Usar siempre migraciones versionadas (Alembic para Python, Flyway para Java, Knex para Node)
   - Nunca alterar datos en producción sin script de rollback
   - Incluir script `seed.sql` con datos de ejemplo para demo del producto

## Restricciones
- Nunca usar IDs autoincrementales expuestos al exterior (usar UUID)
- Nunca guardar archivos en la base de datos (guardar solo la ruta)
- Siempre incluir created_at y updated_at en todas las tablas
