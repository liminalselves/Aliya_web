from pathlib import Path, PurePosixPath
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
import threading
import asyncio
import copy
import hashlib
import json
import os
import re
import time
import uuid
import requests
from requests.adapters import HTTPAdapter
import websockets
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

#Misskey 配置
MSK_HOST = "misskey.liminalselves.top"
msk_token = None  # 由前端通过 /api/set_token 设置

# 每个 token 维护独立当前会话，避免多个浏览器或账号互相覆盖。
_session_state = {}
_session_state_lock = threading.Lock()
SESSION_STATE_TTL = 6 * 60 * 60
CHARACTER_ID = "akqruskge8w6003j"
AGENT_IMAGE_MODEL_ID = "aob0wkxmi3"
IMG_SIZE = "landscape"
IMG_ARTIST_PRESET_ID = "default-anime"
IMG_STEPS = 28
IMG_SCALE = 5
IMG_CFG_RESCALE = 0
IMG_SAMPLER = "k_euler_ancestral"
IMG_NOISE_SCHEDULE = "karras"
DIALOGUE_STYLE_ID = "aofoi210vawt01t4"
MAX_REQUEST_BYTES = 16 * 1024 * 1024
MAX_MESSAGE_CHARS = 16000
METADATA_CACHE_MAX_ENTRIES = 256

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_REQUEST_BYTES
LOCAL_CORS_ORIGINS = [
    "http://127.0.0.1:4000",
    "http://localhost:4000",
    "http://[::1]:4000",
]
CORS(app, resources={r"/api/*": {"origins": LOCAL_CORS_ORIGINS}})

FRONTEND_ROOT = Path(__file__).resolve().parent
STATIC_DIRS = {"audio", "css", "img", "js"}
CACHEABLE_STATIC_DIRS = {"audio", "img"}
SHORT_CACHE_STATIC_DIRS = {"css", "js"}
HTML_PAGES = {"index.html", "index-p.html", "index-m.html"}

_metadata_cache = {}
_metadata_cache_inflight = {}
_metadata_cache_lock = threading.Lock()
_http_local = threading.local()


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"error": "请求体过大"}), 413


@app.after_request
def add_response_headers(response):
    path = request.path or "/"
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob: https:; "
        "media-src 'self'; "
        f"connect-src 'self' https://{MSK_HOST} wss://{MSK_HOST}; "
        "object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'",
    )

    if response.status_code >= 400:
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    elif path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    else:
        clean_path = path.lstrip("/") or "index.html"
        first_part = clean_path.split("/", 1)[0]
        if clean_path in HTML_PAGES:
            response.headers["Cache-Control"] = "no-cache, max-age=0, must-revalidate"
        elif first_part in CACHEABLE_STATIC_DIRS:
            response.headers["Cache-Control"] = "public, max-age=86400"
        elif first_part in SHORT_CACHE_STATIC_DIRS:
            response.headers["Cache-Control"] = "public, max-age=300, must-revalidate"

    return response


class StyleEnforcementError(RuntimeError):
    pass


def _misskey_headers(extra=None):
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": f"https://{MSK_HOST}",
    }
    if extra:
        headers.update(extra)
    return headers


def _http_post(url, **kwargs):
    session = getattr(_http_local, "session", None)
    if session is None:
        session = requests.Session()
        adapter = HTTPAdapter(pool_connections=4, pool_maxsize=8, max_retries=0)
        session.mount("https://", adapter)
        _http_local.session = session
    return session.post(url, **kwargs)


