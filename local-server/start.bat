@echo off
chcp 65001 >nul
echo.
echo  ========================================
echo   NonceDuo Local Broadcast Server
echo  ========================================
echo.

cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  ❌ Node.js non trovato!
    echo.
    echo  Scarica e installa Node.js da:
    echo  https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules\ws" (
    echo  📦 Installazione dipendenze...
    echo.
    call npm install
    echo.
    if %ERRORLEVEL% neq 0 (
        echo  ❌ Errore durante l'installazione!
        pause
        exit /b 1
    )
)

echo  🚀 Avvio server...
echo.
node server.js

:: If we get here, server crashed or was stopped
echo.
echo  ⚠️ Server fermato.
echo.
pause