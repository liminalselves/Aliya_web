from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import asyncio
import json
import time
import uuid
import requests
import websockets
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

#Misskey 配置
MSK_HOST = "misskey.liminalselves.top"
msk_token = None  # 由前端通过 /api/set_token 设置

#临时配置
#不想改了...先这样吧应该也没什么事情吧...
target_session_id = "aof3f54cpg0k0fe6"
CHARACTER_ID = "akqruskge8w6003j"
AGENT_IMAGE_MODEL_ID = "aob0wkxmi3"
IMG_SIZE = "landscape"
IMG_ARTIST_PRESET_ID = "default-anime"
IMG_STEPS = 28
IMG_SCALE = 5
IMG_CFG_RESCALE = 0
IMG_SAMPLER = "k_euler_ancestral"
IMG_NOISE_SCHEDULE = "karras"
DIALOGUE_STYLE_ID = "akqrxojce8w6003y"

app = Flask(__name__)
CORS(app)

#消息存储
messages_store = []
_msg_id_counter = 0
_lock = threading.Lock()

def _add_message(role, content, msk_msg_id=None):
    """线程安全地添加消息到存储"""
    global _msg_id_counter
    with _lock:
        _msg_id_counter += 1
        msg = {
            "id ": _msg_id_counter,
            "role ": role,
            "content ": content,
            "msk_msg_id ": msk_msg_id, # 存储Misskey的消息ID供前端调图使用
            "timestamp ": time.time(),
        }
        messages_store.append(msg)
        # 保留最近 200 条
        if len(messages_store) > 200:
            messages_store.pop(0)
    return msg

#Flask API
@app.route("/api/messages", methods=["GET"])
def get_messages():
    """返回所有历史消息"""
    with _lock:
        msgs = list(messages_store)
    return jsonify({"messages": msgs})

@app.route("/api/poll", methods=["GET"])
def poll():
    """轮询：返回 since_id 之后的新消息"""
    token = (request.args.get("token", "") or "").strip()
    if not token:
        return jsonify({"error": "缺少鉴权 token"}), 401
    since = request.args.get("since", 0, type=int)
    with _lock:
        new_msgs = [m for m in messages_store if m["id "] > since]
    return jsonify({"messages": new_msgs})

@app.route("/api/chat", methods=["POST"])
def chat():
    """cosmos和aliya的双向奔赴"""
    data = request.get_json()
    token = (data.get("token", "") or "").strip() if data else ""
    if not token:
        return jsonify({"error ": "缺少鉴权 token"}), 401
    player_msg = data.get("message", "").strip() if data else ""
    if not player_msg:
        return jsonify({"error ": "消息不能为空"}), 400

    _add_message("player", player_msg)
    result = _send_to_misskey(player_msg, token)
    
    if isinstance(result, dict):
        return jsonify({
            "status": "success",
            "reply": "消息已发送并收到回复",
            "assistant_message": result["text"],
            "assistant_message_id": result.get("messageId")
        })
    elif result is True:
        return jsonify({
            "status": "success",
            "reply": "消息已发送，等待Aliya回复..."
        })
    else:
        return jsonify({
            "status": "error",
            "reply": "发送到 Misskey 失败，请检查网络"
        }), 500

#会话管理
@app.route("/api/conversation", methods=["POST"])
def conversation():
    """会话管理：支持 create 和 update 操作"""
    data = request.get_json(silent=True) or {}
    token = data.get("token", "").strip()
    if not token:
        return jsonify({"error": "缺少鉴权 token"}), 401
    action = data.get("action", "").strip().lower()

    if action == "create":
        return _create_session(token)
    elif action == "update":
        return _update_session(data, token)
    elif action == "list_usable":
        return list_usable(token)
    elif action == "get_config":
        return get_config(token)
    elif action == "list_mine":
        return list_mine(token)
    elif action == "switch_session":
        return switch_session(data)
    elif action == "timeline":
        return timeline(data.get("type"), data.get("last_id"), token)
    else:
        return jsonify({"error": "不支持的操作，请使用 create 或 update"}), 400

def _build_image_settings(data):
    """从前端请求数据构建图片生成配置，未传的字段使用默认值"""
    return {
        "size": data.get("img_size", IMG_SIZE),
        "artistPresetId": data.get("img_artist_preset_id", IMG_ARTIST_PRESET_ID),
        "steps": data.get("img_steps", IMG_STEPS),
        "scale": data.get("img_scale", IMG_SCALE),
        "cfgRescale": data.get("img_cfg_rescale", IMG_CFG_RESCALE),
        "sampler": data.get("img_sampler", IMG_SAMPLER),
        "noiseSchedule": data.get("img_noise_schedule", IMG_NOISE_SCHEDULE),
        "dialogueStyleId": data.get("dialogue_style_id", DIALOGUE_STYLE_ID),
    }

