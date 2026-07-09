document.addEventListener("DOMContentLoaded", function (event) {
  var mainbgm = document.getElementById("mainbgm")
  var noisebgm = document.getElementById("noisebgm")
  var Litterbgm = document.getElementById("Litterbgm")
  const radioButton = document.querySelector('#radio-button');



  function setRem() {
    const designWidth = 1080; // 设计稿宽度（如移动端以 750px 为基准）
    const baseFontSize = 6; // 基准值，通常与默认 font-size 一致
    const scale = document.documentElement.clientWidth / designWidth;
    document.documentElement.style.fontSize = baseFontSize * scale + "px";
  }
  setRem(); // 初始化
  window.addEventListener("resize", setRem); // 窗口变化时更新

 // 动态更新视口单位
 const updateViewport = () => {
  const dvh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--dvh', `${dvh}px`);
};

window.addEventListener('resize', updateViewport);
window.addEventListener('orientationchange', updateViewport);
updateViewport();

// 初始加载时强制调整
setTimeout(() => {
  window.scrollTo(0, 0);
}, 100);

  //自动滚动
  // 获取目标元素
  const container = document.getElementById('aliyaText');
  // 方法一：内容变化时自动滚动（推荐）
  const observer = new MutationObserver(() => {
    container.scrollTop = container.scrollHeight;
  });
  // 开始观察内容变化
  observer.observe(container, {
    childList: true,    // 监听子元素变化
    subtree: true       // 监听所有后代元素
  });


  const menuToggle = document.querySelector('.menu-toggle');
  const sideMenu = document.querySelector('.side-menu');
  const overlay = document.querySelector('.menu-overlay');

  // 打开菜单
  menuToggle.addEventListener('click', () => {
    sideMenu.classList.add('active');
    overlay.classList.add('active');
  });

  // 关闭菜单
  overlay.addEventListener('click', () => {
    sideMenu.classList.remove('active');
    overlay.classList.remove('active');
  });

  // 阻止菜单内容点击触发关闭
  sideMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });


   //心电图模块开始
   const canvas = document.getElementById('ecgCanvas');
   const ctx = canvas.getContext('2d');
 
   // 设置画布分辨率
   canvas.width = 260;
   canvas.height = 200;
 
   // 心电图关键点坐标（绝对坐标）
   const ecgPoints = [
     { x: 0, y: 100 },  // 起点
     { x: 80, y: 100 },
 
     { x: 90, y: 90 },
     { x: 95, y: 110 },
 
     { x: 100, y: 70 },
     { x: 110, y: 130 },
 
     { x: 130, y: 40 },
     { x: 150, y: 160 },
 
     { x: 170, y: 70 },
     { x: 180, y: 130 },
 
     { x: 185, y: 90 },
     { x: 190, y: 120 },
 
     { x: 200, y: 100 },
     { x: 260, y: 100 },
 
   ];
 
   // 动态参数
   let currentIndex = 0;
   let currentPos = 0;
   const speed = 5;
   const tailPoints = [];
   const tailMaxLength = 60;
 
   // 新增：路径重置标记
   let isLooping = false;
 
 
 
   // ==== 修复1：调整透明度计算参数 ====
   const GRADIENT_FALLOFF = 0.03;  // 从0.015调整为0.02，增强渐变效果
   function drawTrailWithGradient() {
     let previousPoint = null;
 
     // ==== 修复1：反转拖尾点遍历顺序 ====
     const reversedPoints = [...tailPoints].reverse(); // 反向遍历实现尾部渐隐
 
     ctx.globalCompositeOperation = 'screen';
 
     reversedPoints.forEach((point, index) => { // 从新到旧遍历
       if (!point) {
         previousPoint = null;
         return;
       }
 
       // ==== 修复2：调整透明度衰减方向 ====
       const alpha = Math.max(0, 1 - index * GRADIENT_FALLOFF); // 最新点alpha最高
 
       if (previousPoint) {
         // ==== 修复3：反转渐变方向 ====
         const gradient = ctx.createLinearGradient(
           point.x, point.y,          // 起点：当前点（最新）
           previousPoint.x, previousPoint.y // 终点：前一点（更旧）
         );
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
 
     // 当接近终点时插入断开标记
     if (currentIndex === ecgPoints.length - 2 && progress > 0.95) {
       if (!isLooping) {
         tailPoints.push(null); // 插入路径断开标记
         isLooping = true;
       }
     } else {
       isLooping = false;
     }
 
     tailPoints.push({ x, y });
     if (tailPoints.length > tailMaxLength) tailPoints.shift();
 
 
 
     drawTrailWithGradient();  // 先绘制拖尾
 
     // 绘制移动点（保持不变）
     ctx.beginPath();
     ctx.arc(x, y, 1, 0, Math.PI * 2);
     ctx.fillStyle = '#fff';
     ctx.fill();
 
     // 更新位置
     currentPos += speed;
     if (currentPos >= Math.sqrt(dx * dx + dy * dy)) {
       currentPos = 0;
       currentIndex = (currentIndex + 1) % (ecgPoints.length - 1);
 
       // 重置时插入断开标记
       if (currentIndex === 0) {
         tailPoints.push(null);
       }
     }
 
     requestAnimationFrame(draw);
   }
 
   draw();
 
   //心电图模块结束
   //-----------------------------------------------------------------------------------
   //随机数字模块
   // 1. 定义范围参数对象
   const ranges = {
     low: { min: 63, max: 68 },
     medium: { min: 70, max: 75 },
     high: { min: 79, max: 85 }
   };
 
   // 2. 初始化当前范围
   currentRange = ranges.medium;
 
   // 3. 生成范围内随机整数（闭包实现）
   function getRandomInRange() {
     return Math.floor(
       Math.random() * (currentRange.max - currentRange.min + 1)
     ) + currentRange.min;
   }
 
   // 4. 更新显示的函数
    function updateDisplay() {
     document.getElementById('number').textContent = getRandomInRange();
   }
 
   // 5. 启动定时器（每秒更新）
   let timer = setInterval(updateDisplay, 1500);
 
   //暴露给game改变心率
   window.setRange = function(type) {
     currentRange = ranges[type];
     updateDisplay(); // 立即显示新范围数值
   }
 
   //-----------------------------------------------------------------------------------
   //按钮模块
   let isCooling = false; // 冷却状态标志
   document.querySelectorAll('.toggle-input').forEach(input => {
     input.addEventListener('change', function () {
       if (isCooling) return;
       // 进入冷却状态
       isCooling = true;
       document.querySelectorAll('.bg').forEach(bgOne => {
         bgOne.classList.add('disabled');
       });
       const parent = input.parentNode;
       const grandparent = parent.parentNode;
       const onLabel = grandparent.querySelector('.on-label');
       const offLabel = grandparent.querySelector('.off-label');
       onLabel.classList.toggle('active', !this.checked);
       offLabel.classList.toggle('active', this.checked);
 
       buttonBgm();
 
       setTimeout(() => {
         isCooling = false;
         document.querySelectorAll('.bg').forEach(bgOne => {
           bgOne.classList.remove('disabled');
         });
       }, 520);
 
     });
   });
 
   //------------------------------------------------------------------------------------
   //hrm按钮控制
   const hrmButton = document.querySelector('#hrmbutton');
   const hrm = document.querySelector('.hrm');
   hrmButton.addEventListener('change', function () {
     if (this.checked) {
       hrm.style.opacity = "1"
 
     } else {
       hrm.style.opacity = "0"
     }
   });
 
 
 
 
   //-------------------------------------------------------------------------------------
   //禁止图片拖拽
   const liderContainer = document.querySelector('.slider-container');
   liderContainer.addEventListener('mousedown', e => {
     e.preventDefault() // 核心拦截
   })
 
 
   //收音机模块----------------------------
 
   const sliderThumb = document.querySelector('.slider-thumb');
   const sliderTrack = document.querySelector('.slider-track');
   let isDragging = false;
   let startX = 0;
   let initialLeft = 0;
   let currentInterval = null;
   var positon = 1;
   // 定义触发区间及回调函数
   const intervals = [
     { min: 0, max: 100, label: '低频区', callback: () => handleInterval(0) },
     { min: 100, max: 200, label: '中频区', callback: () => handleInterval(1) },
     { min: 200, max: 300, label: '高频区', callback: () => handleInterval(2) }
   ];
 
      // 触摸开始
  sliderThumb.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDragging = true;
    const touch = e.touches[0];
    startX = touch.clientX;
    initialLeft = parseFloat(getComputedStyle(sliderThumb).left);
  });
    // 触摸移动
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const trackRect = sliderTrack.getBoundingClientRect();
    
    // 计算移动距离
    let moveX = touch.clientX - startX;
    let newLeft = initialLeft + moveX;
    
    // 限制边界（屏幕宽度的1/3可见）
    newLeft = Math.max(0, Math.min(newLeft, sliderTrack.offsetWidth - sliderThumb.offsetWidth));
    
    // 更新位置
    sliderThumb.style.left = `${newLeft}px`;
    positon = newLeft;
    checkCurrentInterval(newLeft);
  }, { passive: false });
  // 触摸结束
  document.addEventListener('touchend', () => {
    isDragging = false;
  });
 
   function checkCurrentInterval(position) {
     const currentPos = (position / sliderTrack.offsetWidth) * 300; // 转换为0-300范围
     for (const interval of intervals) {
       if (currentPos >= interval.min && currentPos <= interval.max) {
         if (currentInterval !== position) {
           currentInterval = position;
           interval.callback(); // 触发回调
         }
         break;
       }
     }
   }
 
   function handleInterval(label) {
     var text = `收音机当前区域：${label}`;
 
     if (label === 2 && radioButton.checked) {
       Litterbgm.play()
       mainbgm.pause();
       noisebgm.pause();
     } else if (label !== 2 && radioButton.checked) {
 
       noisebgm.play()
       Litterbgm.pause();
       mainbgm.pause();
 
     } else if (!radioButton.checked) {
       noisebgm.pause()
       Litterbgm.pause();
       mainbgm.play();
     } else {
 
     }
   }
 
   //---------------------------------------------------------------------------------------------------------
 
   function buttonBgm() {
     var button = document.getElementById("buttonbgm")
     button.play()
   }
 
   //-------------------------------------------------------------------------------------
   //radiob按钮控制
   function togglePlay(audio) {
     audio.paused ? audio.play() : audio.pause();
   }
   function isPlaying(audio) {
     return !audio.paused && !audio.ended && audio.currentTime > 0;
   }
 
 
   radioButton.addEventListener('change', function () {
     if (this.checked) {
 
       mainbgm.pause();
       checkCurrentInterval(++positon)
 
     } else {
       mainbgm.play();
       noisebgm.pause();
       Litterbgm.pause()
 
     }
   });




})