def _token_fingerprint(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _metadata_cache_key(namespace, token=None):
    owner = _token_fingerprint(token) if token else "global"
    return namespace, owner


def _cleanup_metadata_cache_locked(now=None):
    now = time.monotonic() if now is None else now
    expired = [key for key, item in _metadata_cache.items() if item["expires_at"] <= now]
    for key in expired:
        _metadata_cache.pop(key, None)
    while len(_metadata_cache) > METADATA_CACHE_MAX_ENTRIES:
        oldest_key = min(_metadata_cache, key=lambda key: _metadata_cache[key]["stored_at"])
        _metadata_cache.pop(oldest_key, None)


def _cached_metadata(namespace, token, ttl, loader):
    """Return an isolated cache copy and collapse concurrent misses for one key."""
    key = _metadata_cache_key(namespace, token)
    while True:
        now = time.monotonic()
        with _metadata_cache_lock:
            _cleanup_metadata_cache_locked(now)
            item = _metadata_cache.get(key)
            if item and item["expires_at"] > now:
                return copy.deepcopy(item["value"])
            event = _metadata_cache_inflight.get(key)
            if event is None:
                event = threading.Event()
                _metadata_cache_inflight[key] = event
                is_loader = True
            else:
                is_loader = False

        if is_loader:
            break
        event.wait(timeout=35)

    try:
        value = loader()
        now = time.monotonic()
        with _metadata_cache_lock:
            _cleanup_metadata_cache_locked(now)
            if key not in _metadata_cache and len(_metadata_cache) >= METADATA_CACHE_MAX_ENTRIES:
                oldest_key = min(_metadata_cache, key=lambda cache_key: _metadata_cache[cache_key]["stored_at"])
                _metadata_cache.pop(oldest_key, None)
            _metadata_cache[key] = {
                "value": copy.deepcopy(value),
                "stored_at": now,
                "expires_at": now + max(1, float(ttl)),
            }
        return copy.deepcopy(value)
    finally:
        with _metadata_cache_lock:
            completed = _metadata_cache_inflight.pop(key, None)
            if completed:
                completed.set()


def _invalidate_metadata(namespace, token=None):
    with _metadata_cache_lock:
        _metadata_cache.pop(_metadata_cache_key(namespace, token), None)


def _cleanup_session_state_locked(now=None):
    now = now or time.time()
    expired = [
        key for key, item in _session_state.items()
        if now - float(item.get("updated_at", 0)) > SESSION_STATE_TTL
    ]
    for key in expired:
        _session_state.pop(key, None)


def _get_cached_session_id(token):
    now = time.time()
    key = _token_fingerprint(token)
    with _session_state_lock:
        _cleanup_session_state_locked(now)
        item = _session_state.get(key)
        if not item:
            return None
        item["updated_at"] = now
        return item.get("session_id")


def _set_cached_session_id(token, session_id):
    if not session_id:
        return
    with _session_state_lock:
        _cleanup_session_state_locked()
        _session_state[_token_fingerprint(token)] = {
            "session_id": session_id,
            "updated_at": time.time(),
        }


def _clear_cached_session_id(token, session_id=None):
    key = _token_fingerprint(token)
    with _session_state_lock:
        item = _session_state.get(key)
        if item and (session_id is None or item.get("session_id") == session_id):
            _session_state.pop(key, None)


def _create_session_data(token):
    _ensure_required_style_subscription(token)
    url = f"https://{MSK_HOST}/api/agents/sessions/create"
    payload = {
        "characterId": CHARACTER_ID,
        "dialogueStyleId": DIALOGUE_STYLE_ID,
        "i": token,
        "sessionKind": "community",
    }
    resp = _http_post(url, json=payload, headers=_misskey_headers(), timeout=30)
    resp.raise_for_status()
    data = resp.json()
    session_id = data.get("id")
    if not session_id:
        raise ValueError(f"响应中缺少会话 id: {data}")
    return data


def _list_mine_data(token):
    url = f"https://{MSK_HOST}/api/agents/sessions/list-mine"
    resp = _http_post(url, json={"i": token}, headers=_misskey_headers(), timeout=30)
    resp.raise_for_status()
    return resp.json()


def _list_usable_styles_data(token):
    url = f"https://{MSK_HOST}/api/agents/styles/list-usable"
    resp = _http_post(url, json={"i": token}, headers=_misskey_headers(), timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []


def _usable_style_ids(token):
    return {
        item.get("id")
        for item in _list_usable_styles_data(token)
        if isinstance(item, dict) and item.get("id")
    }


def _show_session_data(token, session_id):
    url = f"https://{MSK_HOST}/api/agents/sessions/show"
    payload = {"i": token, "sessionId": session_id}
    resp = _http_post(url, json=payload, headers=_misskey_headers(), timeout=30)
    resp.raise_for_status()
    return resp.json()


def _ensure_required_style_subscription(token):
    usable_ids = _usable_style_ids(token)
    if DIALOGUE_STYLE_ID in usable_ids:
        logging.info(f">>> 标准文风特殊版已在可用文风列表中: {DIALOGUE_STYLE_ID}")
        return {"success": True, "alreadyUsable": True}

    url = f"https://{MSK_HOST}/api/agents/styles/subscribe"
    payload = {"i": token, "styleId": DIALOGUE_STYLE_ID}
    resp = _http_post(url, json=payload, headers=_misskey_headers(), timeout=30)
    resp.raise_for_status()
    result = resp.json()

    usable_ids_after = _usable_style_ids(token)
    if DIALOGUE_STYLE_ID not in usable_ids_after:
        raise StyleEnforcementError(
            "标准文风特殊版不在可用文风列表中，且自动添加后仍不可用："
            f"styleId={DIALOGUE_STYLE_ID}"
        )

    logging.info(f">>> 已将标准文风特殊版加入可用文风列表: {DIALOGUE_STYLE_ID}")
    return result


def _ensure_required_session_style(token, session_id, session_data=None):
    if session_data is None:
        session_data = _show_session_data(token, session_id)

    current_style_id = session_data.get("dialogueStyleId")
    if current_style_id == DIALOGUE_STYLE_ID:
        logging.info(f">>> 当前会话已使用标准文风特殊版: {session_id} dialogueStyleId={DIALOGUE_STYLE_ID}")
        return

    logging.info(
        f">>> 当前会话不是标准文风特殊版，准备切换: "
        f"{session_id} current={current_style_id} target={DIALOGUE_STYLE_ID}"
    )
    _ensure_required_style_subscription(token)

    url = f"https://{MSK_HOST}/api/agents/sessions/update"
    payload = {"i": token, "sessionId": session_id, "dialogueStyleId": DIALOGUE_STYLE_ID}
    resp = _http_post(url, json=payload, headers=_misskey_headers(), timeout=30)
    resp.raise_for_status()

    verified = _show_session_data(token, session_id)
    actual_style_id = verified.get("dialogueStyleId")
    if actual_style_id != DIALOGUE_STYLE_ID:
        raise StyleEnforcementError(
            "强制标准文风特殊版失败："
            f"目标 dialogueStyleId={DIALOGUE_STYLE_ID}，实际 dialogueStyleId={actual_style_id}"
        )

    logging.info(f">>> 已强制会话使用标准文风特殊版: {session_id} dialogueStyleId={DIALOGUE_STYLE_ID}")


def _session_character_id(session):
    if not isinstance(session, dict):
        return None
    for key in ("characterId", "agentCharacterId"):
        value = session.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    for key in ("character", "agentCharacter"):
        value = session.get(key)
        if isinstance(value, dict):
            character_id = value.get("id")
            if isinstance(character_id, str) and character_id.strip():
                return character_id.strip()
    return None


def _is_aliya_session(session, allowed_character_ids=None):
    character_id = _session_character_id(session)
    if allowed_character_ids is None:
        allowed_character_ids = {CHARACTER_ID}
    return character_id in allowed_character_ids


def _resolve_aliya_character_ids(sessions):
    """只允许固定 Aliya characterId，绝不根据可编辑名称推断角色。"""
    return {CHARACTER_ID}


def _ensure_session_id(token, create_if_missing=True):
    """确保当前 token 对应账号有一个 Aliya 会话。"""
    cached_session_id = _get_cached_session_id(token)

    if cached_session_id:
        try:
            current_session = _show_session_data(token, cached_session_id)
            if _is_aliya_session(current_session):
                _ensure_required_session_style(token, cached_session_id, current_session)
                return cached_session_id
            logging.info(
                f"当前会话角色不匹配，准备重新选择 Aliya 会话: "
                f"{cached_session_id} characterId={_session_character_id(current_session)}"
            )
            _clear_cached_session_id(token, cached_session_id)
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response is not None else None
            if status not in (400, 403, 404):
                raise
            logging.info(f"当前会话不可用，准备重新选择会话: {cached_session_id}")
            _clear_cached_session_id(token, cached_session_id)

    sessions = _list_mine_data(token)
    allowed_ids = _resolve_aliya_character_ids(sessions)
    aliya_sessions = [s for s in sessions if _is_aliya_session(s, allowed_ids)] if isinstance(sessions, list) else []
    if aliya_sessions:
        session_id = aliya_sessions[0].get("id")
        if session_id:
            _ensure_required_session_style(token, session_id, aliya_sessions[0])
            _set_cached_session_id(token, session_id)
            logging.info(f">>> 已自动切换到 Aliya 会话: {session_id}")
            return session_id

    if create_if_missing:
        data = _create_session_data(token)
        session_id = data["id"]
        _set_cached_session_id(token, session_id)
        logging.info(f">>> 已自动创建会话: {session_id}")
        return session_id

    return None


def _safe_frontend_path(filename):
    normalized = filename.replace("\\", "/")
    parts = PurePosixPath(normalized).parts
    if not parts or normalized.startswith("/") or "\x00" in normalized:
        abort(404)
    if any(part in ("", ".", "..") for part in parts):
        abort(404)
    return normalized, parts


def _token_from_request(data=None):
    if data is None:
        data = request.get_json(silent=True) or {}
    token = _token_from_json(data)
    if token:
        return token
    token = str(request.headers.get("X-Aliya-Token", "") or "").strip()
    if token and len(token) <= 2048:
        return token
    return ""


def _token_from_json(data):
    if not isinstance(data, dict):
        return ""
    raw_token = data.get("token")
    if not isinstance(raw_token, str):
        return ""
    token = raw_token.strip()
    return token if len(token) <= 2048 else ""


def _string_from_json(data, key, max_len=None):
    if not isinstance(data, dict):
        return ""
    value = data.get(key)
    if not isinstance(value, str):
        return ""
    value = value.strip()
    if max_len is not None and len(value) > max_len:
        return ""
    return value


@app.route("/", methods=["GET"])
def index():
    return send_from_directory(FRONTEND_ROOT, "index.html")


@app.route("/<path:filename>", methods=["GET"])
def frontend_file(filename):
    filename, parts = _safe_frontend_path(filename)
    first_part = parts[0]
    is_page = filename in {"index.html", "index-p.html", "index-m.html", "favicon.ico"}
    if is_page:
        return send_from_directory(FRONTEND_ROOT, filename)
    if first_part in STATIC_DIRS and len(parts) > 1:
        return send_from_directory(FRONTEND_ROOT / first_part, "/".join(parts[1:]))
    abort(404)

#消息存储
messages_store = []
_msg_id_counter = 0
_lock = threading.Lock()

def _message_owner_key(token):
    return _token_fingerprint(token) if token else None


def _add_message(role, content, msk_msg_id=None, token=None):
    """线程安全地添加消息到存储"""
    global _msg_id_counter
    owner = _message_owner_key(token)
    with _lock:
        _msg_id_counter += 1
        msg = {
            "id": _msg_id_counter,
            "role": role,
            "content": content,
            "msk_msg_id": msk_msg_id, # 存储Misskey的消息ID供前端调图使用
            "timestamp": time.time(),
            "owner": owner,
        }
        messages_store.append(msg)
        # 保留最近 200 条
        if len(messages_store) > 200:
            messages_store.pop(0)
    return msg


def _messages_for_token(token):
    owner = _message_owner_key(token)
    return [m for m in messages_store if m.get("owner") == owner]


def _public_message(message):
    return {k: v for k, v in message.items() if k != "owner"}

#Flask API
@app.route("/api/messages", methods=["GET"])
def get_messages():
    """返回所有历史消息"""
    token = _token_from_request()
    if not token:
        return jsonify({"error": "缺少鉴权 token"}), 401
    with _lock:
        msgs = [_public_message(m) for m in _messages_for_token(token)]
    return jsonify({"messages": msgs})

@app.route("/api/poll", methods=["GET", "POST"])
def poll():
    """轮询：返回 since_id 之后的新消息"""
    data = request.get_json(silent=True) or {}
    token = _token_from_request(data)
    if not token:
        return jsonify({"error": "缺少鉴权 token"}), 401
    since_raw = data.get("since", request.args.get("since", 0)) if isinstance(data, dict) else request.args.get("since", 0)
    try:
        since = int(since_raw or 0)
    except (TypeError, ValueError):
        since = 0
    with _lock:
        new_msgs = [
            _public_message(m) for m in _messages_for_token(token)
            if int(m.get("id", m.get("id ", 0)) or 0) > since
        ]
    return jsonify({"messages": new_msgs})

@app.route("/api/chat", methods=["POST"])
def chat():
    """cosmos和aliya的双向奔赴"""
    data = request.get_json()
    token = _token_from_json(data)
    if not token:
        return jsonify({"error": "缺少鉴权 token"}), 401
    raw_message = data.get("message") if isinstance(data, dict) else None
    if not isinstance(raw_message, str):
        return jsonify({"error": "消息必须是字符串"}), 400
    player_msg = raw_message.strip()
    if not player_msg:
        return jsonify({"error": "消息不能为空"}), 400
    if len(player_msg) > MAX_MESSAGE_CHARS:
        return jsonify({"error": f"消息不能超过 {MAX_MESSAGE_CHARS} 字符"}), 400

    _add_message("player", player_msg, token=token)
    result = _send_to_misskey(player_msg, token)
    
    if isinstance(result, dict) and result.get("error"):
        return jsonify({
            "status": "error",
            "reply": result["error"],
        }), 500
    elif isinstance(result, dict):
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
    token = _token_from_json(data)
    if not token:
        return jsonify({"error": "缺少鉴权 token"}), 401
    action = _string_from_json(data, "action", 64).lower()

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
        return switch_session(data, token)
    elif action == "timeline":
        return timeline(data.get("type"), data.get("last_id"), token)
    elif action == "image_models":
        return list_image_models(token)
    elif action == "image_presets":
        return list_image_presets(token)
    elif action == "model_success_rates":
        return model_success_rates(token)
    elif action == "agent_models":
        return list_agent_models(token)
    elif action == "credit_balance":
        return credit_balance(token)
    elif action == "update_segmented":
        return update_segmented_output(data, token)
    elif action == "rename_session":
        return rename_session(data, token)
    elif action == "delete_session":
        return delete_session(data, token)
    else:
        return jsonify({"error": "不支持的操作，请使用 create 或 update"}), 400

def _misskey_api_post(token, endpoint, payload=None, timeout=30):
    body = dict(payload or {})
    body["i"] = token
    url = f"https://{MSK_HOST}/api/{endpoint}"
    resp = _http_post(url, json=body, headers=_misskey_headers(), timeout=timeout)
    resp.raise_for_status()
    return resp.json()

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
        "dialogueStyleId": DIALOGUE_STYLE_ID,
    }

def _image_model_id_from_data(data):
    if "agent_image_model_id" not in data:
        return AGENT_IMAGE_MODEL_ID
    model_id = data.get("agent_image_model_id")
    if model_id is None:
        return None
    if not isinstance(model_id, str):
        raise ValueError("agent_image_model_id 必须是字符串或 null")
    model_id = model_id.strip()
    return model_id or None

def _agent_model_id_from_data(data):
    model_id = data.get("agent_model_id")
    if model_id is None:
        return None
    if not isinstance(model_id, str):
        raise ValueError("agent_model_id 必须是字符串或 null")
    model_id = model_id.strip()
    return model_id or None

def _bool_from_data(data, key):
    value = data.get(key)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)

