@echo off
title LyP Gestion — Iniciando...
color 1F
cls

echo.
echo  ██╗     ██╗   ██╗██████╗
echo  ██║     ╚██╗ ██╔╝██╔══██╗
echo  ██║      ╚████╔╝ ██████╔╝
echo  ██║       ╚██╔╝  ██╔═══╝
echo  ███████╗   ██║   ██║
echo  ╚══════╝   ╚═╝   ╚═╝    GESTION JURIDICA
echo.
echo  =========================================
echo   Sistema de Gestion de Casos Juridicos
echo  =========================================
echo.

echo  [1/3] Iniciando servidor backend...
start "LyP - Servidor" cmd /k "cd /d "%~dp0server" && npm run dev"
timeout /t 3 /nobreak > nul

echo  [2/3] Iniciando cliente frontend...
start "LyP - Cliente" cmd /k "cd /d "%~dp0client" && npm run dev"
timeout /t 4 /nobreak > nul

echo  [3/3] Abriendo navegador...
start http://localhost:5173

echo.
echo  =========================================
echo   App iniciada. Usuario: admin@lyp.com
echo   Contrasena: admin123
echo  =========================================
echo.
echo  Presiona cualquier tecla para cerrar esta ventana.
echo  (Los servidores continuaran corriendo en segundo plano)
pause > nul