@echo off
setlocal
echo Starting Writing OS open-source dev server...
echo Open: http://localhost:3000
echo Keep this window open while using Writing OS.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-wsl-script.ps1" "scripts/start-dev.sh"
if errorlevel 1 pause
exit /b %errorlevel%
