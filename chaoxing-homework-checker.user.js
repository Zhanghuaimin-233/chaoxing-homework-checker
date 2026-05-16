// ==UserScript==
// @name         学习通作业统一查看
// @namespace    https://github.com/chaoxing-homework-checker
// @version      1.0.0
// @description  检测学习通当前账号所有课程的作业情况并统一显示
// @author       Assistant
// @match        *://*.chaoxing.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      mooc1-api.chaoxing.com
// @connect      mooc1.chaoxing.com
// @connect      mooc2-ans.chaoxing.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    "use strict";
    console.log("[ChaoxingHW] Script loaded");

    var CONFIG = { concurrency: 3, requestDelay: 500, cacheTime: 30 * 60 * 1000 };

    // ===== Styles =====
    var css = [
        "#cxhw-panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:920px;max-height:85vh;background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.3);z-index:999999;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:none;overflow:hidden}",
        "#cxhw-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:999998;display:none}",
        ".cxhw-hdr{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center}",
        ".cxhw-hdr h2{margin:0;font-size:18px;font-weight:600}",
        ".cxhw-x{background:rgba(255,255,255,.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px}",
        ".cxhw-x:hover{background:rgba(255,255,255,.3)}",
        ".cxhw-tb{padding:12px 24px;background:#f8f9fa;border-bottom:1px solid #e9ecef;display:flex;gap:10px;align-items:center}",
        ".cxhw-fb{padding:5px 14px;border:1px solid #dee2e6;border-radius:16px;background:#fff;cursor:pointer;font-size:13px}",
        ".cxhw-fb.on{background:#667eea;color:#fff;border-color:#667eea}",
        ".cxhw-fb:hover:not(.on){border-color:#667eea;color:#667eea}",
        ".cxhw-sts{margin-left:auto;font-size:13px;color:#6c757d}",
        ".cxhw-sts b{color:#667eea}",
        ".cxhw-cnt{overflow-y:auto;max-height:calc(85vh - 200px)}",
        ".cxhw-cs{border-bottom:1px solid #e9ecef}",
        ".cxhw-cs:last-child{border-bottom:none}",
        ".cxhw-ch{padding:14px 24px;background:#f8f9fa;cursor:pointer;display:flex;justify-content:space-between;align-items:center}",
        ".cxhw-ch:hover{background:#e9ecef}",
        ".cxhw-cn{font-weight:600;font-size:14px;color:#343a40}",
        ".cxhw-ci{font-size:12px;color:#6c757d}",
        ".cxhw-ci .r{color:#dc3545;font-weight:600}",
        ".cxhw-ci .g{color:#28a745}",
        ".cxhw-ar{transition:transform .2s;color:#6c757d}",
        ".cxhw-ch.open .cxhw-ar{transform:rotate(180deg)}",
        ".cxhw-hl{display:none}",
        ".cxhw-ch.open+.cxhw-hl{display:block}",
        ".cxhw-hi{padding:12px 24px 12px 48px;border-bottom:1px solid #f1f3f5;display:flex;justify-content:space-between;align-items:center}",
        ".cxhw-hi:last-child{border-bottom:none}",
        ".cxhw-hi:hover{background:#f8f9fa}",
        ".cxhw-ht{font-size:13px;color:#343a40}",
        ".cxhw-hd{font-size:11px;color:#6c757d;margin-top:2px}",
        ".cxhw-ss{padding:3px 10px;border-radius:10px;font-size:11px;font-weight:500;white-space:nowrap}",
        ".cxhw-ss-nj{background:#f8d7da;color:#721c24}",
        ".cxhw-ss-dp{background:#fff3cd;color:#856404}",
        ".cxhw-ss-ok{background:#d4edda;color:#155724}",
        ".cxhw-ss-ot{background:#e2e3e5;color:#383d41}",
        ".cxhw-ld{padding:60px 24px;text-align:center}",
        ".cxhw-sp{width:36px;height:36px;border:3px solid #e9ecef;border-top-color:#667eea;border-radius:50%;animation:cxhw-ani 1s linear infinite;margin:0 auto 12px}",
        "@keyframes cxhw-ani{to{transform:rotate(360deg)}}",
        ".cxhw-em{padding:48px 24px;text-align:center;color:#6c757d;font-size:14px}",
        ".cxhw-er{padding:16px 24px;background:#f8d7da;color:#721c24;margin:12px 24px;border-radius:6px;font-size:13px}",
        ".cxhw-ft{padding:14px 24px;background:#f8f9fa;border-top:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center}",
        ".cxhw-rf{padding:7px 18px;background:#667eea;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px}",
        ".cxhw-rf:hover{background:#5a6fd6}",
        ".cxhw-cc{font-size:11px;color:#6c757d}",
        "#cxhw-tg{position:fixed;bottom:24px;right:24px;width:52px;height:52px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border:none;border-radius:50%;color:#fff;font-size:22px;cursor:pointer;box-shadow:0 4px 16px rgba(102,126,234,.4);z-index:999997;display:flex;align-items:center;justify-content:center}",
        "#cxhw-tg:hover{transform:scale(1.1)}"
    ].join("\n");
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // ===== Utility =====
    function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

    function gmFetch(url) {
        return new Promise(function(resolve, reject) {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: function(r) {
                    if (r.status >= 200 && r.status < 300) resolve(r.responseText);
                    else reject(new Error("HTTP " + r.status));
                },
                onerror: function() { reject(new Error("Network error")); }
            });
        });
    }

    function parseHTML(html) {
        return new DOMParser().parseFromString(html, "text/html");
    }

    function esc(s) {
        var d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
    }


    // ===== Core Logic =====
    async function fetchCourseList() {
        var text = await gmFetch("https://mooc1-api.chaoxing.com/mycourse/backclazzdata?view=json&rss=1");
        var data = JSON.parse(text);
        var courses = [];
        if (data.channelList) {
            data.channelList.forEach(function(ch) {
                if (ch.content && ch.content.course && ch.content.course.data) {
                    ch.content.course.data.forEach(function(c) {
                        courses.push({
                            courseId: c.id,
                            classId: ch.content.id,
                            cpi: ch.content.cpi,
                            name: c.name,
                            teacher: c.teacherfactor || ""
                        });
                    });
                }
            });
        }
        return courses;
    }

    async function fetchWorkEnc(courseId, classId, cpi) {
        var url = "https://mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu?courseid="
            + courseId + "&clazzid=" + classId + "&cpi=" + cpi + "&v=2";
        var html = await gmFetch(url);
        var doc = parseHTML(html);
        var weEl = doc.getElementById("workEnc");
        var encEl = doc.getElementById("enc");
        return {
            workEnc: weEl ? weEl.value : "",
            enc: encEl ? encEl.value : ""
        };
    }

    async function fetchHomeworkList(courseId, classId, cpi, workEnc, pageNum) {
        pageNum = pageNum || 1;
        var url = "https://mooc1.chaoxing.com/mooc2/work/list?courseId="
            + courseId + "&classId=" + classId + "&cpi=" + cpi
            + "&ut=s&enc=" + workEnc + "&pageNum=" + pageNum;
        var html = await gmFetch(url);
        var doc = parseHTML(html);
        var items = [];
        doc.querySelectorAll("li[data]").forEach(function(li) {
            var titleEl = li.querySelector(".overHidden2");
            var statusEl = li.querySelector(".status");
            var timeEl = li.querySelector(".time");
            if (titleEl) {
                items.push({
                    title: titleEl.textContent.trim(),
                    status: statusEl ? statusEl.textContent.trim() : "",
                    deadline: timeEl ? timeEl.textContent.trim() : "",
                    url: li.getAttribute("data") || ""
                });
            }
        });
        var totalPages = 1;
        var pagingEl = doc.getElementById("page");
        if (pagingEl) {
            var pa = pagingEl.getAttribute("pagenum");
            if (pa) totalPages = parseInt(pa) || 1;
        }
        return { items: items, totalPages: totalPages };
    }

    async function fetchCourseHomework(course) {
        try {
            var enc = await fetchWorkEnc(course.courseId, course.classId, course.cpi);
            if (!enc.workEnc) {
                return Object.assign({}, course, { homework: [], error: "No workEnc" });
            }
            var all = [];
            var page = 1;
            var total = 1;
            do {
                var res = await fetchHomeworkList(course.courseId, course.classId, course.cpi, enc.workEnc, page);
                all = all.concat(res.items);
                total = res.totalPages;
                page++;
                if (page <= total) await delay(CONFIG.requestDelay);
            } while (page <= total);
            return Object.assign({}, course, { homework: all, error: null });
        } catch (e) {
            return Object.assign({}, course, { homework: [], error: e.message });
        }
    }

    async function fetchAllHomework(courses) {
        var results = new Array(courses.length);
        var idx = 0;
        async function worker() {
            while (idx < courses.length) {
                var i = idx++;
                results[i] = await fetchCourseHomework(courses[i]);
            }
        }
        var workers = [];
        for (var i = 0; i < CONFIG.concurrency; i++) workers.push(worker());
        await Promise.all(workers);
        return results;
    }


    // ===== UI =====
    var panel, overlay, cachedData = null, cacheTime = 0, cfilter = "all";

    function createUI() {
        var btn = document.createElement("button");
        btn.id = "cxhw-tg";
        btn.innerHTML = "&#128203;";
        btn.title = "查看所有作业";
        btn.onclick = toggle;
        document.body.appendChild(btn);

        overlay = document.createElement("div");
        overlay.id = "cxhw-overlay";
        overlay.onclick = toggle;
        document.body.appendChild(overlay);

        panel = document.createElement("div");
        panel.id = "cxhw-panel";
        panel.innerHTML =
            '<div class="cxhw-hdr">' +
                '<h2>&#128218; 学习通作业查看器</h2>' +
                '<button class="cxhw-x" id="cxhw-xbtn">&times;</button>' +
            '</div>' +
            '<div class="cxhw-tb">' +
                '<button class="cxhw-fb on" data-f="all">全部</button>' +
                '<button class="cxhw-fb" data-f="pending">未交</button>' +
                '<button class="cxhw-fb" data-f="submitted">待批改</button>' +
                '<button class="cxhw-fb" data-f="completed">已完成</button>' +
                '<span class="cxhw-sts">共 <b id="cxhw-cnt">0</b> 项作业</span>' +
            '</div>' +
            '<div class="cxhw-cnt" id="cxhw-body">' +
                '<div class="cxhw-em">点击刷新按钮加载数据</div>' +
            '</div>' +
            '<div class="cxhw-ft">' +
                '<button class="cxhw-rf" id="cxhw-rfbtn">&#128260; 刷新数据</button>' +
                '<span class="cxhw-cc" id="cxhw-cc"></span>' +
            '</div>';
        document.body.appendChild(panel);

        document.getElementById("cxhw-xbtn").onclick = toggle;
        document.getElementById("cxhw-rfbtn").onclick = doRefresh;

        panel.querySelectorAll(".cxhw-fb").forEach(function(b) {
            b.onclick = function() {
                cfilter = b.getAttribute("data-f");
                panel.querySelectorAll(".cxhw-fb").forEach(function(x) { x.classList.remove("on"); });
                b.classList.add("on");
                render();
            };
        });
    }

    function toggle() {
        var vis = panel.style.display === "block";
        panel.style.display = vis ? "none" : "block";
        overlay.style.display = vis ? "none" : "block";
        if (!vis && !cachedData) loadData();
    }

    function showLoading(msg) {
        document.getElementById("cxhw-body").innerHTML =
            '<div class="cxhw-ld"><div class="cxhw-sp"></div><div>' +
            (msg || "正在加载作业数据...") + '</div></div>';
    }

    function render() {
        if (!cachedData) return;
        var html = "";
        var count = 0;
        cachedData.forEach(function(c) {
            if (!c.homework || !c.homework.length) return;
            var hw = c.homework;
            if (cfilter === "pending") {
                hw = hw.filter(function(h) { return h.status === "未交"; });
            } else if (cfilter === "submitted") {
                hw = hw.filter(function(h) { return h.status === "待批阅" || h.status === "待批改"; });
            } else if (cfilter === "completed") {
                hw = hw.filter(function(h) { return h.status === "已完成"; });
            }
            if (!hw.length) return;
            count += hw.length;
            var pend = c.homework.filter(function(h) { return h.status === "未交"; }).length;
            var wait = c.homework.filter(function(h) { return h.status === "待批阅" || h.status === "待批改"; }).length;
            var done = c.homework.filter(function(h) { return h.status === "已完成"; }).length;
            html += '<div class="cxhw-cs">';
            html += '<div class="cxhw-ch" onclick="this.classList.toggle(\'open\')">';
            html += '<span class="cxhw-cn">' + esc(c.name) + '</span>';
            html += '<span class="cxhw-ci">';
            if (pend) html += '<span class="r">' + pend + ' 未交</span> ';
            if (wait) html += wait + ' 待批改 ';
            html += '<span class="g">' + done + ' 完成</span> ';
            html += '<span class="cxhw-ar">&#9660;</span></span></div>';
            html += '<div class="cxhw-hl">';
            hw.forEach(function(h) {
                var sc = h.status === "未交" ? "cxhw-ss-nj"
                    : (h.status === "待批阅" || h.status === "待批改") ? "cxhw-ss-dp"
                    : h.status === "已完成" ? "cxhw-ss-ok" : "cxhw-ss-ot";
                html += '<div class="cxhw-hi"><div>';
                html += '<div class="cxhw-ht">' + esc(h.title) + '</div>';
                if (h.deadline) html += '<div class="cxhw-hd">&#9200; ' + esc(h.deadline) + '</div>';
                html += '</div><span class="cxhw-ss ' + sc + '">' + esc(h.status) + '</span></div>';
            });
            html += '</div></div>';
        });
        if (!count) {
            html = '<div class="cxhw-em">' +
                (cfilter === "all" ? "暂无作业数据" : "没有符合条件的作业") +
                '</div>';
        }
        document.getElementById("cxhw-body").innerHTML = html;
        document.getElementById("cxhw-cnt").textContent = count;
        updateCacheInfo();
    }

    function updateCacheInfo() {
        var el = document.getElementById("cxhw-cc");
        if (cacheTime) {
            var m = Math.floor((Date.now() - cacheTime) / 60000);
            el.textContent = "缓存: " + m + " 分钟前";
        }
    }

    async function loadData() {
        showLoading();
        try {
            var now = Date.now();
            if (cachedData && (now - cacheTime) < CONFIG.cacheTime) { render(); return; }
            var courses = await fetchCourseList();
            if (!courses.length) {
                document.getElementById("cxhw-body").innerHTML =
                    '<div class="cxhw-er">未找到任何课程，请确认已登录学习通</div>';
                return;
            }
            showLoading("正在加载 " + courses.length + " 个课程的作业数据...");
            cachedData = await fetchAllHomework(courses);
            cacheTime = now;
            try {
                GM_setValue("cxhw_cache", JSON.stringify(cachedData));
                GM_setValue("cxhw_cache_time", cacheTime);
            } catch(e) {}
            render();
        } catch (e) {
            document.getElementById("cxhw-body").innerHTML =
                '<div class="cxhw-er">加载失败: ' + esc(e.message) + '</div>';
        }
    }

    function doRefresh() {
        cachedData = null;
        cacheTime = 0;
        try { GM_setValue("cxhw_cache", null); GM_setValue("cxhw_cache_time", 0); } catch(e) {}
        loadData();
    }

    // ===== Init =====
    function init() {
        try {
            var saved = GM_getValue("cxhw_cache", null);
            var savedTime = GM_getValue("cxhw_cache_time", 0);
            if (saved && savedTime) {
                cachedData = JSON.parse(saved);
                cacheTime = savedTime;
            }
        } catch (e) {}
        createUI();
    }

    if (document.readyState === "complete") init();
    else window.addEventListener("load", init);
})();