def _current_or_requested_session_id(data, token):
    session_id = _string_from_json(data, "session_id", 128)
    if not session_id:
        return _ensure_session_id(token)

    session = _show_session_data(token, session_id)
    if not _is_aliya_session(session):
        raise PermissionError("只能操作 Aliya 角色的会话")
    _ensure_required_session_style(token, session_id, session)
    return session_id

def _create_session(token):
    """向 Misskey 创建新会话"""
    try:
        resp_json = _create_session_data(token)
        session_id = resp_json["id"]
        _set_cached_session_id(token, session_id)
        logging.info(f">>> 会话创建成功，会话 id: {session_id}")
        return jsonify({"status": "success", "data": resp_json, "session_id": session_id})
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        detail = e.response.text if e.response is not None else str(e)
        logging.error(f"会话创建失败 {status}: {detail}")
        return jsonify({"error": f"创建会话失败: {status}", "detail": detail}), status
    except Exception as e:
        logging.error(f"创建会话异常: {e}")
        return jsonify({"error": str(e)}), 500

def _update_session(data, token):
    """向 Misskey 更新会话"""
    try:
        _ensure_required_style_subscription(token)
        session_id = _ensure_session_id(token)
    except Exception as e:
        logging.error(f"准备更新会话前获取会话失败: {e}")
        return jsonify({"error": str(e)}), 500
    url = "https://misskey.liminalselves.top/api/agents/sessions/update"
    payload = {
        "agentImageModelId": _image_model_id_from_data(data),
        "i": token,
        "sessionId": session_id,
        "dialogueStyleId": DIALOGUE_STYLE_ID,
        "agentImageSettings": _build_image_settings(data),
    }
    if "agent_model_id" in data:
        payload["agentModelId"] = _agent_model_id_from_data(data)
    if "segmented_output_enabled" in data:
        payload["segmentedOutputEnabled"] = _bool_from_data(data, "segmented_output_enabled")
    headers = _misskey_headers()
    try:
        resp = _http_post(url, json=payload, headers=headers, timeout=30)
        if resp.status_code in (200, 201):
            logging.info(">>> 会话更新成功")
            return jsonify({"status": "success", "data": resp.json()})
        else:
            logging.error(f"会话更新失败 {resp.status_code}: {resp.text}")
            return jsonify({"error": f"更新会话失败: {resp.status_code}"}), resp.status_code
    except Exception as e:
        logging.error(f"更新会话异常: {e}")
        return jsonify({"error": str(e)}), 500

