# Revisión de dependencias — cuarta corrección

Revisión del 26/10/2026. La etapa anterior dejó 15 avisos en el cliente (1 crítico, 10 altos y 4 moderados). Esta etapa corrigió sus causas sin usar `npm audit fix --force` ni bajar versiones para silenciar avisos.

## Resultado de la auditoría

- Servidor: cero vulnerabilidades informadas por npm.
- Cliente: cero vulnerabilidades informadas por npm, incluidas dependencias de desarrollo.
- El informe es una comprobación de los avisos conocidos por npm en esta fecha; no certifica la ausencia de otras fallas de la aplicación.

| Paquete o cadena | Severidad anterior | Corrección |
| --- | --- | --- |
| `tar` / `@mapbox/node-pre-gyp` | Crítica | Retirada la cadena, introducida por el visor PDF que no se utilizaba. |
| `pdfjs-dist` / `react-pdf` | Alta | Retirado `react-pdf`: no había importaciones ni visor implementado. Las cargas y descargas privadas del expediente siguen por su API. |
| `xlsx` | Alta | Actualizado de 0.18.5 a SheetJS 0.20.3 desde el CDN oficial, con integridad en el lockfile. Se conservan XLS y XLSX. |
| `@grpc/grpc-js` / Firebase | Alta | Retirado Firebase, sin importaciones del SDK en el código. |
| `nanoid` | Alta | Override limitado a `docx`, de 5.1.6 a una versión compatible de la rama 5 desde 5.1.16. |
| `zod` | Alta | Retirado: no había validaciones que lo utilizaran. |
| `react-router` / `react-router-dom` | Moderada | Actualizado a 7.18.4, conservando React 18 y las rutas existentes. |
| `postcss-selector-parser` / `@tailwindcss/typography` | Moderada | Override limitado al plugin para resolver 6.1.5 dentro de la misma versión mayor. |

La migración de React Router se verificó con su [guía de v6 a v7](https://reactrouter.com/7.18.4/upgrading/v6) y los requisitos del paquete publicado (React >=18). SheetJS se obtuvo siguiendo [la distribución oficial](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), que identifica el CDN como fuente actual de versiones.

## Validaciones de esta etapa

- `npm test` desde la raíz: 180 pruebas del servidor y 31 del cliente aprobadas, 211 en total.
- 17 pruebas nuevas: 10 de importación y 7 de navegación.
- CSV con BOM y tildes, XLS y XLSX generados y leídos con bibliotecas reales; envío de los valores esperados a la API con sesión.
- Arrastrar y soltar, lectura fallida, archivo vacío, CSV dañado, reintento después de un error de API y descarte de una lectura anterior lenta.
- Router, autenticación, login, menú y lista reales; se aíslan las APIs de las páginas ajenas a la navegación. Las rutas conservan los parámetros al abrir y editar un expediente.
- `npm run lint`: sin errores ni advertencias.
- Compilación de producción correcta con Vite 6.4.5. Se conserva la advertencia por el tamaño del paquete JavaScript; esta etapa no implementa su división en fragmentos.
- `npm ci --dry-run --ignore-scripts --no-audit --no-fund`: lockfile consistente.
- Workflow YAML comprobado localmente; auditoría habilitada para ambos proyectos. La ejecución en GitHub sigue pendiente de publicar los cambios.

## Controles de la etapa anterior que se conservan

- ESLint del cliente configurado; corregidas sus observaciones sin desactivar las reglas de hooks ni excluir componentes.
- Pruebas de Configuración con Vitest y jsdom, incluidas carga fallida, reintento, respuesta inválida, guardado fallido, restablecimiento y cancelación al desmontar.
- Vite actualizado de la rama 5 a 6.4.5 para usar una versión compatible con Vitest 4.1.12; plugin React actualizado dentro de su rama 4. Referencias: [migración de Vite 5 a 6](https://v6.vite.dev/guide/migration), [guía de Vitest](https://vitest.dev/guide/).
- Workflow en `.github/workflows/ci.yml`, con rutas reales y Node.js 22 y 24. El YAML y sus rutas se comprobaron localmente; la ejecución alojada de GitHub requiere publicar los cambios.
- La auditoría automática conserva el umbral alto y se ejecuta en trabajos separados. Ahora incluye también al cliente.
- Comandos de lint, pruebas y compilación disponibles desde la raíz; hook pre-commit dirigido al ESLint instalado en el cliente.

## Hallazgo independiente corregido en la quinta etapa

Se detectó que `client/src/utils/firebaseUpload.js`, usado por los comprobantes de gastos, simulaba progreso y devolvía una URL inventada. La quinta etapa retiró esa utilidad e implementó almacenamiento real, descarga autorizada y reposición de comprobantes anteriores. Ver [la entrega de comprobantes](ENTREGA_COMPROBANTES_GASTOS.md). La carga privada de documentación del expediente se conserva.