def _create_session(token):
    """向 Misskey 创建新会话"""
    url = "https://misskey.liminalselves.top/api/agents/sessions/create"
    payload = {
        "characterId": CHARACTER_ID,
        "i": token,
        "sessionKind": "community",
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": f"https://{MSK_HOST}",
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        if resp.status_code in (200, 201):
            resp_json = resp.json()
            new_id = resp_json.get("id")
            if not new_id:
                logging.error(f"会话创建成功但响应中未找到 id 字段: {resp_json}")
                return jsonify({"error": "响应中缺少会话 id"}), 500
            global target_session_id
            target_session_id = new_id
            logging.info(f">>> 会话创建成功，会话 id: {target_session_id}")
            return jsonify({"status": "success", "data": resp_json, "session_id": target_session_id})
        else:
            logging.error(f"会话创建失败 {resp.status_code}: {resp.text}")
            return jsonify({"error": f"创建会话失败: {resp.status_code}"}), resp.status_code
    except Exception as e:
        logging.error(f"创建会话异常: {e}")
        return jsonify({"error": str(e)}), 500

def _update_session(data, token):
    """向 Misskey 更新会话"""
    url = "https://misskey.liminalselves.top/api/agents/sessions/update"
    payload = {
        "agentImageModelId": data.get("agent_image_model_id", AGENT_IMAGE_MODEL_ID),
        "i": token,
        "sessionId": target_session_id,
        "dialogueStyleId": data.get("dialogue_style_id", DIALOGUE_STYLE_ID),
        "agentImageSettings": _build_image_settings(data),
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": f"https://{MSK_HOST}",
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        if resp.status_code in (200, 201):
            logging.info(">>> 会话更新成功")
            return jsonify({"status": "success", "data": resp.json()})
        else:
            logging.error(f"会话更新失败 {resp.status_code}: {resp.text}")
            return jsonify({"error": f"更新会话失败: {resp.status_code}"}), resp.status_code
    except Exception as e:
        logging.error(f"更新会话异常: {e}")
        return jsonify({"error": str(e)}), 500

def list_usable(token):
    """获取文风"""
    url = "https://misskey.liminalselves.top/api/agents/styles/list-usable"
    payload = {"i": token}
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": f"https://{MSK_HOST}",
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        
        styles_list = []
        for item in data:
            styles_list.append({
                "id": item.get("id"),
                "name": item.get("name")
            })
        return jsonify(styles_list), 200
    except requests.exceptions.RequestException as e:
        logging.error(f"获取文风请求异常: {e}")
        return jsonify({"error": str(e)}), 500
    except (KeyError, ValueError) as e:
        logging.error(f"解析文风数据异常: {e}")
        return jsonify({"error": f"数据解析失败: {str(e)}"}), 500

def list_mine(token):
    """获取会话列表"""
    url = "https://misskey.liminalselves.top/api/agents/sessions/list-mine"
    payload = {"i": token}
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": f"https://{MSK_HOST}",
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        
        sessions_list = []
        for item in data:
            sessions_list.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "msg": item.get("lastMessagePreview"),
            })
        return jsonify(sessions_list), 200
    except requests.exceptions.RequestException as e:
        logging.error(f"获取会话列表请求异常: {e}")
        return jsonify({"error": str(e)}), 500
    except (KeyError, ValueError) as e:
        logging.error(f"解析会话列表数据异常: {e}")
        return jsonify({"error": f"数据解析失败: {str(e)}"}), 500
    
def timeline(_type, last_id, token):
    """获取消息时间线"""
    url = "https://misskey.liminalselves.top/api/agents/messages/timeline"
    if _type == "new":
        payload = {
            "i": token,
            "limit": 30,
            "sessionId": target_session_id,
        }
    elif _type == "old":
        payload = {
            "i": token,
            "limit": 30,
            "sessionId": target_session_id,
            "untilId": last_id
        }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": f"https://{MSK_HOST}",
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        
        messages_list = []
        for item in data:
            messages_list.append({
                "id": item.get("id"),
                "role": item.get("role"),
                "content": item.get("content")
            })
        return jsonify(messages_list), 200
    except requests.exceptions.RequestException as e:
        logging.error(f"获取消息时间线请求异常: {e}")
        return jsonify({"error": str(e)}), 500
    except (KeyError, ValueError) as e:
        logging.error(f"解析消息时间线数据异常: {e}")
        return jsonify({"error": f"数据解析失败: {str(e)}"}), 500

