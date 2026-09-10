@echo off
title Instalador Asistente Pitin en Servidor
cd /d "%~dp0"
color 0A

echo ============================================================
echo   INSTALACION DE ASISTENTE PITIN EN EL SERVIDOR
echo ============================================================
echo.

REM Detectar rutas estandar de Node.js en Windows
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
if exist "%ALLUSERSPROFILE%\chocolatey\bin\node.exe" set "PATH=%ALLUSERSPROFILE%\chocolatey\bin;%PATH%"

REM 1. Verificar Node.js
echo [1/3] Verificando Node.js en el sistema...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Node.js no esta en el PATH. Reintentando deteccion...
    if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
    if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se detecto Node.js.
    echo Si acabas de instalar Node.js, por favor cierra esta ventana y vuelve a abrirla.
    pause
    exit /b 1
)

echo [OK] Node.js detectado correctamente:
node -v
echo.

REM 2. Instalar dependencias
echo [2/3] Instalando librerias del bot (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Ocurrio un problema con npm install.
    pause
    exit /b 1
)
echo [OK] Librerias instaladas correctamente.
echo.

REM 3. Configurar arranque automatico
echo [3/3] Configurando arranque automatico en Windows...
if exist "instalar_arranque_automatico.bat" (
    call instalar_arranque_automatico.bat
)
echo.

echo ============================================================
echo   INSTALACION COMPLETADA CON EXITO!
echo.
echo   Pasos siguientes:
echo   1. Abre el archivo: iniciar_bot.bat
echo   2. Escanea el codigo QR que aparecera con tu WhatsApp
echo      (o abre http://localhost:3008 en tu navegador).
echo ============================================================
echo.
pause
