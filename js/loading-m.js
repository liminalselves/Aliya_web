document.addEventListener("DOMContentLoaded", function (event) {
    let transitionInProgress = false;

    function safePlay(audio) {
        if (!audio) return;
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    }



    async function startTransition() {
        if (transitionInProgress) return;
        transitionInProgress = true;

        const mainContent = document.getElementById('mainContent');
        const animContainer = document.getElementById('animationContainer');
        const newPage = document.querySelector('.new-page');
    
        mainContent.style.opacity = '0';
        mainContent.style.display = 'none'
        animContainer.style.opacity = '1';
        animContainer.style.transition = 'opacity 2s ease-out';
        animContainer.style.opacity = '0';
    
        await new Promise(r => setTimeout(r, 500));
        newPage.classList.add('visible');
        
        var mainbgm = document.getElementById("mainbgm")
        safePlay(mainbgm)
    }
    
    document.querySelector('.launch-btn').addEventListener('click', startTransition);
})
    
