@echo off
title LyP Gestión - Instalador para Usuarios Finales
color 1F
cls

echo.
echo  ███╗   ███╗ █████╗ ███╗   ██╗██╗   ██╗███████╗
echo  ████╗ ████║██╔══██╗████╗  ██║██║   ██║██╔════╝
echo  ██╔████╔██║███████║██╔██╗ ██║██║   ██║███████╗
echo  ██║╚██╔╝██║██╔══██║██║╚██╗██║██║   ██║╚════██║
echo  ██║ ╚═╝ ██║██║  ██║██║ ╚████║╚██████╔╝███████║
echo  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝
echo.
echo  =================================================
echo  Instalador de LyP Gestión Jurídico
echo  Para Lamberti & Pleitel
echo  =================================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado o no está en el PATH.
    echo.
    echo Por favor, instale Node.js v18 o superior desde:
    echo https://nodejs.org/
    echo.
    echo Después de instalar, ejecute este instalador nuevamente.
    pause
    exit /b 1
)

:: Check Node.js version
for /f "tokens=2 delims==" %%v in ('node -v') do set "NODE_VERSION=%%v"
set "NODE_VERSION=%NODE_VERSION:v=%"
echo [INFO] Node.js detectado: versión %NODE_VERSION%

:: Extract major version
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set "NODE_MAJOR=%%a"
if %NODE_MAJOR% lss 18 (
    echo [ERROR] Se requiere Node.js v18 o superior. Tiene v%NODE_VERSION%.
    pause
    exit /b 1
)

echo [INFO] Versión de Node.js compatible.
echo.

:: Change to project directory
cd /d "%~dp0"

:: Install dependencies
echo [PASO 1/5] Instalando dependencias del backend...
cd server
call npm install >nul
if errorlevel 1 (
    echo [ERROR] Falló la instalación de dependencias del backend.
    pause
    exit /b 1
)
echo [OK] Dependencias del backend instaladas.
cd ..

echo.
echo [PASO 2/5] Instalando dependencias del frontend...
cd client
call npm install >nul
if errorlevel 1 (
    echo [ERROR] Falló la instalación de dependencias del frontend.
    pause
    exit /b 1
)
echo [OK] Dependencias del frontend instaladas.
cd ..

echo.
echo [PASO 3/5] Configurando base de datos...
cd server

:: Check if .env exists, if not create from example
if not exist .env (
    echo [INFO] Creando archivo de configuración .env...
    copy .env.example .env >nul
    
    :: Update DATABASE_URL to use SQLite for end-user simplicity
    (echo # Base de Datos (SQLite - sin instalación requerida)
    echo DATABASE_URL="file:./dev.db"
    echo # Autenticación (JWT)
    echo JWT_SECRET="lyp_gestion_secreto_cambiar_en_produccion_$(date +%s)"
    echo # Entorno
    echo NODE_ENV="production") > .env.tmp
    
    :: Copy other lines from .env.example that aren't DATABASE_URL or JWT_SECRET
    findstr /v /i "DATABASE_URL JWT_SECRET" .env.example >> .env.tmp
    move /y .env.tmp .env >nul
    
    echo [OK] Archivo .env creado con configuración SQLite.
) else (
    echo [INFO] Archivo .env ya existe.
    :: Ensure it's using SQLite
    findstr /i "DATABASE_URL" .env | findstr /i "postgresql" >nul
    if not errorlevel 1 (
        echo [ADVERTENCIA] Su .env está configurado para PostgreSQL.
        echo Cambiando a SQLite para facilitar la instalación de usuario final...
        (echo # Base de Datos (SQLite - sin instalación requerida)
        echo DATABASE_URL="file:./dev.db"
        echo # Autenticación (JWT)
        echo JWT_SECRET="lyp_gestion_secreto_cambiar_en_produccion_$(date +%s)"
        echo # Entorno
        echo NODE_ENV="production") > .env.tmp
        
        :: Preserve other settings
        for /f "usebackq delims=" %%a in (".env.example") do (
            set "line=%%a"
            set "line=!line:DATABASE_URL=!"
            if not "!line!"=="%%a" (
                echo DATABASE_URL="file:./dev.db" >> .env.tmp
            ) else (
                set "line=!line:JWT_SECRET=!"
                if not "!line!"=="%%a" (
                    echo JWT_SECRET="lyp_gestion_secreto_cambiar_en_produccion_$(date +%s)" >> .env.tmp
                ) else (
                    echo %%a >> .env.tmp
                )
            )
        )
        move /y .env.tmp .env >nul
        echo [OK] .env actualizado para usar SQLite.
    )
)

:: Initialize database with Prisma
echo [INFO] Inicializando base de datos SQLite...
call npx prisma generate >nul
if errorlevel 1 (
    echo [ERROR] Falló la generación del cliente Prisma.
    pause
    exit /b 1
)

echo [INFO] Aplicando migraciones de base de datos...
call npx prisma migrate dev --name init --skip-seed >nul
if errorlevel 1 (
    echo [ERROR] Falló la aplicación de migraciones.
    pause
    exit /b 1
)

echo [INFO] Cargando datos iniciales...
call node prisma/seed.js >nul
if errorlevel 1 (
    echo [ERROR] Falló la carga de datos iniciales.
    pause
    exit /b 1
)
echo [OK] Base de datos configurada correctamente.
cd ..

echo.
echo [PASO 4/5] Creando acceso directo en el escritorio...
:: Create desktop shortcut
set "USERPROFILE=%HOMEDRIVE%%HOMEPATH%"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\LyP Gestión.lnk"
powershell -Command "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%~dp0start_app.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0start_app.bat,0'; $s.Save()" >nul 2>&1
if not exist "%SHORTCUT_PATH%" (
    echo [ADVERTENCIA] No se pudo crear el acceso directo en el escritorio.
) else (
    echo [OK] Acceso directo creado en el escritorio.
)

echo.
echo [PASO 5/5] Instalación completada!
echo.
echo  =================================================
echo  ¡LyP Gestión está listo para usar!
echo  =================================================
echo.
echo  INSTRUCCIONES:
echo  1. Haga doble clic en el acceso directo "LyP Gestión" en su escritorio
echo     O ejecute: start_app.bat
echo.
echo  2. Espere a que se inicien los servidores (aprox. 10-15 segundos)
echo.
echo  3. Se abrirá automáticamente su navegador en:
echo     http://localhost:5173
echo.
echo  4. Usuario por defecto:
echo     Email: admin@lyp.com
echo     Contraseña: admin123
echo.
echo  NOTAS IMPORTANTES:
echo  - La primera ejecución puede tomar un momento mientras se compilan los assets
echo  - Los datos se almacenan localmente en la carpeta del proyecto
echo  - Para reinstalar o reparar, ejecute este instalador nuevamente
echo  - No cierre las ventanas de comandos que se abran automáticamente
echo.
echo  =================================================
echo  Presione cualquier tecla para iniciar la aplicación ahora...
echo  =================================================
pause >nul

:: Launch the application
call start_app.bat