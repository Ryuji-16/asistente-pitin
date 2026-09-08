@echo off
title Configurar Arranque Automatico - Asistente Pitin
cd /d "%~dp0"
color 0B
echo ============================================================
echo   ⚡ CONFIGURAR ARRANQUE AUTOMATICO AL ENCENDER WINDOWS
echo ============================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $startup = [Environment]::GetFolderPath('Startup'); $s = $ws.CreateShortcut($startup + '\Asistente Pitin.lnk'); $s.TargetPath = (Get-Location).Path + '\iniciar_segundo_plano.vbs'; $s.WorkingDirectory = (Get-Location).Path; $s.Description = 'Arranque automatico Asistente Pitin'; $s.Save(); Write-Host '[OK] Acceso directo creado en la carpeta de inicio de Windows.' -ForegroundColor Green"

echo.
echo ============================================================
echo   Listo! Cada vez que enciendan la maquina, Asistente
echo   Pitin iniciara solo y en segundo plano sin pedir nada.
echo ============================================================
echo.
pause
