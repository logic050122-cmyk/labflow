@echo off
setlocal

rem %~dp0 is the folder where this script is located.
set "ROOT=%~dp0"

if not exist "%ROOT%web\node_modules" (
  echo Frontend dependencies are not installed.
  echo Run: cd /d "%ROOT%web" ^&^& npm.cmd install
  pause
  exit /b 1
)

if not exist "%ROOT%server\node_modules" (
  echo Backend dependencies are not installed.
  echo Run: cd /d "%ROOT%server" ^&^& npm.cmd install
  pause
  exit /b 1
)

if not exist "%ROOT%server\.env" (
  echo Warning: server\.env does not exist. The backend may fail to connect to MySQL.
)

echo Starting LabFlow backend...
start "LabFlow Backend" /D "%ROOT%server" cmd /k "npm.cmd run dev"

echo Starting LabFlow frontend...
start "LabFlow Frontend" /D "%ROOT%web" cmd /k "npm.cmd run dev"

echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo Close a service with Ctrl+C in its terminal window.

endlocal
