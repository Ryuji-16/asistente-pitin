@echo off
title Detener Asistente Pitin
cd /d "%~dp0"
color 0C
echo ============================================================
echo   🛑 DETENIENDO ASISTENTE PITIN
echo ============================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$stopped = $false; $conn = Get-NetTCPConnection -LocalPort 3008 -ErrorAction SilentlyContinue; if ($conn) { $conn | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; $stopped = $true } }; $procs = Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*src/app.js*' -or $_.CommandLine -like '*asistente-pitin*' }; if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $stopped = $true } }; if ($stopped) { Write-Host '[OK] Asistente Pitin ha sido detenido correctamente.' -ForegroundColor Green } else { Write-Host '[INFO] No se encontro ninguna instancia activa del bot.' -ForegroundColor Yellow }"
echo.
pause
