@echo off
chcp 65001 >nul
echo ==========================================
echo CD30瞳电游工作室展区特别版启动脚本
echo ==========================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

REM 检查依赖
echo [信息] 检查依赖...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo [信息] 安装依赖...
    pip install -r requirements.txt
)

REM 设置环境变量
set CD30_ACCESS_PASSWORD=cd30aliyaweb
set CD30_REMOTE_API_KEY=yGMjJwKW3qkrtNfJ7ydJXcFZhOjKYuGc
set CD30_DEFAULT_MODEL=akqrsc9j5u
set CD30_DEFAULT_IMAGE_MODEL=nai-diffusion-4-5-full
set ALIYA_HOST=0.0.0.0
set ALIYA_PORT=4000
set ALIYA_DEBUG=false

echo.
echo [信息] 环境变量已配置
echo [信息] 访问密码: %CD30_ACCESS_PASSWORD%
echo [信息] 默认模型: %CD30_DEFAULT_MODEL%
echo [信息] 默认绘图模型: %CD30_DEFAULT_IMAGE_MODEL%
echo.
echo [信息] 启动服务器...
echo [信息] 本地访问: http://localhost:%ALIYA_PORT%
echo [信息] 局域网访问: http://%COMPUTERNAME%:%ALIYA_PORT%
echo.
echo 按 Ctrl+C 停止服务器
echo.

REM 启动服务器
python misskey_server.py

pause
