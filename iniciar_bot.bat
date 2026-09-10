@echo off
title Asistente Pitin - PitaPollo WhatsApp Bot
cd /d "%~dp0"
color 0A

echo ============================================================
echo   🍗 ASISTENTE PITIN - PITAPOLLO (LA TRINIDAD)
echo ============================================================
echo.

:: Detectar rutas estandar de Node.js en Windows
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
if exist "%ALLUSERSPROFILE%\chocolatey\bin\node.exe" set "PATH=%ALLUSERSPROFILE%\chocolatey\bin;%PATH%"
set "PATH=%LOCALAPPDATA%\Programs\git\cmd;%ProgramFiles%\Git\cmd;%PATH%"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js en el sistema.
    echo.
    echo Por favor ejecuta primero: instalar_en_servidor.bat
    echo O descarga Node.js LTS directamente desde: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Verificar si existe la carpeta node_modules
if not exist "node_modules" (
    echo [AVISO] No se encontraron las dependencias instaladas.
    echo Ejecutando npm install por primera vez...
    echo.
    call npm install
    echo.
)

echo [OK] Entorno verificado:
node -v
echo.
echo Iniciando Asistente Pitin...
echo (Si necesitas escanear el QR, puedes abrir: http://localhost:3008)
echo ============================================================
echo.

node src/app.js
pause
