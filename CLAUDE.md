# 学习通作业统一查看器 — 项目文档

## 项目概述

Tampermonkey 用户脚本，自动获取学习通（chaoxing.com）所有课程的作业状态，统一展示在悬浮面板中。

- **仓库**: `E:\Dev\Projects\chaoxing-homework-checker`
- **主文件**: `chaoxing-homework-checker.user.js`（~965行）
- **开发工具**: Claude Code + Codex (GPT-5.5) 协作
- **GitHub**: https://github.com/Zhanghuaimin-233/chaoxing-homework-checker

---

## 核心架构

### API 逆向（通过 CDP Proxy 探索得出）

| 步骤 | 端点 | 类型 | 说明 |
|------|------|------|------|
| 课程列表 | `mooc1-api.chaoxing.com/mycourse/backclazzdata` | JSON | 返回所有已加入课程 |
| 获取 workEnc | `mooc1.chaoxing.com/visit/stucoursemiddle` | HTML 重定向 | 从课程页解析 `<input id="workEnc">` 获取加密令牌 |
| 作业列表 | `mooc1.chaoxing.com/mooc-ans/mooc2/work/list` | HTML | 需要 `enc` 参数，解析 `<li>` 元素 |

**关键发现**：
- 作业列表 API 不存在 JSON 版本，只能通过 HTML 解析
- `workEnc` 是每课程独立的加密令牌，需先访问课程页获取
- `stucoursemiddle` 会重定向到 `mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu?enc=...`
- 直接访问 `mooc2-ans/.../stu?courseid=...` 会返回"无效的参数"，必须通过 `stucoursemiddle` 入口

### 关键参数

- `courseId` — 课程 ID（纯数字，来自 `c.id`）
- `classId` — 班级 ID（纯数字，来自 `ch.content.id`）
- `cpi` — 课程人员 ID（纯数字，来自 `ch.content.cpi`）
- `workEnc` — 每课程加密令牌，32位hex，从课程页 HTML 提取

### 两层缓存架构

```
Layer 1: courseCache（课程列表，全量缓存，30分钟TTL）
  └─ GM_getValue("cxhw_courses") + "cxhw_courses_time"

Layer 2: homeworkCache（作业数据，按courseId独立缓存，30分钟TTL）
  └─ GM_getValue("cxhw_homework") — { courseId: { homework, error, time } }

辅助存储:
  - cxhw_selected_courses — 用户选择的课程ID数组（null=全选）
  - cxhw_cfilter — 筛选状态（all/pending/submitted/peerreview/completed）
  - cxhw_hideFinished — 隐藏已结课开关
  - cxhw_safeMode — 安全模式开关
  - cxhw_autoRefreshOnLoad — 页面加载时刷新
  - cxhw_autoRefreshInterval — 定时刷新间隔（分钟）
  - cxhw_ignored_homework — 已忽略的作业列表
```

### 数据流

```
init()
  ├─ loadCacheFromStorage()     // 从GM存储恢复所有缓存
  ├─ cleanSelectedCourseIds()   // 清理过期的课程选择ID
  ├─ createUI()                 // 注入DOM、绑定事件
  ├─ buildFilteredCachedData()  // 用缓存数据渲染
  ├─ startAutoRefreshTimer()    // 启动定时刷新
  └─ auto-refresh logic         // sessionStorage + Navigation API 判断

loadData(forceAll)
  ├─ fetchCourseList()          // Layer 1: 获取课程列表
  ├─ cleanSelectedCourseIds()   // 清理过期选择
  ├─ showCourseSelector()       // 首次加载弹出选择器
  ├─ applyCourseSelection()     // 按选择过滤课程
  ├─ fetchAllHomework()         // Layer 2: 分批获取作业
  │   └─ fetchCourseHomework()  // 单课程：workEnc → 分页作业列表
  ├─ saveCacheToStorage()       // 持久化两层缓存
  └─ render()                   // 渲染面板
```

---

## 核心函数速查

| 函数 | 作用 |
|------|------|
| `fetchCourseList()` | 调用课程列表API，返回 `[{courseId, classId, cpi, name, teacher, isretire, endDate}]` |
| `fetchWorkEnc(courseId, classId, cpi)` | 访问课程页获取 workEnc 字符串 |
| `fetchHomeworkList(courseId, classId, cpi, workEnc, pageNum)` | 获取单页作业列表，返回 `{items, totalPages}` |
| `fetchCourseHomework(course)` | 单课程完整流程：workEnc → 分页拉取 → 合并结果 |
| `fetchAllHomework(courses, onProgress)` | 并发获取多课程作业（默认3路并发，500ms间隔） |
| `applyCourseSelection(courses)` | 按 selectedCourseIds 过滤，自动清理过期ID |
| `buildCachedData()` / `buildFilteredCachedData()` | 将两层缓存合并为渲染数据 |
| `isCourseActive(course)` | `isretire!==1 && endDate未过期` |
| `isPending(s)` / `isSubmitted(s)` / `isPeerReview(s)` / `isCompleted(s)` | 状态判断（繁简体兼容） |
| `getHomeworkKey(courseId, h)` | 从URL解析workId生成稳定key：`courseId:workId` |
| `safeUrl(u)` | 只允许 http/https 协议 |
| `escText(s)` / `escAttr(s)` | HTML转义（文本/属性上下文） |
| `isValidId(v)` | 纯数字校验 `/^\d+$/` |

