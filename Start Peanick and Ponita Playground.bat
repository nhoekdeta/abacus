@echo off
title Peanick and Ponita Playground
cd /d "%~dp0"

echo.
echo   ===================================
echo    Peanick and Ponita Playground is starting...
echo   ===================================
echo.
echo   Your browser will open at:
echo       http://localhost:8777
echo.
echo   Keep this window open while playing.
echo   Close it (or press Ctrl+C) to stop.
echo.

rem Pick whichever Python launcher exists
where python >nul 2>nul && (set "PY=python") || (set "PY=py")

rem Open the browser a moment after the server starts
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:8777"

%PY% -m http.server 8777

echo.
echo   Server stopped.
pause
