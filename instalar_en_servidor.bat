@echo off
title Instalador Asistente Pitin en Servidor
cd /d "%~dp0"
color 0A

echo ============================================================
echo   🍗 INSTALACION DE ASISTENTE PITIN EN EL SERVIDOR
echo ============================================================
echo.

:: Detectar rutas estandar de Node.js en Windows
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
if exist "%ALLUSERSPROFILE%\chocolatey\bin\node.exe" set "PATH=%ALLUSERSPROFILE%\chocolatey\bin;%PATH%"

:: 1. Verificar Node.js
echo [1/3] Verificando Node.js en el sistema...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Node.js no esta instalado en este servidor.
    echo Intentando instalacion automatica de Node.js LTS...
    echo.
    
    :: Intentar con winget primero si existe
    where winget >nul 2>&1
    if %errorlevel% equ 0 (
        echo Instalando mediante Windows Package Manager (winget)...
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    ) else (
        echo Descargando instalador oficial de Node.js LTS...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$msi = '$env:TEMP\nodejs.msi'; Write-Host 'Descargando desde nodejs.org...'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi', $msi); Write-Host 'Ejecutando instalador (por favor acepta el permiso de administrador si aparece)...'; Start-Process msiexec.exe -ArgumentList '/i', $msi -Verb RunAs -Wait; Remove-Item $msi -Force -ErrorAction SilentlyContinue"
    )

    :: Re-verificar rutas
    if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
    if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
    if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [AVISO] No se pudo completar la instalacion automatica de Node.js.
    echo Por favor instala Node.js manualmente:
    echo 1. Se abrira la pagina oficial: https://nodejs.org
    echo 2. Descarga la version LTS (Recomendada).
    echo 3. Abre el archivo descargado y haz clic en 'Next' a todo hasta finalizar.
    echo 4. Una vez instalado, vuelve a ejecutar este instalador (instalar_en_servidor.bat).
    start https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js esta listo:
node -v
echo.

:: 2. Instalar dependencias
echo [2/3] Instalando dependencias de la aplicacion (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Ocurrio un problema al instalar las dependencias con npm.
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas correctamente.
echo.

:: 3. Configurar arranque automatico
echo [3/3] Configurando inicio automatico al encender el equipo...
if exist "instalar_arranque_automatico.bat" (
    call instalar_arranque_automatico.bat
)
echo.

echo ============================================================
echo   🎉 INSTALACION COMPLETADA CON EXITO!
echo.
echo   Pasos para iniciar el bot:
echo   1. Abre el archivo: iniciar_bot.bat
echo   2. Escanea el codigo QR que aparecera con tu WhatsApp
echo      (o abre http://localhost:3008 en el navegador).
echo   3. Listo! El bot quedara atendiendo a tus clientes.
echo ============================================================
echo.
pause