def list_image_models(token):
    try:
        data = _cached_metadata(
            "image_models",
            token,
            300,
            lambda: _misskey_api_post(token, "agents/images/models/list"),
        )
        return jsonify(data if isinstance(data, list) else []), 200
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        detail = e.response.text if e.response is not None else str(e)
        logging.error(f"获取生图模型失败 {status}: {detail}")
        return jsonify({"error": f"获取生图模型失败: {status}", "detail": detail}), status
    except requests.exceptions.RequestException as e:
        logging.error(f"获取生图模型请求异常: {e}")
        return jsonify({"error": str(e)}), 500

def list_image_presets(token):
    try:
        data = _cached_metadata(
            "image_presets",
            token,
            300,
            lambda: _misskey_api_post(token, "agents/images/presets/list"),
        )
        return jsonify(data if isinstance(data, list) else []), 200
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        detail = e.response.text if e.response is not None else str(e)
        logging.error(f"获取画师串失败 {status}: {detail}")
        return jsonify({"error": f"获取画师串失败: {status}", "detail": detail}), status
    except requests.exceptions.RequestException as e:
        logging.error(f"获取画师串请求异常: {e}")
        return jsonify({"error": str(e)}), 500

def model_success_rates(token):
    try:
        data = _cached_metadata(
            "model_success_rates",
            token,
            30,
            lambda: _misskey_api_post(
                token,
                "agents/models/success-rates",
                {"windowMs": 60 * 60 * 1000},
            ),
        )
        return jsonify(data if isinstance(data, dict) else {"windowMs": 60 * 60 * 1000, "rates": []}), 200
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        detail = e.response.text if e.response is not None else str(e)
        logging.warning(f"获取模型成功率失败 {status}: {detail}")
        return jsonify({"windowMs": 60 * 60 * 1000, "rates": []}), 200
    except requests.exceptions.RequestException as e:
        logging.warning(f"获取模型成功率请求异常: {e}")
        return jsonify({"windowMs": 60 * 60 * 1000, "rates": []}), 200

