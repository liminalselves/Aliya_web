/**
 * CD30瞳电游工作室展区特别版 - 核心功能模块
 * 包含：顶部横幅、对话轮数限制、隐私保护倒计时、简化认证
 */

(function() {
    'use strict';

    // ==================== 配置常量 ====================
    const CD30_CONFIG = {
        MAX_TURNS: 30, // 每个会话最多30轮对话
        PRIVACY_TIMEOUT: 30 * 60 * 1000, // 30分钟无操作自动清除
        AUTH_KEY: 'cd30_auth_verified',
        TURNS_KEY: 'cd30_current_turns',
        SESSION_KEY: 'cd30_session_id',
        LAST_ACTIVE_KEY: 'cd30_last_active',
        SEGMENT_KEY: 'aliya_segment_output' // 分段输出存储键
    };

    // ==================== 默认配置初始化 ====================
    function initDefaultConfig() {
        // 默认开启分段输出
        if (!localStorage.getItem(CD30_CONFIG.SEGMENT_KEY)) {
            localStorage.setItem(CD30_CONFIG.SEGMENT_KEY, 'true');
        }
        
        // 立即设置默认模型（硬编码，确保可用）
        localStorage.setItem('aliya_default_model', 'akqrsc9j5u');
        // nai-diffusion-4-5-full 的内部ID是 aob0wkxmi3
        localStorage.setItem('aliya_default_image_model', 'aob0wkxmi3');
        
        // 从服务器获取最新配置并更新（异步，不阻塞）
        fetch('/api/cd30/config')
            .then(res => res.json())
            .then(config => {
                // 设置默认模型到本地存储，供原有逻辑读取
                if (config.default_model) {
                    localStorage.setItem('aliya_default_model', config.default_model);
                }
                if (config.default_image_model) {
                    localStorage.setItem('aliya_default_image_model', config.default_image_model);
                }
            })
            .catch(err => console.log('获取CD30配置失败:', err));
    }

    // ==================== 顶部横幅 ====================
    function createBanner() {
        const banner = document.createElement('div');
        banner.id = 'cd30-banner';
        banner.innerHTML = `
            <div class="cd30-banner-content">
                <span class="cd30-banner-badge">CD30特别版</span>
                <span class="cd30-banner-text">
                    CD30瞳电游工作室展区特别版 | 
                    正式版请访问<a href="https://docs.liminalselves.top" target="_blank" rel="noopener noreferrer">文档</a> | 
                    玩家二创，与官方无关！
                </span>
                <button class="cd30-banner-close" aria-label="关闭横幅">&times;</button>
            </div>
        `;
        document.body.insertBefore(banner, document.body.firstChild);
        
        // 添加body类名，控制主内容区域下移
        document.body.classList.add('cd30-banner-visible');
            
        // 关闭按钮事件
        banner.querySelector('.cd30-banner-close').addEventListener('click', function() {
            banner.classList.add('cd30-banner-hidden');
            document.body.classList.remove('cd30-banner-visible');
            setTimeout(() => banner.remove(), 300);
        });
    }

    // ==================== 对话轮数限制 ====================
    const TurnLimiter = {
        currentTurns: 0,
        
        init() {
            const saved = localStorage.getItem(CD30_CONFIG.TURNS_KEY);
            this.currentTurns = saved ? parseInt(saved, 10) : 0;
            this.updateDisplay();
        },
        
        increment() {
            this.currentTurns++;
            localStorage.setItem(CD30_CONFIG.TURNS_KEY, this.currentTurns.toString());
            this.updateDisplay();
            
            if (this.currentTurns >= CD30_CONFIG.MAX_TURNS) {
                this.onLimitReached();
                return false;
            }
            return true;
        },
        
        reset() {
            this.currentTurns = 0;
            localStorage.setItem(CD30_CONFIG.TURNS_KEY, '0');
            this.updateDisplay();
        },
        
        getRemaining() {
            return Math.max(0, CD30_CONFIG.MAX_TURNS - this.currentTurns);
        },
        
        updateDisplay() {
            // 确保状态容器存在
            let container = document.querySelector('.cd30-status-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'cd30-status-container';
                document.body.appendChild(container);
            }
            
            let display = document.getElementById('cd30-turns-display');
            if (!display) {
                display = document.createElement('div');
                display.id = 'cd30-turns-display';
                display.className = 'cd30-status-item';
                container.appendChild(display);
            }
            display.innerHTML = `<span class="cd30-status-label">剩余</span><span class="cd30-status-value">${this.getRemaining()}轮</span>`;
            
            // 轮数警告
            if (this.getRemaining() <= 5) {
                display.classList.add('cd30-warning');
            } else {
                display.classList.remove('cd30-warning');
            }
        },
        
        onLimitReached() {
            // 不弹窗遮挡消息，改为在输入框区域显示内联提示
            if (document.body.classList.contains('cd30-limit-reached')) return;
            document.body.classList.add('cd30-limit-reached');
            
            // 禁用输入控件
            const playerInput = document.getElementById('playerInput');
            if (playerInput) playerInput.disabled = true;
            const sendBtn = document.getElementById('sendBtn');
            if (sendBtn) sendBtn.disabled = true;
            
            // 在输入区域插入提示条（替换输入框显示，不遮挡消息）
            let banner = document.getElementById('cd30-limit-banner');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'cd30-limit-banner';
                banner.className = 'cd30-limit-banner';
                banner.innerHTML = `
                    <span class="cd30-limit-text">本次会话已达到最大对话轮数（${CD30_CONFIG.MAX_TURNS}轮）</span>
                    <button class="cd30-btn cd30-btn-primary" id="cd30-limit-restart-btn">开始新会话</button>
                `;
                const inputArea = document.getElementById('playerInputArea');
                if (inputArea) {
                    inputArea.appendChild(banner);
                } else {
                    document.body.appendChild(banner);
                }
                // 绑定按钮事件
                document.getElementById('cd30-limit-restart-btn').addEventListener('click', function() {
                    window.CD30Special.startNewSession();
                });
            }
        }
    };

    // ==================== 隐私保护倒计时 ====================
    const PrivacyGuard = {
        timer: null,
        remaining: CD30_CONFIG.PRIVACY_TIMEOUT,
        lastActive: Date.now(),
        
        init() {
            this.resetTimer();
            this.startCountdown();
            this.bindActivityEvents();
        },
        
        resetTimer() {
            this.lastActive = Date.now();
            this.remaining = CD30_CONFIG.PRIVACY_TIMEOUT;
            localStorage.setItem(CD30_CONFIG.LAST_ACTIVE_KEY, this.lastActive.toString());
        },
        
        startCountdown() {
            if (this.timer) clearInterval(this.timer);
            
            this.timer = setInterval(() => {
                const now = Date.now();
                const elapsed = now - this.lastActive;
                this.remaining = Math.max(0, CD30_CONFIG.PRIVACY_TIMEOUT - elapsed);
                
                this.updateDisplay();
                
                if (this.remaining <= 0) {
                    this.onTimeout();
                }
            }, 1000);
        },
        
        updateDisplay() {
            // 确保状态容器存在
            let container = document.querySelector('.cd30-status-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'cd30-status-container';
                document.body.appendChild(container);
            }
            
            let display = document.getElementById('cd30-privacy-display');
            if (!display) {
                display = document.createElement('div');
                display.id = 'cd30-privacy-display';
                display.className = 'cd30-status-item cd30-privacy';
                container.appendChild(display);
            }
            
            const minutes = Math.floor(this.remaining / 60000);
            const seconds = Math.floor((this.remaining % 60000) / 1000);
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            display.innerHTML = `<span class="cd30-status-label">重置倒计时</span><span class="cd30-status-value">${timeStr}</span>`;
            
            // 最后1分钟警告
            if (this.remaining <= 60000) {
                display.classList.add('cd30-danger');
            } else {
                display.classList.remove('cd30-danger');
            }
        },
        
        bindActivityEvents() {
            const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
            events.forEach(event => {
                document.addEventListener(event, () => this.resetTimer(), { passive: true });
            });
        },
        
        onTimeout() {
            clearInterval(this.timer);
            
            // 清除对话历史
            if (typeof clearChatHistory === 'function') {
                clearChatHistory();
            }
            
            // 显示隐私保护提示
            const modal = document.createElement('div');
            modal.className = 'cd30-modal-overlay';
            modal.innerHTML = `
                <div class="cd30-modal">
                    <h3>隐私保护已启动</h3>
                    <p>检测到长时间无操作，已自动清除对话历史。</p>
                    <p>保护前一位用户的隐私安全。</p>
                    <button class="cd30-btn cd30-btn-primary" id="cd30-privacy-restart-btn">开始新会话</button>
                </div>
            `;
            document.body.appendChild(modal);
            
            // 绑定按钮事件
            document.getElementById('cd30-privacy-restart-btn').addEventListener('click', function() {
                window.CD30Special.startNewSession();
            });
        }
    };

    // ==================== 简化认证 ====================
    const SimpleAuth = {
        init() {
            if (this.isAuthenticated()) {
                // 已认证，确保API密钥存在
                this.ensureApiKey();
                return true;
            }
            this.showAuthDialog();
            return false;
        },
        
        isAuthenticated() {
            return localStorage.getItem(CD30_CONFIG.AUTH_KEY) === 'true';
        },
        
        ensureApiKey() {
            // 如果已有Misskey token则跳过
            const existingToken = localStorage.getItem('aliya_msk_token');
            if (existingToken) {
                // 同步更新index.js中的mskToken变量
                if (typeof mskToken !== 'undefined') {
                    mskToken = existingToken;
                }
                return;
            }
            // 从服务器获取Misskey token
            fetch('/api/cd30/config')
                .then(res => res.json())
                .then(config => {
                    if (config.misskey_token) {
                        localStorage.setItem('aliya_msk_token', config.misskey_token);
                        // 同步更新index.js中的mskToken变量
                        if (typeof mskToken !== 'undefined') {
                            mskToken = config.misskey_token;
                        }
                    }
                })
                .catch(err => console.log('获取Misskey token失败:', err));
        },
        
        showAuthDialog() {
            const overlay = document.createElement('div');
            overlay.className = 'cd30-auth-overlay';
            overlay.innerHTML = `
                <div class="cd30-auth-panel">
                    <h2>CD30展区特别版</h2>
                    <p>请输入展区访问密码</p>
                    <input type="password" id="cd30-password" placeholder="请输入密码" autocomplete="off">
                    <div class="cd30-auth-error" id="cd30-auth-error"></div>
                    <button class="cd30-btn cd30-btn-primary" id="cd30-verify-btn">验证</button>
                </div>
            `;
            document.body.appendChild(overlay);
            
            // 绑定验证按钮事件
            document.getElementById('cd30-verify-btn').addEventListener('click', function() {
                window.CD30Special.verifyPassword();
            });
            
            // 回车提交
            document.getElementById('cd30-password').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    window.CD30Special.verifyPassword();
                }
            });
        },
        
        verifyPassword() {
            const input = document.getElementById('cd30-password');
            const error = document.getElementById('cd30-auth-error');
            const password = input.value.trim();
            
            // 从环境变量读取密码（通过API）
            fetch('/api/cd30/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    localStorage.setItem(CD30_CONFIG.AUTH_KEY, 'true');
                    // 设置Misskey token，供原有逻辑使用
                    const token = data.misskey_token || '';
                    localStorage.setItem('aliya_msk_token', token);
                    // 同步更新index.js中的mskToken变量
                    if (typeof mskToken !== 'undefined') {
                        mskToken = token;
                    }
                    document.querySelector('.cd30-auth-overlay').remove();
                    // 确保连接界面可见
                    const mainContent = document.getElementById('mainContent');
                    if (mainContent) {
                        mainContent.style.display = 'flex';
                        mainContent.style.opacity = '1';
                    }
                    // 初始化其他功能
                    window.CD30Special.initFeatures();
                    // 触发原有应用启动
                    if (typeof bootstrap === 'function') {
                        bootstrap();
                    }
                } else {
                    error.textContent = '密码错误，请重试';
                    input.value = '';
                    input.focus();
                }
            })
            .catch(() => {
                error.textContent = '验证失败，请重试';
            });
        }
    };

    // ==================== 使用说明提示 ====================
    function showWelcomeGuide() {
        if (localStorage.getItem('cd30_guide_shown')) return;
        
        const modal = document.createElement('div');
        modal.className = 'cd30-modal-overlay';
        modal.innerHTML = `
            <div class="cd30-modal cd30-guide">
                <h3>欢迎使用CD30展区特别版</h3>
                <div class="cd30-guide-content">
                    <p><strong>本版本为漫展展示专用，具有以下特点：</strong></p>
                    <ul>
                        <li>每次会话最多${CD30_CONFIG.MAX_TURNS}轮对话</li>
                        <li>${Math.round(CD30_CONFIG.PRIVACY_TIMEOUT / 60000)}分钟无操作自动清除记录</li>
                        <li>保护每位观众的隐私安全</li>
                    </ul>
                    <p><strong>隐私保护说明：</strong></p>
                    <p>系统会在您停止操作${Math.round(CD30_CONFIG.PRIVACY_TIMEOUT / 60000)}分钟后自动清除对话内容，确保下一位观众不会看到您的对话记录。</p>
                </div>
                <button class="cd30-btn cd30-btn-primary" id="cd30-guide-ok-btn">我知道了</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        // 绑定按钮事件
        document.getElementById('cd30-guide-ok-btn').addEventListener('click', function() {
            modal.remove();
            localStorage.setItem('cd30_guide_shown', 'true');
        });
    }

    // ==================== 重新开始按钮 ====================
    function createRestartButton() {
        // 确保状态容器存在
        let container = document.querySelector('.cd30-status-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'cd30-status-container';
            document.body.appendChild(container);
        }
        // 避免重复创建
        if (document.getElementById('cd30-restart-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'cd30-restart-btn';
        btn.className = 'cd30-btn cd30-btn-restart';
        btn.innerHTML = '重新开始对话';
        btn.addEventListener('click', function() {
            window.CD30Special.startNewSession();
        });
        // 添加到状态显示区域（右上角，剩余轮数和倒计时下方），不遮挡输入框
        container.appendChild(btn);
    }

    // ==================== 主入口 ====================
    window.CD30Special = {
        init() {
            // 先检查认证
            if (!SimpleAuth.init()) {
                return;
            }
            // 已认证用户，确保连接界面可见
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.style.display = 'flex';
                mainContent.style.opacity = '1';
            }
            this.initFeatures();
        },
        
        initFeatures() {
            initDefaultConfig(); // 初始化默认配置（分段输出、默认模型）
            createBanner();
            TurnLimiter.init();
            PrivacyGuard.init();
            createRestartButton();
            showWelcomeGuide();
        },
        
        verifyPassword() {
            SimpleAuth.verifyPassword();
        },
        
        startNewSession() {
            // 重置轮数
            TurnLimiter.reset();
            // 重置隐私计时器
            PrivacyGuard.resetTimer();
            PrivacyGuard.startCountdown();
            // 清除本地会话标记
            localStorage.removeItem(CD30_CONFIG.SESSION_KEY);
            // 移除所有模态框
            document.querySelectorAll('.cd30-modal-overlay').forEach(m => m.remove());
            // 移除轮数上限提示状态
            document.body.classList.remove('cd30-limit-reached');
            const limitBanner = document.getElementById('cd30-limit-banner');
            if (limitBanner) limitBanner.remove();
            // 恢复输入控件
            const playerInput = document.getElementById('playerInput');
            if (playerInput) playerInput.disabled = false;
            const sendBtn = document.getElementById('sendBtn');
            if (sendBtn) sendBtn.disabled = false;
            // 移除状态显示
            const statusContainer = document.querySelector('.cd30-status-container');
            if (statusContainer) statusContainer.remove();
            // 移除重新开始按钮
            const restartBtn = document.getElementById('cd30-restart-btn');
            if (restartBtn) restartBtn.remove();
            
            // 删除当前会话（服务器端），确保重新连接时创建全新会话
            const token = localStorage.getItem('aliya_msk_token') || '';
            if (token) {
                fetch('/api/conversation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete_session', token: token })
                })
                .catch(err => console.log('删除会话失败:', err))
                .finally(() => {
                    // 无论删除成功与否，都刷新页面回到连接页
                    location.reload();
                });
            } else {
                location.reload();
            }
        },
        
        // 供外部调用：每次发送消息时调用
        onMessageSent() {
            return TurnLimiter.increment();
        },
        
        // 供外部调用：检查是否可以发送消息
        canSendMessage() {
            return TurnLimiter.currentTurns < CD30_CONFIG.MAX_TURNS;
        }
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.CD30Special.init();
        });
    } else {
        window.CD30Special.init();
    }
})();
