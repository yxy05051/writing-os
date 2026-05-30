@echo off
setlocal
cd /d "%~dp0.."
echo Starting Writing OS Desktop Preview...
echo Keep this window open while using Writing OS.

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js 20 or newer, then try again.
  pause
  exit /b 1
)

if not exist desktop\node_modules (
  call npm --prefix desktop install
  if errorlevel 1 pause & exit /b %errorlevel%
)

call npm --prefix desktop start
if errorlevel 1 pause
exit /b %errorlevel%
