@echo off
setlocal
cd /d "%~dp0.."
echo Preparing Writing OS Desktop Preview...

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js 22.12 or newer, then try again.
  pause
  exit /b 1
)

if "%WRITING_OS_BACKEND_PORT%"=="" set WRITING_OS_BACKEND_PORT=8000
set WRITING_OS_BACKEND_URL=http://127.0.0.1:%WRITING_OS_BACKEND_PORT%
set NEXT_PUBLIC_WRITING_OS_WS_URL=ws://127.0.0.1:%WRITING_OS_BACKEND_PORT%/ws

call npm --prefix frontend ci
if errorlevel 1 pause & exit /b %errorlevel%

call npm --prefix frontend run build
if errorlevel 1 pause & exit /b %errorlevel%

call npm --prefix desktop ci
if errorlevel 1 pause & exit /b %errorlevel%

echo Desktop preview is prepared.
echo Start it with windows\start-desktop.bat.
pause
