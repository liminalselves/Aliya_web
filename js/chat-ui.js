// 聊天区交互组件（PC/移动端共用）：消息操作菜单、确认/编辑对话框、轻提示、报错卡片。
// 只负责 UI，业务动作由页面脚本通过回调注入。
(function () {
    "use strict";

    var LONG_PRESS_MS = 480;

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    // ==================== 轻提示 ====================
    var toastHost = null;
    function toast(message, type) {
        if (!toastHost) {
            toastHost = el("div", "chat-toast-host");
            toastHost.setAttribute("role", "status");
            toastHost.setAttribute("aria-live", "polite");
            document.body.appendChild(toastHost);
        }
        var item = el("div", "chat-toast" + (type ? " is-" + type : ""), message);
        toastHost.appendChild(item);
        setTimeout(function () {
            item.classList.add("is-leaving");
            setTimeout(function () { item.remove(); }, 240);
        }, 2200);
    }

    // ==================== 剪贴板 ====================
    // 局域网 http 访问时 navigator.clipboard 不可用，退回 execCommand。
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
        }
        return Promise.resolve(legacyCopy(text));
    }
    function legacyCopy(text) {
        var area = el("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        area.remove();
        return ok;
    }

    // ==================== 对话框 ====================
    // options: { title, message, input (初始文本，有则显示多行输入框), confirmText, danger }
    // 返回 Promise：取消 → null；确认 → 输入框文本或 true。
    function dialog(options) {
        options = options || {};
        return new Promise(function (resolve) {
            var overlay = el("div", "chat-dialog-overlay");
            var panel = el("div", "chat-dialog");
            panel.setAttribute("role", "dialog");
            panel.setAttribute("aria-modal", "true");
            if (options.title) panel.appendChild(el("h3", "chat-dialog-title", options.title));
            if (options.message) panel.appendChild(el("p", "chat-dialog-message", options.message));
            var input = null;
            if (typeof options.input === "string") {
                input = el("textarea", "chat-dialog-input");
                input.value = options.input;
                input.rows = 6;
                panel.appendChild(input);
            }
            var actions = el("div", "chat-dialog-actions");
            var cancelBtn = el("button", "chat-dialog-btn", "取消");
            cancelBtn.type = "button";
            var okBtn = el("button", "chat-dialog-btn is-primary" + (options.danger ? " is-danger" : ""), options.confirmText || "确定");
            okBtn.type = "button";
            actions.appendChild(cancelBtn);
            actions.appendChild(okBtn);
            panel.appendChild(actions);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            var done = false;
            function close(result) {
                if (done) return;
                done = true;
                document.removeEventListener("keydown", onKey, true);
                overlay.classList.add("is-closing");
                setTimeout(function () { overlay.remove(); }, 200);
                resolve(result);
            }
            function onKey(e) {
                if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(null); }
                else if (e.key === "Enter" && (!input || e.ctrlKey || e.metaKey)) { e.preventDefault(); confirm(); }
            }
            function confirm() { close(input ? input.value : true); }
            cancelBtn.addEventListener("click", function () { close(null); });
            okBtn.addEventListener("click", confirm);
            overlay.addEventListener("click", function (e) { if (e.target === overlay) close(null); });
            document.addEventListener("keydown", onKey, true);
            requestAnimationFrame(function () {
                if (input) {
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                } else {
                    okBtn.focus();
                }
            });
        });
    }

    // ==================== 消息操作菜单 ====================
    var openMenu = null;
    function closeMenu() {
        if (!openMenu) return;
        var menu = openMenu;
        openMenu = null;
        menu.classList.add("is-closing");
        setTimeout(function () { menu.remove(); }, 160);
    }

    // items: [{ label, icon, danger, action }]；anchor 为 {x, y} 视口坐标。
    function showMenu(items, anchor) {
        closeMenu();
        var menu = el("div", "chat-menu");
        menu.setAttribute("role", "menu");
        items.forEach(function (item) {
            if (item === "divider") {
                menu.appendChild(el("div", "chat-menu-divider"));
                return;
            }
            var btn = el("button", "chat-menu-item" + (item.danger ? " is-danger" : ""));
            btn.type = "button";
            btn.setAttribute("role", "menuitem");
            if (item.icon) btn.appendChild(el("span", "chat-menu-icon", item.icon));
            btn.appendChild(el("span", "chat-menu-label", item.label));
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                closeMenu();
                item.action();
            });
            menu.appendChild(btn);
        });
        document.body.appendChild(menu);
        // 先测量再定位，保证菜单整体留在可视区内。
        var rect = menu.getBoundingClientRect();
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var x = Math.min(Math.max(8, anchor.x), vw - rect.width - 8);
        var y = anchor.y;
        if (y + rect.height > vh - 8) y = Math.max(8, anchor.y - rect.height);
        menu.style.left = x + "px";
        menu.style.top = y + "px";
        menu.style.transformOrigin = (anchor.x > vw / 2 ? "right " : "left ") + (y < anchor.y ? "bottom" : "top");
        openMenu = menu;
        var first = menu.querySelector(".chat-menu-item");
        if (first) first.focus({ preventScroll: true });
    }

    document.addEventListener("pointerdown", function (e) {
        if (openMenu && !openMenu.contains(e.target)) closeMenu();
    }, true);
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && openMenu) { e.preventDefault(); closeMenu(); }
    }, true);
    window.addEventListener("resize", closeMenu);

    // 绑定聊天区：右键 / 长按 / 悬停按钮打开菜单。
    // getItems(messageEl) 返回菜单项数组，空数组表示该节点没有可用操作。
    function bindMessageMenu(container, getItems) {
        function findMessage(target) {
            var li = target && target.closest ? target.closest("li[data-msg-ref]") : null;
            return li && container.contains(li) ? li : null;
        }
        function open(li, x, y) {
            var items = getItems(li);
            if (!items || !items.length) return;
            li.classList.add("is-menu-target");
            setTimeout(function () { li.classList.remove("is-menu-target"); }, 400);
            showMenu(items, { x: x, y: y });
        }

        container.addEventListener("contextmenu", function (e) {
            var li = findMessage(e.target);
            if (!li || (e.target.closest && e.target.closest("a"))) return;
            e.preventDefault();
            // Android 长按也会触发 contextmenu：与自身长按计时合并，只弹一次。
            if (touchActive) {
                if (!pressFired) {
                    cancelPress();
                    pressFired = true;
                    open(li, e.clientX, e.clientY + 8);
                }
                return;
            }
            open(li, e.clientX, e.clientY);
        });

        container.addEventListener("click", function (e) {
            var btn = e.target.closest && e.target.closest(".msg-more-btn");
            if (!btn) return;
            var li = findMessage(btn);
            if (!li) return;
            e.stopPropagation();
            var rect = btn.getBoundingClientRect();
            open(li, rect.left, rect.bottom + 4);
        });

        // 触屏长按：iOS 不触发 contextmenu，自行计时；移动超过阈值视为滚动。
        var pressTimer = null;
        var pressStart = null;
        var pressFired = false;
        var touchActive = false;
        function cancelPress() {
            if (pressTimer) clearTimeout(pressTimer);
            pressTimer = null;
        }
        container.addEventListener("touchstart", function (e) {
            var li = findMessage(e.target);
            if (!li || e.touches.length !== 1) return;
            var t = e.touches[0];
            pressStart = { x: t.clientX, y: t.clientY };
            pressFired = false;
            touchActive = true;
            cancelPress();
            pressTimer = setTimeout(function () {
                pressTimer = null;
                pressFired = true;
                if (navigator.vibrate) navigator.vibrate(12);
                open(li, pressStart.x, pressStart.y + 8);
            }, LONG_PRESS_MS);
        }, { passive: true });
        container.addEventListener("touchmove", function (e) {
            if (!pressTimer || !pressStart) return;
            var t = e.touches[0];
            if (Math.abs(t.clientX - pressStart.x) > 10 || Math.abs(t.clientY - pressStart.y) > 10) cancelPress();
        }, { passive: true });
        container.addEventListener("touchend", function (e) {
            cancelPress();
            touchActive = false;
            // 长按已弹出菜单时吞掉随后的点击，避免误触图片放大等。
            if (pressFired) {
                e.preventDefault();
                pressFired = false;
            }
        });
        container.addEventListener("touchcancel", function () {
            cancelPress();
            touchActive = false;
        });
        container.addEventListener("scroll", closeMenu, { passive: true });
    }

    function attachMoreButton(li) {
        if (li.querySelector(".msg-more-btn")) return;
        var btn = el("button", "msg-more-btn", "⋯");
        btn.type = "button";
        btn.title = "消息操作";
        btn.setAttribute("aria-label", "消息操作");
        li.appendChild(btn);
    }

    // ==================== 报错卡片 ====================
    // failure: { title, reason, status, detail, attempts[], retryable }
    // options: { type: "error"|"info", onRetry, onDismiss }
    function buildNoticeCard(failure, options) {
        options = options || {};
        failure = failure || {};
        var card = el("li", "chat-notice is-" + (options.type || "error") + " msg-enter");
        card.setAttribute("role", options.type === "info" ? "status" : "alert");
        var head = el("div", "chat-notice-head");
        head.appendChild(el("span", "chat-notice-icon", options.type === "info" ? "i" : "!"));
        head.appendChild(el("span", "chat-notice-title", failure.title || "请求失败"));
        var dismiss = el("button", "chat-notice-close", "×");
        dismiss.type = "button";
        dismiss.setAttribute("aria-label", "关闭提示");
        dismiss.addEventListener("click", function () {
            card.classList.add("is-leaving");
            setTimeout(function () { card.remove(); }, 220);
            if (options.onDismiss) options.onDismiss();
        });
        head.appendChild(dismiss);
        card.appendChild(head);

        var lines = [];
        if (failure.message) lines.push(failure.message);
        var tags = [];
        if (failure.code) tags.push(failure.code);
        if (failure.reason) tags.push(failure.reason);
        if (failure.status) tags.push("HTTP " + failure.status);
        lines.forEach(function (line) { card.appendChild(el("p", "chat-notice-text", line)); });
        if (tags.length) card.appendChild(el("p", "chat-notice-tags", tags.join(" · ")));

        var detailParts = [];
        if (failure.detail) detailParts.push(failure.detail);
        (failure.attempts || []).forEach(function (a) {
            var bits = ["#" + (a.index || "?"), a.code, a.reason, a.status ? "HTTP " + a.status : null].filter(Boolean);
            detailParts.push(bits.join(" · ") + (a.detail ? "\n" + a.detail : ""));
        });
        if (detailParts.length) {
            var details = el("details", "chat-notice-details");
            details.appendChild(el("summary", null, "详细信息"));
            details.appendChild(el("pre", null, detailParts.join("\n\n")));
            card.appendChild(details);
        }

        if (options.onRetry && failure.retryable !== false) {
            var actions = el("div", "chat-notice-actions");
            var retry = el("button", "chat-notice-btn", "重试发送");
            retry.type = "button";
            retry.addEventListener("click", function () {
                card.classList.add("is-leaving");
                setTimeout(function () { card.remove(); }, 220);
                options.onRetry();
            });
            actions.appendChild(retry);
            card.appendChild(actions);
        }
        return card;
    }

    window.AliyaChatUI = {
        toast: toast,
        copyText: copyText,
        dialog: dialog,
        showMenu: showMenu,
        closeMenu: closeMenu,
        bindMessageMenu: bindMessageMenu,
        attachMoreButton: attachMoreButton,
        buildNoticeCard: buildNoticeCard
    };
})();
