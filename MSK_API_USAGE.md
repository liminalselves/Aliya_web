Exit code: 0
Wall time: 0.3 seconds
Output:
# Aliya Web 中 MSK API 使用说明

本文档根据当前项目源码整理，覆盖项目实际使用到的 Misskey/Aliya Agent API（下文简称 MSK API）、调用链、请求参数和使用方法。

## 1. 总体架构

项目的 MSK API 地址固定为：

~~~text
https://misskey.liminalselves.top/api/
~~~

主要调用方：

1. `misskey__agent_server.py`：Flask 后端通过 `requests` 调用 MSK API，并包装成本地 `/api/*` 接口。
2. `js/index.js`、`js/index-m.js`：浏览器直接调用生图占位接口并跳转到 MiAuth 页面；其余业务请求通常先调用本地 Flask 代理。

需要账号权限的 HTTP 请求都使用 JSON POST，并在请求体中携带：

~~~json
{
  "i": "MISSKEY_API_TOKEN"
}
~~~

后端统一使用 JSON 请求头、Misskey Origin；普通请求超时 30 秒，发送消息请求超时 120 秒。

> 安全提示：Token 会被前端保存在浏览器 `localStorage` 的 `aliya_msk_token` 中，并提交给本地 Flask 服务。不要把真实 Token 写入源码、文档、日志、URL 或 Git。

## 2. MSK API 总清单

| 上游接口 | 方法 | 用途 | 调用位置 |
|---|---:|---|---|
| `/api/i` | POST | 验证 Token、获取当前用户 | `_validate_misskey_token` |
| `/api/miauth/{session_id}/check` | POST | 用 MiAuth 会话换取 Token | `miauth_check` |
| `/api/drive/files/create` | POST multipart | 上传图片并获取 `fileId` | `/api/upload_image` |
| `/api/agents/sessions/create` | POST | 创建 Aliya 会话 | `_create_session_data` |
| `/api/agents/sessions/list-mine` | POST | 获取当前账号的会话 | `_list_mine_data`、`list_mine` |
| `/api/agents/sessions/show` | POST | 查询会话详情/配置 | `_show_session_data` |
| `/api/agents/sessions/update` | POST | 更新模型、图片配置、文风、分段输出或名称 | `_update_session` 等 |
| `/api/agents/sessions/delete` | POST | 删除会话 | `delete_session` |
| `/api/agents/styles/list-usable` | POST | 获取当前账号可用文风 | `_list_usable_styles_data`、`list_usable` |
| `/api/agents/styles/subscribe` | POST | 订阅指定文风 | `_ensure_required_style_subscription` |
| `/api/agents/messages/send` | POST | 向 Aliya 发送消息并读取同步回复 | `_send_to_misskey` |
| `/api/agents/messages/timeline` | POST | 获取会话消息时间线 | `timeline` |
| `/api/agents/images/models/list` | POST | 获取生图模型列表 | `list_image_models` |
| `/api/agents/images/presets/list` | POST | 获取画师串/图片预设列表 | `list_image_presets` |
| `/api/agents/images/generate-placeholder` | POST | 生成图片占位符对应的图片 URL | 两个前端脚本直接调用 |
| `/api/agents/models/success-rates` | POST | 获取模型成功率 | `model_success_rates` |
| `/api/agents/credit-balance` | POST | 获取 Agent 余额 | `credit_balance` |
| `/api/meta` | POST | 获取 Agent 对话模型元数据 | `list_agent_models` |
| `/streaming?i=TOKEN` | WebSocket | 监听新聊天消息 | `_listen_misskey` |

## 3. 鉴权与 MiAuth

### 3.1 验证 Token：`POST /api/i`

后端请求体：

~~~json
{
  "i": "MISSKEY_API_TOKEN"
}
~~~

HTTP 200 且返回 JSON 对象时，项目认为 Token 有效，并取出 `id`、`username`、`name` 返回前端。该调用由本地：

~~~text
POST /api/validate_token
POST /api/set_token       （兼容旧客户端）
~~~

触发。页面启动、手动填写 Token、Token watchdog 定时检查都会调用 `/api/validate_token`。

### 3.2 MiAuth 授权

前端生成随机 `session_id`，跳转到：

~~~text
https://misskey.liminalselves.top/miauth/{session_id}?name=Aliya%20Web&callback=回调地址&permission=read:account,read:chat,write:chat,read:messaging,write:messaging,read:drive,write:drive
~~~

授权完成后，前端调用本地：

~~~http
POST /api/miauth_check
Content-Type: application/json
~~~

~~~json
{
  "session_id": "授权时生成的 session_id"
}
~~~

后端再调用上游：

