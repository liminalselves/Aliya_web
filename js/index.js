document.addEventListener("DOMContentLoaded", function (event) {
    // ==================== 动态注入样式 ====================
    const style = document.createElement('style');
    style.textContent = `
        .image-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 8px;
            margin-top: 10px;
            display: inline-block;
            max-width: 100%;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .image-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.3);
            border-color: rgba(255, 255, 255, 0.3);
        }
        .image-card img {
            display: block;
            max-width: 100%;
            border-radius: 8px;
            pointer-events: none; 
        }
        #overlay.active {
            display: flex !important;
            justify-content: center;
            align-items: center;
            background: rgba(0, 0, 0, 0.85);
            z-index: 9999;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
        }
        #zoomedImage {
            max-width: 90vw;
            max-height: 90vh;
            transition: transform 0.1s ease-out;
            cursor: grab;
            user-select: none;
            -webkit-user-drag: none;
        }
        #zoomedImage.panning {
            cursor: grabbing;
            transition: none;
        }
    `;
    document.head.appendChild(style);

    var mainbgm = document.getElementById("mainbgm")
    var noisebgm = document.getElementById("noisebgm")
    var Litterbgm = document.getElementById("Litterbgm")
    const radioButton = document.querySelector('#radio-button');

    function setRem() {
        const designWidth = 1080; 
        const baseFontSize = 6; 
        const scale = document.documentElement.clientWidth / designWidth;
        document.documentElement.style.fontSize = baseFontSize * scale + "px";
    }
    setRem(); 
    window.addEventListener("resize", setRem); 

    // 心电图模块开始 (保持原样)
    const canvas = document.getElementById('ecgCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 260;
    canvas.height = 200;
    const ecgPoints = [
        { x: 0, y: 100 }, { x: 80, y: 100 }, { x: 90, y: 90 }, { x: 95, y: 110 },
        { x: 100, y: 70 }, { x: 110, y: 130 }, { x: 130, y: 40 }, { x: 150, y: 160 },
        { x: 170, y: 70 }, { x: 180, y: 130 }, { x: 185, y: 90 }, { x: 190, y: 120 },
        { x: 200, y: 100 }, { x: 260, y: 100 },
    ];
    let currentIndex = 0;
    let currentPos = 0;
    const speed = 5;
    const tailPoints = [];
    const tailMaxLength = 60;
    let isLooping = false;
    const GRADIENT_FALLOFF = 0.03;  
    
    function drawTrailWithGradient() {
        let previousPoint = null;
        const reversedPoints = [...tailPoints].reverse(); 
        ctx.globalCompositeOperation = 'screen';
        reversedPoints.forEach((point, index) => { 
            if (!point) { previousPoint = null; return; }
            const alpha = Math.max(0, 1 - index * GRADIENT_FALLOFF); 
            if (previousPoint) {
                const gradient = ctx.createLinearGradient(point.x, point.y, previousPoint.x, previousPoint.y);
                gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
                gradient.addColorStop(1, `rgba(255,255,255,${alpha * 1})`);
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(previousPoint.x, previousPoint.y);
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            previousPoint = point;
        });
        ctx.globalCompositeOperation = 'source-over';
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const startPoint = ecgPoints[currentIndex];
        const endPoint = ecgPoints[currentIndex + 1];
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const progress = Math.min(currentPos / Math.sqrt(dx * dx + dy * dy), 1);
        const x = startPoint.x + dx * progress;
        const y = startPoint.y + dy * progress;
        if (currentIndex === ecgPoints.length - 2 && progress > 0.95) {
            if (!isLooping) { tailPoints.push(null); isLooping = true; }
        } else { isLooping = false; }
        tailPoints.push({ x, y });
        if (tailPoints.length > tailMaxLength) tailPoints.shift();
        drawTrailWithGradient();  
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        currentPos += speed;
        if (currentPos >= Math.sqrt(dx * dx + dy * dy)) {
            currentPos = 0;
            currentIndex = (currentIndex + 1) % (ecgPoints.length - 1);
            if (currentIndex === 0) tailPoints.push(null);
        }
        requestAnimationFrame(draw);
    }
    draw();

    // 音频与UI控制模块 (保持原样)
    const ranges = { low: { min: 63, max: 68 }, medium: { min: 70, max: 75 }, high: { min: 79, max: 85 } };
    currentRange = ranges.medium;
    function getRandomInRange() { return Math.floor(Math.random() * (currentRange.max - currentRange.min + 1)) + currentRange.min; }
    function updateDisplay() { document.getElementById('number').textContent = getRandomInRange(); }
    let timer = setInterval(updateDisplay, 1500);
    window.setRange = function(type) { currentRange = ranges[type]; updateDisplay(); }
    
    let isCooling = false; 
    document.querySelectorAll('.toggle-input').forEach(input => {
        input.addEventListener('change', function () {
            if (isCooling) return;
            isCooling = true;
            document.querySelectorAll('.bg').forEach(bgOne => bgOne.classList.add('disabled'));
            const parent = input.parentNode;
            const grandparent = parent.parentNode;
            const onLabel = grandparent.querySelector('.on-label');
            const offLabel = grandparent.querySelector('.off-label');
            onLabel.classList.toggle('active', !this.checked);
            offLabel.classList.toggle('active', this.checked);
            buttonBgm();
            setTimeout(() => {
                isCooling = false;
                document.querySelectorAll('.bg').forEach(bgOne => bgOne.classList.remove('disabled'));
            }, 520);
        });
    });

    const hrmButton = document.querySelector('#hrmbutton');
    const hrm = document.querySelector('.hrm');
    hrmButton.addEventListener('change', function () {
        if (this.checked) { hrm.style.opacity = "1" } else { hrm.style.opacity = "0" }
    });

    const liderContainer = document.querySelector('.slider-container');
    liderContainer.addEventListener('mousedown', e => { e.preventDefault() })
    const sliderThumb = document.querySelector('.slider-thumb');
    const sliderTrack = document.querySelector('.slider-track');
    let isDragging = false;
    let currentInterval = null;
    const intervals = [
        { min: 0, max: 100, label: '低频区', callback: () => handleInterval(0) },
        { min: 100, max: 200, label: '中频区', callback: () => handleInterval(1) },
        { min: 200, max: 300, label: '高频区', callback: () => handleInterval(2) }
    ];
    sliderThumb.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    var positon = 1;
    function startDrag(e) { isDragging = true; sliderThumb.style.cursor = 'grabbing'; }
    function drag(e) {
        if (!isDragging) return;
        const trackRect = sliderTrack.getBoundingClientRect();
        let newLeft = e.clientX - trackRect.left - sliderThumb.offsetWidth / 2;
        newLeft = Math.max(0, Math.min(newLeft, trackRect.width - sliderThumb.offsetWidth));
        sliderThumb.style.left = `${newLeft}px`;
        positon = newLeft;
        checkCurrentInterval(newLeft);
    }
    function endDrag() { isDragging = false; sliderThumb.style.cursor = 'grab'; }
    function checkCurrentInterval(position) {
        const currentPos = (position / sliderTrack.offsetWidth) * 300; 
        for (const interval of intervals) {
            if (currentPos >= interval.min && currentPos <= interval.max) {
                if (currentInterval !== position) {
                    currentInterval = position;
                    interval.callback(); 
                }
                break;
            }
        }
    }
    function handleInterval(label) {
        if (label === 2 && radioButton.checked) { Litterbgm.play(); mainbgm.pause(); noisebgm.pause(); } 
        else if (label !== 2 && radioButton.checked) { noisebgm.play(); Litterbgm.pause(); mainbgm.pause(); } 
        else if (!radioButton.checked) { noisebgm.pause(); Litterbgm.pause(); mainbgm.play(); }
    }
    function buttonBgm() { document.getElementById("buttonbgm").play() }
    function togglePlay(audio) { audio.paused ? audio.play() : audio.pause(); }
    function isPlaying(audio) { return !audio.paused && !audio.ended && audio.currentTime > 0; }
    radioButton.addEventListener('change', function () {
        if (this.checked) { mainbgm.pause(); checkCurrentInterval(++positon) } 
        else { mainbgm.play(); noisebgm.pause(); Litterbgm.pause() }
    });

    // ==================== 图片预览与缩放模块 (重构) ====================
    const overlay = document.getElementById('overlay');
    const zoomedImage = document.getElementById('zoomedImage');
    
    let currentScale = 1;
    let translateX = 0, translateY = 0;
    let isPanning = false;
    let startX, startY;

    function openImageOverlay(src) {
        zoomedImage.src = src;
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        resetZoom();
    }

    function resetZoom() {
        currentScale = 1;
        translateX = 0;
        translateY = 0;
        applyTransform();
    }

    function applyTransform() {
        zoomedImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
    }

    // 事件委托：处理聊天区图片点击
    var aliyaText = document.getElementById("aliyaText");
    aliyaText.addEventListener('click', function(e) {
        let target = e.target;
        if (target.tagName === 'IMG' && target.classList.contains('zoomable-img')) {
            openImageOverlay(target.src);
        } else if (target.classList.contains('image-card')) {
            let img = target.querySelector('img');
            if (img) openImageOverlay(img.src);
        }
    });

    // 滚轮缩放
    overlay.addEventListener('wheel', function(e) {
        if (!overlay.classList.contains('active')) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        currentScale = Math.min(Math.max(1, currentScale + delta), 5); 
        if (currentScale === 1) { translateX = 0; translateY = 0; }
        applyTransform();
    }, { passive: false });

    // 拖拽平移
    zoomedImage.addEventListener('mousedown', function(e) {
        if (currentScale > 1) {
            isPanning = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            zoomedImage.classList.add('panning');
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (isPanning) {
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            applyTransform();
        }
    });

    document.addEventListener('mouseup', function() {
        if (isPanning) {
            isPanning = false;
            zoomedImage.classList.remove('panning');
        }
    });

    // 点击空白处关闭
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // ==================== IndexedDB 存储模块 (保持原样) ====================
    var DB_NAME = "aliya_chat_db";
    var DB_VERSION = 1;
    var STORE_NAME = "messages";
    var PAGE_SIZE = 200;
    var db = null;
    function openDB() {
        return new Promise(function (resolve, reject) {
            var request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = function (e) {
                var database = e.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    var store = database.createObjectStore(STORE_NAME, { keyPath: "_key" });
                    store.createIndex("timestamp", "timestamp", { unique: false });
                }
            };
            request.onsuccess = function (e) { resolve(e.target.result); };
            request.onerror = function (e) { reject(e.target.error); };
        });
    }
    function genKey(prefix) { return prefix + "" + Date.now() + "" + Math.random().toString(36).substr(2, 9); }
    function dbAddMessage(msg) {
        return new Promise(function (resolve, reject) {
            if (!db) { resolve(); return; }
            var tx = db.transaction(STORE_NAME, "readwrite");
            var store = tx.objectStore(STORE_NAME);
            store.put(msg);
            tx.oncomplete = function () { resolve(); };
            tx.onerror = function () { reject(tx.error); };
        });
    }
    function dbGetLatest(limit) {
        return new Promise(function (resolve, reject) {
            if (!db) { resolve([]); return; }
            var tx = db.transaction(STORE_NAME, "readonly");
            var store = tx.objectStore(STORE_NAME);
            var index = store.index("timestamp");
            var messages = [];
            var request = index.openCursor(null, "prev");
            request.onsuccess = function (e) {
                var cursor = e.target.result;
                if (cursor && messages.length < limit) { messages.unshift(cursor.value); cursor.continue(); } 
                else { resolve(messages); }
            };
            request.onerror = function () { reject(request.error); };
        });
    }
    function dbGetBefore(beforeTs, limit) {
        return new Promise(function (resolve, reject) {
            if (!db) { resolve([]); return; }
            var tx = db.transaction(STORE_NAME, "readonly");
            var store = tx.objectStore(STORE_NAME);
            var index = store.index("timestamp");
            var range = IDBKeyRange.upperBound(beforeTs, true);
            var messages = [];
            var request = index.openCursor(range, "prev");
            request.onsuccess = function (e) {
                var cursor = e.target.result;
                if (cursor && messages.length < limit) { messages.unshift(cursor.value); cursor.continue(); } 
                else { resolve(messages); }
            };
            request.onerror = function () { reject(request.error); };
        });
    }

    // ==================== 图片生成处理模块 ====================
    var currentSessionId = null;
    async function fetchPlaceholderImage(msgId, index) {
        var url = "https://misskey.liminalselves.top/api/agents/images/generate-placeholder";
        var payload = {
            sessionId: currentSessionId,
            messageId: msgId,
            placeholderIndex: index,
            regenerate: false,
            regenerationOfId: null,
            i: mskToken 
        };
        try {
            var res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                var data = await res.json();
                return data.url || data.thumbnailUrl;
            }
        } catch (e) {
            console.error("获取占位图失败", e);
        }
        return null;
    }

    // 【修复】即使没有 msgId，也要清理原始提示词
    async function processDrawingInstruction(text, msgId) {
        var regex = /\[\[agent_draw\s+size=([^\s]+)\s+tag=([^\]]+)\]\]/g;
        var cleanText = text;
        var images = [];
        var matches = [...text.matchAll(regex)];
        for (var i = 0; i < matches.length; i++) {
            var m = matches[i];
            cleanText = cleanText.replace(m[0], "");
            if (msgId) {
                var imgUrl = await fetchPlaceholderImage(msgId, i);
                if (imgUrl) images.push(imgUrl);
            }
        }
        return { text: cleanText.trim(), images: images };
    }

    // 心率指令解析：[[heart_rate:min,max]]，允许空格
    function processHeartRateInstruction(text) {
        var regex = /\[\[heart_rate:\s*(\d+)\s*,\s*(\d+)\s*\]\]/g;
        var cleanText = text;
        var matched = false;
        var matches = [...text.matchAll(regex)];
        for (var i = 0; i < matches.length; i++) {
            var m = matches[i];
            var min = parseInt(m[1], 10);
            var max = parseInt(m[2], 10);
            currentRange = { min: min, max: max };
            updateDisplay();
            cleanText = cleanText.replace(m[0], "");
            matched = true;
        }
        return { text: cleanText.trim(), matched: matched };
    }

    // =========================================================
    var API_BASE = "http://127.0.0.1:5000";
    var mskToken = "";

    function loadToken() {
        mskToken = localStorage.getItem("aliya_msk_token") || "";
    }
    function saveToken() {
        localStorage.setItem("aliya_msk_token", mskToken);
    }
    // 给所有 POST body 自动附加 token
    function makeBody(obj) {
        obj.token = mskToken;
        return JSON.stringify(obj);
    }

    var playerInput = document.getElementById("playerInput");
    var sendBtn = document.getElementById("sendBtn");
    var playerInputArea = document.getElementById("playerInputArea");
    var waitImg = document.getElementById("waitImg");
    var lastMsgId = 0;
    var isWaitingReply = false;
    var pollTimer = null;
    var isLoadingMore = false;
    var noMoreHistory = false;
    var earliestMsgId = null;
    var recentlySentSet = {}; 
    var recentlyReceivedSet = {}; 
    var isAtBottomFlag = true; 

    aliyaText.addEventListener('scroll', function() {
        isAtBottomFlag = aliyaText.scrollHeight - aliyaText.scrollTop - aliyaText.clientHeight < 50;
        // 滚动到顶部时加载更多历史
        if (aliyaText.scrollTop < 50) {
            loadMoreHistory();
        }
    });
    var scrollObserver = new MutationObserver(function () {
        // 加载历史消息期间跳过，避免与滚动位置补偿争抢
        if (isLoadingMore) return;
        if (isAtBottomFlag) {
            requestAnimationFrame(() => { aliyaText.scrollTop = aliyaText.scrollHeight; });
        }
    });
    scrollObserver.observe(aliyaText, { childList: true, subtree: true });

    // ==================== 分段回复配置 ====================
    var segConfig = {
        enabled: false,
        regex: "[。！？!?\\n]",
        delayMin: 800,
        delayMax: 2000
    };

    function loadSegConfig() {
        try {
            var saved = JSON.parse(localStorage.getItem("aliya_seg_config"));
            if (saved) Object.assign(segConfig, saved);
        } catch(e) {}
    }

    function saveSegConfig() {
        localStorage.setItem("aliya_seg_config", JSON.stringify(segConfig));
    }

    // 将文本按正则切分，分隔符附在上一段末尾
    function splitText(text, regexStr) {
        try {
            var regex = new RegExp("(" + regexStr + ")", "g");
            var parts = text.split(regex).filter(function(s) { return s.length > 0; });
            var segments = [];
            var sepTest = new RegExp("^" + regexStr + "$");
            for (var i = 0; i < parts.length; i++) {
                if (segments.length > 0 && sepTest.test(parts[i])) {
                    segments[segments.length - 1] += parts[i];
                } else {
                    segments.push(parts[i]);
                }
            }
            return segments.length > 1 ? segments : [text];
        } catch(e) {
            return [text];
        }
    }

    // 统一的 aliya 消息渲染入口（处理分段逻辑）
    // immediate=true 时即时渲染各分段（用于历史消息），不应用延迟
    function renderAliyaMessage(cleanContent, images, immediate) {
        if (segConfig.enabled && cleanContent) {
            var segments = splitText(cleanContent, segConfig.regex);
            segments.forEach(function(seg, idx) {
                if (immediate) {
                    appendMessage("aliya", seg);
                } else {
                    var delay = (segConfig.delayMin +
                        Math.random() * (segConfig.delayMax - segConfig.delayMin)) * idx;
                    setTimeout(function() {
                        appendMessage("aliya", seg);
                    }, delay);
                }
            });
            // 图片在最后一段之后渲染
            if (images && images.length > 0) {
                if (immediate) {
                    images.forEach(function(imgUrl) {
                        appendMessage("aliya", null, null, [imgUrl]);
                    });
                } else {
                    var imgDelay = (segConfig.delayMin +
                        Math.random() * (segConfig.delayMax - segConfig.delayMin)) * segments.length;
                    setTimeout(function() {
                        images.forEach(function(imgUrl) {
                            appendMessage("aliya", null, null, [imgUrl]);
                        });
                    }, imgDelay);
                }
            }
        } else {
            appendMessage("aliya", cleanContent, null, images);
        }
    }

    // 【修复】图片渲染为独立卡片
    function appendMessage(role, content, msgTimestamp, images, msgId) {
        if (content) {
            var li = document.createElement("li");
            li.className = role;
            var textNode = document.createTextNode(content);
            li.appendChild(textNode);
            aliyaText.appendChild(li);
        }
        if (images && images.length > 0) {
            images.forEach(function(imgUrl) {
                var li = document.createElement("li");
                li.className = role + " image-only";
                var card = document.createElement("div");
                card.className = "image-card";
                var img = document.createElement("img");
                img.src = imgUrl;
                img.className = "zoomable-img";
                card.appendChild(img);
                li.appendChild(card);
                aliyaText.appendChild(li);
            });
        }
    }

    function dedupMessages(msgs) {
        var seen = {};
        var result = [];
        for (var i = 0; i < msgs.length; i++) {
            var m = msgs[i];
            var fp = m.role + "|" + m.content + "|" + Math.floor(m.timestamp);
            if (!seen[fp]) { seen[fp] = true; result.push(m); }
        }
        return result;
    }

    // prependMessages 已移除，timeline 一次性返回全部消息

    function setWaiting(isWaiting) {
        isWaitingReply = isWaiting;
        if (isWaiting) { playerInputArea.style.display = "none"; waitImg.style.display = "block"; } 
        else { playerInputArea.style.display = "flex"; waitImg.style.display = "none"; }
    }

    // 初始化拉取消息（通过 timeline 端点，type=new）
    async function fetchInitialMessages() {
        aliyaText.innerHTML = "";
        try {
            var res = await fetch(API_BASE + "/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ action: "timeline", type: "new" })
            });
            var data = await res.json();
            if (Array.isArray(data)) {
                var hrProcessed = false;
                // 后端返回最新→最旧（Misskey timeline 默认降序），逆序渲染为正序
                for (var i = data.length - 1; i >= 0; i--) {
                    var msg = data[i];
                    var role = msg.role === "user" ? "player" : "aliya";
                    var cleanContent = msg.content;
                    var images = [];
                    if (role === "aliya") {
                        var processed = await processDrawingInstruction(msg.content, msg.id);
                        cleanContent = processed.text;
                        images = processed.images;
                        var hrResult = processHeartRateInstruction(cleanContent);
                        cleanContent = hrResult.text;
                        // 只在最新一条 aliya 消息时决定是否恢复默认心率
                        if (!hrProcessed) {
                            if (!hrResult.matched) {
                                currentRange = ranges.medium;
                                updateDisplay();
                            }
                            hrProcessed = true;
                        }
                    }
                    if (role === "aliya") {
                        renderAliyaMessage(cleanContent, images, true);
                    } else {
                        appendMessage(role, cleanContent, null, images, msg.id);
                    }
                }
                // 记录最老一条消息的 id，供下拉加载使用
                if (data.length > 0) {
                    // data[0] 是最新，data[length-1] 是最旧
                    earliestMsgId = data[data.length - 1].id;
                    // 如果首次拉取不足一页，说明没有更多历史了
                    if (data.length < 30) { noMoreHistory = true; }
                }
                requestAnimationFrame(() => { aliyaText.scrollTop = aliyaText.scrollHeight; });
            }
        } catch (err) { console.log("获取时间线失败：", err); }
    }

    // 下拉加载更多历史消息
    async function loadMoreHistory() {
        if (isLoadingMore || noMoreHistory || earliestMsgId === null) return;
        isLoadingMore = true;
        // 记录当前滚动位置，加载后恢复，避免跳到底部
        var oldScrollHeight = aliyaText.scrollHeight;

        try {
            var res = await fetch(API_BASE + "/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ action: "timeline", type: "old", last_id: earliestMsgId })
            });
            var data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                // 过滤掉重复（与当前最老消息 id 相同的）
                var filtered = data.filter(function(m) { return m.id !== earliestMsgId; });
                if (filtered.length > 0) {
                    await prependMessages(filtered);
                    // 更新最老消息 id
                    // filtered 是降序（最新→最旧），最后一条是最旧
                    earliestMsgId = filtered[filtered.length - 1].id;
                    // 不足一页，没有更多了
                    if (filtered.length < 30) { noMoreHistory = true; }
                } else {
                    // 返回的全部是重复，说明没有更多了
                    noMoreHistory = true;
                }
                // 保持滚动位置：补偿新增高度
                var newScrollHeight = aliyaText.scrollHeight;
                aliyaText.scrollTop += (newScrollHeight - oldScrollHeight);
            } else {
                // 没有返回数据，标记没有更多
                noMoreHistory = true;
            }
        } catch (err) {
            console.log("加载历史消息失败：", err);
        } finally {
            isLoadingMore = false;
        }
    }

    // 将历史消息插入到列表顶部
    async function prependMessages(messages) {
        // messages 是降序（最新→最旧），从新到旧逐条插到 firstChild 之前
        // 最终 DOM 顺序：最旧（最前）→ 最新（最后）
        for (var i = 0; i < messages.length; i++) {
            var msg = messages[i];
            var role = msg.role === "user" ? "player" : "aliya";
            var cleanContent = msg.content;
            var images = [];
            if (role === "aliya") {
                var processed = await processDrawingInstruction(msg.content, msg.id);
                cleanContent = processed.text;
                images = processed.images;
                var hrResult = processHeartRateInstruction(cleanContent);
                cleanContent = hrResult.text;
                // 分段处理（即时，无延迟）
                if (segConfig.enabled && cleanContent) {
                    var segments = splitText(cleanContent, segConfig.regex);
                    // 分段后逆序插入（insertMessageAtTop 每次插到最前，逆序保证最终正序）
                    for (var j = segments.length - 1; j >= 0; j--) {
                        insertMessageAtTop("aliya", segments[j], null);
                    }
                    if (images && images.length > 0) {
                        for (var k = images.length - 1; k >= 0; k--) {
                            insertMessageAtTop("aliya", null, [images[k]]);
                        }
                    }
                    continue;
                }
            }
            insertMessageAtTop(role, cleanContent, images);
        }
    }

    function insertMessageAtTop(role, content, images) {
        // 使用文档片段收集新元素，一次性插入到顶部
        var fragment = document.createDocumentFragment();

        if (content) {
            var li = document.createElement("li");
            li.className = role;
            li.appendChild(document.createTextNode(content));
            fragment.appendChild(li);
        }
        if (images && images.length > 0) {
            images.forEach(function(imgUrl) {
                var li = document.createElement("li");
                li.className = role + " image-only";
                var card = document.createElement("div");
                card.className = "image-card";
                var img = document.createElement("img");
                img.src = imgUrl;
                img.className = "zoomable-img";
                card.appendChild(img);
                li.appendChild(card);
                fragment.appendChild(li);
            });
        }
        // 插入到最前面
        if (aliyaText.firstChild) {
            aliyaText.insertBefore(fragment, aliyaText.firstChild);
        } else {
            aliyaText.appendChild(fragment);
        }
    }

    // 【修复】轮询消息时，无论是否有 msk_msg_id，都强制清理提示词
    async function pollMessages() {
        try {
            var res = await fetch(API_BASE + "/api/poll?since=" + lastMsgId + "&token=" + encodeURIComponent(mskToken));
            var data = await res.json();
            if (data.messages && data.messages.length > 0) {
                for (var i = 0; i < data.messages.length; i++) {
                    var msg = data.messages[i];
                    if (msg.role === "player" && recentlySentSet[msg.content]) {
                        if (msg.id > lastMsgId) lastMsgId = msg.id;
                        continue;
                    }
                    if (msg.role === "aliya" && recentlyReceivedSet[msg.content]) {
                        if (msg.id > lastMsgId) lastMsgId = msg.id;
                        delete recentlyReceivedSet[msg.content];
                        continue;
                    }
                    
                    if (msg.role === "aliya") {
                        var processed = await processDrawingInstruction(msg.content, msg.msk_msg_id);
                        var hrResult = processHeartRateInstruction(processed.text);
                        if (!hrResult.matched) {
                            // 新消息没有心率指令，恢复默认
                            currentRange = ranges.medium;
                            updateDisplay();
                        }
                        renderAliyaMessage(hrResult.text, processed.images);
                    } else {
                        appendMessage(msg.role, msg.content, msg.timestamp);
                    }
                    
                    if (msg.id > lastMsgId) lastMsgId = msg.id;
                    if (msg.role === "aliya" && isWaitingReply) { setWaiting(false); }
                }
            }
        } catch (err) { console.log("轮询消息失败：", err); }
    }

    async function sendMessage() {
        var content = playerInput.value.trim();
        if (!content) return;
        appendMessage("player", content);
        playerInput.value = "";
        setWaiting(true);
        recentlySentSet[content] = true;
        setTimeout(function () { delete recentlySentSet[content]; }, 8000);
        try {
            var controller = new AbortController();
            var timeoutId = setTimeout(function() { controller.abort(); }, 125000);
            var res = await fetch(API_BASE + "/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ message: content }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            var data = await res.json();
            if (data.status === "success" && data.assistant_message) {
                var rawText = data.assistant_message;
                var msgId = data.assistant_message_id;
                var processed = await processDrawingInstruction(rawText, msgId);
                var hrResult = processHeartRateInstruction(processed.text);
                if (!hrResult.matched) {
                    currentRange = ranges.medium;
                    updateDisplay();
                }
                renderAliyaMessage(hrResult.text, processed.images);
                setWaiting(false);
                recentlyReceivedSet[processed.text] = true;
                setTimeout(function () { delete recentlyReceivedSet[processed.text]; }, 10000);
            } else if (data.status === "error") {
                appendMessage("aliya", "通信故障，请稍后再试");
                setWaiting(false);
            }
        } catch (err) {
            console.log("发送消息失败：", err);
            appendMessage("aliya", "通信故障，请稍后再试");
            setWaiting(false);
        }
    }

    sendBtn.addEventListener("click", sendMessage);
    playerInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.ctrlKey) { e.preventDefault(); sendMessage(); }
    });
    aliyaText.addEventListener("scroll", function () {
        // 历史消息加载已移除，timeline 一次性返回
    });

    // ==================== 设置面板 ====================
    var settingsBtn = document.getElementById("settingsBtn");
    var settingsOverlay = document.getElementById("settingsOverlay");
    var settingsCloseBtn = document.getElementById("settingsCloseBtn");
    var segToggle = document.getElementById("segToggle");
    var segRegex = document.getElementById("segRegex");
    var segDelayMin = document.getElementById("segDelayMin");
    var segDelayMax = document.getElementById("segDelayMax");
    var settingsSaveBtn = document.getElementById("settingsSaveBtn");
    var settingsStatus = document.getElementById("settingsStatus");
    var segTokenInput = document.getElementById("segToken");

    function openSettingsPanel() {
        segToggle.checked = segConfig.enabled;
        segRegex.value = segConfig.regex;
        segDelayMin.value = segConfig.delayMin;
        segDelayMax.value = segConfig.delayMax;
        segTokenInput.value = mskToken;
        settingsOverlay.classList.add("active");
        settingsStatus.textContent = "";
    }

    function closeSettingsPanel() {
        settingsOverlay.classList.remove("active");
    }

    settingsBtn.addEventListener("click", openSettingsPanel);
    settingsCloseBtn.addEventListener("click", closeSettingsPanel);
    settingsOverlay.addEventListener("click", function(e) {
        if (e.target === settingsOverlay) closeSettingsPanel();
    });

    settingsSaveBtn.addEventListener("click", async function() {
        segConfig.enabled = segToggle.checked;
        segConfig.regex = segRegex.value || "[。！？!?\\n]";
        segConfig.delayMin = parseInt(segDelayMin.value, 10) || 800;
        segConfig.delayMax = parseInt(segDelayMax.value, 10) || 2000;
        if (segConfig.delayMin > segConfig.delayMax) {
            var tmp = segConfig.delayMin;
            segConfig.delayMin = segConfig.delayMax;
            segConfig.delayMax = tmp;
        }
        saveSegConfig();

        // token 处理
        var newToken = segTokenInput.value.trim();
        if (newToken && newToken !== mskToken) {
            mskToken = newToken;
            saveToken();
            try {
                await fetch(API_BASE + "/api/set_token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: mskToken })
                });
            } catch(e) { console.log("设置 token 失败：", e); }
        }

        settingsStatus.textContent = "已保存";
        settingsStatus.className = "op-status success";
        setTimeout(function() {
            settingsStatus.textContent = "";
            settingsStatus.className = "op-status";
        }, 2000);
    });

    // ==================== Operation 面板 ====================
    var opOverlay = document.getElementById("opOverlay");
    var opCloseBtn = document.getElementById("opCloseBtn");
    var operationBtn = document.getElementById("operationBtn");
    var opSessionList = document.getElementById("opSessionList");
    var opStyleTrigger = document.getElementById("opStyleTrigger");
    var opStyleDropdown = document.getElementById("opStyleDropdown");
    var opStyleText = document.getElementById("opStyleText");
    var opCreateBtn = document.getElementById("opCreateBtn");
    var opUpdateBtn = document.getElementById("opUpdateBtn");
    var opStatus = document.getElementById("opStatus");

    var opSelectedStyleId = null;
    var opSessions = [];
    var opCurrentSessionId = null;

    function opShowStatus(msg, type) {
        opStatus.textContent = msg;
        opStatus.className = "op-status" + (type ? " " + type : "");
    }

    function opCollectConfig() {
        return {
            action: "update",
            img_size: document.getElementById("cfgImgSize").value,
            img_artist_preset_id: document.getElementById("cfgImgArtistPresetId").value,
            img_steps: parseInt(document.getElementById("cfgImgSteps").value, 10),
            img_scale: parseFloat(document.getElementById("cfgImgScale").value),
            img_cfg_rescale: parseFloat(document.getElementById("cfgImgCfgRescale").value),
            img_sampler: document.getElementById("cfgImgSampler").value,
            img_noise_schedule: document.getElementById("cfgImgNoiseSchedule").value,
            agent_image_model_id: document.getElementById("cfgAgentImageModelId").value,
            dialogue_style_id: opSelectedStyleId
        };
    }

    async function opLoadStyles() {
        opStyleText.textContent = "加载中...";
        opSelectedStyleId = null;
        opStyleDropdown.innerHTML = "";
        try {
            var res = await fetch(API_BASE + "/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ action: "list_usable" })
            });
            var data = await res.json();
            if (!Array.isArray(data) || data.length === 0) {
                opStyleText.textContent = "无可选项";
                return;
            }
            data.forEach(function(item, idx) {
                var option = document.createElement("div");
                option.className = "op-select-option";
                option.textContent = item.name;
                option.dataset.id = item.id;
                option.addEventListener("click", function() {
                    opSelectedStyleId = item.id;
                    opStyleText.textContent = item.name;
                    opStyleDropdown.querySelectorAll(".op-select-option").forEach(function(el) {
                        el.classList.remove("selected");
                    });
                    option.classList.add("selected");
                    opStyleDropdown.classList.remove("active");
                });
                opStyleDropdown.appendChild(option);
                if (idx === 0) {
                    opSelectedStyleId = item.id;
                    opStyleText.textContent = item.name;
                    option.classList.add("selected");
                }
            });
        } catch (err) {
            console.log("加载文风列表失败：", err);
            opStyleText.textContent = "加载失败";
        }
    }

    function opRenderSessions() {
        opSessionList.innerHTML = "";
        if (opSessions.length === 0) {
            opSessionList.innerHTML = '<div style="text-align:center;color:#888;padding:1rem;">暂无对话记录</div>';
            return;
        }
        opSessions.forEach(function(session) {
            var item = document.createElement("div");
            item.className = "op-session-item";
            if (session.id === opCurrentSessionId) item.classList.add("active");

            var infoDiv = document.createElement("div");
            infoDiv.className = "session-info";

            var nameSpan = document.createElement("span");
            nameSpan.className = "session-name";
            nameSpan.textContent = session.name || ("会话 " + session.id.substring(0, 8));

            var msgSpan = document.createElement("span");
            msgSpan.className = "session-msg";
            msgSpan.textContent = session.msg || "";

            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(msgSpan);

            var idSpan = document.createElement("span");
            idSpan.className = "session-id";
            idSpan.textContent = session.id;

            item.appendChild(infoDiv);
            item.appendChild(idSpan);

            item.addEventListener("click", async function() {
                try {
                    var res = await fetch(API_BASE + "/api/conversation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: makeBody({ action: "switch_session", session_id: session.id })
                    });
                    var data = await res.json();
                    if (data.status === "success") {
                        opCurrentSessionId = session.id;
                        currentSessionId = session.id;
                        opRenderSessions();
                        opShowStatus("已切换到会话：" + (session.name || session.id), "success");
                        // 切换后清空聊天区并重新拉取 timeline
                        await fetchInitialMessages();
                    } else {
                        opShowStatus(data.error || "切换会话失败", "error");
                    }
                } catch (err) {
                    opShowStatus("切换会话失败：" + err.message, "error");
                }
            });

            opSessionList.appendChild(item);
        });
    }

    async function opLoadSessions() {
        try {
            var res = await fetch(API_BASE + "/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ action: "list_mine" })
            });
            var data = await res.json();
            if (Array.isArray(data)) {
                opSessions = data;
            } else {
                opSessions = [];
            }
            opRenderSessions();
        } catch (err) {
            console.log("加载会话列表失败：", err);
            opSessions = [];
            opRenderSessions();
        }
    }

    async function opLoadConfig() {
        try {
            var res = await fetch(API_BASE + "/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ action: "get_config" })
            });
            var data = await res.json();
            if (data.error) {
                opShowStatus("加载配置失败：" + data.error, "error");
                return;
            }

            // 基本信息
            opCurrentSessionId = data.id || null;
            currentSessionId = opCurrentSessionId;

            // 图片配置
            var imgSettings = data.agentImageSettings || {};
            if (imgSettings.size) document.getElementById("cfgImgSize").value = imgSettings.size;
            if (imgSettings.steps) document.getElementById("cfgImgSteps").value = imgSettings.steps;
            if (imgSettings.scale !== undefined) document.getElementById("cfgImgScale").value = imgSettings.scale;
            if (imgSettings.cfgRescale !== undefined) document.getElementById("cfgImgCfgRescale").value = imgSettings.cfgRescale;
            if (imgSettings.sampler) document.getElementById("cfgImgSampler").value = imgSettings.sampler;
            if (imgSettings.noiseSchedule) document.getElementById("cfgImgNoiseSchedule").value = imgSettings.noiseSchedule;
            if (imgSettings.artistPresetId) document.getElementById("cfgImgArtistPresetId").value = imgSettings.artistPresetId;

            // 图片模型ID
            if (data.agentImageModelId) document.getElementById("cfgAgentImageModelId").value = data.agentImageModelId;

            // 文风ID：选中下拉菜单中匹配的项
            if (data.dialogueStyleId) {
                opSelectedStyleId = data.dialogueStyleId;
                var matchedOption = opStyleDropdown.querySelector('.op-select-option[data-id="' + data.dialogueStyleId + '"]');
                if (matchedOption) {
                    opStyleText.textContent = matchedOption.textContent;
                    opStyleDropdown.querySelectorAll(".op-select-option").forEach(function(el) {
                        el.classList.remove("selected");
                    });
                    matchedOption.classList.add("selected");
                }
            }
        } catch (err) {
            console.log("加载会话配置失败：", err);
            opShowStatus("加载配置失败：" + err.message, "error");
        }
    }

    async function opOpenPanel() {
        opOverlay.classList.add("active");
        opShowStatus("");
        await opLoadStyles();
        await opLoadConfig();
        await opLoadSessions();
    }

    function opClosePanel() {
        opOverlay.classList.remove("active");
        opStyleDropdown.classList.remove("active");
    }

    operationBtn.addEventListener("click", opOpenPanel);
    opCloseBtn.addEventListener("click", opClosePanel);
    opOverlay.addEventListener("click", function(e) {
        if (e.target === opOverlay) opClosePanel();
    });

    opStyleTrigger.addEventListener("click", function(e) {
        e.stopPropagation();
        opStyleDropdown.classList.toggle("active");
    });
    document.addEventListener("click", function() {
        opStyleDropdown.classList.remove("active");
    });

    async function opDoCreate() {
        opCreateBtn.disabled = true;
        opShowStatus("正在创建会话...");
        try {
            var res = await fetch(API_BASE + "/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ action: "create" })
            });
            var data = await res.json();
            if (data.status === "success" && data.session_id) {
                opCurrentSessionId = data.session_id;
                currentSessionId = data.session_id;
                var newSession = { id: data.session_id, name: "新会话" };
                opSessions.unshift(newSession);
                opRenderSessions();
                opShowStatus("会话创建成功，正在更新配置...", "success");
                // 创建成功后自动调用更新
                await opDoUpdate(true);
            } else {
                opShowStatus(data.error || "创建会话失败", "error");
            }
        } catch (err) {
            console.log("创建会话失败：", err);
            opShowStatus("创建会话失败：" + err.message, "error");
        }
        opCreateBtn.disabled = false;
    }

    async function opDoUpdate(isAutoCall) {
        opUpdateBtn.disabled = true;
        opShowStatus(isAutoCall ? "正在更新配置..." : "正在更新配置...");
        try {
            var config = opCollectConfig();
            var res = await fetch(API_BASE + "/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody(config)
            });
            var data = await res.json();
            if (data.status === "success") {
                opShowStatus("配置更新成功", "success");
            } else {
                opShowStatus(data.error || "更新配置失败", "error");
            }
        } catch (err) {
            console.log("更新配置失败：", err);
            opShowStatus("更新配置失败：" + err.message, "error");
        }
        opUpdateBtn.disabled = false;
    }

    opCreateBtn.addEventListener("click", opDoCreate);
    opUpdateBtn.addEventListener("click", function() { opDoUpdate(false); });

    openDB().then(function (database) {
        db = database;
        loadSegConfig();
        loadToken();
        // 先通知后端 token（触发 WS 连接）
        if (!mskToken) {
            console.log("未设置 token，请在 Settings 中填写");
            return null;
        }
        return fetch(API_BASE + "/api/set_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: mskToken })
        });
    }).then(function () {
        // 获取当前会话配置，拿到 sessionId 后再拉取 timeline
        return fetch(API_BASE + "/api/conversation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: makeBody({ action: "get_config" })
        });
    }).then(function (res) { return res.json(); }).then(function (config) {
        if (config && config.id) { currentSessionId = config.id; }
        return fetchInitialMessages();
    }).then(function () {
        pollTimer = setInterval(pollMessages, 1500);
    });
});