def list_agent_models(token):
    try:
        def load_agent_models():
            url = f"https://{MSK_HOST}/api/meta"
            resp = _http_post(url, json={"detail": False}, headers=_misskey_headers(), timeout=30)
            resp.raise_for_status()
            return resp.json()

        data = _cached_metadata("agent_models", None, 300, load_agent_models)
        models = data.get("agentModels") if isinstance(data, dict) else []
        default_model_id = data.get("agentDefaultModelId") if isinstance(data, dict) else None
        return jsonify({
            "agentModels": models if isinstance(models, list) else [],
            "agentDefaultModelId": default_model_id,
            "agentLlmConfigured": bool(data.get("agentLlmConfigured")) if isinstance(data, dict) else False,
        }), 200
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        detail = e.response.text if e.response is not None else str(e)
        logging.error(f"获取对话模型失败 {status}: {detail}")
        return jsonify({"error": f"获取对话模型失败: {status}", "detail": detail}), status
    except requests.exceptions.RequestException as e:
        logging.error(f"获取对话模型请求异常: {e}")
        return jsonify({"error": str(e)}), 500

def credit_balance(token):
    try:
        data = _cached_metadata(
            "credit_balance",
            token,
            10,
            lambda: _misskey_api_post(token, "agents/credit-balance"),
        )
        return jsonify(data if isinstance(data, dict) else {"creditBalance": None}), 200
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        detail = e.response.text if e.response is not None else str(e)
        logging.warning(f"获取智能体余额失败 {status}: {detail}")
        return jsonify({"creditBalance": None}), 200
    except requests.exceptions.RequestException as e:
        logging.warning(f"获取智能体余额请求异常: {e}")
        return jsonify({"creditBalance": None}), 200

