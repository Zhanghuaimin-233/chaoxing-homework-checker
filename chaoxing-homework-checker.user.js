// ==UserScript==
// @name         学习通作业统一查看
// @namespace    https://github.com/chaoxing-homework-checker
// @version      2.0.0
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

    // Skip iframes — only inject UI in top-level window
    if (window !== window.top) return;

    const CONFIG = { concurrency: 3, requestDelay: 500, cacheTime: 30 * 60 * 1000, requestTimeout: 15000, maxRetries: 2 };

    // ===== Styles =====
    GM_addStyle(`
        #cxhw-panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:920px;max-height:85vh;background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.3);z-index:999999;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:none;overflow:hidden}
        #cxhw-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:999998;display:none}
        .cxhw-hdr{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center}
        .cxhw-hdr h2{margin:0;font-size:18px;font-weight:600}
        .cxhw-x{background:rgba(255,255,255,.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px}
        .cxhw-x:hover{background:rgba(255,255,255,.3)}
        .cxhw-tb{padding:12px 24px;background:#f8f9fa;border-bottom:1px solid #e9ecef;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .cxhw-fb{padding:5px 14px;border:1px solid #dee2e6;border-radius:16px;background:#fff;cursor:pointer;font-size:13px}
        .cxhw-fb.on{background:#667eea;color:#fff;border-color:#667eea}
        .cxhw-fb:hover:not(.on){border-color:#667eea;color:#667eea}
        #cxhw-hidefin{border-style:dashed;font-size:12px;padding:4px 10px}
        #cxhw-hidefin.on{background:#6c757d;border-color:#6c757d}
        #cxhw-expand{border-style:dashed;font-size:12px;padding:4px 10px}
        .cxhw-sts{margin-left:auto;font-size:13px;color:#6c757d}
        .cxhw-sts b{color:#667eea}
        .cxhw-cnt{overflow-y:auto;max-height:calc(85vh - 200px)}
        .cxhw-cs{border-bottom:1px solid #e9ecef}
        .cxhw-cs:last-child{border-bottom:none}
        .cxhw-ch{padding:14px 24px;background:#f8f9fa;cursor:pointer;display:flex;justify-content:space-between;align-items:center}
        .cxhw-ch:hover{background:#e9ecef}
        .cxhw-cn{font-weight:600;font-size:14px;color:#343a40}
        .cxhw-cn a:hover{color:#667eea;text-decoration:underline!important}
        .cxhw-ci{font-size:12px;color:#6c757d}
        .cxhw-ci .r{color:#dc3545;font-weight:600}
        .cxhw-ci .g{color:#28a745}
        .cxhw-ar{transition:transform .2s;color:#6c757d}
        .cxhw-ch.open .cxhw-ar{transform:rotate(180deg)}
        .cxhw-hl{display:none}
        .cxhw-ch.open+.cxhw-hl{display:block}
        .cxhw-hi{padding:12px 24px 12px 48px;border-bottom:1px solid #f1f3f5;display:flex;justify-content:space-between;align-items:center}
        .cxhw-hi:last-child{border-bottom:none}
        .cxhw-hi[data-url]{cursor:pointer}
        .cxhw-hi[data-url]:hover{background:#f0f4ff}
        .cxhw-ht{font-size:13px;color:#343a40}
        .cxhw-hd{font-size:11px;color:#6c757d;margin-top:2px}
        .cxhw-ss{padding:3px 10px;border-radius:10px;font-size:11px;font-weight:500;white-space:nowrap}
        .cxhw-ss-nj{background:#f8d7da;color:#721c24}
        .cxhw-ss-dp{background:#fff3cd;color:#856404}
        .cxhw-ss-pr{background:#e8daef;color:#6f42c1}
        .cxhw-ss-ok{background:#d4edda;color:#155724}
        .cxhw-ss-ot{background:#e2e3e5;color:#383d41}
        .cxhw-ld{padding:60px 24px;text-align:center}
        .cxhw-sp{width:36px;height:36px;border:3px solid #e9ecef;border-top-color:#667eea;border-radius:50%;animation:cxhw-ani 1s linear infinite;margin:0 auto 12px}
        @keyframes cxhw-ani{to{transform:rotate(360deg)}}
        .cxhw-em{padding:48px 24px;text-align:center;color:#6c757d;font-size:14px}
        .cxhw-er{padding:16px 24px;background:#f8d7da;color:#721c24;margin:12px 24px;border-radius:6px;font-size:13px}
        .cxhw-ft{padding:14px 24px;background:#f8f9fa;border-top:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center}
        .cxhw-rf{padding:7px 18px;background:#667eea;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px}
        .cxhw-rf:hover{background:#5a6fd6}
        .cxhw-cc{font-size:11px;color:#6c757d}
        #cxhw-tg{position:fixed;bottom:24px;right:24px;width:52px;height:52px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border:none;border-radius:50%;color:#fff;font-size:22px;cursor:pointer;box-shadow:0 4px 16px rgba(102,126,234,.4);z-index:1000;display:flex;align-items:center;justify-content:center}
        #cxhw-tg:hover{transform:scale(1.1)}
    `);

    // ===== Utility =====
    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    function isCourseCacheValid() {
        return courseCache && courseCacheTime > 0 && (Date.now() - courseCacheTime) < CONFIG.cacheTime;
    }

    function gmFetch(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url,
                timeout: CONFIG.requestTimeout,
                headers: { "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
                onload: r => {
                    if (r.status >= 200 && r.status < 300) resolve(r.responseText);
                    else reject(new Error("HTTP " + r.status + " for " + url.substring(0, 80)));
                },
                onerror: () => reject(new Error("Network error for " + url.substring(0, 80))),
                ontimeout: () => reject(new Error("Timeout for " + url.substring(0, 80)))
            });
        });
    }

    async function gmFetchWithRetry(url, retries = 0) {
        try {
            return await gmFetch(url);
        } catch (e) {
            if (retries < CONFIG.maxRetries && /Timeout|Network error|HTTP 5\d{2}/.test(e.message)) {
                await delay(1000 * (retries + 1));
                return gmFetchWithRetry(url, retries + 1);
            }
            throw e;
        }
    }

    function parseHTML(html) {
        return new DOMParser().parseFromString(html, "text/html");
    }

    function escText(s) {
        const d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
    }

    function escAttr(s) {
        return escText(s).replace(/"/g, "&quot;");
    }

    function isValidId(v) { return /^\d+$/.test(String(v)); }

    // P0: block javascript: protocol
    function safeUrl(u) {
        try {
            const parsed = new URL(u);
            return (parsed.protocol === "https:" || parsed.protocol === "http:") ? u : "";
        } catch { return ""; }
    }

    function buildCourseUrl(c) {
        return "https://mooc1.chaoxing.com/visit/stucoursemiddle?courseid=" + c.courseId + "&clazzid=" + c.classId + "&cpi=" + c.cpi + "&ismooc2=1&v=2";
    }

    // Normalize status text — platform uses mixed traditional/simplified Chinese
    function isPending(s) { return /未交|未提交/.test(s); }
    function isPeerReview(s) { return /互評|互评/.test(s); }
    function isSubmitted(s) { return /待批閱|待批阅|待批改/.test(s); }
    function isCompleted(s) { return /已完成|已批改/.test(s); }


    // ===== Core Logic =====
    async function fetchCourseList() {
        const text = await gmFetchWithRetry("https://mooc1-api.chaoxing.com/mycourse/backclazzdata?view=json&rss=1");
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error("课程列表API返回非JSON响应，可能未登录或会话过期");
        }
        const courses = [];
        if (data.channelList) {
            data.channelList.forEach(ch => {
                if (ch.content && ch.content.course && ch.content.course.data) {
                    ch.content.course.data.forEach(c => {
                        if (!isValidId(c.id) || !isValidId(ch.content.id) || !isValidId(ch.content.cpi)) return;
                        courses.push({
                            courseId: c.id,
                            classId: ch.content.id,
                            cpi: ch.content.cpi,
                            name: c.name,
                            teacher: c.teacherfactor || "",
                            isretire: ch.content.isretire || 0,
                            endDate: ch.content.endDate || ""
                        });
                    });
                }
            });
        }
        return courses;
    }

    async function fetchWorkEnc(courseId, classId, cpi) {
        const url = buildCourseUrl({ courseId, classId, cpi });
        const html = await gmFetchWithRetry(url);
        const doc = parseHTML(html);
        const weEl = doc.getElementById("workEnc");
        if (!weEl) {
            const urlMatch = html.match(/enc=([a-f0-9]{32})/);
            if (urlMatch) return urlMatch[1];
            const snippet = html.substring(0, 200).replace(/\s+/g, " ");
            throw new Error("未找到workEnc（页面可能已变更或未登录），响应片段: " + snippet);
        }
        return weEl.value;
    }

    async function fetchHomeworkList(courseId, classId, cpi, workEnc, pageNum = 1) {
        const url = "https://mooc1.chaoxing.com/mooc-ans/mooc2/work/list?courseId="
            + courseId + "&classId=" + classId + "&cpi=" + cpi
            + "&enc=" + workEnc + "&pageNum=" + pageNum;
        const html = await gmFetchWithRetry(url);
        const doc = parseHTML(html);
        const items = [];
        doc.querySelectorAll("li[data]").forEach(li => {
            const titleEl = li.querySelector(".overHidden2");
            const statusEl = li.querySelector(".status");
            const timeEl = li.querySelector(".time");
            if (titleEl) {
                items.push({
                    title: titleEl.textContent.trim(),
                    status: statusEl ? statusEl.textContent.trim() : "",
                    deadline: timeEl ? timeEl.textContent.trim() : "",
                    url: li.getAttribute("data") || ""
                });
            }
        });
        // Robust pagination: prefer .xl-active sibling count
        let totalPages = 1;
        const pagingEl = doc.getElementById("page");
        if (pagingEl) {
            let maxPage = 1;
            pagingEl.querySelectorAll("li").forEach(li => {
                if (li.classList.contains("xl-prevPage") || li.classList.contains("xl-nextPage")) return;
                const num = parseInt(li.textContent.trim());
                if (!isNaN(num) && num > maxPage) maxPage = num;
            });
            totalPages = maxPage;
        }
        return { items, totalPages };
    }

    async function fetchCourseHomework(course) {
        try {
            const workEnc = await fetchWorkEnc(course.courseId, course.classId, course.cpi);
            let all = [];
            let page = 1;
            let total = 1;
            do {
                const res = await fetchHomeworkList(course.courseId, course.classId, course.cpi, workEnc, page);
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

    // P2: progress callback
    async function fetchAllHomework(courses, onProgress) {
        const results = new Array(courses.length);
        let done = 0;
        let idx = 0;
        async function worker() {
            while (idx < courses.length) {
                const i = idx++;
                results[i] = await fetchCourseHomework(courses[i]);
                done++;
                if (onProgress) onProgress(done, courses.length);
            }
        }
        const workers = [];
        for (let i = 0; i < CONFIG.concurrency; i++) workers.push(worker());
        await Promise.all(workers);
        return results;
    }


    // ===== Two-layer Cache =====
    // Layer 1: course list (always full)
    let courseCache = null, courseCacheTime = 0;
    // Layer 2: homework per course (keyed by courseId)
    let homeworkCache = {};
    // Course selection: null = all, string[] = selected courseIds
    let selectedCourseIds = null;

    function loadCacheFromStorage() {
        try {
            const c = GM_getValue("cxhw_courses", null);
            const ct = +GM_getValue("cxhw_courses_time", 0) || 0;
            if (c && ct) {
                const parsed = JSON.parse(c);
                if (Array.isArray(parsed)) { courseCache = parsed; courseCacheTime = ct; }
            }
        } catch (e) { console.warn("[ChaoxingHW] Failed to load course cache:", e); }
        try {
            const h = GM_getValue("cxhw_homework", null);
            if (h) {
                const parsed = JSON.parse(h);
                if (parsed && typeof parsed === "object") homeworkCache = parsed;
            }
        } catch (e) { console.warn("[ChaoxingHW] Failed to load homework cache:", e); }
        try {
            const s = GM_getValue("cxhw_selected_courses", null);
            if (s) {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed) && parsed.length > 0) selectedCourseIds = parsed;
            }
        } catch (e) {}
    }

    function saveCacheToStorage() {
        try {
            GM_setValue("cxhw_courses", JSON.stringify(courseCache));
            GM_setValue("cxhw_courses_time", courseCacheTime);
            // Prune homework entries for courses no longer in courseCache
            if (courseCache) {
                const validIds = new Set(courseCache.map(c => String(c.courseId)));
                for (const key of Object.keys(homeworkCache)) {
                    if (!validIds.has(key)) delete homeworkCache[key];
                }
            }
            GM_setValue("cxhw_homework", JSON.stringify(homeworkCache));
            GM_setValue("cxhw_selected_courses", selectedCourseIds ? JSON.stringify(selectedCourseIds) : null);
        } catch (e) { console.warn("[ChaoxingHW] Failed to save cache:", e); }
    }

    function buildCachedData() {
        if (!courseCache) return null;
        return courseCache.map(c => {
            const cached = homeworkCache[c.courseId];
            return Object.assign({}, c, {
                homework: cached ? cached.homework : [],
                error: cached ? cached.error : null,
                hwPending: !cached
            });
        });
    }

    function buildFilteredCachedData() {
        const all = buildCachedData();
        if (!all || !selectedCourseIds) return all;
        const idSet = new Set(selectedCourseIds);
        return all.filter(c => idSet.has(String(c.courseId)));
    }

    // ===== Course Selection =====
    function applyCourseSelection(courses) {
        if (!selectedCourseIds) return courses;
        const idSet = new Set(selectedCourseIds);
        return courses.filter(c => idSet.has(String(c.courseId)));
    }

    function showCourseSelector(courses) {
        return new Promise(resolve => {
            const panel = document.getElementById("cxhw-panel");
            const overlay = document.getElementById("cxhw-overlay");
            const savedSet = selectedCourseIds ? new Set(selectedCourseIds) : null;
            let checked = new Set(savedSet ? courses.filter(c => savedSet.has(String(c.courseId))).map(c => String(c.courseId)) : courses.map(c => String(c.courseId)));

            // Create dedicated selector modal (outside panel, with own scrolling)
            let modal = document.getElementById("cxhw-sel-modal");
            if (!modal) {
                modal = document.createElement("div");
                modal.id = "cxhw-sel-modal";
                modal.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:720px;max-height:85vh;background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.3);z-index:1000000;display:none;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif";
                document.body.appendChild(modal);
            }

            function renderSelector() {
                const search = document.getElementById("cxhw-sel-search");
                const q = search ? search.value.trim().toLowerCase() : "";
                let html = '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:16px 24px;display:flex;justify-content:space-between;align-items:center">';
                html += '<span style="font-size:16px;font-weight:600">选择要追踪的课程</span>';
                html += '<button id="cxhw-sel-x" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:15px">&times;</button>';
                html += '</div>';
                html += '<div style="padding:8px 24px;background:#fff5f5;border-bottom:1px solid #fecaca">';
                html += '<span style="color:#dc3545;font-size:12px">&#9888; 只建议勾选需要的课程，全选或课程量过大可能导致平台风控，建议追踪课程不超过12个</span>';
                html += '</div>';
                html += '<div style="padding:10px 24px;background:#f8f9fa;border-bottom:1px solid #e9ecef;display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
                html += '<button class="cxhw-fb" id="cxhw-sel-all">全选</button>';
                html += '<button class="cxhw-fb" id="cxhw-sel-none">全不选</button>';
                html += '<button class="cxhw-fb" id="cxhw-sel-active">仅已开课</button>';
                html += '<input id="cxhw-sel-search" type="text" placeholder="搜索课程名/教师" value="' + escAttr(q) + '" style="margin-left:auto;padding:4px 10px;border:1px solid #dee2e6;border-radius:6px;font-size:13px;width:180px">';
                html += '</div>';
                html += '<div style="overflow-y:auto;max-height:calc(85vh - 160px);padding:4px 0">';
                let visibleCount = 0;
                courses.forEach(c => {
                    const id = String(c.courseId);
                    const name = (c.name || "").toLowerCase();
                    const teacher = (c.teacher || "").toLowerCase();
                    if (q && !name.includes(q) && !teacher.includes(q)) return;
                    visibleCount++;
                    const isActive = isCourseActive(c);
                    const statusStr = !isActive ? '<span style="color:#6c757d;font-size:11px;margin-left:8px">已结课</span>' : '';
                    const newBadge = savedSet && !savedSet.has(id) ? '<span style="background:#667eea;color:#fff;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:8px">新</span>' : '';
                    html += '<label style="display:flex;align-items:center;padding:6px 24px;cursor:pointer;gap:10px;border-bottom:1px solid #f8f9fa" class="cxhw-sel-row">';
                    html += '<input type="checkbox" data-cid="' + id + '"' + (checked.has(id) ? ' checked' : '') + ' style="width:16px;height:16px;cursor:pointer">';
                    html += '<span style="font-size:13px;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escText(c.name) + '</span>';
                    html += '<span style="font-size:12px;color:#6c757d;min-width:60px">' + escText(c.teacher || '') + '</span>';
                    html += statusStr + newBadge;
                    html += '</label>';
                });
                if (!visibleCount) html += '<div style="padding:24px;text-align:center;color:#6c757d">无匹配课程</div>';
                html += '</div>';
                // Fixed footer with confirm button
                html += '<div style="padding:14px 24px;background:#f8f9fa;border-top:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center">';
                html += '<span style="font-size:13px;color:#6c757d">已选 <b style="color:#667eea">' + checked.size + '</b>/' + courses.length + ' 个课程</span>';
                html += '<div style="display:flex;gap:10px">';
                html += '<button class="cxhw-fb" id="cxhw-sel-cancel">取消</button>';
                html += '<button class="cxhw-fb on" id="cxhw-sel-confirm">确认</button>';
                html += '</div></div>';
                modal.innerHTML = html;

                // Event bindings
                document.getElementById("cxhw-sel-all").onclick = () => { checked = new Set(courses.map(c => String(c.courseId))); renderSelector(); };
                document.getElementById("cxhw-sel-none").onclick = () => { checked = new Set(); renderSelector(); };
                document.getElementById("cxhw-sel-active").onclick = () => { checked = new Set(courses.filter(c => isCourseActive(c)).map(c => String(c.courseId))); renderSelector(); };
                document.getElementById("cxhw-sel-search").oninput = () => renderSelector();
                document.getElementById("cxhw-sel-x").onclick = () => {
                    modal.style.display = "none";
                    overlay.style.display = "none";
                    selectedCourseIds = null;
                    resolve(false);
                };
                document.getElementById("cxhw-sel-cancel").onclick = () => {
                    modal.style.display = "none";
                    overlay.style.display = "none";
                    selectedCourseIds = null;
                    resolve(false);
                };
                document.getElementById("cxhw-sel-confirm").onclick = () => {
                    if (checked.size === 0) { alert("请至少选择一个课程"); return; }
                    selectedCourseIds = checked.size === courses.length ? null : Array.from(checked);
                    modal.style.display = "none";
                    overlay.style.display = "none";
                    resolve(true);
                };
                modal.querySelectorAll("input[data-cid]").forEach(cb => {
                    cb.onchange = () => { cb.checked ? checked.add(cb.dataset.cid) : checked.delete(cb.dataset.cid); };
                });
            }

            // Show modal
            modal.style.display = "block";
            overlay.style.display = "block";
            renderSelector();
        });
    }

    // ===== UI =====
    let panel, overlay, cachedData = null, loading = false;

    // Persist filter state
    let cfilter = GM_getValue("cxhw_cfilter", "all");
    let hideFinished = GM_getValue("cxhw_hideFinished", false);

    function isCourseActive(course) {
        if (course.isretire === 1) return false;
        if (course.endDate) {
            const end = new Date(course.endDate).getTime();
            if (end < Date.now()) return false;
        }
        return true;
    }

    function createUI() {
        const btn = document.createElement("button");
        btn.id = "cxhw-tg";
        btn.innerHTML = "&#128203;";
        btn.title = "查看所有作业";
        btn.setAttribute("aria-label", "查看所有作业");
        btn.onclick = toggle;
        document.body.appendChild(btn);

        overlay = document.createElement("div");
        overlay.id = "cxhw-overlay";
        overlay.onclick = toggle;
        document.body.appendChild(overlay);

        panel = document.createElement("div");
        panel.id = "cxhw-panel";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", "学习通作业查看器");
        panel.innerHTML =
            '<div class="cxhw-hdr">' +
                '<h2>&#128218; 学习通作业查看器</h2>' +
                '<button class="cxhw-x" id="cxhw-xbtn" aria-label="关闭">&times;</button>' +
            '</div>' +
            '<div class="cxhw-tb">' +
                '<button class="cxhw-fb on" data-f="all">全部</button>' +
                '<button class="cxhw-fb" data-f="pending">未交</button>' +
                '<button class="cxhw-fb" data-f="peerreview">待互评</button>' +
                '<button class="cxhw-fb" data-f="submitted">待批阅</button>' +
                '<button class="cxhw-fb" data-f="completed">已完成</button>' +
                '<button class="cxhw-fb" id="cxhw-hidefin">&#9670; 隐藏已结课</button>' +
                '<button class="cxhw-fb" id="cxhw-expand">展开/折叠</button>' +
                '<button class="cxhw-fb" id="cxhw-coursesel">&#9776; 课程选择</button>' +
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

        // Restore persisted filter state
        if (cfilter !== "all") {
            panel.querySelectorAll(".cxhw-fb[data-f]").forEach(b => {
                b.classList.toggle("on", b.getAttribute("data-f") === cfilter);
            });
        }
        if (hideFinished) {
            document.getElementById("cxhw-hidefin").classList.add("on");
        }

        panel.querySelectorAll(".cxhw-fb[data-f]").forEach(b => {
            b.onclick = () => {
                cfilter = b.getAttribute("data-f");
                GM_setValue("cxhw_cfilter", cfilter);
                panel.querySelectorAll(".cxhw-fb[data-f]").forEach(x => x.classList.remove("on"));
                b.classList.add("on");
                render();
            };
        });

        document.getElementById("cxhw-hidefin").onclick = function() {
            hideFinished = !hideFinished;
            GM_setValue("cxhw_hideFinished", hideFinished);
            this.classList.toggle("on", hideFinished);
            // When turning off hideFinished, check if closed courses need homework fetch
            if (!hideFinished && courseCache) {
                const missing = courseCache.filter(c => !isCourseActive(c) && !homeworkCache[c.courseId]);
                if (missing.length > 0) {
                    loadData();
                    return;
                }
            }
            render();
        };

        // P3: expand/collapse all
        let allExpanded = false;
        document.getElementById("cxhw-expand").onclick = () => {
            allExpanded = !allExpanded;
            document.querySelectorAll(".cxhw-ch").forEach(ch => {
                ch.classList.toggle("open", allExpanded);
            });
        };

        // Course selection button
        document.getElementById("cxhw-coursesel").onclick = async () => {
            if (!courseCache) return;
            const confirmed = await showCourseSelector(courseCache);
            if (confirmed) {
                saveCacheToStorage();
                cachedData = buildFilteredCachedData();
                render();
            }
        };

        // Event delegation for course headers and homework items
        const body = document.getElementById("cxhw-body");
        body.addEventListener("click", e => {
            const ch = e.target.closest(".cxhw-ch");
            if (ch && !e.target.closest("a")) {
                ch.classList.toggle("open");
                return;
            }
            const hi = e.target.closest(".cxhw-hi[data-url]");
            if (hi) {
                const url = safeUrl(hi.getAttribute("data-url"));
                if (url) window.open(url, "_blank");
            }
        });

        // ESC key to close
        document.addEventListener("keydown", e => {
            if (e.key === "Escape" && panel.style.display === "block") toggle();
        });
    }

    function toggle() {
        const vis = panel.style.display === "block";
        panel.style.display = vis ? "none" : "block";
        overlay.style.display = vis ? "none" : "block";
        if (!vis && !courseCache) loadData();
    }

    function showLoading(msg) {
        document.getElementById("cxhw-body").innerHTML =
            '<div class="cxhw-ld"><div class="cxhw-sp"></div><div>' +
            (msg || "正在加载作业数据...") + '</div></div>';
    }

    function render() {
        if (!cachedData) return;
        let html = "";
        let count = 0;
        let errorCount = 0;
        let pendingCount = 0;
        cachedData.forEach(c => {
            if (c.hwPending) { pendingCount++; return; }
            if (c.error) { errorCount++; return; }
            if (hideFinished && !isCourseActive(c)) return;
            if (!c.homework || !c.homework.length) return;
            let hw = c.homework;
            if (cfilter === "pending") hw = hw.filter(h => isPending(h.status));
            else if (cfilter === "submitted") hw = hw.filter(h => isSubmitted(h.status));
            else if (cfilter === "peerreview") hw = hw.filter(h => isPeerReview(h.status));
            else if (cfilter === "completed") hw = hw.filter(h => isCompleted(h.status));
            if (!hw.length) return;
            count += hw.length;
            const pend = c.homework.filter(h => isPending(h.status)).length;
            const wait = c.homework.filter(h => isSubmitted(h.status)).length;
            const peer = c.homework.filter(h => isPeerReview(h.status)).length;
            const done = c.homework.filter(h => isCompleted(h.status)).length;
            const courseUrl = safeUrl(buildCourseUrl(c));
            html += '<div class="cxhw-cs">';
            html += '<div class="cxhw-ch">';
            html += '<span class="cxhw-cn"><a href="' + courseUrl + '" target="_blank" onclick="event.stopPropagation()" style="color:inherit;text-decoration:none;">' + escText(c.name) + '</a></span>';
            html += '<span class="cxhw-ci">';
            if (pend) html += '<span class="r">' + pend + ' 未交</span> ';
            if (peer) html += '<span style="color:#6f42c1">' + peer + ' 待互评</span> ';
            if (wait) html += '<span style="color:#856404">' + wait + ' 待批阅</span> ';
            html += '<span class="g">' + done + ' 完成</span> ';
            html += '<span class="cxhw-ar">&#9660;</span></span></div>';
            html += '<div class="cxhw-hl">';
            hw.forEach(h => {
                const sc = isPending(h.status) ? "cxhw-ss-nj"
                    : isPeerReview(h.status) ? "cxhw-ss-pr"
                    : isSubmitted(h.status) ? "cxhw-ss-dp"
                    : isCompleted(h.status) ? "cxhw-ss-ok" : "cxhw-ss-ot";
                const hwUrl = h.url ? safeUrl(h.url) : "";
                html += '<div class="cxhw-hi"' + (hwUrl ? ' data-url="' + escAttr(hwUrl) + '"' : '') + '><div>';
                html += '<div class="cxhw-ht">' + escText(h.title) + '</div>';
                if (h.deadline) html += '<div class="cxhw-hd">&#9200; ' + escText(h.deadline) + '</div>';
                html += '</div><span class="cxhw-ss ' + sc + '">' + escText(h.status) + '</span></div>';
            });
            html += '</div></div>';
        });
        if (!count) {
            html = '<div class="cxhw-em">' +
                (cfilter === "all" ? "暂无作业数据" : "没有符合条件的作业") +
                '</div>';
        }
        if (errorCount > 0) {
            html = '<div class="cxhw-er" style="margin:8px 24px;padding:8px 12px;font-size:12px;">' +
                errorCount + ' 个课程加载失败（可能是已结课或权限不足）</div>' + html;
        }
        if (pendingCount > 0) {
            html = '<div class="cxhw-er" style="margin:8px 24px;padding:8px 12px;font-size:12px;background:#fff3cd;color:#856404;">' +
                pendingCount + ' 个课程的作业数据尚未加载，点击刷新按钮获取</div>' + html;
        }
        document.getElementById("cxhw-body").innerHTML = html;
        document.getElementById("cxhw-cnt").textContent = count;
        updateCacheInfo();
    }

    function updateCacheInfo() {
        const el = document.getElementById("cxhw-cc");
        if (courseCacheTime > 0) {
            const m = Math.floor((Date.now() - courseCacheTime) / 60000);
            el.textContent = m >= 0 ? ("缓存: " + m + " 分钟前") : "";
        }
    }

    async function loadData(forceAll = false) {
        if (loading) return;
        loading = true;
        try {
            // Layer 1: fetch course list if needed
            if (!isCourseCacheValid() || forceAll) {
                showLoading("正在获取课程列表...");
                courseCache = await fetchCourseList();
                courseCacheTime = Date.now();
            }
            if (!courseCache.length) {
                document.getElementById("cxhw-body").innerHTML =
                    '<div class="cxhw-er">未找到任何课程，请确认已登录学习通</div>';
                return;
            }

            // Course selection: show selector on first load (no saved selection) or forced refresh
            if (!selectedCourseIds && !GM_getValue("cxhw_selected_courses", null)) {
                const confirmed = await showCourseSelector(courseCache);
                if (!confirmed) {
                    selectedCourseIds = null; // user cancelled = select all
                }
                saveCacheToStorage();
            }

            // Apply course selection
            const selectedCourses = applyCourseSelection(courseCache);

            // Layer 2: determine which courses need homework fetch
            let skippedFinished = 0, skippedCached = 0;
            const coursesToFetch = selectedCourses.filter(c => {
                if (hideFinished && !isCourseActive(c)) { skippedFinished++; return false; }
                if (forceAll) return true;
                const cached = homeworkCache[c.courseId];
                if (!cached) return true;
                if (!cached.time) return true;
                if ((Date.now() - cached.time) < CONFIG.cacheTime) { skippedCached++; return false; }
                return true;
            });
            const skipMsg = [
                skippedFinished > 0 ? (skippedFinished + " 个已结课") : "",
                skippedCached > 0 ? (skippedCached + " 个已缓存") : ""
            ].filter(Boolean).join("、");

            if (coursesToFetch.length > 0) {
                const selStr = selectedCourseIds ? "（已选 " + selectedCourses.length + "/" + courseCache.length + " 个课程）" : "";
                showLoading("正在加载 " + coursesToFetch.length + " 个课程的作业数据..." + selStr +
                    (skipMsg ? "（跳过 " + skipMsg + "）" : ""));
                const results = await fetchAllHomework(coursesToFetch, (done, total) => {
                    showLoading("已加载 " + done + "/" + total + " 个课程..." + selStr +
                        (skipMsg ? "（跳过 " + skipMsg + "）" : ""));
                });
                for (const r of results) {
                    homeworkCache[r.courseId] = { homework: r.homework, error: r.error, time: Date.now() };
                }
                saveCacheToStorage();
            }

            cachedData = buildFilteredCachedData();
            render();
        } catch (e) {
            document.getElementById("cxhw-body").innerHTML =
                '<div class="cxhw-er">加载失败: ' + escText(e.message) + '</div>';
        } finally {
            loading = false;
        }
    }

    function doRefresh() {
        if (loading) {
            showLoading("正在加载中，请稍候...");
            return;
        }
        courseCache = null;
        courseCacheTime = 0;
        homeworkCache = {};
        try { GM_setValue("cxhw_courses", null); GM_setValue("cxhw_courses_time", 0); GM_setValue("cxhw_homework", null); } catch(e) {}
        loadData(true);
    }

    // ===== Init =====
    function init() {
        loadCacheFromStorage();
        createUI();
        try {
            cachedData = buildFilteredCachedData();
            render();
        } catch (e) {
            console.warn("[ChaoxingHW] Failed to build cached data:", e);
            courseCache = null;
            homeworkCache = {};
        }
        const checkCourses = applyCourseSelection(courseCache || []);
        const needsFetch = !isCourseCacheValid() || (checkCourses && checkCourses.some(c => {
            if (hideFinished && !isCourseActive(c)) return false;
            return !homeworkCache[c.courseId];
        }));
        if (needsFetch) loadData();
    }

    if (document.readyState === "complete") init();
    else window.addEventListener("load", init);
})();
