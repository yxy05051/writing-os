@echo off
setlocal
cd /d "%~dp0\.."
echo Starting Writing OS open-source dev server...
wsl bash -lc "cd '%CD:\=/%' && bash scripts/start-dev.sh"
