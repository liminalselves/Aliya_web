document.addEventListener("DOMContentLoaded", function (event) {

    const canvas = document.getElementById('warpCanvas');
    const ctx = canvas.getContext('2d');
    let animationFrame;
    
    const STAR_COUNT = 400;
    let stars = [];
    let isAnimating = false;
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    
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
    
        update() {
            this.z -= this.speed * 15;
            if (this.z <= 0) this.reset();
        }
    
        draw() {
            const factor = 100 / (this.z + 100);
            const x = this.x * factor + canvas.width/2;
            const y = this.y * factor + canvas.height/2;
            const alpha = Math.min(1 - factor/3, 0.9);
            
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.arc(x, y, this.size * factor * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    function initStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push(new Star());
        }
    }
    
    function animate() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        stars.forEach(star => {
            star.update();
            star.draw();
        });
        
        animationFrame = requestAnimationFrame(animate);
    }
    
    async function startTransition() {

        const mainContent = document.getElementById('mainContent');
        const animContainer = document.getElementById('animationContainer');
        const newPage = document.querySelector('.new-page');
    
        mainContent.style.opacity = '0';
        mainContent.style.display = 'none'
        animContainer.style.opacity = '1';
        resizeCanvas();
        initStars();
        animate();
    
        // 纯星空持续时间延长至2秒
        await new Promise(r => setTimeout(r, 1000));
    
        animContainer.style.transition = 'opacity 2s ease-out';
        animContainer.style.opacity = '0';
    
        await new Promise(r => setTimeout(r, 500));
        newPage.classList.add('visible');
    
        cancelAnimationFrame(animationFrame);
        canvas.width = 0;
        canvas.height = 0;
        var mainbgm = document.getElementById("mainbgm")
        mainbgm.play()
    }
    
    document.querySelector('.launch-btn').addEventListener('click', startTransition);
    resizeCanvas();
})
    
