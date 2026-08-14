@echo off
chcp 65001 >nul
title 设置开机自启 (任务计划程序)

echo ============================================
echo   设置 SuperPlugin 开机自动启动
echo   (使用 Windows 任务计划程序)
echo ============================================
echo.

:: 创建计划任务 - 用户登录时运行 start-server.vbs
schtasks /delete /tn "SuperPlugin" /f >nul 2>&1
schtasks /create /tn "SuperPlugin" /tr "wscript.exe \"D:\exporteplugin\plugin\server\start-server.vbs\"" /sc onlogon /rl highest /f

if %errorlevel% equ 0 (
    echo.
    echo ✓ 开机自启已成功设置！
    echo.
    echo 每次登录 Windows 后，服务器会自动启动。
    echo 可以随时用「管理服务器.bat」查看状态。
) else (
    echo.
    echo ✗ 设置失败，请以管理员身份运行此脚本！
    echo 右键点击 → 以管理员身份运行
)

echo.
pause
