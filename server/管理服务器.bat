@echo off
chcp 65001 >nul
title SuperPlugin Server Manager

:MENU
cls
echo ============================================
echo   SuperPlugin - 服务器管理
echo ============================================
echo.
echo  1. 启动服务器
echo  2. 停止服务器
echo  3. 重启服务器
echo  4. 查看运行状态
echo  5. 查看实时日志
echo  6. 设置开机自启(需管理员)
echo  7. 取消开机自启
echo  8. 退出
echo.
echo ============================================
set /p choice="请选择操作 (1-8): "

if "%choice%"=="1" goto START
if "%choice%"=="2" goto STOP
if "%choice%"=="3" goto RESTART
if "%choice%"=="4" goto STATUS
if "%choice%"=="5" goto LOGS
if "%choice%"=="6" goto STARTUP
if "%choice%"=="7" goto UNSTARTUP
if "%choice%"=="8" goto EXIT
goto MENU

:START
cls
echo 正在启动服务器...
cd /d "%~dp0"
start "SuperPlugin" /min cmd /c "cd /d %~dp0 && node index.js"
echo.
echo 服务器已启动!
echo 浏览器访问: http://localhost:3000/health
echo.
pause
goto MENU

:STOP
cls
echo 正在停止服务器...
taskkill /fi "WINDOWTITLE eq SuperPlugin" /f 2>nul
taskkill /fi "WINDOWTITLE eq SuperPlugin*" /f 2>nul
echo 服务器已停止。
pause
goto MENU

:RESTART
cls
echo 正在重启服务器...
taskkill /fi "WINDOWTITLE eq SuperPlugin" /f 2>nul
ping -n 2 127.0.0.1 >nul
start "SuperPlugin" /min cmd /c "cd /d %~dp0 && node index.js"
echo 服务器已重启。
pause
goto MENU

:STATUS
cls
echo 检查服务器状态...
powershell -Command "try { $r = Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing -TimeoutSec 3; Write-Host $r.Content } catch { Write-Host 'Server not running' }"
echo.
pause
goto MENU

:LOGS
cls
cd /d "%~dp0"
if exist logs\server.log (
    type logs\server.log
) else (
    echo No log file found.
)
echo.
pause
goto MENU

:STARTUP
cls
echo 请确认已使用管理员身份运行此脚本!
echo.
cd /d "%~dp0"
copy /Y "start-server.vbs" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SuperPlugin.vbs"
echo.
echo 开机自启已设置!
pause
goto MENU

:UNSTARTUP
cls
del /f "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SuperPlugin.vbs" 2>nul
echo.
echo 开机自启已取消!
pause
goto MENU

:EXIT
exit
