# Guía de Instalación y Comercialización — LyP Gestión

Este documento está diseñado para los implementadores técnicos y el equipo comercial que entrega **LyP Gestión** a estudios jurídicos.

## 📦 Modelos de Distribución

### Opción A: SaaS "Cloud LyP" (Recomendado)
El cliente no instala nada, simplemente accede a una URL `app.lyp-legal.com`.
El sistema multi-tenant permite aislar bajo el mismo código todas las operaciones.
1. Utiliza nuestro script automatizado para dar de alta al nuevo cliente.
2. Cada cliente accede con sus propios usuarios sin enterarse de la existencia del resto.
**Mantenimiento:** Servidor VPS Ubuntu (p.ej. DigitalOcean, AWS EC2) apuntando Nginx/PM2 en Node 18+.

### Opción B: On-Premise "Instalación Local"
El escritorio o servidor privado del cliente alojará la app.
(Ver sección *Pasos de Autoinstalación* abajo).

---

## 💰 Propuesta de Precios Sugerida (SaaS)

| Plan | Tamaño Estudio | Límites Recomendados | Precio Ref Mensual |
|------|---------------|----------------------|--------------------|
| **Básico** | Independientes / Duplas | Hasta 2 Abogados, Max 200 Casos, 1 Operador | $ 25.000 ARS |
| **Profesional** | Estudio Mediano | Hasta 5 Abogados, Casos Ilimitados | $ 60.000 ARS |
| **Corporativo** | Gran Estudio / Holding | Usuarios Ilimitados, Soporte Prioritario 24/7 | $ 120.000 ARS |

> *A estos precios se recomienda sumarle un setup fee de instalación / capacitación de onboarding de única vez.*

---

## 🚀 Pasos de Autoinstalación en Cliente (Windows On-Premise)

Si acordaste instalarlo físicamente en la PC del abogado:

1. **Requisitos Previos:**
   Asegúrate de que la PC tenga descargado **Node.js LTS (v18+)** de *nodejs.org*.

2. **Doble Clic:**
   Copia toda la carpeta del proyecto en la computadora del cliente (ej. `C:\LyP-Gestion\`).
   Haz doble clic sobre el archivo `install.bat`. Este script instalará automáticamente todo y preparará la base de datos vacía pero lista (con un estudio pre-creado y usuario admin).

3. **Ejecutar:**
   Haz doble clic en `start.bat`. 
   Se abrirá una ventana de fondo negro (no cerrarla). Automáticamente el navegador abrirá `http://localhost:5173`. 
   
   **Credenciales iniciales de Demo / Primer Uso:**
   El instalador generará el correo `admin@lyp.com` con contraseña `admin123`.

## ⚙️ Herramienta Avanzada: Alta de Clientes en Consola 
Si lo administras como SaaS, hemos incluido un script para crear y licenciar un nuevo estudio en segundos:
Dentro de `/server/`, ejecuta:
`node scripts/create-tenant.js "Estudio Perez y Asoc" "20-99999999-9" "director@perez.com"`
(Esto generará el estudio, la membresía, y el usuario listo para enviarle por mail a tu nuevo cliente).
