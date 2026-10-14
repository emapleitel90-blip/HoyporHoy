# Hoy por Hoy — continuación del 14/10/2026

## Punto de partida

Se revisó el chat `hoyporhoy.2.0`. Sus respuestas recientes no se recuperaron como texto: el lector devolvió referencias internas. Las capturas sí permitieron identificar la carpeta y la rama del proyecto.

- Origen local: `C:\Users\Usuario\Desktop\antigravity lyp\HoyporHoy`.
- Copia de trabajo actual: `C:\Users\Usuario\Desktop\hoyporhoy2.1`.
- Repositorio: https://github.com/emapleitel90-blip/HoyporHoy
- Rama local: `develop/hoyporhoy-2.0`, basada en `dd7d920`.
- Consulta directa a GitHub: solo existía `main`, en `4e1c59d`. Los commits `bd1070d` y `dd7d920` no estaban publicados. Las referencias `origin/*` copiadas del repositorio local no prueban que una rama exista en GitHub.

## Correcciones en esta copia

- `server/.env.example`: conexión SQLite coherente con el esquema actual de Prisma.
- `server/src/index.js`: rechazo de JWT_SECRET vacío, de espacios o igual al valor de ejemplo `REPLACE_WITH_GENERATED_SECRET`.

## Verificación

- Servidor: 6 archivos de pruebas, 31 pruebas aprobadas, con configuración temporal de verificación.
- Control de arranque: 5 casos comprobados (ausente, espacios, valor de ejemplo, valor inseguro conocido y valor válido).
- Sintaxis del servidor y comprobación del diff: aprobadas.
- Interfaz: compilación de producción aprobada (2509 módulos). Advertencias sobre datos de navegadores antiguos y un paquete JavaScript de 1,23 MB sin comprimir.
- Algunas pruebas existentes, como las de aislamiento de casos, contienen `expect(true).toBe(true)`: aprobarlas no demuestra aislamiento real.

## Pendientes

- Probar los flujos reales con una base local configurada.
- Revisar los valores sensibles del historial: eliminar `server/.env` del último commit no lo elimina de commits anteriores. No se reescribió el historial ni se rotaron credenciales.
- Destino de entrega para revisión de Bartolito: rama `develop/hoyporhoy-2.0` en GitHub. No se realizó un despliegue ni una integración en `main`.
- La configuración de CI está en `ci/ci.yml`, usa rutas `lyp-app/*` y pide un script de pruebas inexistente en el cliente; requiere corregirse antes de usarla como validación automática en GitHub.
