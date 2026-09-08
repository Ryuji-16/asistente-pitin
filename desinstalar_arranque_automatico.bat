@echo off
title Quitar Arranque Automatico - Asistente Pitin
cd /d "%~dp0"
color 0E
echo ============================================================
echo   DESACTIVAR ARRANQUE AUTOMATICO
echo ============================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$startup = [Environment]::GetFolderPath('Startup'); $path = $startup + '\Asistente Pitin.lnk'; if (Test-Path $path) { Remove-Item $path -Force; Write-Host '[OK] Arranque automatico desactivado.' -ForegroundColor Yellow } else { Write-Host 'No habia ningun arranque automatico configurado.' }"

echo.
pause
