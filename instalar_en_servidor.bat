@echo off
title Instalador Asistente Pitin en Servidor
cd /d "%~dp0"
color 0A
echo ============================================================
echo   🍗 INSTALACION DE ASISTENTE PITIN EN EL SERVIDOR
echo ============================================================
echo.

:: 1. Verificar Node.js
echo [1/3] Verificando Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js no esta instalado. Descargando e instalando Node.js LTS automaticamente...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi' -OutFile '$env:TEMP\nodejs.msi'; Start-Process msiexec.exe -ArgumentList '/i', '$env:TEMP\nodejs.msi', '/quiet', '/norestart' -Wait; Remove-Item '$env:TEMP\nodejs.msi' -Force"
    echo [OK] Node.js ha sido instalado.
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
) else (
    echo [OK] Node.js detectado en el sistema.
)
echo.

:: 2. Instalar dependencias
echo [2/3] Instalando dependencias del bot...
call npm install
echo [OK] Dependencias listas.
echo.

:: 3. Configurar inicio automatico
echo [3/3] Configurando arranque automatico en Windows...
call instalar_arranque_automatico.bat
echo.

echo ============================================================
echo   🎉 INSTALACION COMPLETADA!
echo   
echo   Para probarlo por primera vez en el servidor:
echo   Abre el archivo: iniciar_bot.bat
echo   (Si ya tenias la sesion copiada, conectara de una vez.
echo    Si no, abre http://localhost:3008 para escanear el QR).
echo ============================================================
echo.
pause
