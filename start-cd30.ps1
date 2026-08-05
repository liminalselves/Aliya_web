# CD30瞳电游工作室展区特别版启动脚本
# PowerShell版本

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CD30瞳电游工作室展区特别版启动脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查Python是否安装
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[信息] Python版本: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[错误] 未找到Python，请先安装Python 3.8+" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}

# 检查依赖
Write-Host "[信息] 检查依赖..." -ForegroundColor Yellow
$flaskInstalled = pip show flask 2>&1
if (-not $flaskInstalled) {
    Write-Host "[信息] 安装依赖..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# 设置环境变量
$env:CD30_ACCESS_PASSWORD = "cd30aliyaweb"
$env:CD30_REMOTE_API_KEY = "yGMjJwKW3qkrtNfJ7ydJXcFZhOjKYuGc"
$env:CD30_DEFAULT_MODEL = "akqrsc9j5u"
$env:CD30_DEFAULT_IMAGE_MODEL = "nai-diffusion-4-5-full"
$env:ALIYA_HOST = "0.0.0.0"
$env:ALIYA_PORT = "4000"
$env:ALIYA_DEBUG = "false"

Write-Host ""
Write-Host "[信息] 环境变量已配置" -ForegroundColor Green
Write-Host "[信息] 访问密码: $env:CD30_ACCESS_PASSWORD" -ForegroundColor Cyan
Write-Host "[信息] 默认模型: $env:CD30_DEFAULT_MODEL" -ForegroundColor Cyan
Write-Host "[信息] 默认绘图模型: $env:CD30_DEFAULT_IMAGE_MODEL" -ForegroundColor Cyan
Write-Host ""
Write-Host "[信息] 启动服务器..." -ForegroundColor Green
Write-Host "[信息] 本地访问: http://localhost:$env:ALIYA_PORT" -ForegroundColor Cyan
Write-Host "[信息] 局域网访问: http://$env:COMPUTERNAME:$env:ALIYA_PORT" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""

# 启动服务器
python misskey_server.py

Read-Host "按回车键退出"
