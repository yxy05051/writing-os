@echo off
setlocal
echo Running Writing OS release dry run...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-wsl-script.ps1" "scripts/release-dry-run.sh"
if errorlevel 1 pause
exit /b %errorlevel%
