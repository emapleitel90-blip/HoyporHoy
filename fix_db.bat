@echo off
title LyP — Fix DB Launcher
cls

echo.
echo  Abriendo reparacion de la base de datos...
echo  Espera que la ventana nueva diga EXITO.
echo.

start "LyP - Reparar BD" cmd /k "cd /d "%~dp0server" && call repair_db.bat"

timeout /t 2 /nobreak > nul
exit
