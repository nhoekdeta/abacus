@echo off
REM Double-click to publish the current changes to https://nhoekdeta.github.io/abacus/
REM It bumps the service-worker cache version, commits, and pushes to GitHub.
set /p MSG="Describe what you changed (or just press Enter): "
if "%MSG%"=="" set MSG=Update site
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" -Message "%MSG%"
echo.
pause
