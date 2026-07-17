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
        .auth-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: #050505;
            z-index: 3000;
            justify-content: center;
            align-items: center;
            padding: 2rem;
            box-sizing: border-box;
        }
        .auth-overlay.active {
            display: flex;
        }
        .auth-panel {
            width: min(520px, calc(100vw - 32px));
            background: #2d2d2d;
            border: 1px solid #555;
            border-radius: 1.5rem;
            padding: 3rem;
            color: #efefef;
            box-sizing: border-box;
            text-align: center;
        }
        .auth-title {
            font-size: 2.4rem;
            margin-bottom: 1.5rem;
        }
        .auth-message {
            color: #bebebe;
            font-size: 1.6rem;
            line-height: 1.7;
            margin-bottom: 2.5rem;
        }
        .auth-actions {
            display: flex;
            justify-content: center;
            gap: 1.5rem;
            flex-wrap: wrap;
        }
        .auth-btn {
            border: 0;
            border-radius: 0.8rem;
            padding: 1rem 2.4rem;
            color: #efefef;
            font-size: 1.6rem;
            cursor: pointer;
        }
        .auth-btn-primary {
            background: #d6740b;
        }
        .auth-btn-secondary {
            background: #555;
        }
        .auth-status {
            min-height: 2rem;
            margin-top: 1.5rem;
            color: #c66908;
            font-size: 1.4rem;
        }
        .auth-manual-form {
            display: none;
            flex-direction: column;
            gap: 1.5rem;
        }
        .auth-token-input {
            width: 100%;
            box-sizing: border-box;
            background: #202020;
            border: 1px solid #555;
            border-radius: 0.8rem;
            color: #efefef;
            font-size: 1.6rem;
            padding: 1rem 1.5rem;
            outline: none;
            font-family: inherit;
        }
        .auth-token-input:focus {
            border-color: #d6740b;
        }
        .auth-overlay.manual-mode .auth-title,
        .auth-overlay.manual-mode .auth-message,
        .auth-overlay.manual-mode .auth-actions {
            display: none;
        }
        .auth-overlay.manual-mode .auth-manual-form {
            display: flex;
        }
        .auth-save-btn {
            width: 100%;
        }
    `;
    document.head.appendChild(style);

    var mainbgm = document.getElementById("mainbgm")
    var noisebgm = document.getElementById("noisebgm")
    var Litterbgm = document.getElementById("Litterbgm")
    const radioButton = document.querySelector('#radio-button');
    const backgroundMusicStorageKey = "aliya_background_music";
    const backgroundMusicSources = {
        letter: "audio/music/letter.mp3",
        aliya: "audio/music/aliya.mp3",
        drift: "audio/music/drift.mp3",
        response: "audio/music/response.mp3",
        "astral-sunset": "audio/music/astral-sunset.mp3",
        "stars-annihilation": "audio/music/stars-annihilation.mp3",
        "tranquil-repose": "audio/music/tranquil-repose.mp3"
    };
    var activeBackgroundMusic = "letter";

    function safePlay(audio) {
        if (!audio) return;
        var playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function() {});
        }
    }

    function applyBackgroundMusic(value, playNow) {
        var nextValue = value === "none" || Object.prototype.hasOwnProperty.call(backgroundMusicSources, value)
            ? value
            : "letter";
        var nextSource = backgroundMusicSources[nextValue] || "";
        activeBackgroundMusic = nextValue;
        localStorage.setItem(backgroundMusicStorageKey, nextValue);

        if (!mainbgm) return;
        mainbgm.pause();
        mainbgm.currentTime = 0;
        if (nextSource) {
            if (mainbgm.getAttribute("src") !== nextSource) {
                mainbgm.src = nextSource;
                mainbgm.load();
            }
            if (playNow && !radioButton.checked) safePlay(mainbgm);
        } else {
            mainbgm.removeAttribute("src");
            mainbgm.load();
        }
    }

    function playBackgroundMusic() {
        if (activeBackgroundMusic !== "none") safePlay(mainbgm);
    }

    var savedBackgroundMusic = localStorage.getItem(backgroundMusicStorageKey) || "letter";
    applyBackgroundMusic(savedBackgroundMusic, false);

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
    const ECG_CYCLE_DURATION_MS = 1000;
    const tailPoints = [];
    const tailMaxLength = 60;
    let isLooping = false;
    const GRADIENT_FALLOFF = 0.03;  
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let ecgAnimationFrame = null;
    let ecgLastTimestamp = null;
    let ecgTotalLength = 0;
    for (let pointIndex = 0; pointIndex < ecgPoints.length - 1; pointIndex++) {
        const start = ecgPoints[pointIndex];
        const end = ecgPoints[pointIndex + 1];
        ecgTotalLength += Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    }

    function ecgShouldAnimate() {
        return !document.hidden && !reduceMotionQuery.matches;
    }

    function drawStaticEcg() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ecgPoints.forEach(function(point, index) {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function startEcgAnimation() {
        if (!ecgShouldAnimate()) {
            if (!document.hidden && reduceMotionQuery.matches) drawStaticEcg();
            return;
        }
        if (ecgAnimationFrame) return;
        ecgAnimationFrame = requestAnimationFrame(draw);
    }

    function onEcgMotionStateChange() {
        startEcgAnimation();
    }
    
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

    function advanceEcgPosition(distance) {
        while (distance > 0) {
            const startPoint = ecgPoints[currentIndex];
            const endPoint = ecgPoints[currentIndex + 1];
            const segmentLength = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));
            const remaining = segmentLength - currentPos;
            if (distance < remaining) {
                currentPos += distance;
                return;
            }
            distance -= remaining;
            currentPos = 0;
            currentIndex = (currentIndex + 1) % (ecgPoints.length - 1);
            if (currentIndex === 0) tailPoints.push(null);
        }
    }
    
    function draw(timestamp) {
        ecgAnimationFrame = null;
        if (!ecgShouldAnimate()) {
            ecgLastTimestamp = null;
            return;
        }
        if (ecgLastTimestamp === null) ecgLastTimestamp = timestamp;
        const elapsedMs = Math.min(Math.max(timestamp - ecgLastTimestamp, 0), 100);
        ecgLastTimestamp = timestamp;
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
        advanceEcgPosition(ecgTotalLength * elapsedMs / ECG_CYCLE_DURATION_MS);
        ecgAnimationFrame = requestAnimationFrame(draw);
    }
    document.addEventListener("visibilitychange", onEcgMotionStateChange);
    if (reduceMotionQuery.addEventListener) {
        reduceMotionQuery.addEventListener("change", onEcgMotionStateChange);
    } else if (reduceMotionQuery.addListener) {
        reduceMotionQuery.addListener(onEcgMotionStateChange);
    }
    startEcgAnimation();

    // 音频与UI控制模块 (保持原样)
    const ranges = { low: { min: 63, max: 68 }, medium: { min: 70, max: 75 }, high: { min: 79, max: 85 } };
    let currentRange = ranges.medium;
    function getRandomInRange() { return Math.floor(Math.random() * (currentRange.max - currentRange.min + 1)) + currentRange.min; }
    function updateDisplay() { document.getElementById('number').textContent = getRandomInRange(); }
    let vitalsTimer = null;
    function syncVitalsTimer() {
        if (vitalsTimer) {
            clearInterval(vitalsTimer);
            vitalsTimer = null;
        }
        if (!document.hidden) {
            vitalsTimer = setInterval(updateDisplay, 1500);
        }
    }
    document.addEventListener("visibilitychange", syncVitalsTimer);
    syncVitalsTimer();
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
        if (label === 2 && radioButton.checked) { safePlay(Litterbgm); mainbgm.pause(); noisebgm.pause(); } 
        else if (label !== 2 && radioButton.checked) { safePlay(noisebgm); Litterbgm.pause(); mainbgm.pause(); } 
        else if (!radioButton.checked) { noisebgm.pause(); Litterbgm.pause(); playBackgroundMusic(); }
    }
    function buttonBgm() { safePlay(document.getElementById("buttonbgm")); }
    function togglePlay(audio) { audio.paused ? safePlay(audio) : audio.pause(); }
    function isPlaying(audio) { return !audio.paused && !audio.ended && audio.currentTime > 0; }
    radioButton.addEventListener('change', function () {
        if (this.checked) { mainbgm.pause(); checkCurrentInterval(++positon) } 
        else { playBackgroundMusic(); noisebgm.pause(); Litterbgm.pause() }
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
            var data = await res.json();
            if (res.ok) return data.url || data.thumbnailUrl;
            console.warn("占位图生成失败：", data.errorMessage || data.errorCode || "未知错误");
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

    function timelineAttachmentImageUrls(file) {
        if (!file || typeof file !== "object") return [];
        var type = String(file.type || "").toLowerCase();
        var url = file.url || file.thumbnailUrl;
        // MSK 的 timeline 可能省略 type；这种情况下仍以图片 URL 作为兼容回退。
        if (!url || (type && type.indexOf("image/") !== 0)) return [];
        return [url];
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
    var API_BASE = (window.ALIYA_API_BASE || "").replace(/\/+$/, "");
    var mskToken = "";

    function loadToken() {
        mskToken = localStorage.getItem("aliya_msk_token") || "";
    }
    function saveToken() {
        localStorage.setItem("aliya_msk_token", mskToken);
    }

    var MISSKEY_HOST = "misskey.liminalselves.top";
    var MIAUTH_SESSION_KEY = "aliya_miauth_session";

    function buildAuthCallbackUrl() {
        var url = new URL(window.location.href);
        url.searchParams.set("auth", "misskey");
        url.searchParams.delete("token");
        return url.toString();
    }

    function clearAuthQuery() {
        var url = new URL(window.location.href);
        url.searchParams.delete("auth");
        if (url.toString() !== window.location.href) {
            window.history.replaceState({}, document.title, url.toString());
        }
    }

    function ensureAuthPrompt() {
        var existing = document.getElementById("authOverlay");
        if (existing) return existing;

        var overlay = document.createElement("div");
        overlay.className = "auth-overlay";
        overlay.id = "authOverlay";
        overlay.innerHTML = [
            '<div class="auth-panel">',
            '  <h2 class="auth-title">需要 Misskey 授权</h2>',
            '  <p class="auth-message" id="authMessage">当前没有有效 token。请跳转到 Misskey 完成第三方登录，授权后会自动回到本页面。</p>',
            '  <div class="auth-actions">',
            '    <button class="auth-btn auth-btn-primary" id="authLoginBtn">前往 Misskey 登录</button>',
            '    <button class="auth-btn auth-btn-secondary" id="authManualBtn">手动填写 Token</button>',
            '  </div>',
            '  <form class="auth-manual-form" id="authManualForm">',
            '    <input class="auth-token-input" id="authTokenInput" type="password" autocomplete="off" spellcheck="false" placeholder="Misskey API Token">',
            '    <button class="auth-btn auth-btn-primary auth-save-btn" id="authTokenSaveBtn" type="submit">保存</button>',
            '  </form>',
            '  <div class="auth-status" id="authStatus"></div>',
            '</div>'
        ].join("");
        document.body.appendChild(overlay);

        document.getElementById("authLoginBtn").addEventListener("click", startMisskeyAuth);
        document.getElementById("authManualBtn").addEventListener("click", function() {
            showManualTokenPrompt();
        });
        document.getElementById("authManualForm").addEventListener("submit", async function(e) {
            e.preventDefault();
            await submitManualToken();
        });
        return overlay;
    }

    function showAuthPrompt(message) {
        var overlay = ensureAuthPrompt();
        overlay.classList.remove("manual-mode");
        document.getElementById("authMessage").textContent = message || "当前没有有效 token。请跳转到 Misskey 完成第三方登录，授权后会自动回到本页面。";
        document.getElementById("authStatus").textContent = "";
        overlay.classList.add("active");
    }

    function showManualTokenPrompt() {
        var overlay = ensureAuthPrompt();
        overlay.classList.add("manual-mode");
        document.getElementById("authStatus").textContent = "";
        document.getElementById("authTokenInput").value = "";
        overlay.classList.add("active");
        setTimeout(function() {
            document.getElementById("authTokenInput").focus();
        }, 0);
    }

    async function submitManualToken() {
        var input = document.getElementById("authTokenInput");
        var status = document.getElementById("authStatus");
        var token = input.value.trim();
        if (!token) {
            status.textContent = "请输入 token";
            return;
        }
        status.textContent = "正在验证 token...";
        var ok = await validateAndActivateToken(token);
        if (!ok) {
            status.textContent = "token 无效或已过期";
            input.select();
            return;
        }
        mskToken = token;
        saveToken();
        document.getElementById("authOverlay").classList.remove("active");
        await startConnectedApp();
    }

    function startMisskeyAuth() {
        var sessionId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
        localStorage.setItem(MIAUTH_SESSION_KEY, sessionId);
        var callback = buildAuthCallbackUrl();
        var permissions = [
            "read:account",
            "read:chat",
            "write:chat",
            "read:messaging",
            "write:messaging",
            "read:drive",
            "write:drive"
        ].join(",");
        var authUrl = "https://" + MISSKEY_HOST + "/miauth/" + encodeURIComponent(sessionId)
            + "?name=" + encodeURIComponent("Aliya Web")
            + "&callback=" + encodeURIComponent(callback)
            + "&permission=" + encodeURIComponent(permissions);
        window.location.href = authUrl;
    }

    async function handleMisskeyAuthCallback() {
        var params = new URLSearchParams(window.location.search);
        var pendingSession = localStorage.getItem(MIAUTH_SESSION_KEY);
        if (params.get("auth") !== "misskey" || !pendingSession) return false;

        var overlay = ensureAuthPrompt();
        overlay.classList.add("active");
        document.getElementById("authMessage").textContent = "正在完成 Misskey 授权...";
        document.getElementById("authStatus").textContent = "";

        try {
            var res = await fetch(API_BASE + "/api/miauth_check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: pendingSession })
            });
            var data = await res.json();
            if (res.ok && data.ok && data.token) {
                mskToken = data.token;
                saveToken();
                localStorage.removeItem(MIAUTH_SESSION_KEY);
                clearAuthQuery();
                document.getElementById("authStatus").textContent = "授权成功，正在连接...";
                overlay.classList.remove("active");
                return true;
            }
            throw new Error(data.error || "授权未完成");
        } catch (err) {
            localStorage.removeItem(MIAUTH_SESSION_KEY);
            clearAuthQuery();
            showAuthPrompt("Misskey 授权失败，请重新登录或手动填写 Token。");
            document.getElementById("authStatus").textContent = err.message || "授权失败";
            return false;
        }
    }

    async function validateAndActivateToken(token) {
        if (!token) return false;
        try {
            var validateRes = await fetch(API_BASE + "/api/validate_token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: token })
            });
            var validateData = await validateRes.json();
            if (!validateRes.ok || !validateData.ok) return false;
            return true;
        } catch (err) {
            console.log("验证 token 失败：", err);
            return false;
        }
    }

    function clearTokenAndReturnToAuth(message) {
        mskToken = "";
        localStorage.removeItem("aliya_msk_token");
        if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
        pollInFlight = false;
        setWaiting(false);
        showAuthPrompt(message || "token 已失效，请重新完成 Misskey 授权。");
    }

    function isAuthFailureResponse(res, data) {
        if (res && (res.status === 401 || res.status === 403)) return true;
        var errorText = data && (data.error || data.reply || data.message);
        return typeof errorText === "string" && /token|鉴权|授权|无效|过期|unauthorized|forbidden/i.test(errorText);
    }

    async function guardAuthResponse(res, data) {
        if (isAuthFailureResponse(res, data)) {
            clearTokenAndReturnToAuth("token 已失效，请重新完成 Misskey 授权。");
            return true;
        }
        return false;
    }

    function startTokenWatchdog() {
        setInterval(async function() {
            if (!mskToken || document.hidden) return;
            var ok = await validateAndActivateToken(mskToken);
            if (!ok) {
                clearTokenAndReturnToAuth("token 已失效，请重新完成 Misskey 授权。");
            }
        }, 60000);
    }

    // 给所有 POST body 自动附加 token
    function makeBody(obj) {
        obj.token = mskToken;
        return JSON.stringify(obj);
    }

    var playerInput = document.getElementById("playerInput");
    var imageInput = document.getElementById("imageInput");
    var imageUploadBtn = document.querySelector(".image-upload-btn");
    var mediaUploadLabel = imageUploadBtn && imageUploadBtn.querySelector(".media-upload-label");
    var mediaUploadMark = imageUploadBtn && imageUploadBtn.querySelector(".media-upload-mark");
    var sendBtn = document.getElementById("sendBtn");
    var playerInputArea = document.getElementById("playerInputArea");
    var playerText = document.getElementById("playerText");
    var waitImg = document.getElementById("waitImg");
    var waitText = document.getElementById("waitText");
    var chatLoadingState = document.getElementById("chatLoadingState");
    var chatLoadingText = document.getElementById("chatLoadingText");

    function syncMediaUploadState() {
        if (!imageUploadBtn || !imageInput) return;
        var file = imageInput.files && imageInput.files[0];
        var hasFile = !!file;
        imageUploadBtn.classList.toggle("has-file", hasFile);
        imageUploadBtn.title = hasFile ? "已选择：" + file.name + "（点击更换）" : "添加图片";
        imageUploadBtn.setAttribute("aria-label", hasFile ? "已选择图片 " + file.name + "，点击更换" : "添加图片");
        if (mediaUploadLabel) mediaUploadLabel.textContent = hasFile ? "READY" : "MEDIA";
        if (mediaUploadMark) mediaUploadMark.textContent = hasFile ? "✓" : "+";
    }

    if (imageInput) imageInput.addEventListener("change", syncMediaUploadState);
    var lastMsgId = 0;
    var isWaitingReply = false;
    var pollTimer = null;
    var pollInFlight = false;
    var isLoadingMore = false;
    var noMoreHistory = false;
    var earliestMsgId = null;
    var recentlySentSet = {}; 
    var recentlyReceivedSet = {};
    var isAtBottomFlag = true;
    var isTimelineLoading = false;
    var timelineLoadPromise = null;
    var chatLoadingNoticeTimer = null;
    var timelineSnapshotSignature = "";
    var timelineSnapshotMessageIds = {};
    var timelineRenderedItems = [];
    var timelineRenderedSessionId = null;

    function stopPolling() {
        if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
    }

    function pollDelayMs() {
        if (document.hidden) return 10000;
        return isWaitingReply ? 1500 : 3000;
    }

    function scheduleNextPoll(delay) {
        stopPolling();
        if (!mskToken || !currentSessionId) return;
        pollTimer = setTimeout(async function() {
            await pollMessages();
            scheduleNextPoll();
        }, typeof delay === "number" ? delay : pollDelayMs());
    }

    function startPolling() {
        scheduleNextPoll(0);
    }

    document.addEventListener("visibilitychange", function() {
        if (!mskToken || !currentSessionId) return;
        scheduleNextPoll(document.hidden ? pollDelayMs() : 0);
    });

    aliyaText.addEventListener('scroll', function() {
        isAtBottomFlag = aliyaText.scrollHeight - aliyaText.scrollTop - aliyaText.clientHeight < 50;
        // 滚动到顶部时加载更多历史
        if (aliyaText.scrollTop < 50) {
            loadMoreHistory();
        }
    });
    var scrollObserver = new MutationObserver(function () {
        // 加载历史消息期间跳过，避免与滚动位置补偿争抢
        if (isLoadingMore || isTimelineLoading) return;
        if (isAtBottomFlag) {
            requestAnimationFrame(() => { aliyaText.scrollTop = aliyaText.scrollHeight; });
        }
    });
    scrollObserver.observe(aliyaText, { childList: true, subtree: true });

    // ==================== 分段回复配置 ====================
    var segConfig = {
        enabled: false
    };
    var segmentPlaybackTimers = [];

    function segConfigStorageKey() {
        return currentSessionId ? ("aliya_seg_config:" + currentSessionId) : "aliya_seg_config";
    }

    function loadSegConfig() {
        segConfig.enabled = false;
        try {
            var saved = JSON.parse(localStorage.getItem(segConfigStorageKey()));
            if (saved && typeof saved.enabled === "boolean") {
                segConfig.enabled = saved.enabled;
            }
        } catch(e) {}
    }

    function saveSegConfig() {
        localStorage.setItem(segConfigStorageKey(), JSON.stringify(segConfig));
    }

    function pushSegment(segments, lines) {
        var text = lines.join("\n").trim();
        if (text) segments.push(text);
    }

    function isMarkdownSeparator(line) {
        return /^\s{0,3}(?:(?:-{3,})|(?:_{3,})|(?:\*{3,}))\s*$/.test(line);
    }

    function isTableDelimiter(line) {
        return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
    }

    function isListItem(line) {
        return /^\s*(?:[-+*]|\d+[.)])\s+/.test(line);
    }

    function isListContinuation(line) {
        return /^\s{2,}\S/.test(line);
    }

    function updateHtmlStack(line, stack) {
        var voidTags = {
            area: true, base: true, br: true, col: true, embed: true,
            hr: true, img: true, input: true, link: true, meta: true,
            param: true, source: true, track: true, wbr: true
        };
        var tagRegex = /<!--[\s\S]*?-->|<\/?([A-Za-z][\w:-]*)(?:\s[^<>]*?)?\/?>/g;
        var sawHtml = false;
        var match;
        while ((match = tagRegex.exec(line)) !== null) {
            if (!match[1]) {
                sawHtml = true;
                continue;
            }
            sawHtml = true;
            var raw = match[0];
            var tag = match[1].toLowerCase();
            if (voidTags[tag] || /\/\s*>$/.test(raw)) continue;
            if (/^<\//.test(raw)) {
                for (var i = stack.length - 1; i >= 0; i--) {
                    if (stack[i] === tag) {
                        stack.splice(i);
                        break;
                    }
                }
            } else {
                stack.push(tag);
            }
        }
        return sawHtml;
    }

    function splitAssistantMessageIntoSegments(source) {
        if (source === null || source === undefined) return [];
        var original = String(source);
        var normalized = original.replace(/\r\n?/g, "\n");
        var lines = normalized.split("\n");
        var segments = [];
        var i = 0;

        while (i < lines.length) {
            var line = lines[i];
            if (!line.trim() || isMarkdownSeparator(line)) {
                i++;
                continue;
            }

            var fenceStart = line.match(/^\s*(`{3,}|~{3,})/);
            if (fenceStart) {
                var fence = fenceStart[1];
                var fenceChar = fence.charAt(0);
                var fenceEndRegex = new RegExp("^\\s*" + fenceChar + "{" + fence.length + ",}\\s*$");
                var fenceLines = [line];
                i++;
                while (i < lines.length) {
                    fenceLines.push(lines[i]);
                    if (fenceEndRegex.test(lines[i])) {
                        i++;
                        break;
                    }
                    i++;
                }
                pushSegment(segments, fenceLines);
                continue;
            }

            if (line.indexOf("|") !== -1 && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
                var tableLines = [line, lines[i + 1]];
                i += 2;
                while (i < lines.length && lines[i].trim() && lines[i].indexOf("|") !== -1) {
                    tableLines.push(lines[i]);
                    i++;
                }
                pushSegment(segments, tableLines);
                continue;
            }

            if (isListItem(line)) {
                var listLines = [line];
                i++;
                while (i < lines.length && (isListItem(lines[i]) || isListContinuation(lines[i]))) {
                    listLines.push(lines[i]);
                    i++;
                }
                pushSegment(segments, listLines);
                continue;
            }

            if (/^\s*>/.test(line)) {
                var quoteLines = [line];
                i++;
                while (i < lines.length && /^\s*>/.test(lines[i])) {
                    quoteLines.push(lines[i]);
                    i++;
                }
                pushSegment(segments, quoteLines);
                continue;
            }

            if (line.indexOf("[[agent_draw") !== -1) {
                var toolLines = [line];
                i++;
                while (toolLines.join("\n").indexOf("]]") === -1 && i < lines.length) {
                    toolLines.push(lines[i]);
                    i++;
                }
                pushSegment(segments, toolLines);
                continue;
            }

            var htmlStack = [];
            if (updateHtmlStack(line, htmlStack)) {
                var htmlLines = [line];
                i++;
                while (htmlStack.length > 0 && i < lines.length) {
                    htmlLines.push(lines[i]);
                    updateHtmlStack(lines[i], htmlStack);
                    i++;
                }
                pushSegment(segments, htmlLines);
                continue;
            }

            pushSegment(segments, [line]);
            i++;
        }

        if (segments.length === 0 && original.trim()) return [original.trim()];
        return segments;
    }

    function agentSegmentDelayMs(segment) {
        var visibleChars = String(segment || "").replace(/<[^>]*>|\s+/g, "").length;
        return Math.max(1000, Math.min(3000, 1000 + visibleChars * 20));
    }

    function clearSegmentPlaybackTimers() {
        segmentPlaybackTimers.forEach(function(timerId) { clearTimeout(timerId); });
        segmentPlaybackTimers = [];
    }

    function scheduleSegmentPlayback(callback, delay) {
        var timerId = setTimeout(function() {
            var index = segmentPlaybackTimers.indexOf(timerId);
            if (index !== -1) segmentPlaybackTimers.splice(index, 1);
            callback();
        }, delay);
        segmentPlaybackTimers.push(timerId);
    }

    // 统一的 aliya 消息渲染入口（处理分段逻辑）
    // immediate=true 时即时渲染各分段（用于历史消息），不应用延迟
    function renderAliyaMessage(cleanContent, images, immediate, messageMeta) {
        if (segConfig.enabled && cleanContent) {
            var segments = splitAssistantMessageIntoSegments(cleanContent);
            if (segments.length <= 1) {
                appendMessage("aliya", cleanContent, messageMeta && messageMeta.timestamp, images, null, messageMeta);
                return;
            }
            var elapsed = 0;
            segments.forEach(function(seg, idx) {
                if (immediate || idx === 0) {
                    appendMessage("aliya", seg);
                    return;
                }
                elapsed += agentSegmentDelayMs(seg);
                scheduleSegmentPlayback(function() {
                    appendMessage("aliya", seg);
                }, elapsed);
            });
            // 图片在最后一段之后渲染
            if (images && images.length > 0) {
                if (immediate) {
                    images.forEach(function(imgUrl) {
                        appendMessage("aliya", null, null, [imgUrl]);
                    });
                } else {
                    var imgDelay = elapsed + 300;
                    scheduleSegmentPlayback(function() {
                        images.forEach(function(imgUrl) {
                            appendMessage("aliya", null, null, [imgUrl]);
                        });
                    }, imgDelay);
                }
            }
            if (messageMeta && (messageMeta.timestamp || messageMeta.proactiveScheduleControlFailed || (messageMeta.proactiveScheduleActionTypes || []).length)) {
                var metaDelay = immediate ? 0 : elapsed + (images && images.length > 0 ? 300 : 0);
                if (metaDelay > 0) scheduleSegmentPlayback(function() { appendMessageMeta("aliya", messageMeta); }, metaDelay);
                else appendMessageMeta("aliya", messageMeta);
            }
        } else {
            appendMessage("aliya", cleanContent, messageMeta && messageMeta.timestamp, images, null, messageMeta);
        }
    }

    function appendMessageContent(li, content) {
        var body = document.createElement("div");
        body.className = "message-rich-content";
        if (window.AliyaMessageRenderer && typeof window.AliyaMessageRenderer.renderInto === "function") {
            window.AliyaMessageRenderer.renderInto(body, content);
        } else {
            body.textContent = content;
        }
        li.appendChild(body);
    }

    function parseTimelineDate(value) {
        if (!value) return null;
        var date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatTimelineDate(value) {
        var date = parseTimelineDate(value);
        if (!date) return "";
        return new Intl.DateTimeFormat("zh-CN", {
            timeZone: "Asia/Shanghai",
            month: "numeric",
            day: "numeric"
        }).format(date);
    }

    function timelineDayKey(value) {
        var date = parseTimelineDate(value);
        if (!date) return "";
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Shanghai",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(date);
    }

    function shouldRenderTimelineDateDivider(previousTimestamp, nextTimestamp) {
        var previousDay = timelineDayKey(previousTimestamp);
        var nextDay = timelineDayKey(nextTimestamp);
        return !!previousDay && !!nextDay && previousDay !== nextDay;
    }

    function appendTimelineDateDivider(previousTimestamp, nextTimestamp) {
        var previousText = formatTimelineDate(previousTimestamp);
        var nextText = formatTimelineDate(nextTimestamp);
        if (!previousText || !nextText) return;
        var li = document.createElement("li");
        li.className = "timeline-date-divider";
        li.setAttribute("role", "separator");
        li.setAttribute("aria-label", "消息日期从 " + previousText + " 到 " + nextText);
        li.innerHTML = '<span>↑ ' + previousText + '</span><span class="timeline-date-divider-line" aria-hidden="true"></span><span>' + nextText + ' ↓</span>';
        aliyaText.appendChild(li);
    }

    function appendLiveTimelineDateDivider(timestamp) {
        if (timelineRenderedSessionId !== currentSessionId || !timelineRenderedItems.length) return;
        var previous = timelineRenderedItems[timelineRenderedItems.length - 1];
        if (previous && shouldRenderTimelineDateDivider(previous.timestamp, timestamp)) {
            appendTimelineDateDivider(previous.timestamp, timestamp);
        }
    }

    function formatRelativeMessageTime(value) {
        var date = parseTimelineDate(value);
        if (!date) return "";
        var delta = Math.max(0, Date.now() - date.getTime());
        var minute = 60 * 1000;
        var hour = 60 * minute;
        var day = 24 * hour;
        if (delta < minute) return "刚刚";
        if (delta < hour) return Math.floor(delta / minute) + "分钟前";
        if (delta < day) return Math.floor(delta / hour) + "小时前";
        if (delta < 7 * day) return Math.floor(delta / day) + "天前";
        if (delta < 30 * day) return Math.floor(delta / (7 * day)) + "周前";
        return new Intl.DateTimeFormat("zh-CN", {
            timeZone: "Asia/Shanghai",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(date).replace(/\//g, "-");
    }

    function formatScheduleActionSummary(actionTypes, controlFailed) {
        var labels = { create: "添加", update: "修改", cancel: "删除" };
        var actions = Array.isArray(actionTypes) ? actionTypes.map(function(type) { return labels[type]; }).filter(Boolean) : [];
        if (!actions.length && !controlFailed) return "";
        if (!actions.length) return "日程消息操作 · 操作失败";
        return (controlFailed ? "尝试日程消息操作：" : "日程消息操作：") + actions.join("、") + (controlFailed ? " · 操作失败" : "");
    }

    function appendMessageMeta(role, messageMeta) {
        var timestamp = messageMeta && messageMeta.timestamp;
        var scheduleSummary = formatScheduleActionSummary(
            messageMeta && messageMeta.proactiveScheduleActionTypes,
            messageMeta && messageMeta.proactiveScheduleControlFailed
        );
        var relativeTime = formatRelativeMessageTime(timestamp);
        if (!scheduleSummary && !relativeTime) return;

        var li = document.createElement("li");
        li.className = "message-meta " + role;
        if (scheduleSummary) {
            var schedule = document.createElement("span");
            schedule.className = "message-schedule-summary" + (messageMeta.proactiveScheduleControlFailed ? " is-failed" : "");
            schedule.textContent = "◷ " + scheduleSummary;
            li.appendChild(schedule);
        }
        if (relativeTime) {
            var time = document.createElement("time");
            time.className = "message-time";
            time.dateTime = timestamp;
            time.title = new Intl.DateTimeFormat("zh-CN", {
                timeZone: "Asia/Shanghai",
                year: "numeric", month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
            }).format(parseTimelineDate(timestamp));
            time.textContent = "◷ " + relativeTime;
            li.appendChild(time);
        }
        aliyaText.appendChild(li);
    }

    // 【修复】图片渲染为独立卡片
    function appendMessage(role, content, msgTimestamp, images, msgId, messageMeta) {
        if (content !== null && content !== undefined && String(content) !== "") {
            var li = document.createElement("li");
            li.className = role;
            appendMessageContent(li, String(content));
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
                img.loading = "lazy";
                img.decoding = "async";
                card.appendChild(img);
                li.appendChild(card);
                aliyaText.appendChild(li);
            });
        }
        if (messageMeta || msgTimestamp) {
            appendMessageMeta(role, Object.assign({}, messageMeta || {}, { timestamp: msgTimestamp || (messageMeta && messageMeta.timestamp) || null }));
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

    function setWaiting(isWaiting, message) {
        isWaitingReply = isWaiting;
        if (waitText && message) waitText.textContent = message;
        if (waitImg && message) waitImg.setAttribute("aria-label", message);
        if (waitImg) waitImg.hidden = !isWaiting;
        if (playerInputArea) {
            playerInputArea.classList.toggle("is-waiting", isWaiting);
            playerInputArea.toggleAttribute("hidden", isWaiting);
        }
        if (playerText) {
            playerText.classList.toggle("is-waiting", isWaiting);
            playerText.setAttribute("aria-busy", isWaiting ? "true" : "false");
        }
        [playerInput, imageInput, sendBtn].forEach(function(element) {
            if (element) element.disabled = isWaiting;
        });
        if (sendBtn) sendBtn.setAttribute("aria-busy", isWaiting ? "true" : "false");
    }

    function setChatLoading(isLoading, message, placement) {
        if (chatLoadingNoticeTimer) {
            clearTimeout(chatLoadingNoticeTimer);
            chatLoadingNoticeTimer = null;
        }
        if (chatLoadingText && message) chatLoadingText.textContent = message;
        if (aliyaText) aliyaText.classList.toggle("is-refreshing", isLoading);
        if (!chatLoadingState) return;
        chatLoadingState.hidden = !isLoading;
        chatLoadingState.dataset.placement = placement || "center";
        if (!isLoading) chatLoadingState.removeAttribute("data-state");
    }

    function showChatLoadingError(message) {
        if (!chatLoadingState) return;
        setChatLoading(true, message || "加载聊天记录失败", "center");
        chatLoadingState.dataset.state = "error";
        chatLoadingNoticeTimer = setTimeout(function() {
            if (!isTimelineLoading) setChatLoading(false);
        }, 3200);
    }

    function buildTimelineSnapshotSignature(messages) {
        return JSON.stringify({
            sessionId: currentSessionId || "",
            messages: messages.map(function(msg) {
                var file = msg && msg.file;
                return [
                    msg && msg.id,
                    msg && msg.role,
                    msg && msg.content,
                    msg && msg.createdAt,
                    file && file.id,
                    file && file.url,
                    file && file.thumbnailUrl,
                    file && file.type,
                    msg && msg.imageRecognitionStatus,
                    msg && msg.imageRecognitionDescription,
                    msg && msg.proactiveScheduleActionTypes,
                    msg && msg.proactiveScheduleControlFailed
                ];
            })
        });
    }

    function renderPreparedTimelineMessages(items, scrollToLatest) {
        var oldScrollTop = aliyaText.scrollTop;
        clearSegmentPlaybackTimers();
        aliyaText.innerHTML = "";
        for (var renderedIndex = 0; renderedIndex < items.length; renderedIndex++) {
            var rendered = items[renderedIndex];
            var messageMeta = {
                timestamp: rendered.timestamp || null,
                proactiveScheduleActionTypes: rendered.proactiveScheduleActionTypes || [],
                proactiveScheduleControlFailed: rendered.proactiveScheduleControlFailed === true
            };
            if (rendered.role === "aliya") {
                // 已有消息切换分段设置时要立即全部重排，不播放逐段延迟。
                renderAliyaMessage(rendered.content, rendered.images, true, messageMeta);
            } else {
                appendMessage(rendered.role, rendered.content, rendered.timestamp, rendered.images, rendered.id, messageMeta);
            }
            var nextRendered = items[renderedIndex + 1];
            if (nextRendered && shouldRenderTimelineDateDivider(rendered.timestamp, nextRendered.timestamp)) {
                appendTimelineDateDivider(rendered.timestamp, nextRendered.timestamp);
            }
        }
        requestAnimationFrame(function() {
            aliyaText.scrollTop = scrollToLatest ? aliyaText.scrollHeight : oldScrollTop;
        });
    }

    function rerenderCurrentTimelineForSegmentSetting() {
        if (!timelineRenderedItems.length || timelineRenderedSessionId !== currentSessionId) return;
        renderPreparedTimelineMessages(timelineRenderedItems, false);
    }

    function rememberTimelineItem(role, content, images, id, timestamp, proactiveScheduleActionTypes, proactiveScheduleControlFailed) {
        if (timelineRenderedSessionId !== currentSessionId) {
            timelineRenderedItems = [];
            timelineRenderedSessionId = currentSessionId;
        }
        timelineRenderedItems.push({
            role: role,
            content: content || "",
            images: images || [],
            id: id || null,
            timestamp: timestamp || null,
            proactiveScheduleActionTypes: proactiveScheduleActionTypes || [],
            proactiveScheduleControlFailed: proactiveScheduleControlFailed === true
        });
    }

    async function applyTimelineSnapshot(data, scrollToLatest) {
        var renderedMessages = [];
        var hrProcessed = false;

        // MSK 返回最新→最旧，倒序渲染为页面所需的最旧→最新。
        for (var i = data.length - 1; i >= 0; i--) {
            var msg = data[i];
            var role = msg.role === "user" ? "player" : "aliya";
            var cleanContent = msg.content || "";
            var images = timelineAttachmentImageUrls(msg.file);
            if (role === "aliya") {
                var processed = await processDrawingInstruction(cleanContent, msg.id);
                cleanContent = processed.text;
                images = images.concat(processed.images);
                var hrResult = processHeartRateInstruction(cleanContent);
                cleanContent = hrResult.text;
                if (!hrProcessed) {
                    if (!hrResult.matched) {
                        currentRange = ranges.medium;
                        updateDisplay();
                    }
                    hrProcessed = true;
                }
            }
            renderedMessages.push({
                role: role,
                content: cleanContent,
                images: images,
                id: msg.id,
                timestamp: msg.createdAt || null,
                proactiveScheduleActionTypes: msg.proactiveScheduleActionTypes || [],
                proactiveScheduleControlFailed: msg.proactiveScheduleControlFailed === true
            });
        }

        earliestMsgId = null;
        noMoreHistory = data.length < 30;
        timelineRenderedItems = renderedMessages.slice();
        timelineRenderedSessionId = currentSessionId;
        renderPreparedTimelineMessages(timelineRenderedItems, scrollToLatest);
        if (data.length > 0) {
            earliestMsgId = data[data.length - 1].id;
        }
        timelineSnapshotMessageIds = {};
        data.forEach(function(msg) {
            if (msg && msg.id) timelineSnapshotMessageIds[msg.id] = true;
        });
        timelineSnapshotSignature = buildTimelineSnapshotSignature(data);
    }

    // 初始化拉取消息（通过 timeline 端点，type=new）
    async function fetchInitialMessages() {
        if (timelineLoadPromise) return timelineLoadPromise;
        timelineLoadPromise = (async function() {
            var failed = false;
            isTimelineLoading = true;
            setChatLoading(true, "正在加载聊天记录...", "center");
            try {
                var res = await fetch(API_BASE + "/api/conversation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: makeBody({ action: "timeline", type: "new", session_id: currentSessionId })
                });
                var data = await res.json();
                if (await guardAuthResponse(res, data)) return;
                if (Array.isArray(data)) {
                    // 先在内存完成富文本与图片解析，再原子替换，避免聊天区短暂消失。
                    await applyTimelineSnapshot(data, true);
                } else if (data && data.error) {
                    failed = true;
                    throw new Error(data.error);
                }
                }
            } catch (err) {
                failed = true;
                console.log("获取时间线失败：", err);
            } finally {
                isTimelineLoading = false;
                if (failed) showChatLoadingError("加载聊天记录失败，已保留当前内容");
                else setChatLoading(false);
            }
        })();
        try {
            return await timelineLoadPromise;
        } finally {
            timelineLoadPromise = null;
        }
    }

    // 下拉加载更多历史消息
    async function loadMoreHistory() {
        if (isLoadingMore || noMoreHistory || earliestMsgId === null) return;
        isLoadingMore = true;
        setChatLoading(true, "正在加载更早的消息...", "top");
        // 记录当前滚动位置，加载后恢复，避免跳到底部
        var oldScrollHeight = aliyaText.scrollHeight;

        try {
            var res = await fetch(API_BASE + "/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ action: "timeline", type: "old", last_id: earliestMsgId, session_id: currentSessionId })
            });
            var data = await res.json();
            if (await guardAuthResponse(res, data)) return;
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
            setChatLoading(false);
        }
    }

    // 将历史消息合并进完整时间线后统一重渲染，确保日期分隔和消息元信息连续。
    async function prependMessages(messages) {
        // messages 是降序（最新→最旧），通过 unshift 整理为最旧→最新。
        var preparedMessages = [];
        for (var i = 0; i < messages.length; i++) {
            var msg = messages[i];
            var role = msg.role === "user" ? "player" : "aliya";
            var cleanContent = msg.content;
            var images = timelineAttachmentImageUrls(msg.file);
            if (role === "aliya") {
                var processed = await processDrawingInstruction(msg.content, msg.id);
                cleanContent = processed.text;
                images = images.concat(processed.images);
                var hrResult = processHeartRateInstruction(cleanContent);
                cleanContent = hrResult.text;
                preparedMessages.unshift({
                    role: role,
                    content: cleanContent,
                    images: images,
                    id: msg.id,
                    timestamp: msg.createdAt || null,
                    proactiveScheduleActionTypes: msg.proactiveScheduleActionTypes || [],
                    proactiveScheduleControlFailed: msg.proactiveScheduleControlFailed === true
                });
            } else {
                preparedMessages.unshift({
                    role: role,
                    content: cleanContent || "",
                    images: images,
                    id: msg.id,
                    timestamp: msg.createdAt || null,
                    proactiveScheduleActionTypes: msg.proactiveScheduleActionTypes || [],
                    proactiveScheduleControlFailed: msg.proactiveScheduleControlFailed === true
                });
            }
        }
        timelineRenderedItems = preparedMessages.concat(timelineRenderedItems);
        timelineRenderedSessionId = currentSessionId;
        renderPreparedTimelineMessages(timelineRenderedItems, false);
    }

    function insertMessageAtTop(role, content, images) {
        // 使用文档片段收集新元素，一次性插入到顶部
        var fragment = document.createDocumentFragment();

        if (content !== null && content !== undefined && String(content) !== "") {
            var li = document.createElement("li");
            li.className = role;
            appendMessageContent(li, String(content));
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
                img.loading = "lazy";
                img.decoding = "async";
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
        if (pollInFlight || !mskToken) return;
        pollInFlight = true;
        try {
            var res = await fetch(API_BASE + "/api/poll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ since: lastMsgId, session_id: currentSessionId })
            });
            var data = await res.json();
            if (await guardAuthResponse(res, data)) return;
            if (data.snapshot === true && Array.isArray(data.messages)) {
                // 会话切换期间可能有旧请求返回，不能用旧会话覆盖当前聊天区。
                if (data.session_id && data.session_id !== currentSessionId) return;
                var snapshotSignature = buildTimelineSnapshotSignature(data.messages);
                if (snapshotSignature !== timelineSnapshotSignature) {
                    var hasNewAssistant = data.messages.some(function(msg) {
                        return msg && msg.role === "assistant" && msg.id && !timelineSnapshotMessageIds[msg.id];
                    });
                    await applyTimelineSnapshot(data.messages, isAtBottomFlag);
                    recentlySentSet = {};
                    recentlyReceivedSet = {};
                    if (hasNewAssistant && isWaitingReply) setWaiting(false);
                }
                return;
            }
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
                        renderAliyaMessage(hrResult.text, timelineAttachmentImageUrls(msg.file).concat(processed.images), false, {
                            timestamp: msg.createdAt || msg.timestamp || null,
                            proactiveScheduleActionTypes: msg.proactiveScheduleActionTypes || msg.proactive_schedule_action_types || [],
                            proactiveScheduleControlFailed: msg.proactiveScheduleControlFailed === true || msg.proactive_schedule_control_failed === true
                        });
                    } else {
                        appendMessage(msg.role, msg.content, msg.createdAt || msg.timestamp || null, timelineAttachmentImageUrls(msg.file));
                    }
                    
                    if (msg.id > lastMsgId) lastMsgId = msg.id;
                    if (msg.role === "aliya" && isWaitingReply) { setWaiting(false); }
                }
            }
        } catch (err) {
            console.log("轮询消息失败：", err);
        } finally {
            pollInFlight = false;
        }
    }

    async function uploadSelectedImage(file) {
        var body = new FormData();
        body.append("file", file);
        var res = await fetch(API_BASE + "/api/upload_image", {
            method: "POST",
            headers: { "X-Aliya-Token": mskToken },
            body: body
        });
        var data = await res.json();
        if (!res.ok || !data.id) throw new Error(data.error || "图片上传失败");
        return data.id;
    }

    async function sendMessage() {
        var content = playerInput.value.trim();
        var file = imageInput && imageInput.files && imageInput.files[0];
        if (!content && !file) return;
        // 纯图片消息只显示媒体卡片，和 MSK 原生聊天保持一致。
        var displayContent = content;
        var playerTimestamp = new Date().toISOString();
        var localPreviewImages = file ? [URL.createObjectURL(file)] : [];
        appendLiveTimelineDateDivider(playerTimestamp);
        appendMessage("player", displayContent, playerTimestamp, localPreviewImages);
        rememberTimelineItem("player", displayContent, localPreviewImages, null, playerTimestamp);
        playerInput.value = "";
        if (imageInput) {
            imageInput.value = "";
            syncMediaUploadState();
        }
        setWaiting(true, file ? "正在上传图片..." : "正在发送...");
        recentlySentSet[displayContent] = true;
        setTimeout(function () { delete recentlySentSet[displayContent]; }, 8000);
        try {
            await opWaitForPendingConfigSaves();
            var fileId = file ? await uploadSelectedImage(file) : null;
            setWaiting(true, "正在等待 Aliya 回复...");
            var controller = new AbortController();
            var timeoutId = setTimeout(function() { controller.abort(); }, 125000);
            var res = await fetch(API_BASE + "/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ message: content, file_id: fileId }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            var data = await res.json();
            if (await guardAuthResponse(res, data)) { setWaiting(false); return; }
            if (data.status === "success" && data.assistant_message !== undefined) {
                var rawText = data.assistant_message;
                var msgId = data.assistant_message_id;
                var processed = await processDrawingInstruction(rawText, msgId);
                var hrResult = processHeartRateInstruction(processed.text);
                if (!hrResult.matched) {
                    currentRange = ranges.medium;
                    updateDisplay();
                }
                var assistantTimestamp = new Date().toISOString();
                var assistantMeta = {
                    timestamp: assistantTimestamp,
                    proactiveScheduleActionTypes: data.proactive_schedule_action_types || [],
                    proactiveScheduleControlFailed: data.proactive_schedule_control_failed === true
                };
                appendLiveTimelineDateDivider(assistantTimestamp);
                rememberTimelineItem(
                    "aliya",
                    hrResult.text,
                    processed.images,
                    msgId,
                    assistantTimestamp,
                    assistantMeta.proactiveScheduleActionTypes,
                    assistantMeta.proactiveScheduleControlFailed
                );
                renderAliyaMessage(hrResult.text, processed.images, false, assistantMeta);
                setWaiting(false);
                recentlyReceivedSet[processed.text] = true;
                setTimeout(function () { delete recentlyReceivedSet[processed.text]; }, 10000);
            } else if (data.status === "error") {
                var errorReply = data.reply || data.error || "通信故障，请稍后再试";
                var errorTimestamp = new Date().toISOString();
                appendLiveTimelineDateDivider(errorTimestamp);
                rememberTimelineItem("aliya", errorReply, [], null, errorTimestamp);
                appendMessage("aliya", errorReply, errorTimestamp);
                setWaiting(false);
            }
        } catch (err) {
            console.log("发送消息失败：", err);
            var failureTimestamp = new Date().toISOString();
            appendLiveTimelineDateDivider(failureTimestamp);
            rememberTimelineItem("aliya", "通信故障，请稍后再试", [], null, failureTimestamp);
            appendMessage("aliya", "通信故障，请稍后再试", failureTimestamp);
            setWaiting(false);
        }
    }

    sendBtn.addEventListener("click", sendMessage);
    playerInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && (e.ctrlKey || e.shiftKey)) { e.preventDefault(); sendMessage(); }
    });

    // ==================== 设置面板 ====================
    var settingsBtn = document.getElementById("settingsBtn");
    var settingsOverlay = document.getElementById("settingsOverlay");
    var settingsCloseBtn = document.getElementById("settingsCloseBtn");
    var settingsSaveBtn = document.getElementById("settingsSaveBtn");
    var settingsStatus = document.getElementById("settingsStatus");
    var segTokenInput = document.getElementById("segToken");
    var backgroundMusicSelect = document.getElementById("backgroundMusicSelect");

    function openSettingsPanel() {
        segTokenInput.value = "";
        segTokenInput.placeholder = mskToken ? "留空保持当前 Token" : "Misskey API Token";
        if (backgroundMusicSelect) backgroundMusicSelect.value = activeBackgroundMusic;
        settingsOverlay.classList.add("active");
        settingsStatus.textContent = "";
        settingsStatus.className = "op-status";
    }

    function closeSettingsPanel() {
        settingsOverlay.classList.remove("active");
    }

    settingsBtn.addEventListener("click", openSettingsPanel);
    settingsCloseBtn.addEventListener("click", closeSettingsPanel);
    settingsOverlay.addEventListener("click", function(e) {
        if (e.target === settingsOverlay) closeSettingsPanel();
    });
    if (backgroundMusicSelect) {
        backgroundMusicSelect.value = activeBackgroundMusic;
        backgroundMusicSelect.addEventListener("change", function() {
            applyBackgroundMusic(this.value, true);
        });
    }

    settingsSaveBtn.addEventListener("click", async function() {
        // token 处理
        var newToken = segTokenInput.value.trim();
        if (newToken && newToken !== mskToken) {
            settingsStatus.textContent = "正在验证 token...";
            settingsStatus.className = "op-status";
            var isValid = await validateAndActivateToken(newToken);
            if (!isValid) {
                settingsStatus.textContent = "token 无效或已过期";
                settingsStatus.className = "op-status error";
                return;
            }
            mskToken = newToken;
            saveToken();
            await startConnectedApp();
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
    var opPanel = document.getElementById("opPanel");
    var opInitialLoading = document.getElementById("opInitialLoading");
    var opCloseBtn = document.getElementById("opCloseBtn");
    var operationBtn = document.getElementById("operationBtn");
    var opSubnav = document.getElementById("opSubnav");
    var opSegToggle = document.getElementById("opSegToggle");
    var opSessionList = document.getElementById("opSessionList");
    var opCreateBtn = document.getElementById("opCreateBtn");
    var opStatus = document.getElementById("opStatus");
    var opTimeAwarenessToggle = document.getElementById("opTimeAwarenessToggle");
    var opRandomProactiveToggle = document.getElementById("opRandomProactiveToggle");
    var opScheduledProactiveToggle = document.getElementById("opScheduledProactiveToggle");
    var opProactiveNotice = document.getElementById("opProactiveNotice");
    var opProactiveLastError = document.getElementById("opProactiveLastError");
    var opProactiveRefreshBtn = document.getElementById("opProactiveRefreshBtn");
    var opProactiveScheduleList = document.getElementById("opProactiveScheduleList");
    var opMemorySettingsLink = document.getElementById("opMemorySettingsLink");
    var opSessionRenameBtn = document.getElementById("opSessionRenameBtn");
    var opSessionDeleteBtn = document.getElementById("opSessionDeleteBtn");
    var opSessions = [];
    var opCurrentSessionId = null;
    var opAgentModels = [];
    var opAgentDefaultModelId = "";
    var opAgentCreditBalance = null;
    var opImageModels = [];
    var opArtistPresets = [];
    var opVisionModels = [];
    var opVisionDefaultModelId = "";
    var opModelSuccessRates = {};
    var opCurrentPage = "session";
    var opRandomProactiveEnabled = false;
    var opScheduledProactiveEnabled = false;
    var opProactiveSchedules = [];
    var opProactiveSchedulesLoading = false;
    var opProactiveScheduleMutating = null;
    var opPanelLoadPromise = null;
    var opConfigSaveTimer = null;
    var opConfigSaveInFlight = false;
    var opConfigSavePromise = null;
    var opConfigPendingPatch = {};
    var opConfigPendingSessionId = null;
    var opConfigFieldRevisions = {};
    var opConfigRevision = 0;
    var opConfigLoadRevision = 0;
    var opConfigLoadedSessionId = null;
    var opConfirmedConfig = {};
    var opDesiredConfig = {};
    var opConfirmedSessionId = null;
    var opProactiveReloadAfterSave = false;
    var opSessionSwitchQueued = null;
    var opSessionSwitchPromise = null;
    var opSessionActionBusy = false;
    var opFallbackImageModels = [{
        id: "aob0wkxmi3",
        name: "nai-diffusion-4-5-full",
        provider: "aurora",
        apiModelName: "nai-diffusion-4-5-full",
        costPerCall: 0,
        defaultParams: {},
        defaultArtistPresetId: "default-anime"
    }];
    var opFallbackArtistPresets = [
        { id: "default-anime", name: "二次元插画", thumbnailUrl: null },
        { id: "warm-game-portrait", name: "暖色系游戏立绘", thumbnailUrl: null },
        { id: "soft-fantasy", name: "轻柔幻想风", thumbnailUrl: null },
        { id: "clear-sweet", name: "清透甜绘风", thumbnailUrl: null },
        { id: "light-thick-paint", name: "轻厚涂二次元", thumbnailUrl: null },
        { id: "line-manga", name: "日系线稿漫画", thumbnailUrl: null }
    ];
    var opStyles = [];
    var opCurrentStyleId = "";
    var opStyleLoaded = false;

    function opShowStatus(msg, type) {
        opStatus.textContent = msg;
        opStatus.className = "op-status" + (type ? " " + type : "");
    }

    function opSetInitialLoading(loading, message) {
        if (opPanel) opPanel.classList.toggle("is-initial-loading", loading === true);
        if (opInitialLoading) {
            opInitialLoading.setAttribute("aria-busy", loading === true && !message ? "true" : "false");
            opInitialLoading.classList.toggle("error", !!message);
            var copy = opInitialLoading.querySelector("span:last-child");
            if (copy) copy.textContent = message || "正在读取当前会话设置...";
        }
    }

    function opSyncProactiveNotice() {
        if (!opProactiveNotice) return;
        var enabled = opTimeAwarenessToggle && opTimeAwarenessToggle.checked === true;
        opProactiveNotice.hidden = enabled;
        opProactiveNotice.textContent = enabled ? "" : "请先在“会话”页面开启时间感知，才能启用主动消息。";
        if (opRandomProactiveToggle) opRandomProactiveToggle.disabled = !enabled;
        if (opScheduledProactiveToggle) opScheduledProactiveToggle.disabled = !enabled;
    }

    function opFormatProactiveDate(value) {
        if (!value) return "";
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return new Intl.DateTimeFormat("zh-CN", {
            timeZone: "Asia/Shanghai",
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hour12: false
        }).format(date).replace(/\//g, "-");
    }

    function opProactiveStatusLabel(status) {
        return status === "active" ? "执行中" : status === "paused" ? "已暂停" : status === "completed" ? "已完成" : "已取消";
    }

    function opProactiveTriggerLabel(schedule) {
        var trigger = schedule && schedule.trigger || {};
        if (trigger.type === "once") return "一次性 · " + (trigger.at ? opFormatProactiveDate(trigger.at) : "未设置时间");
        var repeat = trigger.repeat && trigger.repeat.mode === "count"
            ? "重复 " + trigger.repeat.count + " 次"
            : "无限重复";
        return repeat + " · " + (trigger.cron || "未设置规则");
    }

    function opProactiveRemainingLabel(value) {
        return value == null ? "无限重复" : "剩余 " + value + " 次";
    }

    function opRenderProactiveSchedules() {
        if (!opProactiveScheduleList) return;
        opProactiveScheduleList.innerHTML = "";
        if (opProactiveSchedulesLoading) {
            opProactiveScheduleList.innerHTML = '<div class="op-proactive-empty"><span class="op-loading-spinner"></span>正在加载定时计划...</div>';
            return;
        }
        if (!opCurrentSessionId) {
            opProactiveScheduleList.innerHTML = '<div class="op-proactive-empty">当前没有可用会话。</div>';
            return;
        }
        if (!opProactiveSchedules.length) {
            opProactiveScheduleList.innerHTML = '<div class="op-proactive-empty">当前没有定时计划。</div>';
            return;
        }
        opProactiveSchedules.forEach(function(schedule) {
            var card = document.createElement("div");
            card.className = "op-proactive-card";

            var top = document.createElement("div");
            top.className = "op-proactive-card-top";
            var description = document.createElement("div");
            description.className = "op-proactive-card-description";
            description.textContent = schedule.description || "未命名定时计划";
            var status = document.createElement("span");
            status.className = "op-proactive-status status-" + (schedule.status || "unknown");
            status.textContent = opProactiveStatusLabel(schedule.status);
            top.appendChild(description);
            top.appendChild(status);
            card.appendChild(top);

            var meta = document.createElement("div");
            meta.className = "op-proactive-card-meta";
            var trigger = document.createElement("span");
            trigger.textContent = opProactiveTriggerLabel(schedule);
            meta.appendChild(trigger);
            if (schedule.nextRunAt) {
                var next = document.createElement("span");
                next.textContent = "下次执行 " + opFormatProactiveDate(schedule.nextRunAt);
                meta.appendChild(next);
            }
            if (schedule.lastRunAt) {
                var last = document.createElement("span");
                last.textContent = "上次执行 " + opFormatProactiveDate(schedule.lastRunAt);
                meta.appendChild(last);
            }
            if (schedule.createdAt) {
                var created = document.createElement("span");
                created.textContent = "创建于 " + opFormatProactiveDate(schedule.createdAt);
                meta.appendChild(created);
            }
            var remaining = document.createElement("span");
            remaining.textContent = opProactiveRemainingLabel(schedule.remainingRuns);
            meta.appendChild(remaining);
            card.appendChild(meta);

            var actions = document.createElement("div");
            actions.className = "op-proactive-card-actions";
            if (schedule.status === "active" || schedule.status === "paused") {
                var toggle = document.createElement("button");
                toggle.type = "button";
                toggle.className = "op-proactive-action-btn";
                toggle.textContent = schedule.status === "active" ? "暂停" : "恢复";
                toggle.disabled = opProactiveScheduleMutating === schedule.id || (schedule.status === "paused" && (!opTimeAwarenessToggle || !opTimeAwarenessToggle.checked || !opScheduledProactiveEnabled));
                toggle.addEventListener("click", function() { opToggleProactiveSchedule(schedule); });
                actions.appendChild(toggle);
            }
            var remove = document.createElement("button");
            remove.type = "button";
            remove.className = "op-proactive-action-btn danger";
            remove.textContent = "删除";
            remove.disabled = opProactiveScheduleMutating === schedule.id;
            remove.addEventListener("click", function() { opDeleteProactiveSchedule(schedule); });
            actions.appendChild(remove);
            card.appendChild(actions);
            opProactiveScheduleList.appendChild(card);
        });
    }

    async function opLoadProactiveSchedules() {
        if (opProactiveSchedulesLoading) return;
        var previousSchedules = opProactiveSchedules.slice();
        opProactiveSchedulesLoading = true;
        opRenderProactiveSchedules();
        try {
            var data = await opPostConversation({ action: "proactive_schedules", session_id: opCurrentSessionId });
            opProactiveSchedules = Array.isArray(data) ? data : [];
        } catch (err) {
            opProactiveSchedules = previousSchedules;
            if (opCurrentPage === "proactive") opShowStatus("加载定时计划失败：" + err.message, "error");
        } finally {
            opProactiveSchedulesLoading = false;
            opRenderProactiveSchedules();
        }
    }

    function opSaveProactiveSetting(kind, enabled) {
        if (!opTimeAwarenessToggle || !opTimeAwarenessToggle.checked) {
            if (kind === "random" && opRandomProactiveToggle) opRandomProactiveToggle.checked = opRandomProactiveEnabled;
            if (kind === "scheduled" && opScheduledProactiveToggle) opScheduledProactiveToggle.checked = opScheduledProactiveEnabled;
            opShowStatus("请先开启时间感知", "error");
            return;
        }
        var key = kind === "random" ? "random_proactive_enabled" : "scheduled_proactive_enabled";
        if (kind === "random") opRandomProactiveEnabled = enabled;
        else opScheduledProactiveEnabled = enabled;
        if (opTimeAwarenessToggle) opTimeAwarenessToggle.disabled = opRandomProactiveEnabled || opScheduledProactiveEnabled;
        if (kind === "scheduled" && enabled) opProactiveReloadAfterSave = true;
        opRenderProactiveSchedules();
        var patch = {};
        patch[key] = enabled;
        opQueueConfigPatch(patch);
    }

    async function opToggleProactiveSchedule(schedule) {
        if (opProactiveScheduleMutating) return;
        var status = schedule.status === "active" ? "paused" : "active";
        opProactiveScheduleMutating = schedule.id;
        opRenderProactiveSchedules();
        try {
            await opWaitForPendingConfigSaves();
            var result = await opPostConversation({ action: "set_proactive_status", session_id: opCurrentSessionId, schedule_id: schedule.id, status: status });
            if (result && result.status === "completed") opShowStatus("一次性计划已完成，无法恢复", "error");
            await opLoadProactiveSchedules();
        } catch (err) {
            opShowStatus("修改定时计划失败：" + err.message, "error");
        } finally {
            opProactiveScheduleMutating = null;
            opRenderProactiveSchedules();
        }
    }

    async function opDeleteProactiveSchedule(schedule) {
        if (opProactiveScheduleMutating || !window.confirm("确定删除这个定时计划？")) return;
        opProactiveScheduleMutating = schedule.id;
        opRenderProactiveSchedules();
        try {
            await opWaitForPendingConfigSaves();
            await opPostConversation({ action: "delete_proactive_schedule", session_id: opCurrentSessionId, schedule_id: schedule.id });
            await opLoadProactiveSchedules();
            opShowStatus("定时计划已删除", "success");
        } catch (err) {
            opShowStatus("删除定时计划失败：" + err.message, "error");
        } finally {
            opProactiveScheduleMutating = null;
            opRenderProactiveSchedules();
        }
    }

    function opSyncSegmentToggle() {
        if (opSegToggle) opSegToggle.checked = segConfig.enabled === true;
    }

    function opSetPage(page) {
        opCurrentPage = page || "session";
        document.querySelectorAll(".op-page[data-op-page]").forEach(function(el) {
            el.classList.toggle("active", el.getAttribute("data-op-page") === opCurrentPage);
        });
        if (opSubnav) {
            opSubnav.querySelectorAll("[data-op-target]").forEach(function(btn) {
                btn.classList.toggle("active", btn.getAttribute("data-op-target") === opCurrentPage);
            });
        }
        if (opCurrentPage === "memory") opSyncMemorySettingsLink();
        if (opCurrentPage === "proactive") {
            opSyncProactiveNotice();
            opRenderProactiveSchedules();
            if (opCurrentSessionId) opLoadProactiveSchedules();
        }
        if (opCurrentPage === "style" && !opStyleLoaded) opLoadStyleOptions();
    }

    function opSyncMemorySettingsLink() {
        if (!opMemorySettingsLink) return;
        var sessionId = opCurrentSessionId || currentSessionId;
        opMemorySettingsLink.href = sessionId
            ? "https://misskey.liminalselves.top/chat/agent/" + encodeURIComponent(sessionId)
            : "https://misskey.liminalselves.top/agents";
    }

    async function opPostConversation(payload) {
        var res = await fetch(API_BASE + "/api/conversation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: makeBody(payload)
        });
        var data = await res.json();
        if (await guardAuthResponse(res, data)) return null;
        if (!res.ok || data.error) throw new Error(data.error || "请求失败");
        return data;
    }

    function opProviderLabel(provider) {
        return provider === "aurora" ? "Aurora" : (provider || "未知");
    }

    function opFormatModelCost(cost) {
        var n = Number(cost);
        if (!Number.isFinite(n)) return "未知";
        if (n === 0) return "免费";
        return n.toLocaleString();
    }

    function opFormatTokenCountCompact(value) {
        var n = Number(value);
        if (!Number.isFinite(n)) return "—";
        var t = Math.max(0, Math.trunc(n));
        if (t >= 1000000) {
            var m = t / 1000000;
            return (m >= 10 ? Math.round(m) : Math.round(m * 10) / 10).toString().replace(/\.0$/, "") + "M";
        }
        if (t >= 1000) {
            var k = t / 1000;
            return (k >= 100 ? Math.round(k) : Math.round(k * 10) / 10).toString().replace(/\.0$/, "") + "k";
        }
        return String(t);
    }

    function opResolvedAgentDefaultModelId() {
        if (opAgentModels.length === 0) return "";
        if (opAgentDefaultModelId && opAgentModels.some(function(model) { return model.id === opAgentDefaultModelId; })) {
            return opAgentDefaultModelId;
        }
        return opAgentModels[0].id || "";
    }

    function opDisplayAgentModelId(agentModelId) {
        if (agentModelId && opAgentModels.some(function(model) { return model.id === agentModelId; })) {
            return agentModelId;
        }
        return opResolvedAgentDefaultModelId();
    }

    function opFindAgentModel(modelId) {
        for (var i = 0; i < opAgentModels.length; i++) {
            if (opAgentModels[i].id === modelId) return opAgentModels[i];
        }
        return null;
    }

    function opAgentModelCost(modelId) {
        var model = opFindAgentModel(modelId);
        if (!model) return 0;
        var cost = Number(model.costPerCall);
        return Number.isFinite(cost) ? Math.max(0, cost) : 0;
    }

    function opUpdateAgentModelHero() {
        var currentEl = document.getElementById("opAgentModelCurrent");
        var creditWrap = document.getElementById("opAgentCreditWrap");
        var creditEl = document.getElementById("opAgentCreditBalance");
        var costWrap = document.getElementById("opAgentCostWrap");
        var costEl = document.getElementById("opAgentExpectedCost");
        var selectedId = opGetChoiceValue("cfgAgentModel", opResolvedAgentDefaultModelId());
        var model = opFindAgentModel(selectedId);
        var cost = opAgentModelCost(selectedId);

        if (currentEl) currentEl.textContent = model ? (model.name || model.id) : "-";
        if (creditWrap && creditEl) {
            var hasCredit = Number.isFinite(opAgentCreditBalance);
            creditWrap.hidden = !hasCredit;
            if (hasCredit) creditEl.textContent = opAgentCreditBalance.toLocaleString();
        }
        if (costWrap && costEl) {
            costWrap.hidden = !(cost > 0);
            if (cost > 0) costEl.textContent = cost.toLocaleString();
        }
    }

    function opSuccessRateInfo(modelId) {
        var rate = opModelSuccessRates[modelId];
        if (!rate || !rate.total) {
            return { text: "暂无数据", className: "muted" };
        }
        var percent = Math.round((rate.success / rate.total) * 100);
        var className = percent >= 90 ? "high" : (percent >= 70 ? "medium" : "low");
        return {
            text: percent + "% (" + rate.success + "/" + rate.total + ")",
            className: className
        };
    }

    function opCreateMetaChip(kicker, value, className) {
        var chip = document.createElement("span");
        chip.className = "op-model-meta-chip";

        var kickerSpan = document.createElement("span");
        kickerSpan.className = "op-model-meta-kicker";
        kickerSpan.textContent = kicker;

        var valueSpan = document.createElement("span");
        valueSpan.className = "op-model-meta-value" + (className ? " " + className : "");
        valueSpan.textContent = value;

        chip.appendChild(kickerSpan);
        chip.appendChild(valueSpan);
        return chip;
    }

    function opRenderAgentModelLoading() {
        var group = document.getElementById("cfgAgentModel");
        if (group && opAgentModels.length > 0) return;
        if (group) group.innerHTML = '<div class="op-image-loading"><span class="op-loading-spinner"></span><span>正在加载对话模型...</span></div>';
        var currentEl = document.getElementById("opAgentModelCurrent");
        if (currentEl) currentEl.textContent = "...";
    }

    function opRenderAgentModels(selectedId) {
        var group = document.getElementById("cfgAgentModel");
        if (!group) return;
        group.classList.remove("is-loading");
        group.innerHTML = "";

        if (opAgentModels.length === 0) {
            group.innerHTML = '<div class="op-image-loading"><span>暂无可选对话模型</span></div>';
            opUpdateAgentModelHero();
            return;
        }

        var resolvedSelectedId = opDisplayAgentModelId(selectedId);
        opAgentModels.forEach(function(model) {
            var value = model.id || "";
            var card = document.createElement("button");
            card.type = "button";
            card.className = "op-choice-card op-model-card";
            card.setAttribute("data-value", value);
            if (model.description) card.title = model.description;

            var head = document.createElement("div");
            head.className = "op-model-card-head";

            var title = document.createElement("span");
            title.className = "op-choice-title op-model-title";
            title.textContent = model.name || model.id || "未命名模型";

            var action = document.createElement("span");
            action.className = "op-choice-action";
            action.textContent = value === resolvedSelectedId ? "已启用" : "选择";

            head.appendChild(title);
            head.appendChild(action);
            card.appendChild(head);

            if (model.description) {
                var description = document.createElement("p");
                description.className = "op-model-description";
                description.textContent = model.description;
                card.appendChild(description);
            }

            var chips = document.createElement("div");
            chips.className = "op-model-meta";
            var rate = opSuccessRateInfo(value);
            chips.appendChild(opCreateMetaChip("上下文", opFormatTokenCountCompact(model.maxContextTokens), ""));
            chips.appendChild(opCreateMetaChip("输出", opFormatTokenCountCompact(model.maxOutputTokensPerCall), ""));
            chips.appendChild(opCreateMetaChip("费用", opFormatModelCost(model.costPerCall), Number(model.costPerCall) === 0 ? "highlight" : ""));
            chips.appendChild(opCreateMetaChip("1h 成功率", rate.text, rate.className));
            card.appendChild(chips);
            group.appendChild(card);
        });

        opSetChoiceValue("cfgAgentModel", resolvedSelectedId, opResolvedAgentDefaultModelId());
        opUpdateAgentModelHero();
    }

    function opRenderImageLoading() {
        var modelGroup = document.getElementById("cfgAgentImageModel");
        var presetGroup = document.getElementById("cfgImgArtistPresetId");
        if (modelGroup && opImageModels.length === 0) modelGroup.innerHTML = '<div class="op-image-loading"><span class="op-loading-spinner"></span><span>正在加载模型...</span></div>';
        if (presetGroup && opArtistPresets.length === 0 && !presetGroup.querySelector(".op-artist-card")) {
            presetGroup.innerHTML = '<div class="op-image-loading"><span class="op-loading-spinner"></span><span>正在加载画师串...</span></div>';
        }
    }

    function opRenderImageModels(selectedId) {
        var group = document.getElementById("cfgAgentImageModel");
        if (!group) return;
        group.classList.remove("is-loading");
        group.innerHTML = "";

        function appendModelCard(model) {
            var value = model.id || "";
            var card = document.createElement("button");
            card.type = "button";
            card.className = "op-choice-card op-model-card";
            card.setAttribute("data-value", value);
            var modelHints = [];
            if (model.apiModelName) modelHints.push("API 模型：" + model.apiModelName);
            if (model.description) modelHints.push(model.description);
            if (modelHints.length) card.title = modelHints.join("\n");

            var head = document.createElement("div");
            head.className = "op-model-card-head";

            var title = document.createElement("span");
            title.className = "op-choice-title op-model-title";
            title.textContent = model.name || model.id || "无";

            var action = document.createElement("span");
            action.className = "op-choice-action";
            action.textContent = value === selectedId ? "已启用" : "选择";

            head.appendChild(title);
            head.appendChild(action);
            card.appendChild(head);

            var chips = document.createElement("div");
            chips.className = "op-model-meta";
            if (value === "") {
                chips.appendChild(opCreateMetaChip("状态", "关闭生图", "highlight"));
                chips.appendChild(opCreateMetaChip("费用", "免费", "highlight"));
            } else {
                var rate = opSuccessRateInfo(value);
                chips.appendChild(opCreateMetaChip("提供商", opProviderLabel(model.provider), ""));
                if (model.supportsReferenceImage === true) chips.appendChild(opCreateMetaChip("参考图", "支持", "highlight"));
                chips.appendChild(opCreateMetaChip("费用", opFormatModelCost(model.costPerCall), Number(model.costPerCall) === 0 ? "highlight" : ""));
                chips.appendChild(opCreateMetaChip("1h 成功率", rate.text, rate.className));
            }
            card.appendChild(chips);
            group.appendChild(card);
        }

        appendModelCard({ id: "", name: "无" });
        var models = opImageModels.length > 0 ? opImageModels : opFallbackImageModels;
        models.forEach(appendModelCard);
        opSetChoiceValue("cfgAgentImageModel", selectedId || "", "");
    }

    function opRenderVisionModelLoading() {
        var group = document.getElementById("opVisionModelGroup");
        var select = document.getElementById("cfgAgentVisionModel");
        var cost = document.getElementById("opVisionModelCost");
        if (group) group.hidden = false;
        if (select) {
            select.disabled = true;
            select.innerHTML = "";
            var option = document.createElement("option");
            option.textContent = "正在加载识图模型...";
            select.appendChild(option);
        }
        if (cost) cost.textContent = "用于理解你发送的图片 · 识图费用：-";
    }

    function opRenderVisionModels(selectedId) {
        var group = document.getElementById("opVisionModelGroup");
        var select = document.getElementById("cfgAgentVisionModel");
        var cost = document.getElementById("opVisionModelCost");
        if (!group || !select) return;
        if (!opVisionModels.length) {
            group.hidden = true;
            select.disabled = true;
            return;
        }

        var fallbackId = opVisionDefaultModelId || opVisionModels[0].id || "";
        var resolvedId = selectedId || fallbackId;
        if (!opVisionModels.some(function(model) { return model.id === resolvedId; })) resolvedId = fallbackId;

        select.innerHTML = "";
        opVisionModels.forEach(function(model) {
            var option = document.createElement("option");
            option.value = model.id || "";
            option.textContent = model.name || model.id || "未命名模型";
            select.appendChild(option);
        });
        select.value = resolvedId;
        select.disabled = false;
        group.hidden = false;

        var activeModel = opVisionModels.find(function(model) { return model.id === resolvedId; });
        if (cost) cost.textContent = "用于理解你发送的图片 · 识图费用：" + opFormatModelCost(activeModel && activeModel.costPerCall);
    }

    function opRenderArtistPresets(selectedId) {
        var group = document.getElementById("cfgImgArtistPresetId");
        if (!group) return;
        group.classList.remove("is-loading");
        group.innerHTML = "";
        var presets = opArtistPresets.length > 0 ? opArtistPresets : opFallbackArtistPresets;
        if (presets.length === 0) {
            group.innerHTML = '<div class="op-image-loading"><span>暂无可选画师串</span></div>';
            return;
        }
        presets.forEach(function(preset) {
            var card = document.createElement("button");
            card.type = "button";
            card.className = "op-artist-card";
            card.setAttribute("data-value", preset.id || "");

            if (preset.thumbnailUrl) {
                var img = document.createElement("img");
                img.className = "op-artist-thumb";
                img.src = preset.thumbnailUrl;
                img.alt = "";
                img.loading = "lazy";
                img.decoding = "async";
                card.appendChild(img);
            } else {
                var fallback = document.createElement("span");
                fallback.className = "op-artist-thumb-fallback";
                fallback.textContent = "画";
                card.appendChild(fallback);
            }

            var name = document.createElement("span");
            name.className = "op-artist-name";
            name.textContent = preset.name || preset.id || "未命名画师串";
            card.appendChild(name);
            group.appendChild(card);
        });
        opSetChoiceValue("cfgImgArtistPresetId", selectedId || "default-anime", "default-anime");
    }

    function opBuildSuccessRateMap(data) {
        var result = {};
        if (!data || !Array.isArray(data.rates)) return result;
        data.rates.forEach(function(row) {
            if (!row || !row.modelId) return;
            result[row.modelId] = {
                success: Number(row.success) || 0,
                total: Number(row.total) || 0
            };
        });
        return result;
    }

    async function opFetchConversationAction(action) {
        return opPostConversation({ action: action });
    }

    async function opLoadSuccessRates() {
        try {
            var rates = await opFetchConversationAction("model_success_rates");
            opModelSuccessRates = opBuildSuccessRateMap(rates);
        } catch (err) {
            console.log("加载模型成功率失败：", err);
            opModelSuccessRates = {};
        }
    }

    async function opLoadAgentModelOptions(shouldRender) {
        opRenderAgentModelLoading();
        var results = await Promise.allSettled([
            opFetchConversationAction("agent_models"),
            opFetchConversationAction("credit_balance")
        ]);
        if (results[0].status === "fulfilled") {
            var data = results[0].value;
            opAgentModels = data && Array.isArray(data.agentModels) ? data.agentModels : [];
            opAgentDefaultModelId = data && typeof data.agentDefaultModelId === "string" ? data.agentDefaultModelId : "";
        } else {
            console.log("加载对话模型选项失败：", results[0].reason);
            opAgentModels = [];
            opAgentDefaultModelId = "";
        }
        if (results[1].status === "fulfilled") {
            var credit = results[1].value;
            var creditValue = credit ? Number(credit.creditBalance) : NaN;
            opAgentCreditBalance = Number.isFinite(creditValue) ? creditValue : null;
        } else {
            console.log("加载智能体余额失败：", results[1].reason);
            opAgentCreditBalance = null;
        }
        if (shouldRender !== false) opRenderAgentModels(opGetChoiceValue("cfgAgentModel", opResolvedAgentDefaultModelId()));
    }

    async function opLoadImageOptions(shouldRender) {
        opRenderImageLoading();
        var results = await Promise.allSettled([
            opFetchConversationAction("image_models"),
            opFetchConversationAction("image_presets")
        ]);
        if (results[0].status === "fulfilled") {
            opImageModels = Array.isArray(results[0].value) ? results[0].value : [];
        } else {
            console.log("加载生图模型失败：", results[0].reason);
            opImageModels = opFallbackImageModels.slice();
        }
        if (results[1].status === "fulfilled") {
            opArtistPresets = Array.isArray(results[1].value) ? results[1].value : [];
        } else {
            console.log("加载画师串失败：", results[1].reason);
            opArtistPresets = opFallbackArtistPresets.slice();
        }
        if (shouldRender !== false) {
            opRenderImageModels(opGetChoiceValue("cfgAgentImageModel", ""));
            opRenderArtistPresets(opGetChoiceValue("cfgImgArtistPresetId", "default-anime"));
        }
    }

    async function opLoadVisionModelOptions(shouldRender) {
        if (!opVisionModels.length) opRenderVisionModelLoading();
        try {
            var data = await opFetchConversationAction("vision_models");
            opVisionModels = data && Array.isArray(data.models) ? data.models : [];
            opVisionDefaultModelId = data && typeof data.defaultModelId === "string" ? data.defaultModelId : "";
        } catch (err) {
            console.log("加载识图模型失败：", err);
            opVisionModels = [];
            opVisionDefaultModelId = "";
        }
        if (shouldRender !== false) opRenderVisionModels(opDesiredConfig.agent_vision_model_id || "");
    }

    function opSaveSegmentedOutput(enabled) {
        enabled = enabled === true;
        if (segConfig.enabled === enabled) return;
        segConfig.enabled = enabled;
        saveSegConfig();
        opSyncSegmentToggle();
        rerenderCurrentTimelineForSegmentSetting();
        opQueueConfigPatch({ segmented_output_enabled: enabled });
    }

    async function opLoadStyleOptions() {
        var group = document.getElementById("cfgStyle");
        if (group) group.innerHTML = '<div class="op-image-loading"><span class="op-loading-spinner"></span><span>正在加载文风...</span></div>';
        try {
            var data = await opFetchConversationAction("public_list");
            if (data && !data.error && Array.isArray(data)) {
                opStyles = data;
            } else {
                opStyles = [];
            }
        } catch (err) {
            console.log("加载文风列表失败：", err);
            opStyles = [];
        }
        opStyleLoaded = true;
        opRenderStyles(opCurrentStyleId);
    }

    function opRenderStyles(selectedId) {
        var group = document.getElementById("cfgStyle");
        if (!group) return;
        group.innerHTML = "";
        if (opStyles.length === 0) {
            group.innerHTML = '<div class="op-image-loading"><span>暂无可选文风</span></div>';
            return;
        }
        opStyles.forEach(function(style) {
            var value = style.id || "";
            var card = document.createElement("button");
            card.type = "button";
            card.className = "op-choice-card op-style-card";
            card.setAttribute("data-value", value);

            var head = document.createElement("div");
            head.className = "op-model-card-head";

            var title = document.createElement("span");
            title.className = "op-choice-title op-model-title";
            title.textContent = style.name || style.id || "未命名文风";

            var action = document.createElement("span");
            action.className = "op-choice-action";
            action.textContent = value === selectedId ? "已启用" : "选择";

            head.appendChild(title);
            head.appendChild(action);
            card.appendChild(head);

            if (style.summary) {
                var summary = document.createElement("div");
                summary.className = "op-style-summary";
                summary.textContent = style.summary;
                card.appendChild(summary);
            }
            group.appendChild(card);
        });
        if (selectedId) opSetChoiceValue("cfgStyle", selectedId);
    }

    function opGetChoiceValue(groupId, fallbackValue) {
        var group = document.getElementById(groupId);
        if (!group) return fallbackValue || "";
        var active = group.querySelector(".active[data-value]");
        if (active) return active.getAttribute("data-value");
        var first = group.querySelector("[data-value]");
        return first ? first.getAttribute("data-value") : (fallbackValue || "");
    }

    function opSetChoiceValue(groupId, value, fallbackValue) {
        var group = document.getElementById(groupId);
        if (!group) return;
        var options = group.querySelectorAll("[data-value]");
        var target = null;
        options.forEach(function(option) {
            if (option.getAttribute("data-value") === value) {
                target = option;
            }
        });
        if (!target && fallbackValue !== undefined) {
            options.forEach(function(option) {
                if (option.getAttribute("data-value") === fallbackValue) {
                    target = option;
                }
            });
        }
        if (!target && options.length > 0) target = options[0];
        options.forEach(function(option) {
            var selected = option === target;
            option.classList.toggle("active", selected);
            option.setAttribute("aria-pressed", selected ? "true" : "false");
            var action = option.querySelector(".op-choice-action");
            if (action) action.textContent = selected ? "已启用" : "选择";
        });
    }

    function opBindChoiceGroup(groupId) {
        var group = document.getElementById(groupId);
        if (!group) return;
        group.addEventListener("click", function(event) {
            var clickTarget = event.target.nodeType === 3 ? event.target.parentElement : event.target;
            var target = clickTarget.closest("[data-value]");
            if (!target || !group.contains(target)) return;
            var nextValue = target.getAttribute("data-value");
            if (opGetChoiceValue(groupId, "") === nextValue) return;
            opSetChoiceValue(groupId, nextValue);
            if (groupId === "cfgAgentModel") opUpdateAgentModelHero();
            if (groupId === "cfgAgentModel") {
                var defaultAgentModelId = opResolvedAgentDefaultModelId();
                opQueueConfigPatch({ agent_model_id: nextValue === defaultAgentModelId ? "" : nextValue });
            } else if (groupId === "cfgAgentImageModel") {
                opQueueConfigPatch({ agent_image_model_id: nextValue });
            } else if (groupId === "cfgImgSize" || groupId === "cfgImgArtistPresetId") {
                opQueueConfigPatch({
                    img_size: opGetChoiceValue("cfgImgSize", "landscape"),
                    img_artist_preset_id: opGetChoiceValue("cfgImgArtistPresetId", "default-anime")
                });
            }
        });
        opSetChoiceValue(groupId, opGetChoiceValue(groupId));
    }

    opBindChoiceGroup("cfgAgentModel");
    opBindChoiceGroup("cfgAgentImageModel");
    opBindChoiceGroup("cfgImgSize");
    opBindChoiceGroup("cfgImgArtistPresetId");
    opBindChoiceGroup("cfgStyle");

    var opVisionModelSelect = document.getElementById("cfgAgentVisionModel");
    if (opVisionModelSelect) {
        opVisionModelSelect.addEventListener("change", function() {
            var nextValue = opVisionModelSelect.value || "";
            if (!nextValue || opDesiredConfig.agent_vision_model_id === nextValue) return;
            opQueueConfigPatch({ agent_vision_model_id: nextValue });
            opRenderVisionModels(nextValue);
        });
    }

    function opCollectConfigPatch() {
        var config = {
            img_size: opGetChoiceValue("cfgImgSize", "landscape"),
            img_artist_preset_id: opGetChoiceValue("cfgImgArtistPresetId", "default-anime"),
            agent_image_model_id: opGetChoiceValue("cfgAgentImageModel", "aob0wkxmi3"),
            agent_vision_model_id: (document.getElementById("cfgAgentVisionModel") || {}).value || "",
            segmented_output_enabled: segConfig.enabled === true,
            time_awareness_enabled: opTimeAwarenessToggle?.checked === true,
            random_proactive_enabled: opRandomProactiveEnabled === true,
            scheduled_proactive_enabled: opScheduledProactiveEnabled === true,
            dialogueStyleId: (function() {
                var active = document.querySelector("#cfgStyle .active[data-value]");
                return active ? active.getAttribute("data-value") : "";
            })()
        };
        if (opAgentModels.length > 0) {
            var defaultAgentModelId = opResolvedAgentDefaultModelId();
            var pickedAgentModelId = opGetChoiceValue("cfgAgentModel", defaultAgentModelId);
            config.agent_model_id = pickedAgentModelId && pickedAgentModelId !== defaultAgentModelId ? pickedAgentModelId : "";
        }
        return config;
    }

    function opHasOwn(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function opApplyConfigPatchToControls(patch) {
        if (!patch) return;
        if (opHasOwn(patch, "agent_model_id")) {
            opSetChoiceValue("cfgAgentModel", opDisplayAgentModelId(patch.agent_model_id), opResolvedAgentDefaultModelId());
            opUpdateAgentModelHero();
        }
        if (opHasOwn(patch, "agent_image_model_id")) {
            opSetChoiceValue("cfgAgentImageModel", patch.agent_image_model_id || "", "");
        }
        if (opHasOwn(patch, "agent_vision_model_id")) {
            opRenderVisionModels(patch.agent_vision_model_id || "");
        }
        if (opHasOwn(patch, "img_size")) {
            opSetChoiceValue("cfgImgSize", patch.img_size || "landscape", "landscape");
        }
        if (opHasOwn(patch, "img_artist_preset_id")) {
            opSetChoiceValue("cfgImgArtistPresetId", patch.img_artist_preset_id || "default-anime", "default-anime");
        }
        if (opHasOwn(patch, "segmented_output_enabled")) {
            var previousSegmented = segConfig.enabled === true;
            segConfig.enabled = patch.segmented_output_enabled === true;
            saveSegConfig();
            opSyncSegmentToggle();
            if (previousSegmented !== segConfig.enabled) rerenderCurrentTimelineForSegmentSetting();
        }
        if (opHasOwn(patch, "time_awareness_enabled") && opTimeAwarenessToggle) {
            opTimeAwarenessToggle.checked = patch.time_awareness_enabled === true;
        }
        if (opHasOwn(patch, "random_proactive_enabled")) {
            opRandomProactiveEnabled = patch.random_proactive_enabled === true;
            if (opRandomProactiveToggle) opRandomProactiveToggle.checked = opRandomProactiveEnabled;
        }
        if (opHasOwn(patch, "scheduled_proactive_enabled")) {
            opScheduledProactiveEnabled = patch.scheduled_proactive_enabled === true;
            if (opScheduledProactiveToggle) opScheduledProactiveToggle.checked = opScheduledProactiveEnabled;
        }
        if (opHasOwn(patch, "dialogue_style_id")) {
            opCurrentStyleId = patch.dialogue_style_id || "";
            if (opStyleLoaded && opCurrentStyleId) opSetChoiceValue("cfgStyle", opCurrentStyleId);
        }
        if (opTimeAwarenessToggle) opTimeAwarenessToggle.disabled = opRandomProactiveEnabled || opScheduledProactiveEnabled;
        opSyncProactiveNotice();
        opRenderProactiveSchedules();
    }

    function opConfigPatchFromServer(data) {
        var imgSettings = data && data.agentImageSettings || {};
        return {
            agent_model_id: data && data.agentModelId || "",
            agent_image_model_id: data && data.agentImageModelId || "",
            agent_vision_model_id: data && data.agentVisionModelId || "",
            img_size: imgSettings.size || "landscape",
            img_artist_preset_id: imgSettings.artistPresetId || "default-anime",
            segmented_output_enabled: !!(data && data.segmentedOutputEnabled === true),
            time_awareness_enabled: !(data && data.timeAwarenessEnabled === false),
            random_proactive_enabled: !!(data && data.randomProactiveEnabled === true),
            scheduled_proactive_enabled: !!(data && data.scheduledProactiveEnabled === true),
            dialogue_style_id: data && data.dialogueStyleId || ""
        };
    }

    function opAdoptServerConfig(data, revisionSnapshot) {
        if (!data) return;
        var sessionId = data.id || opCurrentSessionId || currentSessionId;
        if (sessionId && opConfirmedSessionId !== sessionId) {
            opConfirmedSessionId = sessionId;
            opConfirmedConfig = {};
            opDesiredConfig = {};
            opConfigFieldRevisions = {};
        }
        opCurrentSessionId = sessionId || null;
        currentSessionId = opCurrentSessionId;
        var serverPatch = opConfigPatchFromServer(data);
        var safePatch = {};
        Object.keys(serverPatch).forEach(function(key) {
            var startedAt = revisionSnapshot && opHasOwn(revisionSnapshot, key) ? revisionSnapshot[key] : 0;
            var currentRevision = opConfigFieldRevisions[key] || 0;
            if (currentRevision !== startedAt) return;
            opConfirmedConfig[key] = serverPatch[key];
            opDesiredConfig[key] = serverPatch[key];
            safePatch[key] = serverPatch[key];
        });
        opApplyConfigPatchToControls(safePatch);
        opConfigLoadedSessionId = opCurrentSessionId;
        opSyncMemorySettingsLink();
        if (opProactiveLastError) {
            var errorLines = [];
            if (data.randomProactiveLastError) errorLines.push("上次随机主动消息执行失败，本次已跳过。");
            if (data.scheduledProactiveLastError) errorLines.push("上次定时主动消息执行失败，本次已跳过。");
            opProactiveLastError.hidden = errorLines.length === 0;
            opProactiveLastError.textContent = errorLines.join(" ");
        }
    }

    function opResetConfigStateForSession(sessionId) {
        if (opConfigSaveTimer) clearTimeout(opConfigSaveTimer);
        opConfigSaveTimer = null;
        opConfigPendingPatch = {};
        opConfigPendingSessionId = null;
        opConfigFieldRevisions = {};
        opConfigRevision = 0;
        opConfigLoadedSessionId = null;
        opConfirmedSessionId = sessionId || null;
        opConfirmedConfig = {};
        opDesiredConfig = {};
        opConfigLoadRevision++;
    }

    function opQueueConfigPatch(patch) {
        var sessionId = opCurrentSessionId || currentSessionId;
        var keys = Object.keys(patch || {});
        if (!keys.length) return;
        if (!sessionId) {
            var unavailableRollback = {};
            keys.forEach(function(key) {
                if (opHasOwn(opConfirmedConfig, key)) unavailableRollback[key] = opConfirmedConfig[key];
            });
            opApplyConfigPatchToControls(unavailableRollback);
            opShowStatus("当前没有可更新的会话", "error");
            return;
        }
        if (opConfigPendingSessionId && opConfigPendingSessionId !== sessionId) {
            opShowStatus("会话正在切换，请稍候重试", "error");
            return;
        }
        opConfigPendingSessionId = sessionId;
        keys.forEach(function(key) {
            var revision = ++opConfigRevision;
            opConfigFieldRevisions[key] = revision;
            opConfigPendingPatch[key] = patch[key];
            opDesiredConfig[key] = patch[key];
        });
        opShowStatus("设置已生效，正在同步...");
        if (opConfigSaveTimer) clearTimeout(opConfigSaveTimer);
        opConfigSaveTimer = setTimeout(function() {
            opConfigSaveTimer = null;
            void opFlushConfigSave();
        }, 140);
    }

    function opFlushConfigSave() {
        if (opConfigSaveInFlight) return opConfigSavePromise || Promise.resolve();
        var keys = Object.keys(opConfigPendingPatch);
        if (!keys.length) return Promise.resolve();
        if (opConfigSaveTimer) clearTimeout(opConfigSaveTimer);
        opConfigSaveTimer = null;
        var patch = opConfigPendingPatch;
        var sessionId = opConfigPendingSessionId || opCurrentSessionId || currentSessionId;
        var sentRevisions = {};
        keys.forEach(function(key) { sentRevisions[key] = opConfigFieldRevisions[key] || 0; });
        opConfigPendingPatch = {};
        opConfigPendingSessionId = null;
        opConfigSaveInFlight = true;

        var task = (async function() {
            try {
                var payload = Object.assign({ action: "update", session_id: sessionId }, patch);
                var result = await opPostConversation(payload);
                if (!result) throw new Error("请求未完成");
                keys.forEach(function(key) { opConfirmedConfig[key] = patch[key]; });
                if (opHasOwn(patch, "scheduled_proactive_enabled") && patch.scheduled_proactive_enabled && opProactiveReloadAfterSave) {
                    opProactiveReloadAfterSave = false;
                    if (sessionId === (opCurrentSessionId || currentSessionId)) void opLoadProactiveSchedules();
                }
                if (sessionId === (opCurrentSessionId || currentSessionId) && Object.keys(opConfigPendingPatch).length === 0) {
                    opShowStatus("设置已同步", "success");
                }
            } catch (err) {
                var rollbackPatch = {};
                keys.forEach(function(key) {
                    if ((opConfigFieldRevisions[key] || 0) === sentRevisions[key] && opHasOwn(opConfirmedConfig, key)) {
                        rollbackPatch[key] = opConfirmedConfig[key];
                        opDesiredConfig[key] = opConfirmedConfig[key];
                    }
                });
                if (sessionId === (opCurrentSessionId || currentSessionId)) {
                    opApplyConfigPatchToControls(rollbackPatch);
                    opShowStatus("设置同步失败：" + err.message, "error");
                }
            } finally {
                opConfigSaveInFlight = false;
                if (opConfigSavePromise === task) opConfigSavePromise = null;
                if (Object.keys(opConfigPendingPatch).length > 0) void opFlushConfigSave();
            }
        })();
        opConfigSavePromise = task;
        return task;
    }

    async function opWaitForPendingConfigSaves() {
        while (opConfigSaveTimer || opConfigSaveInFlight || Object.keys(opConfigPendingPatch).length > 0) {
            if (opConfigSaveTimer) {
                clearTimeout(opConfigSaveTimer);
                opConfigSaveTimer = null;
            }
            if (!opConfigSaveInFlight && Object.keys(opConfigPendingPatch).length > 0) {
                await opFlushConfigSave();
            } else if (opConfigSavePromise) {
                await opConfigSavePromise;
            } else {
                break;
            }
        }
    }

    function opRenderSessionLoading() {
        if (opSessions.length > 0) {
            opSessionList.classList.remove("is-loading");
            return;
        }
        opSessionList.classList.remove("is-loading");
        opSessionList.innerHTML =
            '<div class="op-session-loading">' +
                '<span class="op-session-loading-spinner"></span>' +
                '<span>正在加载会话...</span>' +
            '</div>';
    }

    function opRequestSessionSwitch(session) {
        if (!session || !session.id) return;
        if (!opSessionSwitchPromise && !opSessionSwitchQueued && session.id === opCurrentSessionId) return;
        opSessionSwitchQueued = session;
        opShowStatus("正在切换到会话：" + (session.name || session.id) + "...");
        if (opSessionSwitchPromise) return;

        var task = (async function() {
            var lastSuccessfulSession = null;
            while (opSessionSwitchQueued) {
                var targetSession = opSessionSwitchQueued;
                opSessionSwitchQueued = null;
                try {
                    await opWaitForPendingConfigSaves();
                    var data = await opPostConversation({ action: "switch_session", session_id: targetSession.id });
                    if (!data || data.status !== "success") throw new Error(data && data.error || "切换会话失败");
                    lastSuccessfulSession = targetSession;
                    if (opSessionSwitchQueued) continue;

                    opCurrentSessionId = targetSession.id;
                    currentSessionId = targetSession.id;
                    opResetConfigStateForSession(targetSession.id);
                    loadSegConfig();
                    opSyncSegmentToggle();
                    opRenderSessions();
                    if (opOverlay.classList.contains("active")) opSetInitialLoading(true);
                    await Promise.all([opLoadConfig(), fetchInitialMessages()]);
                    opShowStatus("已切换到会话：" + (targetSession.name || targetSession.id), "success");
                } catch (err) {
                    if (!opSessionSwitchQueued && lastSuccessfulSession) {
                        opCurrentSessionId = lastSuccessfulSession.id;
                        currentSessionId = lastSuccessfulSession.id;
                        opResetConfigStateForSession(lastSuccessfulSession.id);
                        opRenderSessions();
                        if (opOverlay.classList.contains("active")) opSetInitialLoading(true);
                        await Promise.all([opLoadConfig(), fetchInitialMessages()]);
                    }
                    if (!opSessionSwitchQueued) opShowStatus("切换会话失败：" + err.message, "error");
                }
            }
        })();
        opSessionSwitchPromise = task;
        task.finally(function() {
            if (opSessionSwitchPromise === task) opSessionSwitchPromise = null;
            if (opSessionSwitchQueued) opRequestSessionSwitch(opSessionSwitchQueued);
        });
    }

    function opRenderSessions() {
        opSessionList.classList.remove("is-loading");
        opSessionList.innerHTML = "";
        var visibleSessions = opSessions.filter(function(session) { return !!session; });
        if (visibleSessions.length === 0) {
            opSessionList.innerHTML = '<div class="op-session-empty">暂无会话记录</div>';
            return;
        }
        visibleSessions.forEach(function(session) {
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

            item.addEventListener("click", function() { opRequestSessionSwitch(session); });

            opSessionList.appendChild(item);
        });
    }

    async function opLoadSessions() {
        var previousSessions = opSessions.slice();
        opRenderSessionLoading();
        try {
            var res = await fetch(API_BASE + "/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ action: "list_mine" })
            });
            var data = await res.json();
            if (await guardAuthResponse(res, data)) return;
            if (Array.isArray(data)) {
                opSessions = data;
            } else {
                opSessions = [];
            }
            opRenderSessions();
        } catch (err) {
            console.log("加载会话列表失败：", err);
            opSessions = previousSessions;
            opRenderSessions();
            opShowStatus("加载会话列表失败，已保留当前列表", "error");
        }
    }

    async function opLoadConfig() {
        var loadRevision = ++opConfigLoadRevision;
        var revisionSnapshot = Object.assign({}, opConfigFieldRevisions);
        try {
            var res = await fetch(API_BASE + "/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ action: "get_config" })
            });
            var data = await res.json();
            if (await guardAuthResponse(res, data)) return;
            if (loadRevision !== opConfigLoadRevision) return;
            if (!res.ok || data.error) throw new Error(data.error || "加载配置失败");
            opAdoptServerConfig(data, revisionSnapshot);
            if (opCurrentPage === "proactive") opLoadProactiveSchedules();
        } catch (err) {
            console.log("加载会话配置失败：", err);
            if (loadRevision === opConfigLoadRevision) opShowStatus("加载配置失败：" + err.message, "error");
        } finally {
            if (loadRevision === opConfigLoadRevision) {
                var hasCurrentConfig = !!opConfigLoadedSessionId && opConfigLoadedSessionId === (opCurrentSessionId || currentSessionId);
                if (hasCurrentConfig) opSetInitialLoading(false);
                else opSetInitialLoading(true, "读取设置失败，请关闭后重试");
            }
        }
    }

    function opSetSessionActionBusy(busy) {
        opSessionActionBusy = busy === true;
        [opCreateBtn, opSessionRenameBtn, opSessionDeleteBtn].forEach(function(btn) {
            if (btn) btn.disabled = opSessionActionBusy;
        });
    }

    function opCurrentSessionName() {
        for (var i = 0; i < opSessions.length; i++) {
            if (opSessions[i] && opSessions[i].id === opCurrentSessionId) {
                return opSessions[i].name || "";
            }
        }
        return "";
    }

    async function opRenameCurrentSession() {
        if (opSessionActionBusy) return;
        var currentName = opCurrentSessionName();
        var name = window.prompt("新的会话名称", currentName || "Aliya");
        if (name == null) return;
        name = name.trim();
        if (!name) {
            opShowStatus("会话名称不能为空", "error");
            return;
        }
        opSetSessionActionBusy(true);
        try {
            await opWaitForPendingConfigSaves();
            await opPostConversation({ action: "rename_session", name: name });
            opSessions.forEach(function(session) {
                if (session && session.id === opCurrentSessionId) session.name = name;
            });
            opRenderSessions();
            await opLoadSessions();
            opShowStatus("会话已重命名", "success");
        } catch (err) {
            opShowStatus("重命名会话失败：" + err.message, "error");
        } finally {
            opSetSessionActionBusy(false);
        }
    }

    async function opDeleteCurrentSession() {
        if (opSessionActionBusy) return;
        if (!window.confirm("确定删除当前 Aliya 会话？删除后无法撤销。")) return;
        opSetSessionActionBusy(true);
        opShowStatus("正在删除会话...");
        try {
            await opWaitForPendingConfigSaves();
            await opPostConversation({ action: "delete_session" });
            opCurrentSessionId = null;
            currentSessionId = null;
            opResetConfigStateForSession(null);
            if (opOverlay.classList.contains("active")) opSetInitialLoading(true);
            await opLoadConfig();
            await opLoadSessions();
            await fetchInitialMessages();
            opShowStatus("会话已删除", "success");
        } catch (err) {
            opShowStatus("删除会话失败：" + err.message, "error");
        } finally {
            opSetSessionActionBusy(false);
        }
    }

    async function opOpenPanel() {
        opOverlay.classList.add("active");
        opShowStatus("");
        var hasCurrentConfig = !!opConfigLoadedSessionId && opConfigLoadedSessionId === (opCurrentSessionId || currentSessionId);
        opSetInitialLoading(!hasCurrentConfig);
        opSetPage(opCurrentPage || "session");
        if (hasCurrentConfig) opApplyConfigPatchToControls(opDesiredConfig);
        opRenderSessionLoading();
        opRenderAgentModelLoading();
        opRenderImageLoading();
        if (opVisionModels.length) opRenderVisionModels(opDesiredConfig.agent_vision_model_id || "");
        else opRenderVisionModelLoading();
        if (opPanelLoadPromise) return opPanelLoadPromise;
        opPanelLoadPromise = (async function() {
            var sessionsPromise = opLoadSessions();
            var configPromise = opLoadConfig();
            await Promise.all([
                opLoadSuccessRates(),
                opLoadAgentModelOptions(false),
                opLoadImageOptions(false),
                opLoadVisionModelOptions(false),
                configPromise
            ]);
            opRenderAgentModels(opDisplayAgentModelId(opDesiredConfig.agent_model_id));
            opRenderImageModels(opDesiredConfig.agent_image_model_id || "");
            opRenderArtistPresets(opDesiredConfig.img_artist_preset_id || "default-anime");
            opRenderVisionModels(opDesiredConfig.agent_vision_model_id || "");
            opApplyConfigPatchToControls(opDesiredConfig);
            await sessionsPromise;
        })();
        try {
            await opPanelLoadPromise;
        } finally {
            opPanelLoadPromise = null;
        }
    }

    function opClosePanel() {
        opOverlay.classList.remove("active");
    }

    operationBtn.addEventListener("click", opOpenPanel);
    opCloseBtn.addEventListener("click", opClosePanel);
    opOverlay.addEventListener("click", function(e) {
        if (e.target === opOverlay) opClosePanel();
    });
    if (opRandomProactiveToggle) opRandomProactiveToggle.addEventListener("change", function() { opSaveProactiveSetting("random", opRandomProactiveToggle.checked === true); });
    if (opScheduledProactiveToggle) opScheduledProactiveToggle.addEventListener("change", function() { opSaveProactiveSetting("scheduled", opScheduledProactiveToggle.checked === true); });
    if (opTimeAwarenessToggle) {
        opTimeAwarenessToggle.addEventListener("change", function() {
            var enabled = opTimeAwarenessToggle.checked === true;
            if (!enabled && (opRandomProactiveEnabled || opScheduledProactiveEnabled)) {
                opTimeAwarenessToggle.checked = true;
                opShowStatus("请先关闭随机主动消息和定时主动消息", "error");
                return;
            }
            opSyncProactiveNotice();
            opQueueConfigPatch({ time_awareness_enabled: enabled });
        });
    }
    if (opProactiveRefreshBtn) opProactiveRefreshBtn.addEventListener("click", opLoadProactiveSchedules);
    if (opSubnav) {
        opSubnav.addEventListener("click", function(e) {
            var target = e.target.closest("[data-op-target]");
            if (!target || !opSubnav.contains(target)) return;
            opSetPage(target.getAttribute("data-op-target"));
        });
    }
    if (opSegToggle) {
        opSegToggle.addEventListener("change", function() {
            opSaveSegmentedOutput(opSegToggle.checked === true);
        });
    }
    if (opSessionRenameBtn) opSessionRenameBtn.addEventListener("click", opRenameCurrentSession);
    if (opSessionDeleteBtn) opSessionDeleteBtn.addEventListener("click", opDeleteCurrentSession);

    async function opDoCreate() {
        if (opSessionActionBusy) return;
        var initialPatch = opCollectConfigPatch();
        opSetSessionActionBusy(true);
        opCreateBtn.disabled = true;
        opShowStatus("正在创建会话...");
        try {
            await opWaitForPendingConfigSaves();
            var res = await fetch(API_BASE + "/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ action: "create" })
            });
            var data = await res.json();
            if (await guardAuthResponse(res, data)) return;
            if (data.status === "success" && data.session_id) {
                opCurrentSessionId = data.session_id;
                currentSessionId = data.session_id;
                opResetConfigStateForSession(data.session_id);
                opSyncMemorySettingsLink();
                opApplyConfigPatchToControls(initialPatch);
                var newSession = { id: data.session_id, name: "新会话" };
                opSessions.unshift(newSession);
                opRenderSessions();
                opQueueConfigPatch(initialPatch);
                await opWaitForPendingConfigSaves();
                await Promise.all([opLoadConfig(), fetchInitialMessages()]);
                opShowStatus("会话创建成功", "success");
            } else {
                opShowStatus(data.error || "创建会话失败", "error");
            }
        } catch (err) {
            console.log("创建会话失败：", err);
            opShowStatus("创建会话失败：" + err.message, "error");
        } finally {
            opCreateBtn.disabled = false;
            opSetSessionActionBusy(false);
        }
    }

    opCreateBtn.addEventListener("click", opDoCreate);

    async function startConnectedApp() {
        var configRevisionSnapshot = Object.assign({}, opConfigFieldRevisions);
        try {
            var res = await fetch(API_BASE + "/api/conversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ action: "get_config" })
            });
            var config = await res.json();
            if (await guardAuthResponse(res, config)) return;
            if (!res.ok || config.error) throw new Error(config.error || "加载会话配置失败");
            opAdoptServerConfig(config, configRevisionSnapshot);
            await fetchInitialMessages();
            startPolling();
        } catch (err) {
            console.log("初始化会话失败：", err);
            showAuthPrompt("已完成授权，但初始化会话失败。请稍后刷新页面重试。");
        }
    }

    async function bootstrap() {
        loadSegConfig();
        loadToken();

        await handleMisskeyAuthCallback();
        loadToken();

        if (!mskToken) {
            showAuthPrompt("当前没有有效 token。请跳转到 Misskey 完成第三方登录，授权后会自动回到本页面。");
            return;
        }

        var isValidToken = await validateAndActivateToken(mskToken);
        if (!isValidToken) {
            mskToken = "";
            localStorage.removeItem("aliya_msk_token");
            showAuthPrompt("当前 token 无效或已过期。请重新通过 Misskey 第三方登录授权。");
            return;
        }

        await startConnectedApp();
    }

    startTokenWatchdog();
    bootstrap();
});
