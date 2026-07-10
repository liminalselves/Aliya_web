# Aliya Web

Aliya Web 是一个面向 Misskey Agent 的本地 Web 前端与 Flask 代理服务，提供对话、会话管理、模型选择、生图配置、分段输出和 Token 授权等功能。

## 功能

- 与 Aliya Agent 进行对话，并轮询获取新消息
- Misskey MiAuth 授权和 Token 验证
- Aliya 会话的创建、切换、重命名和删除
- 对话模型、生图模型、画师串和图片尺寸选择
- 分段输出：仅影响前端展示与播放，不改写原始消息
- 模型、生图和会话列表加载动画
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

- `Operation`：选择对话模型、生图模型、记忆设置和会话。
- `Settings`：填写或更新 Misskey API Token。
- 分段输出开关：修改后点击“保存”，保存成功会立即刷新当前会话并关闭 Operation 面板。

## 配置与安全

- 前端默认请求后端 `http://127.0.0.1:4000`，如需部署到其他地址，需要同步调整 `js/index.js` 和 `js/index-m.js` 中的 `API_BASE`。
- Misskey Token 由页面提交到本地 Flask 服务，不应写入源码、README 或日志。
- 后端默认只监听 `127.0.0.1`，如需局域网访问，请明确设置 `ALIYA_HOST` 并配置防火墙及访问控制。
- 当前服务会在进程内维护部分会话、消息和元数据缓存，重启服务后本地运行态缓存可能被清空。

## 常见问题

### 页面打开但无法对话

确认 Flask 后端正在运行，并检查浏览器是否能访问 `http://127.0.0.1:4000`。随后在 `Settings` 中重新完成授权或验证 Token。

### 模型列表为空

确认 Token 有效且网络可以访问 Misskey 服务。模型元数据具有缓存机制，必要时可重启后端再次加载。

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
s
## 致谢与来源

本项目原始前端界面来自小黑盒用户(su)：[小黑盒用户主页](https://www.xiaoheihe.cn/app/user/profile/34126245)。

在此基础上，项目进行了功能、交互、布局、样式和后端适配方面的修改，形成当前的 Aliya Web 版本。感谢原作者提供的前端设计基础。