def update_segmented_output(data, token):
    try:
        session_id = _ensure_session_id(token)
        enabled = _bool_from_data(data, "enabled")
        result = _misskey_api_post(token, "agents/sessions/update", {
            "sessionId": session_id,
            "segmentedOutputEnabled": enabled,
        })
        return jsonify({"status": "success", "data": result}), 200
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        detail = e.response.text if e.response is not None else str(e)
        logging.error(f"更新分段输出失败 {status}: {detail}")
        return jsonify({"error": f"更新分段输出失败: {status}", "detail": detail}), status
    except Exception as e:
        logging.error(f"更新分段输出异常: {e}")
        return jsonify({"error": str(e)}), 500

def rename_session(data, token):
    try:
        session_id = _current_or_requested_session_id(data, token)
        name = _string_from_json(data, "name")
        if not name:
            return jsonify({"error": "会话名称不能为空"}), 400
        if len(name) > 256:
            return jsonify({"error": "会话名称不能超过 256 字符"}), 400

        result = _misskey_api_post(token, "agents/sessions/update", {
            "sessionId": session_id,
            "name": name,
        })
        return jsonify({"status": "success", "data": result}), 200
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        detail = e.response.text if e.response is not None else str(e)
        logging.error(f"重命名会话失败 {status}: {detail}")
        return jsonify({"error": f"重命名会话失败: {status}", "detail": detail}), status
    except Exception as e:
        logging.error(f"重命名会话异常: {e}")
        return jsonify({"error": str(e)}), 500

def delete_session(data, token):
    try:
        session_id = _current_or_requested_session_id(data, token)
        result = _misskey_api_post(token, "agents/sessions/delete", {"sessionId": session_id})
        _clear_cached_session_id(token, session_id)
        return jsonify({"status": "success", "data": result}), 200
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        detail = e.response.text if e.response is not None else str(e)
        logging.error(f"删除会话失败 {status}: {detail}")
        return jsonify({"error": f"删除会话失败: {status}", "detail": detail}), status
    except Exception as e:
        logging.error(f"删除会话异常: {e}")
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
        resp = _http_post(url, json=payload, headers=headers, timeout=30)
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
    """获取 Aliya 角色的会话列表"""
    try:
        data = _list_mine_data(token)
        allowed_ids = _resolve_aliya_character_ids(data)

        sessions_list = []
        for item in data:
            if not _is_aliya_session(item, allowed_ids):
                continue
            sessions_list.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "msg": item.get("lastMessagePreview"),
                "characterId": _session_character_id(item),
                "characterName": item.get("characterName"),
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
    try:
        session_id = _ensure_session_id(token)
    except Exception as e:
        logging.error(f"获取时间线前获取会话失败: {e}")
        return jsonify({"error": str(e)}), 500
    url = "https://misskey.liminalselves.top/api/agents/messages/timeline"
    if _type == "new":
        payload = {
            "i": token,
            "limit": 30,
            "sessionId": session_id,
        }
    elif _type == "old":
        payload = {
            "i": token,
            "limit": 30,
            "sessionId": session_id,
            "untilId": last_id
        }
    else:
        return jsonify({"error": "不支持的 timeline type"}), 400
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": f"https://{MSK_HOST}",
    }
    try:
        resp = _http_post(url, json=payload, headers=headers, timeout=30)
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

