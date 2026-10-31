# LyP Gestión - Web Application

Esta aplicación web fue desarrollada para **Lamberti & Pleitel** como sistema de gestión integral de casos jurídicos.

## Estructura del Proyecto

- **`/server`**: Backend de la aplicación (Node.js + Express + Prisma).
- **`/client`**: Frontend de la aplicación (React + Vite + Tailwind CSS).

## Prerrequisitos

- Node.js 22.12 o superior de la rama 22, o Node.js 24. CI verifica las ramas 22 y 24.
- SQLite: la configuración actual guarda la base en un archivo local y no requiere un servidor de base de datos externo.

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
   - Configurar `DATABASE_URL` con la ubicación del archivo SQLite (por ejemplo, `file:./dev.db`).
   - Configurar `JWT_SECRET` con una clave segura.
4. Inicializar la base de datos:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
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

## Verificación del código

Con las dependencias del servidor y del cliente instaladas, ejecutar desde la raíz:

```bash
npm run lint
npm test
npm run build
```

Las pruebas del servidor usan bases temporales. Las pruebas del cliente verifican la recuperación de Configuración, la importación real de CSV/XLS/XLSX, la navegación con sesión, los comprobantes de gastos y el circuito de honorarios. Los comprobantes usan el mismo almacenamiento privado de los expedientes; ver [la entrega de gastos](ENTREGA_COMPROBANTES_GASTOS.md) y [la entrega de pagos](ENTREGA_COMPROBANTES_PAGOS.md) para los estados anteriores y los reemplazos.

La última validación completa local del 31/10/2026 aprobó 359 pruebas de servidor y 112 de cliente (471 en total), con un trabajador y límite de 30 segundos por prueba. ESLint y compilación aprobados. Vitest del servidor incluye únicamente src/tests para excluir los paquetes archivados de revisión. La revisión de entregas sobre versiones exactas se documenta en [su entrega](ENTREGA_REVISION_VERSIONES.md):

```bash
npm --prefix server test -- --maxWorkers=1
npm --prefix client test -- --maxWorkers=1
```

La [entrega de escritos](ENTREGA_ESCRITOS_VERSIONADOS.md) registra el último circuito completo. La [entrega de pagos](ENTREGA_COMPROBANTES_PAGOS.md) conserva el diagnóstico anterior del cierre inesperado de Vitest con Node 24.15.0 en Windows y el modo alternativo comprobado en esa etapa; no se omiten pruebas ni se ignoran errores del ejecutor.

GitHub Actions ejecuta estos controles en Node.js 22 y 24 mediante `.github/workflows/ci.yml`. La auditoría de dependencias de cliente y servidor se ejecuta en trabajos separados para que sus resultados no impidan ejecutar las pruebas. El hook de pre-commit revisa los archivos fuente del cliente con el mismo ESLint del proyecto.

SheetJS se instala desde la URL oficial de la versión 0.20.3, registrada en `client/package.json`. Su URL y su hash de integridad quedan fijados en el lockfile; conservar ambos archivos al actualizar o instalar con `npm ci`. Consultar [la distribución oficial](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) antes de actualizarlo: el paquete `xlsx` del registro npm quedó en una versión anterior.

## Funcionalidades Principales

- **Dashboard**: Visualización de KPIs y gráficos.
- **Gestión de Casos**: Formulario de 13 secciones con Scoring automático.
- **Autenticación**: Roles definidos (Admin, Abogado, Operador).
- **Responsive**: Diseño adaptado a móviles y escritorio.
- **Jurisprudencia**: Acceso a portales oficiales y registro de referencias por expediente, sin IA. Ver [alcance y validación](ENTREGA_JURISPRUDENCIA_OFICIAL.md).
- **Carga por pantalla**: Rutas protegidas y lectura de Excel bajo demanda. Ver [mediciones y límites](ENTREGA_CARGA_CLIENTE.md).
- **Honorarios y cobranzas**: Acuerdos, cuotas, pagos parciales y saldo por expediente; pendientes en Mi jornada y recordatorios manuales. Ver [entrega y migración](ENTREGA_HONORARIOS_PARA_REVISION.md).
- **Rectificación de pagos**: Anulación con motivo, autor y fecha, conservando el pago original y actualizando saldos y recordatorios. Ver [alcance y pruebas](ENTREGA_RECTIFICACION_PAGOS.md).
- **Modificación de acuerdos**: Ajustes de descripción, importes y vencimientos, cuotas nuevas e historial de antes y después, con protección frente a cambios simultáneos. Ver [entrega y validación](ENTREGA_MODIFICACION_ACUERDOS.md).
- **Comprobantes de pagos**: Archivos privados vinculados al pago, descarga autenticada e historial de reemplazos. Ver [alcance y estado de validación](ENTREGA_COMPROBANTES_PAGOS.md).
- **Escritos y versiones**: Texto manual por expediente, historial inmutable, restauración, comparación y Word de la versión elegida. La revisión por tarea identifica la versión exacta entregada. Ver [escritos](ENTREGA_ESCRITOS_VERSIONADOS.md) y [revisión](ENTREGA_REVISION_VERSIONES.md).
- **Actividad y notificaciones**: Avisos por usuario, filtros y consulta de páginas anteriores. Ver [alcance](ENTREGA_ACTIVIDAD_NOTIFICACIONES.md).
- **Reintentos de importación**: Identificador de solicitud persistido para confirmar el mismo lote sin duplicados al reintentar desde la vista previa. Ver [migración y límites](ENTREGA_REINTENTOS_IMPORTACION.md).

## Despliegue (Railway/Render)

1. Subir el repositorio a GitHub.
2. Conectar repositorio a Railway.
3. Configurar variables de entorno en el panel de Railway.
4. El backend y frontend se pueden desplegar como servicios separados o monorepo.

---
Desarrollado para LyP.

Biblioteca de modelos por estudio o titular: clasificación, campos parametrizados y preparación de escritos nuevos. Ver [entrega y validación](ENTREGA_BIBLIOTECA_MODELOS.md).
