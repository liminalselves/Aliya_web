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
    const playModeStorageKey = "aliya_background_music_mode";
    const backgroundMusicSources = {
        letter: "audio/music/letter.mp3",
        aliya: "audio/music/aliya.mp3",
        drift: "audio/music/drift.mp3",
        response: "audio/music/response.mp3",
        "astral-sunset": "audio/music/astral-sunset.mp3",
        "stars-annihilation": "audio/music/stars-annihilation.mp3",
        "tranquil-repose": "audio/music/tranquil-repose.mp3"
    };
    var backgroundMusicKeys = Object.keys(backgroundMusicSources);
    var activeBackgroundMusic = "letter";
    var activePlayMode = "single";

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
            mainbgm.loop = activePlayMode === "single";
            if (playNow && !radioButton.checked) safePlay(mainbgm);
        } else {
            mainbgm.removeAttribute("src");
            mainbgm.load();
        }
    }

    function playBackgroundMusic() {
        if (activeBackgroundMusic !== "none") safePlay(mainbgm);
    }

    function applyPlayMode(mode) {
        activePlayMode = (mode === "single" || mode === "random" || mode === "list") ? mode : "single";
        localStorage.setItem(playModeStorageKey, activePlayMode);
        if (mainbgm) {
            mainbgm.loop = activePlayMode === "single";
        }
    }

    function playNextInList() {
        var currentIdx = backgroundMusicKeys.indexOf(activeBackgroundMusic);
        var nextIdx = currentIdx === -1 || currentIdx >= backgroundMusicKeys.length - 1 ? 0 : currentIdx + 1;
        var nextKey = backgroundMusicKeys[nextIdx];
        applyBackgroundMusic(nextKey, true);
    }

    function playNextRandom() {
        var nextKey = backgroundMusicKeys[Math.floor(Math.random() * backgroundMusicKeys.length)];
        applyBackgroundMusic(nextKey, true);
    }

    function handleMusicEnded() {
        if (activeBackgroundMusic === "none") return;
        if (activePlayMode === "random") playNextRandom();
        else if (activePlayMode === "list") playNextInList();
    }

    if (mainbgm) {
        mainbgm.addEventListener("ended", handleMusicEnded);
    }

    var savedBackgroundMusic = localStorage.getItem(backgroundMusicStorageKey) || "letter";
    var savedPlayMode = localStorage.getItem(playModeStorageKey) || "single";
    applyPlayMode(savedPlayMode);
    applyBackgroundMusic(savedBackgroundMusic, false);

    function setRem() {
        const designWidth = 1080; 
        const baseFontSize = 6; 
        const scale = document.documentElement.clientWidth / designWidth;
        document.documentElement.style.fontSize = baseFontSize * scale + "px";
    }
    setRem(); 
    window.addEventListener("resize", setRem); 

    function updateViewport() {
        const dvh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--dvh', `${dvh}px`);
    }
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    updateViewport();

    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 100);

    const menuToggle = document.querySelector('.menu-toggle');
    const sideMenu = document.querySelector('.side-menu');
    const menuOverlay = document.querySelector('.menu-overlay');
    if (menuToggle && sideMenu && menuOverlay) {
        menuToggle.addEventListener('click', () => {
            sideMenu.classList.add('active');
            menuOverlay.classList.add('active');
        });
        menuOverlay.addEventListener('click', () => {
            sideMenu.classList.remove('active');
            menuOverlay.classList.remove('active');
        });
        sideMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // 心电图模块开始 (支持多 canvas)
    var ecgCanvases = [
        document.getElementById('ecgCanvas'),
        document.getElementById('topEcgCanvas')
    ].filter(function(c) { return !!c; });
    ecgCanvases.forEach(function(c) { c.width = 260; c.height = 200; });
    var ecgCtxs = ecgCanvases.map(function(c) { return c.getContext('2d'); });
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
        ecgCtxs.forEach(function(ctx, i) {
            ctx.clearRect(0, 0, ecgCanvases[i].width, ecgCanvases[i].height);
            ctx.beginPath();
            ecgPoints.forEach(function(point, index) {
                if (index === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 2;
            ctx.stroke();
        });
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
    
    function drawTrailWithGradient(ctx) {
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
        ecgCtxs.forEach(function(c) { c.clearRect(0, 0, 260, 200); });
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
        ecgCtxs.forEach(function(c) { drawTrailWithGradient(c); c.beginPath(); c.arc(x, y, 1, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); });
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
    function updateDisplay() {
        var val = getRandomInRange();
        document.querySelectorAll('.heart-number').forEach(function(el) {
            el.textContent = val;
        });
    }
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
    const topHeart = document.querySelector('.top-heart');
    hrmButton.addEventListener('change', function () {
        const opacity = this.checked ? "1" : "0";
        if (hrm) hrm.style.opacity = opacity;
        if (topHeart) topHeart.style.opacity = opacity;
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
    sliderThumb.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    var positon = 1;
    function getPointerClientX(e) {
        return e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
    }
    function startDrag(e) {
        if (e.cancelable) e.preventDefault();
        isDragging = true;
        sliderThumb.style.cursor = 'grabbing';
    }
    function drag(e) {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        const trackRect = sliderTrack.getBoundingClientRect();
        let newLeft = getPointerClientX(e) - trackRect.left - sliderThumb.offsetWidth / 2;
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
        var url = MSK_ORIGIN + "/api/agents/images/generate-placeholder";
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
    // 人类合理心率上限 300 bpm，下限 0（允许为0，不允许负数）
    var HR_LIMIT_MAX = 300;
    function clampHeartRate(val) {
        if (isNaN(val) || val < 0) return 0;
        if (val > HR_LIMIT_MAX) return HR_LIMIT_MAX;
        return val;
    }
    function processHeartRateInstruction(text) {
        var regex = /\[\[heart_rate:\s*(\d+)\s*,\s*(\d+)\s*\]\]/g;
        var cleanText = text;
        var matched = false;
        var matches = [...text.matchAll(regex)];
        for (var i = 0; i < matches.length; i++) {
            var m = matches[i];
            var min = clampHeartRate(parseInt(m[1], 10));
            var max = clampHeartRate(parseInt(m[2], 10));
            if (min > max) { var tmp = min; min = max; max = tmp; }
            currentRange = { min: min, max: max };
            updateDisplay();
            cleanText = cleanText.replace(m[0], "");
            matched = true;
        }
        return { text: cleanText.trim(), matched: matched };
    }

    // =========================================================
    var API_BASE = (window.ALIYA_API_BASE || "").replace(/\/+$/, "");
    // msk 实例源，来自 js/config.js；开发时可临时改为 "http://127.0.0.1:3000"。
    var MSK_ORIGIN = String(window.ALIYA_MSK_ORIGIN || "https://misskey.liminalselves.top").replace(/\/+$/, "");
    var mskToken = "";

    function loadToken() {
        mskToken = localStorage.getItem("aliya_msk_token") || "";
    }
    function saveToken() {
        localStorage.setItem("aliya_msk_token", mskToken);
        opSyncAgentControlToken();
    }

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
        var authUrl = MSK_ORIGIN + "/miauth/" + encodeURIComponent(sessionId)
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
    var sendInFlight = false;

    function stopPolling() {
        if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
    }

    function pollDelayMs() {
        if (document.hidden) return 10000;
        return isWaitingReply ? 2500 : 3000;
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
    var suppressEnterAnimation = false;

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
    // msgId 只挂在首个分段/图片元素上，用于控制台导航定位
    // 返回总分段播放时长（ms），0 表示无延迟播放
    function renderAliyaMessage(cleanContent, images, immediate, messageMeta, msgId) {
        if (segConfig.enabled && cleanContent) {
            var segments = splitAssistantMessageIntoSegments(cleanContent);
            if (segments.length <= 1) {
                appendMessage("aliya", cleanContent, messageMeta && messageMeta.timestamp, images, msgId, messageMeta);
                return 0;
            }
            var elapsed = 0;
            segments.forEach(function(seg, idx) {
                if (immediate || idx === 0) {
                    appendMessage("aliya", seg, null, null, idx === 0 ? msgId : null);
                    return;
                }
                elapsed += agentSegmentDelayMs(seg);
                scheduleSegmentPlayback(function() {
                    appendMessage("aliya", seg);
                }, elapsed);
            });
            // 图片在最后一段之后渲染（无文字分段时首图承载 msgId）
            if (images && images.length > 0) {
                if (immediate) {
                    images.forEach(function(imgUrl) {
                        appendMessage("aliya", null, null, [imgUrl]);
                    });
                } else {
                    elapsed += 300;
                    var imgDelay = elapsed;
                    scheduleSegmentPlayback(function() {
                        images.forEach(function(imgUrl) {
                            appendMessage("aliya", null, null, [imgUrl]);
                        });
                    }, imgDelay);
                }
            }
            if (messageMeta && (messageMeta.timestamp || messageMeta.proactiveScheduleControlFailed || (messageMeta.proactiveScheduleActionTypes || []).length)) {
                var metaDelay = immediate ? 0 : elapsed;
                if (metaDelay > 0) scheduleSegmentPlayback(function() { appendMessageMeta("aliya", messageMeta); }, metaDelay);
                else appendMessageMeta("aliya", messageMeta);
            }
            return immediate ? 0 : elapsed;
        } else {
            appendMessage("aliya", cleanContent, messageMeta && messageMeta.timestamp, images, null, messageMeta);
            return 0;
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
    // msgId 为 msk 消息 ID，写入 data-message-id 供控制台导航定位。
    function appendMessage(role, content, msgTimestamp, images, msgId, messageMeta) {
        if (content !== null && content !== undefined && String(content) !== "") {
            var li = document.createElement("li");
            li.className = role + (suppressEnterAnimation ? "" : " msg-enter");
            if (msgId) li.setAttribute("data-message-id", msgId);
            appendMessageContent(li, String(content));
            aliyaText.appendChild(li);
        }
        if (images && images.length > 0) {
            images.forEach(function(imgUrl, imgIndex) {
                var li = document.createElement("li");
                li.className = role + " image-only" + (suppressEnterAnimation ? "" : " msg-enter");
                if (msgId && imgIndex === 0) li.setAttribute("data-message-id", msgId);
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
        var oldScrollHeight = aliyaText.scrollHeight;
        clearSegmentPlaybackTimers();
        suppressEnterAnimation = true;
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
                renderAliyaMessage(rendered.content, rendered.images, true, messageMeta, rendered.id);
            } else {
                appendMessage(rendered.role, rendered.content, rendered.timestamp, rendered.images, rendered.id, messageMeta);
            }
            var nextRendered = items[renderedIndex + 1];
            if (nextRendered && shouldRenderTimelineDateDivider(rendered.timestamp, nextRendered.timestamp)) {
                appendTimelineDateDivider(rendered.timestamp, nextRendered.timestamp);
            }
        }
        requestAnimationFrame(function() {
            if (scrollToLatest) {
                aliyaText.scrollTop = aliyaText.scrollHeight;
            } else {
                // 向上加载历史或重排时按高度差补偿，保持用户当前查看的内容不跳到顶部。
                aliyaText.scrollTop = oldScrollTop + (aliyaText.scrollHeight - oldScrollHeight);
            }
        });
        suppressEnterAnimation = false;
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
        // 锁定本次快照所属会话：循环里的 await processDrawingInstruction 期间，
        // 用户可能已切换到其它会话；若继续写入会把旧会话数据覆盖到新会话 DOM。
        var snapshotSessionId = currentSessionId;
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

        // 用户中途切到其它会话，丢弃本次快照，避免旧会话消息覆盖新会话聊天区。
        if (snapshotSessionId !== currentSessionId) return;

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

    // [DEPRECATED] 增量渲染轮询拿到的新消息，避免清空 DOM 重渲染导致闪烁，同时保留新 al 消息的逐句分段延迟。
    // 该机制因为与实时的 sendMessage() 产生严重的并发竞争、状态交错以及防重匹配困难被废弃。
    // 恢复到原有的稳定模式：平时只做 append 增量，会话切换才做全量 snapshot。
    /* 
    async function applyTimelineSnapshotIncremental(data, scrollToLatest) { ... }
    */

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
                // 同步 lastMsgId，避免首次轮询重复获取已渲染的消息
                if (data.length > 0) {
                    lastMsgId = data[0].id;
                } else {
                    lastMsgId = 0;
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
                // 滚动位置由 renderPreparedTimelineMessages 统一按高度差补偿，避免光标留在顶部导致重复拉取。
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
        var prependSessionId = currentSessionId;
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
        // 用户中途切到其它会话，丢弃本次 prepend，避免把旧会话历史插到新会话聊天区。
        if (prependSessionId !== currentSessionId) return;
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

    // 轮询消息，回归到稳定版本中的简单增量追加逻辑。
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
                // [DEPRECATED] 复杂的快照比对与增量更新：废弃，改用下面的简单增量追加。
                /*
                var snapshotSignature = buildTimelineSnapshotSignature(data.messages);
                if (snapshotSignature !== timelineSnapshotSignature) {
                    var hasNewAssistant = data.messages.some(function(msg) {
                        return msg && msg.role === "assistant" && msg.id && !timelineSnapshotMessageIds[msg.id];
                    });
                    await applyTimelineSnapshotIncremental(data.messages, isAtBottomFlag);
                    if (!sendInFlight) {
                        recentlySentSet = {};
                        recentlyReceivedSet = {};
                        if (hasNewAssistant && isWaitingReply) setWaiting(false);
                    }
                }
                */
                // 恢复稳定版逻辑：如果后端返回了 snapshot，我们只从中提取 id > lastMsgId 的消息进行追加。
                // 这避免了与 sendMessage 在时间线上的状态竞争。
                var snapshotSessionId = currentSessionId;
                var appendedAny = false;
                var appendedAssistant = false;
                for (var i = 0; i < data.messages.length; i++) {
                    var m = data.messages[i];
                    if (!m || !m.id || m.id <= lastMsgId) continue;
                    // Misskey 时间线返回的 role 是 user/assistant，而本地消息存储用的是 player/aliya。
                    // 统一映射后再比较，否则防重判断永远不命中，导致用户消息被 poll 重复渲染。
                    var mRole = m.role === "user" ? "player" : (m.role === "assistant" ? "aliya" : m.role);
                    // 跳过防重集合中的消息（这些是 sendMessage 本地刚加进 DOM 的）
                    if (mRole === "player" && recentlySentSet[m.content]) {
                        lastMsgId = m.id;
                        delete recentlySentSet[m.content];
                        continue;
                    }
                    if (mRole === "aliya" && recentlyReceivedSet[m.content]) {
                        lastMsgId = m.id;
                        delete recentlyReceivedSet[m.content];
                        continue;
                    }
                    // 429 限流提示：渲染为一条 AI 消息，但不推进游标、不计入上下文。
                    if (m._rate_limit_hint === true) {
                        renderAliyaMessage(m.content, [], false, { timestamp: m.createdAt || null });
                        continue;
                    }
                    // 走到这里说明这是真实的新消息
                    if (mRole === "aliya") {
                        var processed = await processDrawingInstruction(m.content, m.id);
                        var hrResult = processHeartRateInstruction(processed.text);
                        if (!hrResult.matched) {
                            currentRange = ranges.medium;
                            updateDisplay();
                        }
                        renderAliyaMessage(hrResult.text, timelineAttachmentImageUrls(m.file).concat(processed.images), false, {
                            timestamp: m.createdAt || m.timestamp || null,
                            proactiveScheduleActionTypes: m.proactiveScheduleActionTypes || m.proactive_schedule_action_types || [],
                            proactiveScheduleControlFailed: m.proactiveScheduleControlFailed === true || m.proactive_schedule_control_failed === true
                        }, m.id);
                        // 用 IIFE 捕获本条消息内容，避免 var 循环变量被 setTimeout 闭包引用到最后一条消息。
                        (function (contentKey) {
                            recentlyReceivedSet[contentKey] = true;
                            setTimeout(function() { delete recentlyReceivedSet[contentKey]; }, 10000);
                        })(m.content);
                        appendedAssistant = true;
                    } else if (mRole === "player") {
                        appendMessage("player", m.content, m.createdAt || m.timestamp || null, timelineAttachmentImageUrls(m.file));
                    }
                    lastMsgId = m.id;
                    appendedAny = true;
                }
                if (appendedAssistant && isWaitingReply) setWaiting(false);
                return;
            }
            if (data.messages && data.messages.length > 0) {
                for (var i = 0; i < data.messages.length; i++) {
                    var msg = data.messages[i];
                    var msgRole = msg.role === "user" ? "player" : (msg.role === "assistant" ? "aliya" : msg.role);
                    if (msgRole === "player" && recentlySentSet[msg.content]) {
                        if (msg.id > lastMsgId) lastMsgId = msg.id;
                        delete recentlySentSet[msg.content];
                        continue;
                    }
                    if (msgRole === "aliya" && recentlyReceivedSet[msg.content]) {
                        if (msg.id > lastMsgId) lastMsgId = msg.id;
                        delete recentlyReceivedSet[msg.content];
                        continue;
                    }
                    
                    if (msgRole === "aliya") {
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
                        }, msg.msk_msg_id);
                        (function (contentKey) {
                            recentlyReceivedSet[contentKey] = true;
                            setTimeout(function() { delete recentlyReceivedSet[contentKey]; }, 10000);
                        })(msg.content);
                    } else {
                        appendMessage(msgRole, msg.content, msg.createdAt || msg.timestamp || null, timelineAttachmentImageUrls(msg.file));
                    }
                    
                    if (msg.id > lastMsgId) lastMsgId = msg.id;
                    if (msgRole === "aliya" && isWaitingReply) { setWaiting(false); }
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
        if (sendInFlight) return;
        var content = playerInput.value.trim();
        var file = imageInput && imageInput.files && imageInput.files[0];
        if (!content && !file) return;
        // 纯图片消息只显示媒体卡片，和 MSK 原生聊天保持一致。
        var displayContent = content;
        var targetSessionId = currentSessionId;
        var playerTimestamp = new Date().toISOString();
        var localPreviewImages = file ? [URL.createObjectURL(file)] : [];
        var clientRequestId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
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
        sendInFlight = true;
        try {
            await opWaitForPendingConfigSaves();
            var fileId = file ? await uploadSelectedImage(file) : null;
            setWaiting(true, "正在等待 Aliya 回复...");
            var controller = new AbortController();
            var timeoutId = setTimeout(function() { controller.abort(); }, 125000);
            var res = await fetch(API_BASE + "/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: makeBody({ message: content, file_id: fileId, session_id: targetSessionId, client_request_id: clientRequestId }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            var data = await res.json();
            if (await guardAuthResponse(res, data)) { return; }
            if (data.status === "success" && data.assistant_message !== undefined) {
                var rawText = data.assistant_message;
                var msgId = data.assistant_message_id;
                // 恢复稳定版逻辑：不再依赖 timelineSnapshotMessageIds 这种复杂的快照比对。
                // 只要后端返回了，我们就直接渲染。如果 poll 抢先拉到了，poll 里的 recentlyReceivedSet 会跳过它。
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
                if (!recentlyReceivedSet[rawText]) {
                    renderAliyaMessage(hrResult.text, processed.images, false, assistantMeta, msgId);
                }
                recentlyReceivedSet[rawText] = true;
                setTimeout(function () { delete recentlyReceivedSet[rawText]; }, 10000);
            } else if (data.status === "error") {
                var errorReply = data.reply || data.error || "通信故障，请稍后再试";
                var errorTimestamp = new Date().toISOString();
                appendLiveTimelineDateDivider(errorTimestamp);
                rememberTimelineItem("aliya", errorReply, [], null, errorTimestamp);
                appendMessage("aliya", errorReply, errorTimestamp);
            }
        } catch (err) {
            console.log("发送消息失败：", err);
            // 走到这里时请求体通常已发出（切后台断连、等待超时等），消息大概率已送达 Misskey，
            // 提示用户回复会自动出现，避免误以为发送失败而重复发送。
            var failureTip = err && err.name === "AbortError"
                ? "连接中断（可能切到了后台或等待超时）。消息大概率已发出，Aliya 回复后会自动显示，无需重发。"
                : "网络波动导致请求中断。消息大概率已发出，Aliya 回复后会自动显示，请勿重复发送。";
            var failureTimestamp = new Date().toISOString();
            appendLiveTimelineDateDivider(failureTimestamp);
            rememberTimelineItem("aliya", failureTip, [], null, failureTimestamp);
            appendMessage("aliya", failureTip, failureTimestamp);
        } finally {
            sendInFlight = false;
            setWaiting(false);
            // 不能立即删除防重标记：服务端时间线缓存会延迟 poll 看到本条消息，
            // 正常由 poll 跳过分支删除，这里仅做兜底清理。
            // 兜底窗口必须足够长（5分钟）：移动端后台会冻结定时器，且时间线缓存
            // 可能延迟数十秒才首次带上本条消息，过早清理会导致消息被 poll 重复渲染。
            setTimeout(function () { delete recentlySentSet[displayContent]; }, 300000);
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
    var settingsStatus = document.getElementById("settingsStatus");
    var segTokenInput = document.getElementById("segToken");
    var backgroundMusicSelect = document.getElementById("backgroundMusicSelect");
    var playModeSelect = document.getElementById("playModeSelect");

    function openSettingsPanel() {
        segTokenInput.value = "";
        segTokenInput.placeholder = mskToken ? "留空保持当前 Token" : "Misskey API Token";
        if (backgroundMusicSelect) backgroundMusicSelect.value = activeBackgroundMusic;
        if (playModeSelect) playModeSelect.value = activePlayMode;
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
    if (playModeSelect) {
        playModeSelect.value = activePlayMode;
        playModeSelect.addEventListener("change", function() {
            applyPlayMode(this.value);
            if (activePlayMode !== "single" && activeBackgroundMusic !== "none" && !radioButton.checked) {
                playBackgroundMusic();
            }
        });
    }

    // Token 保存：点击输入框右侧“保存”按钮或按回车后验证并应用。
    var tokenSaveBtn = document.getElementById("tokenSaveBtn");
    async function applyTokenFromInput() {
        var newToken = segTokenInput.value.trim();
        if (!newToken) return;
        if (newToken === mskToken) {
            settingsStatus.textContent = "Token 未变化";
            settingsStatus.className = "op-status";
            setTimeout(function() { settingsStatus.textContent = ""; settingsStatus.className = "op-status"; }, 1500);
            return;
        }
        settingsStatus.textContent = "正在验证 token...";
        settingsStatus.className = "op-status";
        if (tokenSaveBtn) tokenSaveBtn.disabled = true;
        var isValid = await validateAndActivateToken(newToken);
        if (!isValid) {
            if (tokenSaveBtn) tokenSaveBtn.disabled = false;
            settingsStatus.textContent = "token 无效或已过期";
            settingsStatus.className = "op-status error";
            return;
        }
        mskToken = newToken;
        saveToken();
        segTokenInput.value = "";
        segTokenInput.placeholder = "留空保持当前 Token";
        if (tokenSaveBtn) tokenSaveBtn.disabled = false;
        settingsStatus.textContent = "token 已更新";
        settingsStatus.className = "op-status success";
        setTimeout(function() {
            settingsStatus.textContent = "";
            settingsStatus.className = "op-status";
        }, 2000);
        await startConnectedApp();
    }
    if (tokenSaveBtn) tokenSaveBtn.addEventListener("click", applyTokenFromInput);
    segTokenInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter") { e.preventDefault(); applyTokenFromInput(); }
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
    var opSessionRenameBtn = document.getElementById("opSessionRenameBtn");
    var opSessionDeleteBtn = document.getElementById("opSessionDeleteBtn");
    var opSessions = [];
    var opCurrentSessionId = null;
    var opCurrentPage = "session";
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
    var opSessionSwitchQueued = null;
    var opSessionSwitchPromise = null;
    var opSessionActionBusy = false;

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

    function opSyncSegmentToggle() {
        if (opSegToggle) opSegToggle.checked = segConfig.enabled === true;
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

    function opSetPage(page) {
        opCurrentPage = page || "session";
        var isEmbedPage = AGENT_CONTROL_PANELS.indexOf(opCurrentPage) !== -1;
        document.querySelectorAll(".op-page[data-op-page]").forEach(function(el) {
            var pageName = el.getAttribute("data-op-page");
            el.classList.toggle("active", pageName === (isEmbedPage ? "agent-control" : opCurrentPage));
        });
        if (opSubnav) {
            opSubnav.querySelectorAll("[data-op-target]").forEach(function(btn) {
                btn.classList.toggle("active", btn.getAttribute("data-op-target") === opCurrentPage);
            });
        }
        if (isEmbedPage) {
            void opShowAgentControlPanel(opCurrentPage);
        } else {
            opDestroyAgentControl();
        }
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

    function opHasOwn(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function opApplyConfigPatchToControls(patch) {
        if (!patch) return;
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
    }

    function opConfigPatchFromServer(data) {
        // 模型/生图/文风/规则/主动消息等配置由 msk 托管控制台管理，前端只保留显示相关开关。
        return {
            segmented_output_enabled: !!(data && data.segmentedOutputEnabled === true),
            time_awareness_enabled: !(data && data.timeAwarenessEnabled === false)
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
        opSyncAgentControlSession();
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

    // ==================== msk 托管控制台（agent-control-embed） ====================
    // 模型/生图/主动消息/记忆/世界书/规则/文风面板由 msk 的 /agents/embed 页面托管，
    // 本项目只负责抽屉、导航和聊天界面。协议见 misskey 项目 docs/agent-control-embed.md。
    var AGENT_CONTROL_PANELS = ["model", "draw", "proactive", "memory", "worldbook", "rules", "style"];
    var opAgentControlHost = document.getElementById("opAgentControlHost");
    var opAgentControlStatus = document.getElementById("opAgentControlStatus");
    var opAgentControlScriptPromise = null;
    var opAgentControl = null;
    var opAgentControlPanel = "";
    var opAgentControlPending = null;
    var opAgentControlRevealTimer = null;

    function opLoadAgentControlScript() {
        if (window.MisskeyAgentControl) return Promise.resolve();
        if (opAgentControlScriptPromise) return opAgentControlScriptPromise;
        opAgentControlScriptPromise = new Promise(function(resolve, reject) {
            var script = document.createElement("script");
            // msk 以 max-age=86400 提供该脚本且无内容指纹，必须带版本号否则浏览器整天都用旧缓存（缺 setPanel 等新方法）
            script.src = MSK_ORIGIN + "/agent-control-embed.js?v=20260918-03";
            script.onload = function() { resolve(); };
            script.onerror = function() {
                opAgentControlScriptPromise = null;
                reject(new Error("无法加载 " + MSK_ORIGIN + "/agent-control-embed.js"));
            };
            document.head.appendChild(script);
        });
        return opAgentControlScriptPromise;
    }

    function opAgentControlAppearance() {
        return {
            colorScheme: "dark",
            accent: "#e6a15a",
            background: "#2d2d2d",
            panel: "#3a3a3a",
            foreground: "#f2ede7",
            muted: "#b9b2a9",
            divider: "#555555",
            radius: "12px",
            fontFamily: '"微软雅黑", Arial, sans-serif',
            fontSize: "14px",
            contentMaxWidth: "100%",
            spacing: "16px"
        };
    }

    function opShowAgentControlError(message) {
        if (!opAgentControlStatus) return;
        if (!message) {
            opAgentControlStatus.hidden = true;
            opAgentControlStatus.textContent = "";
            return;
        }
        opAgentControlStatus.hidden = false;
        opAgentControlStatus.textContent = message;
    }

    function opDestroyAgentControl() {
        if (opAgentControlRevealTimer) {
            clearTimeout(opAgentControlRevealTimer);
            opAgentControlRevealTimer = null;
        }
        if (opAgentControlPending) {
            try { opAgentControlPending.destroy(); } catch (err) {
                console.log("销毁待加载控制台失败：", err);
            }
            opAgentControlPending = null;
        }
        if (opAgentControl) {
            try { opAgentControl.destroy(); } catch (err) {
                console.log("销毁控制台失败：", err);
            }
            opAgentControl = null;
        }
        opAgentControlPanel = "";
        opShowAgentControlError("");
        if (opAgentControlHost) opAgentControlHost.innerHTML = "";
    }

    function opStageAgentControlIframe(control) {
        // 新 iframe 先隐身叠在旧内容上，等自身鉴权并测出内容高度后再替换，避免加载过程闪动。
        control.iframe.style.position = "absolute";
        control.iframe.style.top = "0";
        control.iframe.style.left = "0";
        control.iframe.style.visibility = "hidden";
    }

    function opRevealAgentControl(control, panel) {
        if (opAgentControlPending !== control || opAgentControlPanel !== panel) return;
        opAgentControlPending = null;
        if (opAgentControlRevealTimer) {
            clearTimeout(opAgentControlRevealTimer);
            opAgentControlRevealTimer = null;
        }
        var old = opAgentControl;
        opAgentControl = control;
        if (opAgentControlHost) {
            Array.prototype.slice.call(opAgentControlHost.children).forEach(function(el) {
                if (el !== control.iframe) el.remove();
            });
        }
        control.iframe.style.position = "";
        control.iframe.style.top = "";
        control.iframe.style.left = "";
        control.iframe.style.visibility = "";
        if (old) {
            try { old.destroy(); } catch (err) {
                console.log("销毁旧控制台失败：", err);
            }
        }
    }

    async function opShowAgentControlPanel(panel) {
        if (!opAgentControlHost) return;
        var sessionId = opCurrentSessionId || currentSessionId;
        if (opAgentControlRevealTimer) {
            clearTimeout(opAgentControlRevealTimer);
            opAgentControlRevealTimer = null;
        }
        if (opAgentControlPending) {
            try { opAgentControlPending.destroy(); } catch (err) {
                console.log("销毁待加载控制台失败：", err);
            }
            opAgentControlPending = null;
        }
        if (!sessionId) {
            opDestroyAgentControl();
            opAgentControlHost.innerHTML = '<div class="op-image-loading op-agent-control-empty">请先在“会话”页创建会话，再配置智能体。</div>';
            return;
        }
        opAgentControlPanel = panel;
        // 同会话下直接让已启动的 iframe 内部切路由（需要 msk 新版宿主脚本支持 setPanel），避免整页重启
        if (opAgentControl && opAgentControl.sessionId === sessionId && typeof opAgentControl.setPanel === "function") {
            opAgentControl.setPanel(panel);
            return;
        }
        if (!opAgentControl) {
            opAgentControlHost.innerHTML = '<div class="op-image-loading op-agent-control-loading"><span class="op-loading-spinner"></span><span>正在加载控制台...</span></div>';
        }
        try {
            await opLoadAgentControlScript();
        } catch (err) {
            opShowAgentControlError(err.message || "控制台脚本加载失败");
            return;
        }
        if (opAgentControlPanel !== panel) return;
        if (!window.MisskeyAgentControl) {
            opShowAgentControlError("msk 宿主脚本不可用");
            return;
        }
        var control;
        try {
            control = new window.MisskeyAgentControl({
                origin: MSK_ORIGIN,
                sessionId: sessionId,
                panel: panel,
                token: function() {
                    if (!mskToken) throw new Error("没有可用的 Misskey token");
                    return mskToken;
                },
                appearance: opAgentControlAppearance(),
                autoHeight: false,
                title: "msk 智能体控制台",
                onEvent: function(message) {
                    if (control !== opAgentControl) {
                        if (!message || typeof message.type !== "string") return;
                        // 鉴权通过即切换：iframe 固定高度自身滚动，加载态由 msk 内部 UI 呈现
                        if (message.type === "misskey:agent-control:authenticated"
                            || message.type === "misskey:agent-control:error") {
                            opRevealAgentControl(control, panel);
                            if (message.type === "misskey:agent-control:error") opHandleAgentControlEvent(message);
                        }
                        return;
                    }
                    opHandleAgentControlEvent(message);
                }
            });
        } catch (err) {
            opShowAgentControlError("控制台初始化失败：" + (err.message || err));
            return;
        }
        opStageAgentControlIframe(control);
        control.mount(opAgentControlHost);
        opAgentControlPending = control;
        opAgentControlRevealTimer = setTimeout(function() {
            opRevealAgentControl(control, panel);
        }, 5000);
    }

    function opSyncAgentControlToken() {
        if (opAgentControl && mskToken) opAgentControl.setToken(mskToken);
    }

    function opSyncAgentControlSession() {
        if (AGENT_CONTROL_PANELS.indexOf(opCurrentPage) === -1) return;
        var sessionId = opCurrentSessionId || currentSessionId;
        if (!sessionId) return;
        if (opAgentControl && opAgentControl.sessionId === sessionId) return;
        if (opAgentControlPending && opAgentControlPending.sessionId === sessionId) return;
        void opShowAgentControlPanel(opCurrentPage);
    }

    function opHandleAgentControlEvent(message) {
        if (!message || typeof message.type !== "string") return;
        if (message.type === "misskey:agent-control:close-requested") {
            opClosePanel();
            void opLoadSessions();
            return;
        }
        if (message.type === "misskey:agent-control:navigate-message"
            || message.type === "misskey:agent-control:navigate-context-divider") {
            opClosePanel();
            scrollToMessageById(message.messageId);
            return;
        }
        if (message.type === "misskey:agent-control:open-url") {
            if (typeof message.url === "string" && message.url.charAt(0) === "/") {
                window.open(MSK_ORIGIN + message.url, "_blank", "noopener");
            }
            return;
        }
        if (message.type === "misskey:agent-control:error") {
            opShowAgentControlError(message.code === "AUTHENTICATION_FAILED"
                ? "Token 鉴权失败，请重新完成 Misskey 授权后再试。"
                : ("控制台错误：" + (message.message || message.code || "未知")));
        }
    }

    function scrollToMessageById(messageId) {
        if (!messageId || !aliyaText) return;
        var raw = String(messageId);
        var selector = '[data-message-id="' + (window.CSS && CSS.escape ? CSS.escape(raw) : raw) + '"]';
        var el = aliyaText.querySelector(selector);
        if (!el) {
            console.log("未找到目标消息：", messageId);
            return;
        }
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.remove("msg-highlight");
        void el.offsetWidth;
        el.classList.add("msg-highlight");
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
        opRenderSessionLoading();
        if (opPanelLoadPromise) return opPanelLoadPromise;
        opPanelLoadPromise = (async function() {
            var configPromise = opLoadConfig();
            await opLoadSessions();
            await configPromise;
        })();
        try {
            await opPanelLoadPromise;
        } finally {
            opPanelLoadPromise = null;
        }
    }

    function opClosePanel() {
        opOverlay.classList.remove("active");
        opDestroyAgentControl();
    }

    operationBtn.addEventListener("click", opOpenPanel);
    opCloseBtn.addEventListener("click", opClosePanel);
    opOverlay.addEventListener("click", function(e) {
        if (e.target === opOverlay) opClosePanel();
    });
    if (opTimeAwarenessToggle) {
        opTimeAwarenessToggle.addEventListener("change", function() {
            opQueueConfigPatch({ time_awareness_enabled: opTimeAwarenessToggle.checked === true });
        });
    }
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
                var newSession = { id: data.session_id, name: "新会话" };
                opSessions.unshift(newSession);
                opRenderSessions();
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
