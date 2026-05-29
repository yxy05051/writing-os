@echo off
setlocal
cd /d "%~dp0\.."
echo Running Writing OS prepublish checks...
wsl bash -lc "cd '%CD:\=/%' && bash scripts/prepublish-check.sh"