def switch_session(data, token):
    """切换当前 token 的 Aliya 会话。"""
    session_id = _string_from_json(data, "session_id", 128)
    if not session_id:
        return jsonify({"error": "缺少 session_id 参数"}), 400
    try:
        session = _show_session_data(token, session_id)
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        detail = e.response.text if e.response is not None else str(e)
        logging.error(f"切换会话校验失败 {status}: {detail}")
        return jsonify({"error": f"切换会话校验失败: {status}", "detail": detail}), status
    except requests.exceptions.RequestException as e:
        logging.error(f"切换会话校验请求异常: {e}")
        return jsonify({"error": str(e)}), 500

    if not _is_aliya_session(session):
        logging.warning(
            f"拒绝切换到非 Aliya 会话: {session_id} "
            f"characterId={_session_character_id(session)}"
        )
        return jsonify({"error": "只能切换 Aliya 角色的会话"}), 403

    try:
        _ensure_required_session_style(token, session_id, session)
    except StyleEnforcementError as e:
        logging.error(f"切换会话时强制文风失败: {e}")
        return jsonify({"error": str(e)}), 500
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        detail = e.response.text if e.response is not None else str(e)
        logging.error(f"切换会话时强制文风失败 {status}: {detail}")
        return jsonify({"error": f"强制文风失败: {status}", "detail": detail}), status
    except requests.exceptions.RequestException as e:
        logging.error(f"切换会话时强制文风请求异常: {e}")
        return jsonify({"error": str(e)}), 500

    _set_cached_session_id(token, session_id)
    logging.info(f">>> 已切换会话: {session_id}")
    return jsonify({"status": "success", "session_id": session_id})

def get_config(token):
    try:
        session_id = _ensure_session_id(token)
        data = _show_session_data(token, session_id)
        return jsonify(data), 200
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        detail = e.response.text if e.response is not None else str(e)
        logging.error(f"获取会话配置失败 {status}: {detail}")
        return jsonify({"error": f"获取会话配置失败: {status}", "detail": detail}), status
    except requests.exceptions.RequestException as e:
        logging.error(f"获取会话配置请求异常: {e}")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        logging.error(f"获取会话配置异常: {e}")
        return jsonify({"error": str(e)}), 500

#Misskey通信
def _send_to_misskey(text, token):
    """通过 Misskey HTTP API 发送消息，并直接解析同步返回的response"""
    try:
        session_id = _ensure_session_id(token)
    except StyleEnforcementError as e:
        logging.error(f"发送消息前强制文风失败: {e}")
        return {"error": str(e)}
    except Exception as e:
        logging.error(f"发送消息前获取会话失败: {e}")
        return {"error": f"发送消息前准备会话失败: {e}"}
    url = f"https://{MSK_HOST}/api/agents/messages/send"
    payload = {
        "i": token,
        "sessionId": session_id,
        "text": text,
        "clientRequestId": str(uuid.uuid4())
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": f"https://{MSK_HOST}",
        "Referer": f"https://{MSK_HOST}/chat/agent/{session_id}"
    }
    try:
        resp = _http_post(url, json=payload, headers=headers, timeout=120)
        if resp.status_code in (200, 201):
            _invalidate_metadata("credit_balance", token)
            logging.info(">>> 消息已成功发送到 Misskey")
            try:
                data = resp.json()
                assistant_text = data.get("assistantText")
                assistant_msg_id = data.get("assistantMessageId") # 提取消息 ID
                if assistant_text:
                    logging.info("<<< 已收到 Misskey 同步回复")
                    _add_message("aliya", assistant_text, msk_msg_id=assistant_msg_id, token=token)
                    return {"text": assistant_text, "messageId": assistant_msg_id}
                else:
                    logging.warning("API 返回成功，但未找到 assistantText 字段")
                    return True
            except ValueError:
                logging.error("API 返回的不是有效的 JSON 格式")
                return True
        elif resp.status_code == 204:
            _invalidate_metadata("credit_balance", token)
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

_ws_thread = None
_ws_loop = None
_ws_connection = None
_ws_state_lock = threading.Lock()


def _current_ws_token():
    with _ws_state_lock:
        return msk_token


async def _listen_misskey():
    """在单一事件循环中监听当前 token，并在 token 变化时重连。"""
    global _ws_connection
    while True:
        token = _current_ws_token()
        if not token:
            await asyncio.sleep(2)
            continue
        ws_url = f"wss://{MSK_HOST}/streaming?i={token}"
        connection = None
        try:
            async with websockets.connect(ws_url, open_timeout=15, close_timeout=5) as ws:
                connection = ws
                with _ws_state_lock:
                    _ws_connection = ws
                logging.info("Misskey WebSocket 已连接")
                await ws.send(json.dumps({
                    "type": "connect",
                    "body": {"channel": "main", "id": "msk_main"},
                }))
                async for message in ws:
                    if token != _current_ws_token():
                        break
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
                        owner = _message_owner_key(token)
                        with _lock:
                            for m in reversed(messages_store[-10:]):
                                if m.get("owner") == owner and m["role"] == "aliya" and m["content"] == text:
                                    is_dup = True
                                    break

                        if not is_dup:
                            logging.info("<<< 已收到 Misskey WebSocket 回复")
                            _add_message("aliya", text, token=token)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            if token == _current_ws_token():
                logging.error(f"Misskey WS 异常: {e}，2秒后重连")
                await asyncio.sleep(2)
        finally:
            with _ws_state_lock:
                if _ws_connection is connection:
                    _ws_connection = None


