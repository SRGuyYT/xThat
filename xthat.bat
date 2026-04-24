@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
cd /d "%ROOT%"

set "LOG_FILE=%ROOT%\.xthat.log"
set "ERR_FILE=%ROOT%\.xthat.err.log"
set "PORT=5000"
set "HOSTNAME=0.0.0.0"

call :load_port

if "%~1"=="" goto gui
if /I "%~1"=="start" goto start_fg
if /I "%~1"=="start-bg" goto start_bg
if /I "%~1"=="stop" goto stop
if /I "%~1"=="status" goto status
if /I "%~1"=="restart" goto restart
if /I "%~1"=="gui" goto gui
goto usage

:load_port
for /f "usebackq tokens=1,* delims==" %%A in ("%ROOT%\.env") do (
  if /I "%%A"=="APP_URL" call :parse_url_port "%%B"
)
exit /b 0

:parse_url_port
set "URL=%~1"
for /f "tokens=1,2,3 delims=/" %%A in ("%URL%") do (
  set "HOSTPORT=%%C"
)
if not defined HOSTPORT exit /b 0
for /f "tokens=1,2 delims=:" %%A in ("%HOSTPORT%") do (
  set "HOSTNAME=%%A"
  if not "%%B"=="" set "PORT=%%B"
)
exit /b 0

:ensure_ready
if not exist "%ROOT%\node_modules" (
  echo node_modules not found. Run npm install first.
  exit /b 1
)
call npm run db:init || exit /b 1
exit /b 0

:start_fg
call :ensure_ready || exit /b 1
echo Starting xThat in foreground on port %PORT%...
set "PORT=%PORT%"
set "HOSTNAME=%HOSTNAME%"
npm run dev -- --hostname %HOSTNAME% --port %PORT%
exit /b %errorlevel%

:start_bg
call :ensure_ready || exit /b 1
call :status_check >nul 2>nul
if %errorlevel%==0 (
  echo xThat is already running.
  goto status
)
echo Starting xThat in background on port %PORT%...
start "xThat Server" /MIN powershell -NoProfile -ExecutionPolicy Bypass -NoExit -Command "Set-Location -LiteralPath '%ROOT%'; $env:PORT='%PORT%'; $env:HOSTNAME='%HOSTNAME%'; npm run dev -- --hostname %HOSTNAME% --port %PORT%"
for /l %%I in (1,1,20) do (
  call :status_check >nul 2>nul
  if !errorlevel! EQU 0 goto status
  timeout /t 1 /nobreak >nul
)
goto status

:status_check
set "XPID="
for /f %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-NetTCPConnection -State Listen -LocalPort %PORT% -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess; if ($p) { $p }"') do set "XPID=%%P"
if "%XPID%"=="" exit /b 1
tasklist /FI "PID eq %XPID%" | find "%XPID%" >nul
if errorlevel 1 exit /b 1
exit /b 0

:stop
call :status_check >nul 2>nul
if errorlevel 1 (
  echo xThat is not running.
  exit /b 0
)
echo Stopping xThat process %XPID%...
taskkill /PID %XPID% /T /F >nul
echo Stopped.
exit /b 0

:status
call :status_check >nul 2>nul
if errorlevel 1 (
  echo xThat is not running.
  exit /b 1
)
echo xThat is running on http://localhost:%PORT% with PID %XPID%.
echo Background mode runs in a minimized PowerShell window and can be stopped with xthat.bat stop.
exit /b 0

:restart
call :stop
goto start_bg

:gui
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\xthat-launcher.ps1" -Root "%ROOT%"
exit /b %errorlevel%

:usage
echo Usage: xthat.bat ^<start^|start-bg^|stop^|status^|restart^|gui^>
echo   gui       Open the Windows launcher UI
echo   start     Run in the current window
echo   start-bg  Run in a minimized background window
echo   stop      Stop the background server
echo   status    Show background server status
echo   restart   Restart the background server
exit /b 1
