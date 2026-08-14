@echo off
chcp 65001 >nul
title 设置开机自启

echo ============================================
echo   设置 SuperPlugin 开机自动启动
echo ============================================
echo.
echo 正在复制启动脚本到开机启动文件夹...

set STARTUP_DIR="%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
copy /Y "%~dp0start-server.vbs" %STARTUP_DIR%\SuperPlugin.vbs

echo.
echo ✓ 开机自启已配置完成！
echo.
echo 每次电脑开机后，服务器会自动在后台启动。
echo 你也可以随时双击 start-server.bat 手动启动。
echo.
pause