~~~http
POST https://misskey.liminalselves.top/api/miauth/{session_id}/check
Content-Type: application/json
~~~

请求体为空 JSON `{}`。上游返回的 Token 传给前端并保存到 `localStorage`；之后前端所有本地 POST 请求通过 `makeBody()` 自动添加 `token` 字段。

## 4. 会话与文风 API

项目固定使用：

~~~text
characterId     = akqruskge8w6003j
dialogueStyleId = aofoi210vawt01t4
~~~

### 4.1 可用文风：`POST /api/agents/styles/list-usable`

~~~json
{ "i": "TOKEN" }
~~~

项目读取返回列表中的 `id`。创建、切换或使用会话前，后端检查固定 `dialogueStyleId` 是否可用。

### 4.2 订阅文风：`POST /api/agents/styles/subscribe`

固定文风不在可用列表时调用：

~~~json
{
  "i": "TOKEN",
  "styleId": "aofoi210vawt01t4"
}
~~~

调用后再次请求 `styles/list-usable` 验证；仍不可用则停止后续会话操作。

### 4.3 创建会话：`POST /api/agents/sessions/create`

~~~json
{
  "i": "TOKEN",
  "characterId": "akqruskge8w6003j",
  "dialogueStyleId": "aofoi210vawt01t4",
  "sessionKind": "community"
}
~~~

返回对象必须包含 `id`。后端按 Token 缓存会话 ID，缓存有效期 6 小时。

### 4.4 查询会话：`list-mine` 和 `show`

获取列表：

~~~json
{ "i": "TOKEN" }
~~~

查询详情：

~~~json
{
  "i": "TOKEN",
  "sessionId": "SESSION_ID"
}
~~~

项目只接受固定 Aliya 角色的会话；切换或复用会话时还会检查并强制设置固定文风。

### 4.5 更新会话：`POST /api/agents/sessions/update`

项目根据前端设置拼装以下请求体，部分字段可省略：

~~~json
{
  "i": "TOKEN",
  "sessionId": "SESSION_ID",
  "agentModelId": "对话模型 ID",
  "agentImageModelId": "aob0wkxmi3",
  "dialogueStyleId": "aofoi210vawt01t4",
  "segmentedOutputEnabled": true,
  "agentImageSettings": {
    "size": "landscape",
    "artistPresetId": "default-anime",
    "steps": 28,
    "scale": 5,
    "cfgRescale": 0,
    "sampler": "k_euler_ancestral",
    "noiseSchedule": "karras",
    "dialogueStyleId": "aofoi210vawt01t4"
  }
}
~~~

前端通过本地 `POST /api/conversation`，设置 `action: "update"`，并使用 `img_size`、`img_artist_preset_id`、`agent_image_model_id`、`agent_model_id`、`segmented_output_enabled` 字段；后端负责转换为上游字段。

### 4.6 删除会话：`POST /api/agents/sessions/delete`

~~~json
{
  "i": "TOKEN",
  "sessionId": "SESSION_ID"
}
~~~

通过本地 `/api/conversation` 的 `action: "delete_session"` 触发；成功后清除服务端会话缓存。

## 5. 消息 API

### 5.1 发送消息：`POST /api/agents/messages/send`

~~~json
{
  "i": "TOKEN",
  "sessionId": "SESSION_ID",
  "text": "用户消息",
  "clientRequestId": "UUID"
}
~~~

项目等待同步结果，超时 120 秒。成功响应可能包含：

~~~json
{
  "assistantText": "Aliya 回复",
  "assistantMessageId": "MISSKEY_MESSAGE_ID"
}
~~~

后端将回复写入本地消息缓存，并把 `assistantMessageId` 存为 `msk_msg_id`，供生图使用。前端通过本地 `POST /api/chat` 触发：

~~~json
{
  "token": "TOKEN",
  "message": "你好"
}
~~~

### 5.2 消息时间线：`POST /api/agents/messages/timeline`

获取最新消息：

~~~json
{
  "i": "TOKEN",
  "sessionId": "SESSION_ID",
  "limit": 30
}
~~~

获取更早消息时增加 `untilId`：

~~~json
{
  "i": "TOKEN",
  "sessionId": "SESSION_ID",
  "limit": 30,
  "untilId": "MESSAGE_ID"
}
~~~

前端通过本地 `/api/conversation` 使用：

~~~json
{ "action": "timeline", "type": "new", "token": "TOKEN" }
~~~

或：

~~~json
{ "action": "timeline", "type": "old", "last_id": "MESSAGE_ID", "token": "TOKEN" }
~~~

### 5.3 Streaming WebSocket

连接地址：

~~~text
wss://misskey.liminalselves.top/streaming?i=TOKEN
~~~

连接后发送：

