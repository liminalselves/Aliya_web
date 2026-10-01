(function () {
    "use strict";

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, "&#96;");
    }

    function decodeBasicEntities(value) {
        return String(value == null ? "" : value)
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, "&");
    }

    function safeUrl(value) {
        var raw = decodeBasicEntities(value).trim();
        if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
        return "";
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

    function isBlockStart(lines, index) {
        var line = lines[index] || "";
        if (!line.trim()) return true;
        if (/^\s*(`{3,}|~{3,})/.test(line)) return true;
        if (line.indexOf("|") !== -1 && index + 1 < lines.length && isTableDelimiter(lines[index + 1])) return true;
        if (isListItem(line)) return true;
        if (/^\s*>/.test(line)) return true;
        if (/^\s{0,3}#{1,6}\s+/.test(line)) return true;
        if (isMarkdownSeparator(line)) return true;
        return false;
    }

    function splitTableRow(line) {
        var cells = String(line || "").trim().split("|");
        if (cells.length > 0 && cells[0].trim() === "") cells.shift();
        if (cells.length > 0 && cells[cells.length - 1].trim() === "") cells.pop();
        return cells;
    }

    function stashToken(tokens, html) {
        var key = "\u0000" + tokens.length + "\u0000";
        tokens.push(html);
        return key;
    }

    function renderMfmFunction(name, opts, body) {
        var fn = String(name || "").toLowerCase();
        var safeBody = body || "";
        var classMap = {
            x2: "mfm-x2",
            x3: "mfm-x3",
            x4: "mfm-x4",
            blur: "mfm-blur",
            center: "mfm-center",
            flip: "mfm-flip",
            jelly: "mfm-jelly",
            tada: "mfm-tada",
            jump: "mfm-jump",
            bounce: "mfm-bounce",
            spin: "mfm-spin",
            shake: "mfm-shake",
            rainbow: "mfm-rainbow",
            sparkle: "mfm-sparkle"
        };
        if (fn === "fg" || fn === "bg") {
            var color = String(opts || "").replace(/^color=/, "").trim();
            if (/^#?[0-9a-fA-F]{3,8}$/.test(color)) {
                if (color.charAt(0) !== "#") color = "#" + color;
            } else if (!/^[a-zA-Z]+$/.test(color)) {
                return safeBody;
            }
            var prop = fn === "fg" ? "color" : "background-color";
            return '<span class="mfm ' + (fn === "fg" ? "mfm-fg" : "mfm-bg") + '" style="' + prop + ":" + escapeAttr(color) + '">' + safeBody + "</span>";
        }
        if (!classMap[fn]) return safeBody;
        return '<span class="mfm ' + classMap[fn] + '">' + safeBody + "</span>";
    }

    function renderMfmFunctions(html) {
        var previous = "";
        var output = html;
        var guard = 0;
        while (previous !== output && guard < 8) {
            previous = output;
            output = output.replace(/\$\[([A-Za-z0-9_]+)(?:\.([^\s\]]+))?\s+([^\[\]]*?)\]/g, function (_, name, opts, body) {
                return renderMfmFunction(name, opts, body);
            });
            guard++;
        }
        return output;
    }

    // ==================== 自定义表情目录 ====================
    var customEmojiMap = null;
    var EMOJI_CACHE_KEY = "aliya_emoji_map_v1";
    var EMOJI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

    function mskOrigin() {
        return String(window.ALIYA_MSK_ORIGIN || "https://misskey.liminalselves.top").replace(/\/+$/, "");
    }

    function sanitizeEmojiUrl(url) {
        var raw = String(url == null ? "" : url).trim();
        if (/^https?:\/\//i.test(raw)) return raw;
        if (raw.charAt(0) === "/") return mskOrigin() + raw;
        return "";
    }

    function sanitizeEmojiMap(map) {
        var clean = {};
        if (!map || typeof map !== "object") return clean;
        for (var name in map) {
            if (Object.prototype.hasOwnProperty.call(map, name) && map[name]) {
                var url = sanitizeEmojiUrl(map[name]);
                if (url) clean[name] = url;
            }
        }
        return clean;
    }

    function renderEmojiCode(name, fallbackText) {
        var url = customEmojiMap ? customEmojiMap[name] : null;
        if (!url) return '<span class="mfm-emoji">' + fallbackText + '</span>';
        var escapedName = escapeHtml(name);
        return '<img class="mfm-emoji-img" src="' + escapeAttr(url) +
            '" alt=":' + escapedName + ':" title=":' + escapedName +
            ':" loading="lazy" decoding="async">';
    }

    // 将已渲染消息中尚未解析的 :name: 文本短码原位升级为表情图片
    //（覆盖表情目录晚于首批消息到达的时序）。
    function upgradeEmojiSpans(root) {
        var spans = (root || document).querySelectorAll("span.mfm-emoji");
        for (var i = 0; i < spans.length; i++) {
            var span = spans[i];
            var text = span.textContent || "";
            var name = text.charAt(0) === ":" ? text.slice(1, -1) : text;
            var url = customEmojiMap && customEmojiMap[name];
            if (!url) continue;
            var img = document.createElement("img");
            img.className = "mfm-emoji-img";
            img.src = url;
            img.alt = ":" + name + ":";
            img.title = ":" + name + ":";
            img.loading = "lazy";
            img.decoding = "async";
            span.parentNode.replaceChild(img, span);
        }
    }

    function setCustomEmojiMap(map) {
        customEmojiMap = sanitizeEmojiMap(map);
        upgradeEmojiSpans(document);
    }

    function loadCachedEmojiMap() {
        try {
            var raw = localStorage.getItem(EMOJI_CACHE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return null;
            if (parsed.origin !== mskOrigin()) return null;
            if (!parsed.map || typeof parsed.map !== "object") return null;
            if (Date.now() - (Number(parsed.fetchedAt) || 0) > EMOJI_CACHE_TTL_MS) return null;
            return parsed.map;
        } catch (e) {
            return null;
        }
    }

    function fetchAndCacheEmojiMap() {
        fetch("/api/emojis").then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        }).then(function (data) {
            var map = sanitizeEmojiMap(data && data.emojiMap);
            if (Object.keys(map).length === 0) return;
            setCustomEmojiMap(map);
            try {
                localStorage.setItem(EMOJI_CACHE_KEY, JSON.stringify({
                    origin: mskOrigin(),
                    fetchedAt: Date.now(),
                    map: map
                }));
            } catch (e) { /* localStorage 配额异常时忽略，仅丢失缓存 */ }
        }).catch(function () { /* 表情目录不可用时降级为文本短码 */ });
    }

    function initCustomEmojis() {
        var cached = loadCachedEmojiMap();
        if (cached) setCustomEmojiMap(cached);
        fetchAndCacheEmojiMap();
    }

    // ==================== 智能体表情包 ====================
    // 三态：pending（上下文未加载或加载失败，保持旧行为：短码照常行内渲染、角色标签按字面）、
    // on（实例开启表情包）、off（实例明确关闭，两类语法均按普通文本，与官方端口径一致）。
    var stickerState = "pending";
    var stickerMap = {};
    var currentRenderRole = null;

    // 本项目 UI 层助手角色值为 "aliya"（用户为 "player"），与 MSK 原始 "assistant" 并存
    function isAssistantRenderRole() {
        return currentRenderRole === "assistant" || currentRenderRole === "aliya";
    }

    var STICKER_TAG_RE = /\[\[agent_sticker\s+key=([a-zA-Z0-9_-]{1,32})\s*\]\]/g;
    var STICKER_TAG_EXACT_RE = /^\[\[agent_sticker\s+key=([a-zA-Z0-9_-]{1,32})\s*\]\]$/;

    function sanitizeStickerMap(map) {
        var clean = {};
        if (!map || typeof map !== "object") return clean;
        for (var key in map) {
            if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
            var info = map[key];
            if (!info || typeof info !== "object") continue;
            var url = sanitizeEmojiUrl(info.url);
            if (!url) continue;
            clean[key] = {
                url: url,
                thumbnailUrl: sanitizeEmojiUrl(info.thumbnailUrl) || "",
                type: String(info.type || "")
            };
        }
        return clean;
    }

    // 动图（gif/apng）用原图保留动画，其余优先缩略图（对齐官方端 stickerUrl 规则）
    function stickerImageUrl(info) {
        if (!info) return "";
        if (info.type === "image/gif" || info.type === "image/apng") return info.url;
        return info.thumbnailUrl || info.url;
    }

    function renderStickerTag(key, extraClass) {
        var url = stickerImageUrl(stickerMap[key]);
        if (!url) {
            return '<span class="mfm-sticker-missing" title="' + escapeAttr(key) + '">表情包已失效</span>';
        }
        return '<img class="mfm-sticker-img' + (extraClass ? " " + extraClass : "") +
            '" src="' + escapeAttr(url) + '" alt="表情包 ' + escapeAttr(key) +
            '" title="' + escapeAttr(key) + '" loading="lazy" decoding="async">';
    }

    // 整段内容恰好是一个表情 token 时按贴纸块渲染（对齐官方端"表情独占气泡"形态）。
    // 仅 assistant 消息且实例开启时生效；返回 null 表示按普通 Markdown 渲染。
    function tryRenderStickerBlock(source) {
        if (stickerState !== "on" || !isAssistantRenderRole()) return null;
        var text = String(source == null ? "" : source).trim();
        var tagMatch = text.match(STICKER_TAG_EXACT_RE);
        if (tagMatch) return renderStickerTag(tagMatch[1], "mfm-sticker-block");
        var emojiMatch = text.match(/^:([A-Za-z0-9_+.\-]{1,100}):$/);
        if (emojiMatch) {
            var url = customEmojiMap ? customEmojiMap[emojiMatch[1]] : null;
            if (url) {
                return '<img class="mfm-sticker-img mfm-sticker-block" src="' + escapeAttr(url) +
                    '" alt=":' + escapeAttr(emojiMatch[1]) + ':" title=":' + escapeAttr(emojiMatch[1]) +
                    ':" loading="lazy" decoding="async">';
            }
        }
        return null;
    }

    function setStickerContext(ctx) {
        if (!ctx || typeof ctx !== "object") {
            stickerState = "pending";
            stickerMap = {};
            return;
        }
        stickerState = ctx.enabled === true ? "on" : "off";
        stickerMap = sanitizeStickerMap(ctx.stickers);
    }

    function renderInline(source) {
        var tokens = [];
        var html = escapeHtml(source);

        html = html.replace(/`([^`\n]+)`/g, function (_, code) {
            return stashToken(tokens, "<code>" + code + "</code>");
        });

        html = html.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
            var url = safeUrl(href);
            if (!url) return label;
            return stashToken(tokens, '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener noreferrer">' + renderInline(decodeBasicEntities(label)) + "</a>");
        });

        html = html.replace(/(^|[\s(])((?:https?:\/\/)[^\s<]+)/g, function (_, prefix, url) {
            var cleaned = url.replace(/[),，。！？!?]+$/, "");
            var tail = url.slice(cleaned.length);
            var decodedUrl = decodeBasicEntities(cleaned);
            return prefix + stashToken(tokens, '<a href="' + escapeAttr(decodedUrl) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(decodedUrl) + "</a>") + escapeHtml(decodeBasicEntities(tail));
        });

        // 角色表情包标签：与表情短码同样先于 strong/em 占位，避免 key 中的下划线触发斜体。
        // 仅 assistant 消息且实例开启时转图；用户消息与其余情况保持字面文本（官方端口径）。
        if (stickerState === "on" && isAssistantRenderRole()) {
            html = html.replace(STICKER_TAG_RE, function (m, key) {
                return stashToken(tokens, renderStickerTag(key));
            });
        }

        // 自定义表情短码：在 strong/em 等强调替换之前解析并占位，
        // 避免表情名中的下划线被误判成斜体（与 QQ 桥先取表情的顺序一致）。
        html = html.replace(/:([A-Za-z0-9_+.\-]{1,100}):/g, function (m, name, offset, whole) {
            // 实例明确关闭表情包时按普通文本（对齐官方端）；pending 态保持旧行为
            if (stickerState === "off") return m;
            // 手动复刻 EMOJI_CODE_RE 的两侧负向断言（不使用 lookbehind，兼容旧 Safari），
            // 排除 10:30:45 这类时刻被误认成表情短码。
            var before = offset > 0 ? whole.charAt(offset - 1) : "";
            var after = whole.charAt(offset + m.length);
            if (/[\w:]/.test(before) || /[\w:]/.test(after)) return m;
            return stashToken(tokens, renderEmojiCode(name, m));
        });

        html = html
            .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
            .replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
            .replace(/~~([^~\n]+)~~/g, "<s>$1</s>")
            .replace(/(^|[^\*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
            .replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");

        html = renderMfmFunctions(html);

        html = html
            .replace(/(^|[\s(])@([A-Za-z0-9_.-]+(?:@[A-Za-z0-9_.-]+)?)/g, '$1<span class="mfm-mention">@$2</span>')
            .replace(/(^|[\s(])#([^\s#.,!?，。！？、]+)/g, '$1<span class="mfm-hashtag">#$2</span>');

        return html.replace(/\u0000(\d+)\u0000/g, function (_, index) {
            return tokens[Number(index)] || "";
        });
    }

    function renderCodeBlock(lines, info) {
        var lang = String(info || "").trim().split(/\s+/)[0];
        var className = /^[A-Za-z0-9_-]+$/.test(lang) ? ' class="language-' + escapeAttr(lang) + '"' : "";
        return "<pre><code" + className + ">" + escapeHtml(lines.join("\n")) + "</code></pre>";
    }

    function renderTable(lines) {
        var headers = splitTableRow(lines[0]);
        var html = ['<div class="message-table-wrap"><table><thead><tr>'];
        headers.forEach(function (cell) {
            html.push("<th>" + renderInline(cell.trim()) + "</th>");
        });
        html.push("</tr></thead><tbody>");
        for (var i = 2; i < lines.length; i++) {
            html.push("<tr>");
            splitTableRow(lines[i]).forEach(function (cell) {
                html.push("<td>" + renderInline(cell.trim()) + "</td>");
            });
            html.push("</tr>");
        }
        html.push("</tbody></table></div>");
        return html.join("");
    }

    function renderList(lines) {
        var ordered = /^\s*\d+[.)]\s+/.test(lines[0]);
        var tag = ordered ? "ol" : "ul";
        var items = [];
        var current = null;
        lines.forEach(function (line) {
            var match = line.match(/^\s*(?:[-+*]|\d+[.)])\s+(.*)$/);
            if (match) {
                if (current) items.push(current);
                current = [match[1]];
            } else if (current) {
                current.push(line.replace(/^\s{2,}/, ""));
            }
        });
        if (current) items.push(current);
        return "<" + tag + ">" + items.map(function (itemLines) {
            return "<li>" + itemLines.map(renderInline).join("<br>") + "</li>";
        }).join("") + "</" + tag + ">";
    }

    function renderMarkdown(source) {
        var text = String(source == null ? "" : source).replace(/\r\n?/g, "\n");
        var lines = text.split("\n");
        var html = [];
        var i = 0;

        while (i < lines.length) {
            var line = lines[i];
            if (!line.trim()) {
                i++;
                continue;
            }

            var fenceStart = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
            if (fenceStart) {
                var fence = fenceStart[1];
                var fenceChar = fence.charAt(0);
                var fenceEndRegex = new RegExp("^\\s*" + fenceChar + "{" + fence.length + ",}\\s*$");
                var codeLines = [];
                var info = fenceStart[2] || "";
                i++;
                while (i < lines.length && !fenceEndRegex.test(lines[i])) {
                    codeLines.push(lines[i]);
                    i++;
                }
                if (i < lines.length) i++;
                html.push(renderCodeBlock(codeLines, info));
                continue;
            }

            if (line.indexOf("|") !== -1 && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
                var tableLines = [line, lines[i + 1]];
                i += 2;
                while (i < lines.length && lines[i].trim() && lines[i].indexOf("|") !== -1) {
                    tableLines.push(lines[i]);
                    i++;
                }
                html.push(renderTable(tableLines));
                continue;
            }

            if (isMarkdownSeparator(line)) {
                html.push("<hr>");
                i++;
                continue;
            }

            var heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
            if (heading) {
                var level = Math.min(6, heading[1].length + 2);
                html.push("<h" + level + ">" + renderInline(heading[2].trim()) + "</h" + level + ">");
                i++;
                continue;
            }

            if (/^\s*>/.test(line)) {
                var quoteLines = [];
                while (i < lines.length && /^\s*>/.test(lines[i])) {
                    quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
                    i++;
                }
                html.push("<blockquote>" + renderMarkdown(quoteLines.join("\n")) + "</blockquote>");
                continue;
            }

            if (isListItem(line)) {
                var listLines = [line];
                i++;
                while (i < lines.length && (isListItem(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
                    listLines.push(lines[i]);
                    i++;
                }
                html.push(renderList(listLines));
                continue;
            }

            var paragraphLines = [line];
            i++;
            while (i < lines.length && !isBlockStart(lines, i)) {
                paragraphLines.push(lines[i]);
                i++;
            }
            html.push("<p>" + paragraphLines.map(renderInline).join("<br>") + "</p>");
        }

        return html.join("");
    }

    // ==================== 分段器（公共版，index.js / index-m.js 共用） ====================
    // isMarkdownSeparator / isTableDelimiter / isListItem 复用本文件 Markdown 渲染区的同名实现。
    function pushSegment(segments, lines) {
        var text = lines.join("\n").trim();
        if (text) segments.push(text);
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

    // 单行普通文本按有效表情包 token 切分，使每个表情独占一个气泡。
    // 无效 token（时刻 12:30:45、未知名、功能关闭时）不切分，原样保留。
    function splitLineByStickerTokens(line) {
        var trimmed = String(line || "").trim();
        if (trimmed === "") return [];
        if (stickerState !== "on") return [trimmed];
        var hits = [];
        var m;
        STICKER_TAG_RE.lastIndex = 0;
        while ((m = STICKER_TAG_RE.exec(trimmed)) !== null) {
            hits.push([m.index, m.index + m[0].length]);
        }
        var emojiRe = /:([A-Za-z0-9_+.\-]{1,100}):/g;
        while ((m = emojiRe.exec(trimmed)) !== null) {
            var before = m.index > 0 ? trimmed.charAt(m.index - 1) : "";
            var after = trimmed.charAt(m.index + m[0].length);
            if (/[\w:]/.test(before) || /[\w:]/.test(after)) continue;
            if (!(customEmojiMap && customEmojiMap[m[1]])) continue;
            hits.push([m.index, m.index + m[0].length]);
        }
        if (hits.length === 0) return [trimmed];
        hits.sort(function (a, b) { return a[0] - b[0]; });
        var out = [];
        var cursor = 0;
        for (var i = 0; i < hits.length; i++) {
            if (hits[i][0] < cursor) continue;
            var beforeText = trimmed.slice(cursor, hits[i][0]).trim();
            if (beforeText !== "") out.push(beforeText);
            out.push(trimmed.slice(hits[i][0], hits[i][1]));
            cursor = hits[i][1];
        }
        var rest = trimmed.slice(cursor).trim();
        if (rest !== "") out.push(rest);
        return out;
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

            // 单行普通文本：行内再按有效表情包 token 切分，让每个表情独占一个气泡
            var stickerPieces = splitLineByStickerTokens(line);
            for (var pieceIndex = 0; pieceIndex < stickerPieces.length; pieceIndex++) {
                pushSegment(segments, [stickerPieces[pieceIndex]]);
            }
            i++;
        }

        if (segments.length === 0 && original.trim()) return [original.trim()];
        return segments;
    }

    function agentSegmentDelayMs(segment) {
        var visibleChars = String(segment || "").replace(/<[^>]*>|\s+/g, "").length;
        return Math.max(1000, Math.min(3000, 1000 + visibleChars * 20));
    }

    function renderInto(container, source, opts) {
        currentRenderRole = opts && typeof opts.role === "string" ? opts.role : null;
        try {
            var stickerBlock = tryRenderStickerBlock(source);
            container.innerHTML = stickerBlock !== null ? stickerBlock : renderMarkdown(source);
        } finally {
            currentRenderRole = null;
        }
    }

    // 挂到 DOMContentLoaded 再拉取表情目录：config.js（提供 ALIYA_MSK_ORIGIN）在本文件之后执行。
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCustomEmojis);
    } else {
        initCustomEmojis();
    }

    window.AliyaMessageRenderer = {
        renderInto: renderInto,
        renderMarkdown: renderMarkdown,
        renderInline: renderInline,
        setCustomEmojiMap: setCustomEmojiMap,
        setStickerContext: setStickerContext,
        splitAssistantMessageIntoSegments: splitAssistantMessageIntoSegments,
        agentSegmentDelayMs: agentSegmentDelayMs
    };
})();
