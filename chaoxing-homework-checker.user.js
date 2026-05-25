// ==UserScript==
// @name         学习通作业统一查看
// @namespace    https://github.com/chaoxing-homework-checker
// @version      2.1.0
// @description  检测学习通当前账号所有课程的作业情况并统一显示
// @author       Assistant
// @match        *://*.chaoxing.com/*
// @license      GPL-3.0
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
        .cxhw-tb{background:#fff;border-bottom:1px solid #edf0f5}
        .cxhw-tb-main{padding:14px 24px 11px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
        .cxhw-seg{display:inline-flex;align-items:center;gap:3px;padding:3px;background:#f1f3f8;border-radius:12px}
        .cxhw-filter{height:34px;padding:0 12px;border:none;border-radius:9px;background:transparent;color:#606a7b;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;gap:7px;transition:background .15s,color .15s,box-shadow .15s}
        .cxhw-filter:hover:not(.on){background:#e6eaf3;color:#3c4555}
        .cxhw-filter.on{background:#fff;color:#5e69df;font-weight:600;box-shadow:0 1px 4px rgba(30,38,58,.10)}
        .cxhw-filter-count{min-width:19px;height:19px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;border-radius:10px;background:#e6eaf2;color:#6d7685;font-size:11px;font-weight:500}
        .cxhw-filter.on .cxhw-filter-count{background:#eef0ff;color:#5c67dd}
        .cxhw-summary{margin-left:auto;height:36px;display:flex;align-items:center;gap:6px;padding:0 13px;border:1px solid #edf0f5;border-radius:18px;color:#718096;font-size:12px;background:#fbfcfe;white-space:nowrap}
        .cxhw-summary strong{font-size:16px;color:#dc5262;line-height:1}
        .cxhw-summary b{font-size:14px;color:#667eea}
        .cxhw-summary-sep{width:1px;height:16px;background:#e4e8f0;margin:0 4px}
        .cxhw-tb-actions{padding:0 24px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .cxhw-tools-label{font-size:11px;color:#97a0af;margin-right:2px;letter-spacing:.06em}
        .cxhw-tool{height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 11px;border:1px solid #e5e9f1;border-radius:10px;background:#fff;color:#5f6979;cursor:pointer;font-size:12px;font-weight:500;transition:background .15s,border-color .15s,color .15s,box-shadow .15s,transform .1s}
        .cxhw-tool:hover{background:#f5f7fb;border-color:#d7ddea;color:#414a5a}
        .cxhw-tool:active{transform:scale(.98)}
        .cxhw-tool:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(102,126,234,.14)}
        .cxhw-tool-primary{border-color:#e1e5ff;background:#f5f6ff;color:#5865dc}
        .cxhw-tool-primary:hover{border-color:#ced4ff;background:#ecefff;color:#4c59cd}
        .cxhw-tool-icon{font-size:13px;color:#9099a9;line-height:1}
        .cxhw-tool-primary .cxhw-tool-icon{color:#6875e8}
        .cxhw-tool-badge,.cxhw-course-count{height:18px;min-width:18px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;border-radius:9px;font-size:10px;font-weight:600;background:#eef1f6;color:#778091}
        .cxhw-course-count{background:#e6e9ff;color:#5865dc}
        #cxhw-showignored.on{background:#f4f5f8;border-color:#dce1ea;color:#404a5c}
        #cxhw-showignored.on .cxhw-tool-icon{color:#667eea}
        .cxhw-manage-hint{font-size:11px;color:#9aa3b3;margin-left:4px}
        #cxhw-sel-modal .cxhw-fb{padding:5px 14px;border:1px solid #dee2e6;border-radius:16px;background:#fff;cursor:pointer;font-size:13px}
        #cxhw-sel-modal .cxhw-fb.on{background:#667eea;color:#fff;border-color:#667eea}
        #cxhw-sel-modal .cxhw-fb:hover:not(.on){border-color:#667eea;color:#667eea}
        .cxhw-cnt{overflow-y:auto;max-height:calc(85vh - 240px)}
        .cxhw-cs{border-bottom:1px solid #e9ecef}
        .cxhw-cs:last-child{border-bottom:none}
        .cxhw-ch{padding:14px 24px;background:#f8f9fa;cursor:pointer;display:flex;justify-content:space-between;align-items:center}
        .cxhw-ch:hover{background:#e9ecef}
        .cxhw-cn{font-weight:600;font-size:14px;color:#343a40}
        .cxhw-cn a:hover{color:#667eea;text-decoration:underline!important}
        .cxhw-ci{font-size:12px;color:#6c757d}
        .cxhw-ci .r{color:#dc3545;font-weight:600}
        .cxhw-ci .g{color:#28a745}
        .cxhw-ar{display:inline-block;width:0;height:0;margin-left:8px;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:6px solid #8a93a4;vertical-align:middle;transform:rotate(90deg);transform-origin:45% 50%;transition:transform .18s ease,border-left-color .15s}
        .cxhw-ch:hover .cxhw-ar{border-left-color:#667eea}
        .cxhw-ch.open .cxhw-ar{transform:rotate(270deg)}
        .cxhw-hl{display:none}
        .cxhw-ch.open+.cxhw-hl{display:block}
        .cxhw-hi{padding:12px 24px 12px 48px;border-bottom:1px solid #f1f3f5;display:flex;justify-content:space-between;align-items:center;gap:16px}
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
        .cxhw-hi.is-ignored{background:#fbfcfe}
        .cxhw-hi.is-ignored .cxhw-ht,.cxhw-hi.is-ignored .cxhw-hd{color:#8b93a3}
        .cxhw-ignored-mark{display:inline-flex;align-items:center;margin-left:7px;padding:1px 7px;border-radius:10px;background:#eef1f6;color:#778091;font-size:10px;font-weight:500;vertical-align:1px}
        .cxhw-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
        .cxhw-ignore-btn{height:27px;display:inline-flex;align-items:center;gap:5px;padding:0 10px;border:1px solid transparent;border-radius:14px;background:#f3f5f9;color:#677181;cursor:pointer;font-size:11px;font-weight:500;white-space:nowrap;transition:background .15s,border-color .15s,color .15s,box-shadow .15s,transform .1s}
        .cxhw-ignore-btn .cxhw-ignore-icon{font-size:13px;line-height:1;color:#97a0af;transition:color .15s}
        .cxhw-ignore-btn:hover{background:#fff1f2;border-color:#fecdd3;color:#d7354d}
        .cxhw-ignore-btn:hover .cxhw-ignore-icon{color:#e05263}
        .cxhw-ignore-btn:active{transform:scale(.97)}
        .cxhw-ignore-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(220,53,69,.14)}
        .cxhw-ignore-btn.restore{background:#ecf9f0;border-color:#d1efdb;color:#218548}
        .cxhw-ignore-btn.restore .cxhw-ignore-icon{color:#39a562}
        .cxhw-ignore-btn.restore:hover{background:#dff5e7;border-color:#a9ddbb;color:#166c37}
        .cxhw-ignore-btn.restore:focus-visible{box-shadow:0 0 0 3px rgba(40,167,69,.15)}
        .cxhw-ld{padding:60px 24px;text-align:center}
        .cxhw-sp{width:36px;height:36px;border:3px solid #e9ecef;border-top-color:#667eea;border-radius:50%;animation:cxhw-ani 1s linear infinite;margin:0 auto 12px}
        @keyframes cxhw-ani{to{transform:rotate(360deg)}}
        .cxhw-em{padding:48px 24px;text-align:center;color:#6c757d;font-size:14px}
        .cxhw-er{padding:16px 24px;background:#f8d7da;color:#721c24;margin:12px 24px;border-radius:6px;font-size:13px}
        .cxhw-ft{padding:14px 24px;background:#f8f9fa;border-top:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center;gap:14px}
        .cxhw-ft-left,.cxhw-ft-center,.cxhw-ft-right{display:flex;align-items:center;gap:8px}
        .cxhw-ft-center{justify-content:center}
        .cxhw-ft-right{justify-content:flex-end}
        .cxhw-rf{padding:7px 18px;background:#667eea;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px}
        .cxhw-rf:hover{background:#5a6fd6}
        .cxhw-status-pill{height:24px;display:inline-flex;align-items:center;padding:0 10px;border:1px solid #e9ecef;border-radius:12px;background:#f8f9fa;color:#6c757d;font-size:11px;white-space:nowrap}
        .cxhw-status-pill:empty{display:none}
        .cxhw-status-ok{color:#28a745;border-color:#d8eddc;background:#f6fbf7}
        .cxhw-autorefresh{display:flex;align-items:center;gap:8px}
        .cxhw-autorefresh label{font-size:12px;color:#6c757d;display:flex;align-items:center;gap:4px;cursor:pointer}
        .cxhw-autorefresh input[type=number]{width:50px;padding:2px 6px;border:1px solid #dee2e6;border-radius:4px;font-size:12px;text-align:center}
        .cxhw-autorefresh input[type=checkbox]{width:14px;height:14px;cursor:pointer}
        #cxhw-sel-modal .cxhw-cb{width:18px;height:18px;border:2px solid #adb5bd;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .15s}
        #cxhw-sel-modal .cxhw-cb.checked{background:#667eea;border-color:#667eea}
        #cxhw-sel-modal .cxhw-cb.checked::after{content:"\\2714";color:#fff;font-size:12px;line-height:1}
        #cxhw-autorefresh-status{font-size:11px;color:#28a745}
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
    function isPeerReview(s) { return /待互評|待互评/.test(s); }
    function isSubmitted(s) { return /待批閱|待批阅|待批改/.test(s); }
    function isCompleted(s) { return /已完成|已批改|已互評|已互评/.test(s); }


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

    // Clean stale selectedCourseIds against current courseCache
    function cleanSelectedCourseIds() {
        if (!selectedCourseIds || !courseCache) return;
        const validIds = new Set(courseCache.map(c => String(c.courseId)));
        const cleaned = selectedCourseIds.filter(id => validIds.has(id));
        if (cleaned.length !== selectedCourseIds.length) {
            selectedCourseIds = cleaned.length > 0 ? cleaned : null;
        }
    }

    // ===== Ignore Homework =====
    let ignoredHomework = {};
    let showIgnored = false;

    function loadIgnoredHomework() {
        try {
            const s = GM_getValue("cxhw_ignored_homework", "{}");
            const parsed = JSON.parse(s);
            if (parsed && typeof parsed === "object") ignoredHomework = parsed;
        } catch (e) {}
    }

    function saveIgnoredHomework() {
        GM_setValue("cxhw_ignored_homework", JSON.stringify(ignoredHomework));
    }

    function getHomeworkKey(courseId, h) {
        // Parse workId from URL for stable key
        const m = (h.url || "").match(/workId=(\d+)/);
        return m ? courseId + ":" + m[1] : courseId + ":" + h.title;
    }

    function isIgnored(courseId, h) {
        return !!ignoredHomework[getHomeworkKey(courseId, h)];
    }

    function ignoreHomework(courseId, courseName, h) {
        const key = getHomeworkKey(courseId, h);
        ignoredHomework[key] = { title: h.title, courseName, ignoredAt: Date.now() };
        saveIgnoredHomework();
    }

    function unignoreHomework(courseId, h) {
        const key = getHomeworkKey(courseId, h);
        delete ignoredHomework[key];
        saveIgnoredHomework();
    }

    // ===== Course Selection =====
    function applyCourseSelection(courses) {
        if (!selectedCourseIds) return courses;
        const validIds = new Set(courses.map(c => String(c.courseId)));
        // Remove stale IDs that no longer exist in course list
        const cleaned = selectedCourseIds.filter(id => validIds.has(id));
        if (cleaned.length === 0) { selectedCourseIds = null; return courses; }
        if (cleaned.length < selectedCourseIds.length) selectedCourseIds = cleaned;
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

            function buildCourseListHtml(q) {
                const displayCourses = hideFinished ? courses.filter(c => isCourseActive(c)) : courses;
                let clHtml = "";
                let visibleCount = 0;
                displayCourses.forEach(c => {
                    const id = String(c.courseId);
                    const name = (c.name || "").toLowerCase();
                    const teacher = (c.teacher || "").toLowerCase();
                    if (q && !name.includes(q) && !teacher.includes(q)) return;
                    visibleCount++;
                    const isActive = isCourseActive(c);
                    const statusStr = !isActive ? '<span style="color:#6c757d;font-size:11px;margin-left:8px">已结课</span>' : '';
                    const newBadge = savedSet && !savedSet.has(id) ? '<span style="background:#667eea;color:#fff;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:8px">新</span>' : '';
                    clHtml += '<label style="display:flex;align-items:center;padding:6px 24px;cursor:pointer;gap:10px;border-bottom:1px solid #f8f9fa" class="cxhw-sel-row">';
                    clHtml += '<div class="cxhw-cb' + (checked.has(id) ? ' checked' : '') + '" data-cid="' + id + '"></div>';
                    clHtml += '<span style="font-size:13px;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escText(c.name) + '</span>';
                    clHtml += '<span style="font-size:12px;color:#6c757d;min-width:60px">' + escText(c.teacher || '') + '</span>';
                    clHtml += statusStr + newBadge;
                    clHtml += '</label>';
                });
                if (!visibleCount) clHtml = '<div style="padding:24px;text-align:center;color:#6c757d">无匹配课程</div>';
                return { html: clHtml, visibleCount, displayCourses };
            }

            function bindCourseListCheckboxes(container) {
                container.querySelectorAll(".cxhw-cb[data-cid]").forEach(cb => {
                    cb.onclick = (e) => {
                        e.stopPropagation();
                        const cid = cb.dataset.cid;
                        if (checked.has(cid)) { checked.delete(cid); cb.classList.remove("checked"); }
                        else { checked.add(cid); cb.classList.add("checked"); }
                        document.getElementById("cxhw-sel-count").textContent = checked.size;
                    };
                });
            }

            function renderSelector() {
                const search = document.getElementById("cxhw-sel-search");
                const q = search ? search.value.trim().toLowerCase() : "";
                const { html: clHtml, displayCourses } = buildCourseListHtml(q);
                const hiddenCount = courses.length - displayCourses.length;
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
                html += '<label style="margin-left:8px;font-size:12px;color:#6c757d;cursor:pointer;display:flex;align-items:center;gap:4px"><div class="cxhw-cb' + (hideFinished ? ' checked' : '') + '" id="cxhw-sel-hidefin-cb"></div> 隐藏已结课</label>';
                html += '<input id="cxhw-sel-search" type="text" placeholder="搜索课程名/教师" value="' + escAttr(q) + '" style="margin-left:auto;padding:4px 10px;border:1px solid #dee2e6;border-radius:6px;font-size:13px;width:180px">';
                html += '</div>';
                html += '<div id="cxhw-sel-courselist" style="overflow-y:auto;max-height:calc(85vh - 200px);padding:4px 0">';
                html += clHtml;
                html += '</div>';
                // Fixed footer with confirm button
                html += '<div style="padding:14px 24px;background:#f8f9fa;border-top:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center">';
                const countNote = hiddenCount > 0 ? '（已隐藏 ' + hiddenCount + ' 门已结课课程）' : '';
                html += '<span style="font-size:13px;color:#6c757d">已选 <b id="cxhw-sel-count" style="color:#667eea">' + checked.size + '</b>/' + displayCourses.length + ' 个课程' + countNote + '</span>';
                html += '<div style="display:flex;gap:10px">';
                html += '<button class="cxhw-fb" id="cxhw-sel-cancel">取消</button>';
                html += '<button class="cxhw-fb on" id="cxhw-sel-confirm">确认</button>';
                html += '</div></div>';
                modal.innerHTML = html;

                // Event bindings
                document.getElementById("cxhw-sel-all").onclick = () => { checked = new Set(displayCourses.map(c => String(c.courseId))); renderSelector(); };
                document.getElementById("cxhw-sel-none").onclick = () => { checked = new Set(); renderSelector(); };
                document.getElementById("cxhw-sel-active").onclick = () => { checked = new Set(displayCourses.filter(c => isCourseActive(c)).map(c => String(c.courseId))); renderSelector(); };
                document.getElementById("cxhw-sel-search").oninput = () => updateCourseList();
                document.getElementById("cxhw-sel-hidefin-cb").onclick = () => {
                    hideFinished = !hideFinished;
                    GM_setValue("cxhw_hideFinished", hideFinished);
                    renderSelector();
                };
                document.getElementById("cxhw-sel-x").onclick = () => {
                    modal.style.display = "none";
                    overlay.style.display = "none";
                    resolve(false);
                };
                document.getElementById("cxhw-sel-cancel").onclick = () => {
                    modal.style.display = "none";
                    overlay.style.display = "none";
                    resolve(false);
                };
                document.getElementById("cxhw-sel-confirm").onclick = () => {
                    if (checked.size === 0) { alert("请至少选择一个课程"); return; }
                    selectedCourseIds = checked.size === courses.length ? null : Array.from(checked);
                    modal.style.display = "none";
                    overlay.style.display = "none";
                    resolve(true);
                };
                bindCourseListCheckboxes(modal);
            }

            function updateCourseList() {
                const search = document.getElementById("cxhw-sel-search");
                const q = search ? search.value.trim().toLowerCase() : "";
                const container = document.getElementById("cxhw-sel-courselist");
                if (!container) return;
                const { html: clHtml } = buildCourseListHtml(q);
                container.innerHTML = clHtml;
                const countEl = document.getElementById("cxhw-sel-count");
                if (countEl) countEl.textContent = checked.size;
                bindCourseListCheckboxes(container);
            }

            // Show modal
            modal.style.display = "block";
            overlay.style.display = "block";
            renderSelector();
        });
    }

    // ===== Auto Refresh =====
    let autoRefreshOnLoad = GM_getValue("cxhw_autoRefreshOnLoad", true);  // default ON
    let autoRefreshInterval = GM_getValue("cxhw_autoRefreshInterval", 0);  // 0 = OFF, minutes
    let autoRefreshTimer = null;

    function startAutoRefreshTimer() {
        if (autoRefreshTimer) clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
        if (autoRefreshInterval > 0) {
            autoRefreshTimer = setInterval(() => {
                if (!loading) doRefresh();
            }, autoRefreshInterval * 60 * 1000);
        }
        updateAutoRefreshStatus();
    }

    function updateAutoRefreshStatus() {
        const el = document.getElementById('cxhw-autorefresh-status');
        if (!el) return;
        const parts = [];
        if (autoRefreshOnLoad) parts.push('页面加载时刷新');
        if (autoRefreshInterval > 0) parts.push('每' + autoRefreshInterval + '分钟');
        el.textContent = parts.join(' · ');
    }

    // ===== UI =====
    let panel, overlay, cachedData = null, loading = false;
    // Tracks open course sections so re-rendering keeps expand/collapse state stable.
    const expandedCourseIds = new Set();

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
                '<div class="cxhw-tb-main">' +
                    '<div class="cxhw-seg" role="tablist" aria-label="作业状态筛选">' +
                        '<button class="cxhw-filter on" data-f="all" role="tab"><span>全部</span><span class="cxhw-filter-count" data-count="all">0</span></button>' +
                        '<button class="cxhw-filter" data-f="pending" role="tab"><span>未交</span><span class="cxhw-filter-count" data-count="pending">0</span></button>' +
                        '<button class="cxhw-filter" data-f="peerreview" role="tab"><span>待互评</span><span class="cxhw-filter-count" data-count="peerreview">0</span></button>' +
                        '<button class="cxhw-filter" data-f="submitted" role="tab"><span>待批阅</span><span class="cxhw-filter-count" data-count="submitted">0</span></button>' +
                        '<button class="cxhw-filter" data-f="completed" role="tab"><span>已完成</span><span class="cxhw-filter-count" data-count="completed">0</span></button>' +
                    '</div>' +
                    '<div class="cxhw-summary"><span>未交</span><strong id="cxhw-pending-total">0</strong><span>项</span><span class="cxhw-summary-sep"></span><span>当前有效项</span><b id="cxhw-count">0</b></div>' +
                '</div>' +
                '<div class="cxhw-tb-actions">' +
                    '<span class="cxhw-tools-label">管理</span>' +
                    '<button class="cxhw-tool cxhw-tool-primary" id="cxhw-coursesel"><span class="cxhw-tool-icon">&#9776;</span><span>选择课程</span><span class="cxhw-course-count" id="cxhw-selected-count">0</span></button>' +
                    '<button class="cxhw-tool" id="cxhw-showignored"><span class="cxhw-tool-icon">&#8856;</span><span id="cxhw-ignore-label">显示已忽略</span><span class="cxhw-tool-badge" id="cxhw-ignored-count">0</span></button>' +
                    '<button class="cxhw-tool" id="cxhw-expand"><span class="cxhw-tool-icon" id="cxhw-expand-icon">&#9662;</span><span id="cxhw-expand-label">展开全部</span></button>' +
                    '<span class="cxhw-manage-hint">只展示已选择课程中的作业</span>' +
                '</div>' +
            '</div>' +
            '<div class="cxhw-cnt" id="cxhw-body">' +
                '<div class="cxhw-em">点击刷新按钮加载数据</div>' +
            '</div>' +
            '<div class="cxhw-ft">' +
                '<div class="cxhw-ft-left">' +
                    '<button class="cxhw-rf" id="cxhw-rfbtn">&#128260; 刷新数据</button>' +
                '</div>' +
                '<div class="cxhw-ft-center cxhw-seg" aria-label="状态信息">' +
                    '<span class="cxhw-status-pill" id="cxhw-cc"></span>' +
                    '<span class="cxhw-status-pill cxhw-status-ok" id="cxhw-autorefresh-status"></span>' +
                '</div>' +
                '<div class="cxhw-ft-right">' +
                    '<div class="cxhw-autorefresh cxhw-seg" aria-label="自动刷新设置">' +
                        '<label title="页面加载/刷新时自动获取最新数据"><input type="checkbox" id="cxhw-ar-onload"> 页面加载时刷新</label>' +
                        '<label title="按固定时间间隔自动刷新"><input type="checkbox" id="cxhw-ar-interval-on"> 每</label>' +
                        '<input type="number" id="cxhw-ar-interval" min="1" max="120" value="' + autoRefreshInterval + '" title="自动刷新间隔（分钟）"> 分钟' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(panel);

        document.getElementById("cxhw-xbtn").onclick = toggle;
        document.getElementById("cxhw-rfbtn").onclick = doRefresh;

        // Auto-refresh controls
        const arOnload = document.getElementById("cxhw-ar-onload");
        const arIntervalOn = document.getElementById("cxhw-ar-interval-on");
        const arInterval = document.getElementById("cxhw-ar-interval");
        arOnload.checked = autoRefreshOnLoad;
        arIntervalOn.checked = autoRefreshInterval > 0;
        arInterval.value = autoRefreshInterval || 30;
        arInterval.disabled = !arIntervalOn.checked;
        updateAutoRefreshStatus();

        arOnload.onchange = () => {
            autoRefreshOnLoad = arOnload.checked;
            GM_setValue("cxhw_autoRefreshOnLoad", autoRefreshOnLoad);
            updateAutoRefreshStatus();
        };
        arIntervalOn.onchange = () => {
            if (arIntervalOn.checked) {
                autoRefreshInterval = parseInt(arInterval.value) || 30;
            } else {
                autoRefreshInterval = 0;
            }
            arInterval.disabled = !arIntervalOn.checked;
            GM_setValue("cxhw_autoRefreshInterval", autoRefreshInterval);
            startAutoRefreshTimer();
        };
        arInterval.onchange = () => {
            const val = Math.max(1, Math.min(120, parseInt(arInterval.value) || 30));
            arInterval.value = val;
            autoRefreshInterval = val;
            GM_setValue("cxhw_autoRefreshInterval", autoRefreshInterval);
            if (arIntervalOn.checked) startAutoRefreshTimer();
        };

        // Restore persisted filter state
        if (cfilter !== "all") {
            panel.querySelectorAll(".cxhw-filter[data-f]").forEach(b => {
                b.classList.toggle("on", b.getAttribute("data-f") === cfilter);
            });
        }

        loadIgnoredHomework();

        panel.querySelectorAll(".cxhw-filter[data-f]").forEach(b => {
            b.onclick = () => {
                cfilter = b.getAttribute("data-f");
                GM_setValue("cxhw_cfilter", cfilter);
                panel.querySelectorAll(".cxhw-filter[data-f]").forEach(x => x.classList.remove("on"));
                b.classList.add("on");
                render();
            };
        });

        // Show/hide ignored homework toggle
        document.getElementById("cxhw-showignored").onclick = function() {
            showIgnored = !showIgnored;
            this.classList.toggle("on", showIgnored);
            render();
        };

        // Expand/collapse all courses currently visible in the list.
        document.getElementById("cxhw-expand").onclick = () => {
            const headers = Array.from(panel.querySelectorAll("#cxhw-body .cxhw-ch"));
            const shouldExpand = headers.some(ch => !ch.classList.contains("open"));
            headers.forEach(ch => {
                const cid = String(ch.dataset.cid);
                if (shouldExpand) expandedCourseIds.add(cid);
                else expandedCourseIds.delete(cid);
                ch.classList.toggle("open", shouldExpand);
            });
            updateToolbarState();
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
            // Ignore/unignore button
            const ignoreBtn = e.target.closest(".cxhw-ignore-btn");
            if (ignoreBtn) {
                e.stopPropagation();
                const action = ignoreBtn.dataset.action;
                const cid = ignoreBtn.dataset.cid;
                if (action === "ignore") {
                    ignoreHomework(cid, ignoreBtn.dataset.cname, {
                        title: ignoreBtn.dataset.title,
                        url: ignoreBtn.dataset.url
                    });
                } else if (action === "unignore") {
                    // Find homework object from cachedData to pass to unignoreHomework
                    const key = ignoreBtn.dataset.key;
                    delete ignoredHomework[key];
                    saveIgnoredHomework();
                }
                render();
                return;
            }
            // Course header toggle
            const ch = e.target.closest(".cxhw-ch");
            if (ch && !e.target.closest("a")) {
                const cid = String(ch.dataset.cid);
                if (expandedCourseIds.has(cid)) expandedCourseIds.delete(cid);
                else expandedCourseIds.add(cid);
                ch.classList.toggle("open");
                updateToolbarState();
                return;
            }
            // Homework item click
            const hi = e.target.closest(".cxhw-hi[data-url]");
            if (hi && !isIgnored(hi.dataset.cid, {url: hi.getAttribute("data-url")})) {
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

    function updateToolbarState() {
        if (!panel) return;
        const effectiveHomework = [];
        const ignoredHomeworkItems = [];
        (cachedData || []).forEach(c => {
            if (c.hwPending || c.error || !Array.isArray(c.homework)) return;
            c.homework.forEach(h => {
                if (isIgnored(c.courseId, h)) ignoredHomeworkItems.push(h);
                else effectiveHomework.push(h);
            });
        });
        const counts = {
            all: effectiveHomework.length,
            pending: effectiveHomework.filter(h => isPending(h.status)).length,
            peerreview: effectiveHomework.filter(h => isPeerReview(h.status)).length,
            submitted: effectiveHomework.filter(h => isSubmitted(h.status)).length,
            completed: effectiveHomework.filter(h => isCompleted(h.status)).length
        };
        Object.keys(counts).forEach(name => {
            const el = panel.querySelector('[data-count="' + name + '"]');
            if (el) el.textContent = counts[name];
        });
        const pendingEl = document.getElementById("cxhw-pending-total");
        if (pendingEl) pendingEl.textContent = counts.pending;
        const selectedEl = document.getElementById("cxhw-selected-count");
        if (selectedEl) selectedEl.textContent = cachedData ? cachedData.length : 0;
        const ignoredEl = document.getElementById("cxhw-ignored-count");
        if (ignoredEl) ignoredEl.textContent = ignoredHomeworkItems.length;
        const ignoredLabel = document.getElementById("cxhw-ignore-label");
        if (ignoredLabel) ignoredLabel.textContent = showIgnored ? "隐藏已忽略" : "显示已忽略";
        const ignoredBtn = document.getElementById("cxhw-showignored");
        if (ignoredBtn) ignoredBtn.classList.toggle("on", showIgnored);
        const headers = Array.from(panel.querySelectorAll("#cxhw-body .cxhw-ch"));
        const allOpen = headers.length > 0 && headers.every(ch => ch.classList.contains("open"));
        const expandLabel = document.getElementById("cxhw-expand-label");
        const expandIcon = document.getElementById("cxhw-expand-icon");
        if (expandLabel) expandLabel.textContent = allOpen ? "折叠全部" : "展开全部";
        if (expandIcon) expandIcon.innerHTML = allOpen ? "&#9652;" : "&#9662;";
    }

    function render() {
        if (!cachedData) return;
        let html = "";
        let count = 0;
        let renderedCount = 0;
        let errorCount = 0;
        let pendingCount = 0;
        cachedData.forEach(c => {
            if (c.hwPending) { pendingCount++; return; }
            if (c.error) { errorCount++; return; }
            if (!c.homework || !c.homework.length) return;
            let hw = c.homework;
            // Status filter
            if (cfilter === "pending") hw = hw.filter(h => isPending(h.status));
            else if (cfilter === "submitted") hw = hw.filter(h => isSubmitted(h.status));
            else if (cfilter === "peerreview") hw = hw.filter(h => isPeerReview(h.status));
            else if (cfilter === "completed") hw = hw.filter(h => isCompleted(h.status));
            // Ignore filter: hide ignored items unless showIgnored is on
            const hwVisible = hw.filter(h => showIgnored || !isIgnored(c.courseId, h));
            if (!hwVisible.length) return;
            renderedCount += hwVisible.length;
            count += hwVisible.filter(h => !isIgnored(c.courseId, h)).length;
            const pend = c.homework.filter(h => isPending(h.status)).length;
            const wait = c.homework.filter(h => isSubmitted(h.status)).length;
            const peer = c.homework.filter(h => isPeerReview(h.status)).length;
            const done = c.homework.filter(h => isCompleted(h.status)).length;
            const courseUrl = safeUrl(buildCourseUrl(c));
            html += '<div class="cxhw-cs">';
            html += '<div class="cxhw-ch' + (expandedCourseIds.has(String(c.courseId)) ? ' open' : '') + '" data-cid="' + escAttr(String(c.courseId)) + '">';
            html += '<span class="cxhw-cn"><a href="' + courseUrl + '" target="_blank" onclick="event.stopPropagation()" style="color:inherit;text-decoration:none;">' + escText(c.name) + '</a></span>';
            html += '<span class="cxhw-ci">';
            if (pend) html += '<span class="r">' + pend + ' 未交</span> ';
            if (peer) html += '<span style="color:#6f42c1">' + peer + ' 待互评</span> ';
            if (wait) html += '<span style="color:#856404">' + wait + ' 待批阅</span> ';
            html += '<span class="g">' + done + ' 完成</span> ';
            html += '<span class="cxhw-ar" aria-hidden="true"></span></span></div>';
            html += '<div class="cxhw-hl">';
            hwVisible.forEach(h => {
                const ignored = isIgnored(c.courseId, h);
                const sc = isPending(h.status) ? "cxhw-ss-nj"
                    : isPeerReview(h.status) ? "cxhw-ss-pr"
                    : isSubmitted(h.status) ? "cxhw-ss-dp"
                    : isCompleted(h.status) ? "cxhw-ss-ok" : "cxhw-ss-ot";
                const hwUrl = h.url ? safeUrl(h.url) : "";
                html += '<div class="cxhw-hi' + (ignored ? ' is-ignored' : '') + '"' + (hwUrl ? ' data-url="' + escAttr(hwUrl) + '"' : '') + '>';
                html += '<div style="flex:1;min-width:0">';
                html += '<div class="cxhw-ht">' + escText(h.title) + (ignored ? ' <span class="cxhw-ignored-mark">已忽略</span>' : '') + '</div>';
                if (h.deadline) html += '<div class="cxhw-hd">&#9200; ' + escText(h.deadline) + '</div>';
                html += '</div>';
                html += '<div class="cxhw-actions">';
                html += '<span class="cxhw-ss ' + sc + '">' + escText(h.status) + '</span>';
                if (ignored) {
                    html += '<button class="cxhw-ignore-btn restore" data-action="unignore" data-cid="' + c.courseId + '" data-key="' + escAttr(getHomeworkKey(c.courseId, h)) + '" title="恢复显示该作业" aria-label="恢复显示：' + escAttr(h.title) + '"><span class="cxhw-ignore-icon" aria-hidden="true">&#8634;</span><span>恢复</span></button>';
                } else {
                    html += '<button class="cxhw-ignore-btn" data-action="ignore" data-cid="' + c.courseId + '" data-cname="' + escAttr(c.name) + '" data-key="' + escAttr(getHomeworkKey(c.courseId, h)) + '" data-title="' + escAttr(h.title) + '" data-url="' + escAttr(h.url || '') + '" title="隐藏此作业，不计入当前待办" aria-label="忽略：' + escAttr(h.title) + '"><span class="cxhw-ignore-icon" aria-hidden="true">&#8856;</span><span>忽略</span></button>';
                }
                html += '</div></div>';
            });
            html += '</div></div>';
        });
        if (!renderedCount) {
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
        document.getElementById("cxhw-count").textContent = count;
        updateToolbarState();
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

            // Clean stale selectedCourseIds against fresh course list
            cleanSelectedCourseIds();

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
            let skippedCached = 0;
            const coursesToFetch = selectedCourses.filter(c => {
                if (forceAll) return true;
                const cached = homeworkCache[c.courseId];
                if (!cached) return true;
                if (!cached.time) return true;
                if ((Date.now() - cached.time) < CONFIG.cacheTime) { skippedCached++; return false; }
                return true;
            });
            const skipMsg = skippedCached > 0 ? (skippedCached + " 个已缓存") : "";

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
        cleanSelectedCourseIds(); // clean stale IDs before first render
        createUI();
        try {
            cachedData = buildFilteredCachedData();
            render();
        } catch (e) {
            console.warn("[ChaoxingHW] Failed to build cached data:", e);
            courseCache = null;
            homeworkCache = {};
        }

        // Start interval timer if configured
        startAutoRefreshTimer();

        // Auto-refresh on page load: distinguish refresh vs new-tab vs in-tab navigation
        const navEntry = performance.getEntriesByType("navigation")[0];
        const isReload = navEntry && navEntry.type === "reload";
        const storedUrl = sessionStorage.getItem("cxhw_loaded");
        sessionStorage.setItem("cxhw_loaded", location.href);

        if (autoRefreshOnLoad) {
            if (isReload) {
                // F5 or browser reload button — always refresh
                doRefresh();
                return;
            }
            if (!storedUrl) {
                // First load in this tab
                if (!document.referrer || !document.referrer.startsWith(location.origin)) {
                    // Fresh browser tab (address bar, bookmark, external link) — refresh
                    doRefresh();
                    return;
                }
                // Same-origin referrer = opened from 学习通 link — skip
            }
            // In-tab navigation or new tab from platform — skip
        }

        // Only auto-fetch on first visit (no cache at all). Expired cache is
        // displayed as-is; user must click refresh to update.
        if (!courseCache) loadData();
    }

    if (document.readyState === "complete") init();
    else window.addEventListener("load", init);
})();
