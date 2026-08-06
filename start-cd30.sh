#!/usr/bin/env bash
# CD30瞳电游工作室展区特别版启动脚本
# Linux / macOS 一键启动

set -e

# 切换到脚本所在目录，确保相对路径（requirements.txt、.env、misskey_server.py）可用
cd "$(dirname "$0")"

echo "=========================================="
echo "CD30瞳电游工作室展区特别版启动脚本"
echo "=========================================="
echo

# ---------- 选择 Python 解释器 ----------
# 优先使用项目内虚拟环境，其次 python3，最后 python
PYTHON_BIN=""
if [ -x ".venv/bin/python" ]; then
    PYTHON_BIN=".venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
else
    echo "[错误] 未找到 Python，请先安装 Python 3.8+"
    exit 1
fi

echo "[信息] 使用 Python: $PYTHON_BIN"
"$PYTHON_BIN" --version

# ---------- 检查并安装依赖 ----------
echo "[信息] 检查依赖..."
if ! "$PYTHON_BIN" -c "import flask" >/dev/null 2>&1; then
    echo "[信息] 安装依赖..."
    "$PYTHON_BIN" -m pip install -r requirements.txt
fi

# ---------- 加载环境变量 ----------
# 优先从 .env 文件读取；若 .env 不存在则使用内置默认值
if [ -f ".env" ]; then
    echo "[信息] 从 .env 加载环境变量"
    set -a
    # shellcheck disable=SC1091
    . "./.env"
    set +a
else
    echo "[提示] 未找到 .env 文件，使用内置默认配置"
    CD30_ACCESS_PASSWORD="${CD30_ACCESS_PASSWORD:-cd30aliyaweb}"
    CD30_REMOTE_API_KEY="${CD30_REMOTE_API_KEY:-yGMjJwKW3qkrtNfJ7ydJXcFZhOjKYuGc}"
    CD30_DEFAULT_MODEL="${CD30_DEFAULT_MODEL:-akqrsc9j5u}"
    CD30_DEFAULT_IMAGE_MODEL="${CD30_DEFAULT_IMAGE_MODEL:-aob0wkxmi3}"
    ALIYA_HOST="${ALIYA_HOST:-0.0.0.0}"
    ALIYA_PORT="${ALIYA_PORT:-47653}"
    ALIYA_DEBUG="${ALIYA_DEBUG:-false}"
fi

# 兜底：确保关键变量一定有值（.env 中可能缺失某项）
CD30_ACCESS_PASSWORD="${CD30_ACCESS_PASSWORD:-cd30aliyaweb}"
CD30_REMOTE_API_KEY="${CD30_REMOTE_API_KEY:-yGMjJwKW3qkrtNfJ7ydJXcFZhOjKYuGc}"
CD30_DEFAULT_MODEL="${CD30_DEFAULT_MODEL:-akqrsc9j5u}"
CD30_DEFAULT_IMAGE_MODEL="${CD30_DEFAULT_IMAGE_MODEL:-aob0wkxmi3}"
ALIYA_HOST="${ALIYA_HOST:-0.0.0.0}"
ALIYA_PORT="${ALIYA_PORT:-47653}"
ALIYA_DEBUG="${ALIYA_DEBUG:-false}"

export CD30_ACCESS_PASSWORD CD30_REMOTE_API_KEY CD30_DEFAULT_MODEL CD30_DEFAULT_IMAGE_MODEL
export ALIYA_HOST ALIYA_PORT ALIYA_DEBUG

echo
echo "[信息] 环境变量已配置"
echo "[信息] 访问密码: $CD30_ACCESS_PASSWORD"
echo "[信息] 默认模型: $CD30_DEFAULT_MODEL"
echo "[信息] 默认绘图模型: $CD30_DEFAULT_IMAGE_MODEL"
echo
echo "[信息] 启动服务器..."
echo "[信息] 本地访问: http://localhost:$ALIYA_PORT"
echo "[信息] 局域网访问: http://$(hostname):$ALIYA_PORT"
echo
echo "按 Ctrl+C 停止服务器"
echo

# ---------- 启动服务器 ----------
exec "$PYTHON_BIN" misskey_server.py
