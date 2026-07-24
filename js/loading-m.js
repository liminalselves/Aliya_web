document.addEventListener("DOMContentLoaded", function (event) {
    const canvas = document.getElementById('warpCanvas');
    const ctx = canvas.getContext('2d');
    let animationFrame;
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const MAX_STAR_COUNT = 400;
    let stars = [];
    let isAnimating = false;
    let transitionInProgress = false;
    let lastAnimationTime = null;
    const STAR_REFERENCE_FRAME_MS = 1000 / 60;

    function safePlay(audio) {
        if (!audio) return;
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);

    function starCountForViewport() {
        return Math.min(MAX_STAR_COUNT, Math.max(120, Math.floor((canvas.width * canvas.height) / 5000)));
    }

    class Star {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = (Math.random() - 0.5) * canvas.width * 2;
            this.y = (Math.random() - 0.5) * canvas.height * 2;
            this.z = Math.random() * 2500;
            this.speed = Math.random() * 0.6 + 0.3;
            this.size = Math.random() * 1.0 + 0.2;
        }

        update(elapsedMs) {
            this.z -= this.speed * 15 * elapsedMs / STAR_REFERENCE_FRAME_MS;
            if (this.z <= 0) this.reset();
        }

        draw() {
            const factor = 100 / (this.z + 100);
            const x = this.x * factor + canvas.width / 2;
            const y = this.y * factor + canvas.height / 2;
            const alpha = Math.min(1 - factor / 3, 0.9);

            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.arc(x, y, this.size * factor * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initStars() {
        stars = [];
        for (let i = 0; i < starCountForViewport(); i++) {
            stars.push(new Star());
        }
    }

    function stopWarpAnimation() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        isAnimating = false;
        lastAnimationTime = null;
    }

    function animate(timestamp) {
        if (!isAnimating || document.hidden || reduceMotionQuery.matches) {
            stopWarpAnimation();
            return;
        }
        if (typeof timestamp !== 'number') timestamp = performance.now();
        if (lastAnimationTime === null) lastAnimationTime = timestamp;
        const elapsedMs = Math.min(Math.max(timestamp - lastAnimationTime, 0), 100);
        lastAnimationTime = timestamp;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        stars.forEach(star => {
            star.update(elapsedMs);
            star.draw();
        });

        animationFrame = requestAnimationFrame(animate);
    }

    async function startTransition() {
        if (transitionInProgress) return;
        transitionInProgress = true;

        const mainContent = document.getElementById('mainContent');
        const animContainer = document.getElementById('animationContainer');
        const newPage = document.querySelector('.new-page');

        mainContent.style.opacity = '0';
        mainContent.style.display = 'none';
        animContainer.style.opacity = '1';
        resizeCanvas();
        if (!reduceMotionQuery.matches) {
            initStars();
            isAnimating = true;
            animate();
        }

        await new Promise(r => setTimeout(r, reduceMotionQuery.matches ? 0 : 1000));

        animContainer.style.transition = 'opacity 2s ease-out';
        animContainer.style.opacity = '0';

        await new Promise(r => setTimeout(r, 500));
        newPage.classList.add('visible');

        stopWarpAnimation();
        canvas.width = 0;
        canvas.height = 0;
        var mainbgm = document.getElementById("mainbgm");
        safePlay(mainbgm);
    }

    document.querySelector('.launch-btn').addEventListener('click', startTransition);
    resizeCanvas();
});