~~~json
{
  "type": "connect",
  "body": {
    "channel": "main",
    "id": "msk_main"
  }
}
~~~

后端监听 `type=channel` 且 `body.type=newChatMessage` 的事件，从事件体的 `text` 取出回复并写入本地消息缓存。Token 变化时关闭旧连接并重连；异常时 2 秒后重连。发送消息同时使用 HTTP 同步响应和 WebSocket，后端对最近 10 条相同内容做简单去重。

## 6. 模型、图片和余额 API

### 6.1 Agent 对话模型：`POST /api/meta`

~~~json
{ "detail": false }
~~~

该接口在项目中不携带 `i`，用于读取公开元数据。后端取出 `agentModels`、`agentDefaultModelId`、`agentLlmConfigured`，通过本地 `action: "agent_models"` 返回前端。缓存 300 秒。

### 6.2 生图模型：`POST /api/agents/images/models/list`

~~~json
{ "i": "TOKEN" }
~~~

通过 `action: "image_models"` 调用，返回数组，缓存 300 秒。

### 6.3 画师串/图片预设：`POST /api/agents/images/presets/list`

~~~json
{ "i": "TOKEN" }
~~~

通过 `action: "image_presets"` 调用，返回数组，缓存 300 秒。

### 6.4 模型成功率：`POST /api/agents/models/success-rates`

~~~json
{
  "i": "TOKEN",
  "windowMs": 3600000
}
~~~

通过 `action: "model_success_rates"` 调用。失败时返回默认 `{"windowMs":3600000,"rates":[]}`，不让页面整体失败。缓存 30 秒。

### 6.5 Agent 余额：`POST /api/agents/credit-balance`

~~~json
{ "i": "TOKEN" }
~~~

通过 `action: "credit_balance"` 调用，缓存 10 秒。发送消息成功后主动清除缓存。

### 6.6 图片占位图：`POST /api/agents/images/generate-placeholder`

这是项目中唯一由浏览器直接请求上游的业务接口，桌面端和移动端代码相同：

~~~json
{
  "i": "TOKEN",
  "sessionId": "SESSION_ID",
  "messageId": "MISSKEY_MESSAGE_ID",
  "placeholderIndex": 0,
  "regenerate": false,
  "regenerationOfId": null
}
~~~

前端从返回值读取 `url`，不存在时读取 `thumbnailUrl`。该调用要求上游允许浏览器跨域；项目 CSP 已允许 Misskey 的图片和连接来源。

## 7. 本地 Flask 代理如何使用

前端默认请求当前站点的本地 API，即 `API_BASE + "/api/..."`。所有本地 POST 请求都自动附加：

~~~json
{ "token": "TOKEN" }
~~~

常用本地接口：

| 本地接口 | 请求 | 作用 |
|---|---:|---|
| `/api/validate_token` | POST | 验证并激活 Token |
| `/api/miauth_check` | POST | 完成 MiAuth 换 Token |
| `/api/chat` | POST | 发送聊天消息 |
| `/api/poll` | GET/POST | 读取本地消息缓存中的新消息 |
| `/api/messages` | GET | 读取当前 Token 的本地消息缓存 |
| `/api/conversation` | POST | 统一处理会话、模型、文风、时间线和余额操作 |

`/api/conversation` 支持：

~~~text
create
update
list_usable
get_config
list_mine
switch_session
timeline
image_models
image_presets
model_success_rates
agent_models
credit_balance
update_segmented
rename_session
delete_session
~~~

## 8. 典型调用流程

~~~text
首次打开页面
  -> MiAuth 页面授权，或手动输入 Token
  -> POST /api/validate_token
  -> GET/POST /streaming?i=TOKEN，启动新消息监听
  -> POST /api/conversation {action: get_config}
  -> show/list-mine；没有 Aliya 会话时 create
  -> list-usable；必要时 styles/subscribe
  -> sessions/update 强制固定文风并保存模型/图片配置

发送消息
  -> POST 本地 /api/chat
  -> sessions/show/list-mine/create（确保会话有效）
  -> POST /api/agents/messages/send
  -> 读取同步 assistantText，或由 WebSocket 收到 newChatMessage
  -> 若回复包含图片占位符，浏览器调用 generate-placeholder
~~~

## 9. 代码位置与维护注意事项

