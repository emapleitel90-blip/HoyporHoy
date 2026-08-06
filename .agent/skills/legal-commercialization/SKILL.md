---
name: legal-commercialization
description: Usa esta skill cuando el usuario necesite preparar la aplicación para su venta o distribución comercial entre estudios jurídicos. Activar ante menciones de licenciamiento, onboarding de clientes, instalación, precios, demo, documentación para venta, SaaS o distribución del producto. Usar el browser integrado de Antigravity para validar visualmente el flujo de onboarding completo antes de considerar el producto listo para vender.
---

# Legal Commercialization

## Objetivo
Preparar el software de gestión para estudios jurídicos para su comercialización, garantizando que sea instalable, demostrable, licenciable y mantenible como producto.

## Instrucciones

1. **Checklist de entregables comerciales**
   Antes de salir a vender, verificar que existan:
   - [ ] `README.md` con descripción del producto, requisitos y guía de instalación
   - [ ] `INSTALL.md` con pasos de instalación para el cliente (sin conocimiento técnico)
   - [ ] Script de instalación automática (`install.sh` o `setup.py`)
   - [ ] Datos de demo precargados (estudio ficticio con casos y clientes de ejemplo)
   - [ ] Manual de usuario en PDF o web (mínimo: cómo cargar un expediente, cómo facturar)
   - [ ] Página de login con nombre del estudio configurable
   - [ ] Sistema de licencias o activación por cliente

2. **Modelo de distribución recomendado para estudios jurídicos**

   **Opción A — Instalación por cliente (más común en Argentina)**
   - El software corre en el servidor o computadora del estudio
   - Se cobra una licencia única + mantenimiento mensual
   - Pro: privacidad total de datos, sin dependencia de internet
   - Contra: soporte técnico por cliente

   **Opción B — SaaS multi-tenant**
   - El software corre en la nube, cada estudio tiene su subdominio
   - Se cobra suscripción mensual por estudio o por usuario
   - Pro: actualizaciones centralizadas, sin instalación
   - Contra: requiere infraestructura en la nube y garantías de uptime

3. **Onboarding de un estudio nuevo**
   El proceso de alta de un cliente nuevo debe ser:
   ```
   1. Crear tenant en el sistema (nombre, dominio, plan)
   2. Crear usuario admin del estudio
   3. Enviar email de bienvenida con credenciales
   4. El admin carga abogados y configuración del estudio
   5. Importar clientes y expedientes existentes (si aplica)
   ```
   Crear un script o panel para automatizar el paso 1 y 2.

4. **Propuesta de precios sugerida (Argentina)**
   - Plan Básico: hasta 2 abogados, 200 expedientes → $X/mes
   - Plan Profesional: hasta 5 abogados, expedientes ilimitados → $XX/mes
   - Plan Estudio: usuarios ilimitados + soporte prioritario → $XXX/mes
   Ajustar según costo de infraestructura + margen deseado.

5. **Documentación técnica mínima para soporte**
   - Guía de backup y restauración de datos
   - Guía de actualización de versión
   - FAQ de problemas frecuentes
   - Contacto de soporte técnico

## Restricciones
- La instalación no debe requerir conocimiento técnico del cliente
- Siempre incluir datos de demo para que el cliente pueda probar antes de comprar
- El sistema debe poder migrarse de servidor sin pérdida de datos
