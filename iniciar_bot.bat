@echo off
title Asistente Pitin - PitaPollo WhatsApp Bot
cd /d "%~dp0"
color 0A
echo ============================================================
echo   🍗 ASISTENTE PITIN - PITAPOLLO (OFERTAS TRINIDAD)
echo ============================================================
echo.
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%LOCALAPPDATA%\Programs\git\cmd;%PATH%"
echo Verificando entorno...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js en el sistema.
    pause
    exit /b 1
)

echo [OK] Node.js detectado correctamente.
echo Iniciando Asistente Pitin...
echo.
node src/app.js
pause
