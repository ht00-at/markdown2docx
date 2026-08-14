@echo off
chcp 65001 >nul
title SuperPlugin - Server Console (close to stop)
cd /d "%~dp0"

if not exist logs mkdir logs

echo ============================================
echo   SuperPlugin Server
echo ============================================
echo   Starting at http://localhost:3000
echo   Close this window to stop the server
echo ============================================

node index.js 2>&1
pause
