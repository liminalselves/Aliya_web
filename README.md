# Aliya Web

Aliya Web 是一个面向 Misskey Agent 的本地 Web 前端与 Flask 代理服务，提供对话、会话管理、msk 托管控制台（模型/生图/主动消息/记忆/世界书/规则/文风）、分段输出和 Token 授权等功能。

## 功能

- 与 Aliya Agent 进行对话，并轮询获取新消息
- Misskey MiAuth 授权和 Token 验证
- Aliya 会话的创建、切换、重命名和删除
- msk 托管控制台：模型、生图、主动消息、记忆、世界书、规则、文风面板通过 `agent-control-embed` 嵌入（协议见 misskey 项目 `docs/agent-control-embed.md`）
- 分段输出：仅影响前端展示与播放，不改写原始消息
- 桌面端与移动端页面

## 技术栈

- 前端：HTML、CSS、原生 JavaScript
- 后端：Python、Flask、Flask-CORS
- Misskey 通信：`requests`、`websockets`

## 目录结构

```text
Aliya_web/
├── index.html                 # Flask 默认入口
├── index-p.html               # 桌面端页面
├── index-m.html               # 移动端页面
├── misskey_server.py          # 推荐启动入口
├── misskey__agent_server.py   # Flask 应用与 Misskey API 代理
├── css/                       # 页面样式
├── js/                        # 页面逻辑与消息渲染
├── img/                       # 图片资源
├── audio/                     # 音频资源
└── requirements.txt           # Python 依赖
```

## 环境要求

- Python 3.10 或更高版本
- 可访问 `misskey.liminalselves.top`
- 浏览器支持现代 JavaScript、Fetch 和 WebSocket

## 安装

在项目根目录执行：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

如果 PowerShell 禁止执行虚拟环境脚本，可以直接使用虚拟环境中的 Python：

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## 启动

```powershell
python misskey_server.py
```

默认连接生产站 `https://misskey.liminalselves.top`。启动命令后缀可指定 msk 实例源（本地开发联调）：

```powershell
python misskey_server.py http://127.0.0.1:3000
```

该参数同时作用于后端代理和前端（通过 `/js/config.js` 动态注入，前端无需改动）。不带协议时，`localhost`/`127.0.0.1` 按 http 处理，其余按 https 处理。

使用官方域名时，会话列表只显示 Aliya 角色的会话；使用非官方域名时（非官方实例上不存在 Aliya 角色），会话列表显示全部会话，且跳过标准文风强制订阅。

默认监听地址为：

```text
http://127.0.0.1:4000
```

也可以通过环境变量修改监听配置：

```powershell
$env:ALIYA_HOST = "127.0.0.1"
$env:ALIYA_PORT = "4000"
$env:ALIYA_DEBUG = "0"
python misskey_server.py
```

启动后访问 `http://127.0.0.1:4000/`。首次使用时，在页面的 `Settings` 中完成 Misskey 授权或填写 Token。

## 页面说明

- `Operation`：会话管理、消息显示开关，以及嵌入的 msk 托管控制台（模型/生图/主动消息/记忆/世界书/规则/文风）。
- `Settings`：填写或更新 Misskey API Token。

## 配置与安全

- msk 实例源由启动参数控制（见「启动」一节），后端 `MSK_ORIGIN` 与前端 `/js/config.js` 动态路由都来源于它。
- 前端默认使用同源 API，也就是请求当前站点下的 `/api/*`。如需前后端分离部署，可以在页面脚本加载前设置 `window.ALIYA_API_BASE = "https://你的后端域名"`。
- Misskey Token 由页面提交到本地 Flask 服务，不应写入源码、README 或日志。
- 后端默认只监听 `127.0.0.1`，如需局域网访问，请明确设置 `ALIYA_HOST` 并配置防火墙及访问控制。
- 当前服务会在进程内维护部分会话、消息和元数据缓存，重启服务后本地运行态缓存可能被清空。

## 常见问题

### 页面打开但无法对话

确认 Flask 后端正在运行，并检查浏览器是否能访问 `http://127.0.0.1:4000`。随后在 `Settings` 中重新完成授权或验证 Token。

### 控制台面板加载失败或提示鉴权失败

确认 Token 有效，且 `js/config.js` 与后端 `MSK_ORIGIN` 指向的 msk 实例已部署 `/agents/embed` 托管控制台。生产站未部署该功能时，面板会提示脚本加载失败或鉴权失败。

### PowerShell 中文乱码

项目命令应使用 UTF-8 编码运行；在 PowerShell 中可以先执行：

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

## 开发检查

```powershell
node --check js/index.js
node --check js/index-m.js
python -m py_compile misskey__agent_server.py
```

## 致谢与来源

本项目原始前端界面来自小黑盒用户(su)：[小黑盒用户主页](https://www.xiaoheihe.cn/app/user/profile/34126245)。

在此基础上，项目进行了功能、交互、布局、样式和后端适配方面的修改，形成当前的 Aliya Web 版本。感谢原作者提供的前端设计基础。
