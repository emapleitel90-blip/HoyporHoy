@echo off
title LyP — Reparando Base de Datos...
color 0A

echo.
echo  =========================================
echo   LyP — Reparar Base de Datos
echo  =========================================
echo.

echo  [1/3] Borrando base de datos antigua...
del /f "prisma\dev.db" 2>nul
del /f "prisma\dev.db-shm" 2>nul
del /f "prisma\dev.db-wal" 2>nul
echo  Hecho.
echo.

echo  [2/3] Creando nueva base de datos...
call node_modules\.bin\prisma db push --accept-data-loss

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERROR en prisma db push.
    echo  Presiona una tecla para cerrar.
    pause > nul
    exit /b 1
)

echo.
echo  [3/3] Creando usuario admin y datos iniciales...
call node_modules\.bin\prisma db seed

echo.
echo  =========================================
echo   EXITO: Base de datos lista.
echo   Usuario: admin@lyp.com
echo   Contrasena: admin123
echo  =========================================
echo.
echo  Ahora abre start_app.bat
echo.
echo  Presiona cualquier tecla para cerrar esta ventana...
pause > nul
