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

        html = html
            .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
            .replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
            .replace(/~~([^~\n]+)~~/g, "<s>$1</s>")
            .replace(/(^|[^\*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
            .replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");

        html = renderMfmFunctions(html);

        html = html
            .replace(/(^|[\s(])@([A-Za-z0-9_.-]+(?:@[A-Za-z0-9_.-]+)?)/g, '$1<span class="mfm-mention">@$2</span>')
            .replace(/(^|[\s(])#([^\s#.,!?，。！？、]+)/g, '$1<span class="mfm-hashtag">#$2</span>')
            .replace(/:([A-Za-z0-9_+-]{2,}):/g, '<span class="mfm-emoji">:$1:</span>');

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

    function renderInto(container, source) {
        container.innerHTML = renderMarkdown(source);
    }

    window.AliyaMessageRenderer = {
        renderInto: renderInto,
        renderMarkdown: renderMarkdown,
        renderInline: renderInline
    };
})();
