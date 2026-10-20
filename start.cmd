@echo off
chcp 65001 >nul
cd /d "%~dp0"
title PromptVault
if not exist "%~dp0index.html" (
  echo.
  echo   [!] index.html not found. Put this file inside the PromptVault app folder.
  echo.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
echo.
echo   Server stopped.
pause
