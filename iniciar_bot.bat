@echo off
title Asistente Pitin - PitaPollo WhatsApp Bot
cd /d "%~dp0"
color 0A
echo ============================================================
echo   🍗 ASISTENTE PITIN - PITAPOLLO (OFERTAS TRINIDAD)
echo ============================================================
echo.
:: Detectar rutas estandar de Node.js en Windows (64-bit, 32-bit y LocalAppData)
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
set "PATH=%LOCALAPPDATA%\Programs\git\cmd;%PATH%"

echo Verificando entorno...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js en el sistema.
    echo Buscado en: %ProgramFiles%\nodejs y %LOCALAPPDATA%\Programs\nodejs
    pause
    exit /b 1
)

echo [OK] Node.js detectado correctamente.
echo Iniciando Asistente Pitin...
echo.
node src/app.js
pause
