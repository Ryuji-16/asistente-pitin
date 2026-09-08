@echo off
title Detener Asistente Pitin
cd /d "%~dp0"
color 0C
echo ============================================================
echo   🛑 DETENIENDO ASISTENTE PITIN
echo ============================================================
echo.
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"
echo [OK] El bot se ha detenido por completo.
echo.
pause
