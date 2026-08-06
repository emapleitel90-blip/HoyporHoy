@echo off
title LyP — Reparar Base de Datos
color 0A
cls

echo.
echo  =========================================
echo   LyP — Reparar y Recrear Base de Datos
echo  =========================================
echo.

cd /d "%~dp0server"

echo  [1/3] Eliminando base de datos antigua...
del /f "prisma\dev.db" 2>nul
del /f "prisma\dev.db-shm" 2>nul
del /f "prisma\dev.db-wal" 2>nul
echo  Hecho.
echo.

echo  [2/3] Creando base de datos con schema actualizado...
node_modules\.bin\prisma db push --accept-data-loss

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERROR: prisma db push fallo. Intentando con npx...
    npx prisma db push --accept-data-loss
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  =========================================
    echo   ERROR: No se pudo ejecutar Prisma.
    echo   Asegurate de haber corrido npm install
    echo   en la carpeta server antes de continuar.
    echo  =========================================
    pause
    exit /b 1
)

echo.
echo  [3/3] Creando datos iniciales (admin y estudio)...
node_modules\.bin\prisma db seed

if %ERRORLEVEL% NEQ 0 (
    echo  (seed via npx)...
    npx prisma db seed
)

echo.
echo  =========================================
echo   EXITO: Base de datos lista.
echo   Usuario: admin@lyp.com
echo   Contrasena: admin123
echo  =========================================
echo.
echo  Ahora ejecuta start_app.bat para iniciar la app.
echo.
pause
