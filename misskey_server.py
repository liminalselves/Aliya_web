from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import asyncio
import json
import time
import requests
import websockets
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# === Misskey 配置 ===
MSK_HOST = "misskey.liminalselves.top"
MSK_TOKEN = "QEnG25h1F9qNqfEICSvrdX7FAyqoZCCQ"
MSK_TARGET_USER_ID = "afdizm0glzhc000e"

app = Flask(__name__)
CORS(app)

# === 消息存储 ===
# 每条消息: {"id": int, "role": "aliya"|"player", "content": str, "timestamp": float}
messages_store = []
_msg_id_counter = 0
_lock = threading.Lock()


def _add_message(role, content):
    """线程安全地添加消息到存储"""
    global _msg_id_counter
    with _lock:
        _msg_id_counter += 1
        msg = {
            "id": _msg_id_counter,
            "role": role,
            "content": content,
            "timestamp": time.time(),
        }
        messages_store.append(msg)
        # 保留最近 200 条
        if len(messages_store) > 200:
            messages_store.pop(0)
        return msg


# ==================== Flask API ====================

@app.route("/api/messages", methods=["GET"])
def get_messages():
    """返回所有历史消息"""
    with _lock:
        msgs = list(messages_store)
    return jsonify({"messages": msgs})


@app.route("/api/poll", methods=["GET"])
def poll():
    """轮询：返回 since_id 之后的新消息"""
    since = request.args.get("since", 0, type=int)
    with _lock:
        new_msgs = [m for m in messages_store if m["id"] > since]
    return jsonify({"messages": new_msgs})


@app.route("/api/chat", methods=["POST"])
def chat():
    """前端发送消息 → 转发到 Misskey"""
    data = request.get_json()
    player_msg = data.get("message", "").strip() if data else ""
    if not player_msg:
        return jsonify({"error": "消息不能为空"}), 400

    # 存入本地存储
    _add_message("player", player_msg)

    # 转发到 Misskey
    success = _send_to_misskey(player_msg)

    if success:
        return jsonify({"reply": "消息已发送"})
    else:
        return jsonify({"reply": "发送到 Misskey 失败，请检查网络"})


# ==================== Misskey 通信 ====================

def _send_to_misskey(text):
    """通过 Misskey HTTP API 发送私信"""
    url = f"https://{MSK_HOST}/api/chat/messages/create-to-user"
    payload = {
        "i": MSK_TOKEN,
        "toUserId": MSK_TARGET_USER_ID,
        "text": text,
    }
    try:
        resp = requests.post(url, json=payload, timeout=15)
        if resp.status_code == 200:
            logging.info(f">>> 已发送到 Misskey: {text[:30]}...")
            return True
        else:
            logging.error(f"Misskey API 返回 {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        logging.error(f"发送到 Misskey 失败: {e}")
        return False


async def _listen_misskey():
    """监听 Misskey WebSocket，接收目标用户的消息"""
    ws_url = f"wss://{MSK_HOST}/streaming?i={MSK_TOKEN}"
    while True:
        try:
            async with websockets.connect(ws_url) as ws:
                logging.info("Misskey WebSocket 已连接")
                await ws.send(json.dumps({
                    "type": "connect",
                    "body": {"channel": "main", "id": "msk_main"},
                }))

                async for message in ws:
                    data = json.loads(message)
                    if data.get("type") != "channel":
                        continue

                    body = data.get("body", {})
                    if body.get("type") != "newChatMessage":
                        continue

                    msg = body.get("body", {})
                    if msg.get("fromUserId") != MSK_TARGET_USER_ID:
                        continue

                    text = msg.get("text") or ""
                    # 清理文本中的 @olenxane 提及
                    text = text.replace("@olenxane\n", "").replace("@olenxane", "").strip()

                    if text:
                        logging.info(f"<<< 收到 Misskey: {text[:30]}...")
                        _add_message("aliya", text)

        except Exception as e:
            logging.error(f"Misskey WS 异常: {e}，5秒后重连")
            await asyncio.sleep(5)


def _run_misskey_listener():
    """在独立线程中运行 Misskey WebSocket 监听器"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(_listen_misskey())


# ==================== 启动入口 ====================

if __name__ == "__main__":
    # 启动 Misskey 监听线程
    t = threading.Thread(target=_run_misskey_listener, daemon=True)
    t.start()
    logging.info("Misskey 监听线程已启动")

    # 启动 Flask
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