def _run_misskey_listener():
    global _ws_loop, _ws_thread
    loop = asyncio.new_event_loop()
    with _ws_state_lock:
        _ws_loop = loop
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_listen_misskey())
    finally:
        loop.close()
        with _ws_state_lock:
            if _ws_loop is loop:
                _ws_loop = None
            if _ws_thread is threading.current_thread():
                _ws_thread = None


def restart_misskey_listener():
    """关闭旧 token 的连接；监听线程会使用最新 token 自动重连。"""
    global _ws_thread
    with _ws_state_lock:
        loop = _ws_loop
        connection = _ws_connection
        thread = _ws_thread

    if loop and loop.is_running() and connection is not None:
        asyncio.run_coroutine_threadsafe(connection.close(), loop)

    if thread and thread.is_alive():
        return

    with _ws_state_lock:
        if _ws_thread and _ws_thread.is_alive():
            return
        _ws_thread = threading.Thread(
            target=_run_misskey_listener,
            name="misskey-listener",
            daemon=True,
        )
        _ws_thread.start()
    logging.info("Misskey 监听线程已启动")


def _activate_misskey_token(token):
    global msk_token
    with _ws_state_lock:
        old_token = msk_token
        msk_token = token
    if old_token != token:
        restart_misskey_listener()


def _validate_misskey_token(token):
    resp = _http_post(
        f"https://{MSK_HOST}/api/i",
        json={"i": token},
        headers=_misskey_headers(),
        timeout=15,
    )
    if resp.status_code != 200:
        return None
    body = resp.json()
    return body if isinstance(body, dict) else None

@app.route("/api/set_token", methods=["POST"])
def set_token():
    """兼容旧客户端：验证并激活 token。"""
    data = request.get_json(silent=True) or {}
    token = _token_from_json(data)
    if not token:
        return jsonify({"error": "token 不能为空"}), 400
    try:
        user = _validate_misskey_token(token)
        if user is None:
            return jsonify({"error": "token 无效或已过期"}), 401
        _activate_misskey_token(token)
        logging.info(">>> 鉴权 token 已验证并激活")
        return jsonify({"status": "success"})
    except requests.exceptions.RequestException as e:
        logging.error(f"激活 token 时验证请求失败: {e}")
        return jsonify({"error": "暂时无法验证 token"}), 502

@app.route("/api/validate_token", methods=["POST"])
def validate_token():
    """验证并激活 Misskey token。"""
    data = request.get_json(silent=True) or {}
    token = _token_from_json(data)
    if not token:
        return jsonify({"ok": False, "error": "token 不能为空"}), 400
    try:
        body = _validate_misskey_token(token)
        if body is not None:
            _activate_misskey_token(token)
            return jsonify({
                "ok": True,
                "user": {
                    "id": body.get("id"),
                    "username": body.get("username"),
                    "name": body.get("name"),
                }
            })
        return jsonify({"ok": False, "error": "token 无效或已过期"}), 401
    except requests.exceptions.RequestException as e:
        logging.error(f"验证 token 失败: {e}")
        return jsonify({"ok": False, "error": "暂时无法验证 token"}), 502
    except (TypeError, ValueError) as e:
        logging.error(f"解析 token 验证响应失败: {e}")
        return jsonify({"ok": False, "error": "token 验证响应无效"}), 502

@app.route("/api/miauth_check", methods=["POST"])
def miauth_check():
    """用 MiAuth session 换取 Misskey token。"""
    data = request.get_json(silent=True) or {}
    session_id = str(data.get("session_id") or "").strip()
    if not re.fullmatch(r"[A-Za-z0-9-]{1,128}", session_id):
        return jsonify({"ok": False, "error": "session_id 无效"}), 400
    try:
        resp = _http_post(
            f"https://{MSK_HOST}/api/miauth/{session_id}/check",
            json={},
            timeout=15,
        )
        body = resp.json() if resp.content else {}
        return jsonify(body), resp.status_code
    except Exception as e:
        logging.error(f"MiAuth check 失败: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/debug_style_enforcement", methods=["GET"])
def debug_style_enforcement():
    return jsonify({
        "ok": True,
        "server": "misskey__agent_server.py",
        "styleEnforcement": "show-session-check-styleId-list-usable-by-styleId-subscribe-if-missing-update-show-verify-before-send",
        "dialogueStyleId": DIALOGUE_STYLE_ID,
    })

if __name__ == "__main__":
    logging.info("服务启动，等待前端设置 token...")
    host = os.environ.get("ALIYA_HOST", "127.0.0.1")
    port = int(os.environ.get("ALIYA_PORT", "4000"))
    debug = os.environ.get("ALIYA_DEBUG", "").strip().lower() in {"1", "true", "yes", "on"}
    app.run(host=host, port=port, debug=debug, use_reloader=False)
