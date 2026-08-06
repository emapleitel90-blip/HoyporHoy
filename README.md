# LyP Gestión - Web Application

Esta aplicación web fue desarrollada para **Lamberti & Pleitel** como sistema de gestión integral de casos jurídicos.

## Estructura del Proyecto

- **`/server`**: Backend de la aplicación (Node.js + Express + Prisma).
- **`/client`**: Frontend de la aplicación (React + Vite + Tailwind CSS).

## Prerrequisitos

- Node.js (v18 o superior)
- PostgreSQL (Base de datos local o servicio como Supabase/Railway)

## Configuración e Instalación

### 1. Backend

1. Navegar a la carpeta `server`:
   ```bash
   cd server
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno:
   - Crear un archivo `.env` basado en `.env.example`.
   - Configurar `DATABASE_URL` con tu conexión a PostgreSQL.
   - Configurar `JWT_SECRET` con una clave segura.
4. Inicializar la base de datos:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
5. Cargar datos de prueba (Admin, Estudio, Usuario):
   ```bash
   node prisma/seed.js
   ```
   **Usuario Admin por defecto:**
   - Email: `admin@lyp.com`
   - Password: `admin123`
6. Iniciar el servidor:
   ```bash
   npm run dev
   ```

### 2. Frontend

1. Navegar a la carpeta `client`:
   ```bash
   cd client
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Funcionalidades Principales

- **Dashboard**: Visualización de KPIs y gráficos.
- **Gestión de Casos**: Formulario de 13 secciones con Scoring automático.
- **Autenticación**: Roles definidos (Admin, Abogado, Operador).
- **Responsive**: Diseño adaptado a móviles y escritorio.

## Despliegue (Railway/Render)

1. Subir el repositorio a GitHub.
2. Conectar repositorio a Railway.
3. Configurar variables de entorno en el panel de Railway.
4. El backend y frontend se pueden desplegar como servicios separados o monorepo.

---
Desarrollado para LyP.