- 上游主机、固定角色和默认图片配置位于 `misskey__agent_server.py` 文件顶部。
- 通用 HTTP POST 封装为 `_http_post()` 和 `_misskey_api_post()`；新增接口时应复用它们。
- 需要 Token 的上游接口统一把 Token 放在 JSON 的 `i` 字段，本地代理接口使用 JSON 的 `token` 字段。
- 会话和元数据是进程内缓存，服务重启后会丢失；Token 只按 SHA-256 指纹作为缓存键，不直接作为缓存键保存。
- 当前 `msk_token` 是单个全局 WebSocket 监听 Token，而 HTTP 会话/消息状态按 Token 隔离；多账号并发时，WebSocket 监听可能只服务最近激活的 Token。
- `js/index.js` 与 `js/index-m.js` 是桌面端和移动端的近似重复逻辑，修改直接上游调用时需同步检查两份文件。

## 10. 2026-07 Agent API 扩展适配

本项目已针对 `liminalselves/misskey` 的 Agent API 扩展完成兼容，参考提交 `4b71e69e83`；提交 `4571a8dff8` 只涉及帖子详情和评论交互，不影响本项目 Agent API。

### 10.1 图片消息与图片识别

前端输入区新增图片选择按钮。发送流程为：

~~~text
浏览器选择图片
  -> POST /api/upload_image（本地 Flask）
  -> POST https://misskey.liminalselves.top/api/drive/files/create
  -> 获取 fileId
  -> POST /api/chat {message, file_id}
  -> POST /api/agents/messages/send {text, fileId}
~~~

上游发送体现在文本为空时仍然有效，但必须至少包含文本或一张图片：

~~~json
{
  "i": "TOKEN",
  "sessionId": "SESSION_ID",
  "text": "可为空",
  "fileId": "DRIVE_FILE_ID",
  "clientRequestId": "UUID"
}
~~~

成功响应中的以下字段会通过本地 `/api/chat` 返回：

~~~json
{
  "userImageRecognitionStatus": "succeeded",
  "userImageRecognitionDescription": "图片内容描述",
  "proactiveScheduleActionTypes": ["create"],
  "proactiveScheduleControlFailed": false
}
~~~

时间线也会透传 `file`、`imageRecognitionStatus`、`imageRecognitionDescription`、`proactiveScheduleActionTypes` 和 `proactiveScheduleControlFailed`，并过滤 `isInternal: true` 的内部消息。

### 10.2 视觉模型

新增上游接口：

~~~http
POST /api/agents/vision-models/list
~~~

项目通过本地 `/api/conversation` 的 `action: "vision_models"` 代理。会话更新支持：

~~~json
{
  "agentVisionModelId": "VISION_MODEL_ID"
}
~~~

对应本地字段为 `agent_vision_model_id`。`agents/sessions/show` 返回的视觉模型配置会原样透传给前端。

### 10.3 主动消息配置与计划

会话更新现在支持：

~~~json
{
  "timeAwarenessEnabled": true,
  "randomProactiveEnabled": true,
  "scheduledProactiveEnabled": true
}
~~~

本地 `/api/conversation` 对应字段分别是 `time_awareness_enabled`、`random_proactive_enabled` 和 `scheduled_proactive_enabled`。

新增上游接口及本地 action：

| 上游接口 | 本地 action | 用途 |
|---|---|---|
| `POST /api/agents/proactive-schedules/list` | `proactive_schedules` | 查询主动消息定时计划 |
| `POST /api/agents/proactive-schedules/set-status` | `set_proactive_status` | 暂停或恢复定时计划 |
| `POST /api/agents/proactive-schedules/delete` | `delete_proactive_schedule` | 删除定时计划 |

暂停/恢复请求示例（`status` 必须为 `active` 或 `paused`）：

~~~json
{
  "action": "set_proactive_status",
  "session_id": "SESSION_ID",
  "schedule_id": "SCHEDULE_ID",
  "status": "paused",
  "token": "TOKEN"
}
~~~

删除请求示例：

~~~json
{
  "action": "delete_proactive_schedule",
  "session_id": "SESSION_ID",
  "schedule_id": "SCHEDULE_ID",
  "token": "TOKEN"
}
~~~

### 10.4 生图模型与占位图错误信息

`agents/images/models/list` 返回的模型可包含：

~~~json
{
  "provider": "openai",
  "description": "模型说明",
  "supportsReferenceImage": true
}
~~~

项目后端会保留这些字段并返回给前端，不再假设图片模型只有 Aurora。`agents/images/generate-placeholder` 失败时，前端应读取 `errorMessage`；当前占位图调用仍保持原有兼容行为。

### 10.5 当前适配边界

- 已支持：图片上传、图片消息发送、图片识别结果透传、视觉模型字段、主动消息开关、主动消息计划查询/启停/删除、扩展时间线字段和内部消息过滤。
- 已兼容：原有纯文本聊天、会话管理、生图配置和占位图调用。
- 尚未制作完整 Operation UI：视觉模型选择、主动消息计划的创建/编辑表单仍可通过本地 API action 调用；当前界面只提供图片消息入口。