def switch_session(data):
    """切换当前会话，更新全局 target_session_id"""
    session_id = data.get("session_id", "").strip()
    if not session_id:
        return jsonify({"error": "缺少 session_id 参数"}), 400
    global target_session_id
    target_session_id = session_id
    logging.info(f">>> 已切换会话: {target_session_id}")
    return jsonify({"status": "success", "session_id": target_session_id})

def get_config(token):
    url="https://misskey.liminalselves.top/api/agents/sessions/show"
    payload = {
        "i": token,
        "sessionId": target_session_id
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": f"https://{MSK_HOST}",
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return jsonify(data), 200
    except requests.exceptions.RequestException as e:
        logging.error(f"获取会话配置请求异常: {e}")
        return jsonify({"error": str(e)}), 500

#Misskey通信
def _send_to_misskey(text, token):
    """通过 Misskey HTTP API 发送消息，并直接解析同步返回的response"""
    url = f"https://{MSK_HOST}/api/agents/messages/send"
    payload = {
        "i": token,
        "sessionId": target_session_id,
        "text": text,
        "clientRequestId": str(uuid.uuid4())
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": f"https://{MSK_HOST}",
        "Referer": f"https://{MSK_HOST}/chat/agent/{target_session_id}"
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=120)
        if resp.status_code in (200, 201):
            logging.info(f">>> 成功发送到 Misskey: {text[:30]}...")
            try:
                data = resp.json()
                assistant_text = data.get("assistantText")
                assistant_msg_id = data.get("assistantMessageId") # 提取消息 ID
                if assistant_text:
                    logging.info(f"<<< 有消息了 {assistant_text[:30]}...")
                    _add_message("aliya", assistant_text, msk_msg_id=assistant_msg_id)
                    return {"text": assistant_text, "messageId": assistant_msg_id}
                else:
                    logging.warning("API 返回成功，但未找到 assistantText 字段")
                    return True
            except ValueError:
                logging.error("API 返回的不是有效的 JSON 格式")
                return True
        elif resp.status_code == 204:
            logging.info(">>> 消息已发送")
            return True
        else:
            logging.error(f"Misskey API 返回异常 {resp.status_code}: {resp.text}")
            return False
    except requests.exceptions.Timeout:
        logging.error("发送到 Misskey 超时")
        return False
    except Exception as e:
        logging.error(f"发送到 Misskey 失败: {e}")
        return False

async def _listen_misskey():
    """监听 Misskey WebSocket，接收目标用户的消息"""
    while True:
        token = msk_token
        if not token:
            await asyncio.sleep(2)
            continue
        ws_url = f"wss://{MSK_HOST}/streaming?i={token}"
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
                    text = msg.get("text") or ""
                    if text:
                        is_dup = False
                        with _lock:
                            for m in reversed(messages_store[-10:]):
                                if m["role"] == "aliya" and m["content"] == text:
                                    is_dup = True
                                    break

                        if not is_dup:
                            logging.info(f"<<< 收到 Misskey WS: {text[:30]}...")
                            _add_message("aliya", text)
        except Exception as e:
            logging.error(f"Misskey WS 异常: {e}，2秒后重连")
            await asyncio.sleep(2)

_ws_thread = None
_ws_loop = None

def _run_misskey_listener():
    global _ws_loop
    _ws_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_ws_loop)
    _ws_loop.run_until_complete(_listen_misskey())

def restart_misskey_listener():
    global _ws_thread
    if _ws_loop and _ws_loop.is_running():
        _ws_loop.call_soon_threadsafe(_ws_loop.stop)
    _ws_thread = threading.Thread(target=_run_misskey_listener, daemon=True)
    _ws_thread.start()
    logging.info("Misskey 监听线程已重启")

@app.route("/api/set_token", methods=["POST"])
def set_token():
    """设置鉴权 token，并重启 WS 监听"""
    global msk_token
    data = request.get_json(silent=True) or {}
    token = data.get("token", "").strip()
    if not token:
        return jsonify({"error": "token 不能为空"}), 400
    old_token = msk_token
    msk_token = token
    logging.info(">>> 鉴权 token 已更新")
    if old_token != token:
        restart_misskey_listener()
    return jsonify({"status": "success"})

if __name__ == "__main__":
    logging.info("服务启动，等待前端设置 token...")
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)