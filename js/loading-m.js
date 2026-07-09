document.addEventListener("DOMContentLoaded", function (event) {
   



    async function startTransition() {

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
        mainbgm.play()
    }
    
    document.querySelector('.launch-btn').addEventListener('click', startTransition);
})
    
