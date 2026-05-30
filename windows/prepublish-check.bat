@echo off
setlocal
echo Running Writing OS prepublish checks...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-wsl-script.ps1" "scripts/prepublish-check.sh"
if errorlevel 1 pause
exit /b %errorlevel%
