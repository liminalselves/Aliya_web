/**
 * CD30瞳电游工作室展区特别版 - 核心功能模块
 * 包含：顶部横幅、对话轮数限制、隐私保护倒计时、简化认证
 */

(function() {
    'use strict';

    // ==================== 配置常量 ====================
    const CD30_CONFIG = {
        MAX_TURNS: 30,
        PRIVACY_TIMEOUT: 10 * 60 * 1000, // 10分钟
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
        
        // 从服务器获取默认模型配置并应用
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
                    <a href="https://docs.linminaslelves.top" target="_blank" rel="noopener noreferrer">正式版请访问文档</a> | 
                    玩家二创，与官方无关！
                </span>
                <button class="cd30-banner-close" aria-label="关闭横幅">&times;</button>
            </div>
        `;
        document.body.insertBefore(banner, document.body.firstChild);
        
        // 关闭按钮事件
        banner.querySelector('.cd30-banner-close').addEventListener('click', function() {
            banner.classList.add('cd30-banner-hidden');
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
            let display = document.getElementById('cd30-turns-display');
            if (!display) {
                display = document.createElement('div');
                display.id = 'cd30-turns-display';
                display.className = 'cd30-status-item';
                document.body.appendChild(display);
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
            const modal = document.createElement('div');
            modal.className = 'cd30-modal-overlay';
            modal.innerHTML = `
                <div class="cd30-modal">
                    <h3>对话轮数已达上限</h3>
                    <p>本次会话已达到最大对话轮数（${CD30_CONFIG.MAX_TURNS}轮）。</p>
                    <p>点击"开始新会话"按钮继续体验。</p>
                    <button class="cd30-btn cd30-btn-primary" onclick="CD30Special.startNewSession()">开始新会话</button>
                </div>
            `;
            document.body.appendChild(modal);
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
            let display = document.getElementById('cd30-privacy-display');
            if (!display) {
                display = document.createElement('div');
                display.id = 'cd30-privacy-display';
                display.className = 'cd30-status-item cd30-privacy';
                document.body.appendChild(display);
            }
            
            const minutes = Math.floor(this.remaining / 60000);
            const seconds = Math.floor((this.remaining % 60000) / 1000);
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            display.innerHTML = `<span class="cd30-status-label">隐私保护倒计时</span><span class="cd30-status-value">${timeStr}</span>`;
            
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
                    <button class="cd30-btn cd30-btn-primary" onclick="CD30Special.startNewSession()">开始新会话</button>
                </div>
            `;
            document.body.appendChild(modal);
        }
    };

    // ==================== 简化认证 ====================
    const SimpleAuth = {
        init() {
            if (this.isAuthenticated()) {
                return true;
            }
            this.showAuthDialog();
            return false;
        },
        
        isAuthenticated() {
            return localStorage.getItem(CD30_CONFIG.AUTH_KEY) === 'true';
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
                    <button class="cd30-btn cd30-btn-primary" onclick="CD30Special.verifyPassword()">验证</button>
                </div>
            `;
            document.body.appendChild(overlay);
            
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
                    document.querySelector('.cd30-auth-overlay').remove();
                    // 初始化其他功能
                    window.CD30Special.initFeatures();
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
                        <li>每次会话最多30轮对话</li>
                        <li>10分钟无操作自动清除记录</li>
                        <li>保护每位观众的隐私安全</li>
                    </ul>
                    <p><strong>隐私保护说明：</strong></p>
                    <p>系统会在您停止操作10分钟后自动清除对话内容，确保下一位观众不会看到您的对话记录。</p>
                </div>
                <button class="cd30-btn cd30-btn-primary" onclick="this.closest('.cd30-modal-overlay').remove(); localStorage.setItem('cd30_guide_shown', 'true');">我知道了</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ==================== 重新开始按钮 ====================
    function createRestartButton() {
        const btn = document.createElement('button');
        btn.id = 'cd30-restart-btn';
        btn.className = 'cd30-btn cd30-btn-restart';
        btn.innerHTML = '重新开始对话';
        btn.onclick = () => window.CD30Special.startNewSession();
        document.body.appendChild(btn);
    }

    // ==================== 主入口 ====================
    window.CD30Special = {
        init() {
            // 先检查认证
            if (!SimpleAuth.init()) {
                return;
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
            // 刷新页面或触发新会话
            if (typeof startNewChatSession === 'function') {
                startNewChatSession();
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
        document.addEventListener('DOMContentLoaded', () => window.CD30Special.init());
    } else {
        window.CD30Special.init();
    }
})();