---

## 状态匹配（繁简体兼容）

平台使用繁简混合中文，必须用正则模糊匹配：

| 函数 | 匹配模式 | 分类 |
|------|----------|------|
| `isPending` | `/未交\|未提交/` | 红色 |
| `isPeerReview` | `/待互評\|待互评/` | 紫色 |
| `isSubmitted` | `/待批閱\|待批阅\|待批改/` | 黄色 |
| `isCompleted` | `/已完成\|已批改\|已互評\|已互评/` | 绿色 |

优先级：未交 > 待互评 > 待批阅 > 已完成 > 其他（灰色）

---

## UI 结构

```
#cxhw-tg          — 右下角浮动按钮（z-index:1000）
#cxhw-overlay     — 半透明遮罩
#cxhw-panel       — 主面板（z-index:999999）
  .cxhw-hdr      — 标题栏（渐变背景）
  .cxhw-tb       — 工具栏（筛选按钮+功能按钮）
  .cxhw-cnt      — 课程列表滚动区
  .cxhw-ft       — 底栏（刷新+自动刷新设置）
#cxhw-sel-modal   — 课程选择模态框（z-index:1000000）
```

**工具栏按钮**：全部 | 未交 | 待互评 | 待批阅 | 已完成 | 显示已忽略 | 展开/折叠 | 课程选择

**底栏控件**：刷新数据 | 缓存时间 | 自动刷新状态 | 页面加载时刷新 ☑ | 每 [N] 分钟

---

## 开发经验与踩坑记录

### 1. workEnc 获取方式

**错误尝试**：直接访问 `mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu?courseid=...&v=2` → 返回"无效的参数"

**正确方式**：通过 `mooc1.chaoxing.com/visit/stucoursemiddle?courseid=...&clazzid=...&cpi=...&ismooc2=1&v=2` 重定向获取

### 2. 繁简体状态匹配

平台返回的状态文本繁简混用（如"待批閱"繁体、"待批阅"简体），必须用正则而非精确匹配。早期用 `===` 导致筛选失效。

### 3. XSS 防护

- 作业URL来自不可信HTML，必须用 `safeUrl()` 过滤 `javascript:` 协议
- 属性上下文用 `escAttr()`（转义 `"`），文本上下文用 `escText()`
- 课程ID用 `isValidId()` 校验纯数字

### 4. sessionStorage 刷新检测

用 `sessionStorage` + `performance.getEntriesByType("navigation")[0].type` 区分：
- F5 刷新 → 触发自动刷新
- 新标签页打开 → 跳过刷新，用缓存
- 页内导航 → 跳过刷新

### 5. 课程选择器 checkbox 兼容性

学习通详情页的全局 CSS 会重置原生 `<input type="checkbox">` 样式。改用自定义 div checkbox（`.cxhw-cb`），不受页面CSS影响。

### 6. 批处理进度溢出

`fetchAllHomework` 的 worker 闭包用 `courses.length` 做循环边界，每批 worker 都跑到列表末尾导致重复处理。修复：引入 `batchLimit` 变量限制每批边界。

### 7. saveCacheToStorage 类型不一致

`Set.has()` 严格比较 `number !== string`。`courseId` 是数字，但 `Object.keys(homeworkCache)` 返回字符串。修复：`new Set(courseCache.map(c => String(c.courseId)))`

### 8. 暂停功能导致死循环

`rate.paused` 在请求失败时自动设为 true → 用户取消暂停 → 又触发加载 → 又失败 → 死循环。最终方案：移除暂停功能，风控检测改为日志警告。

### 9. Codex 沙箱权限问题

Windows Store 版 PowerShell 路径 `C:\Program Files\WindowsApps\...` 被安全策略拦截，`CreateProcessAsUserW failed: 5`。解决：`~/.codex/config.toml` 设置 `sandbox = "unelevated"`。

---

## 迭代历史

| 版本 | 里程碑 |
|------|--------|
| v1.0.0 | 基础功能：课程列表+作业获取+悬浮面板+筛选 |
| v1.1.0 | 安全修复：safeUrl/escText/escAttr、事件委托、iframe过滤 |
| v2.0.0 | 两层缓存架构、课程选择功能、待互评状态、自动刷新、反风控 |
| 当前 | 忽略作业、隐藏已结课移入选择器、sessionStorage刷新检测 |

共 15 轮 Codex 审查，累计修复 60+ 个问题。

---

## Codex 审查清单

每次重大改动后用 Codex 审查，关注：
1. XSS/注入安全（URL、属性、innerHTML）
2. 类型一致性（number vs string key）
3. 竞态条件（loading guard、并发控制）
4. 缓存一致性（两层缓存同步、过期清理）
5. 繁简体匹配覆盖
6. 边界情况（空数组、过期ID、缓存损坏）
