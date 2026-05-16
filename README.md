# 学习通作业统一查看器

篡改猴(Tampermonkey)用户脚本，一键检测学习通所有课程作业状态，统一展示在悬浮面板中。

## 功能特性

- 自动获取当前账号所有课程的作业数据
- 按课程分组显示，支持展开/折叠
- 状态标签：未交（红）、待批改（黄）、已完成（绿）、其他（灰）
- 筛选按钮：全部 / 未交 / 待批改 / 已完成
- 30分钟本地缓存，减少重复请求
- 并发控制（3路），避免触发平台限流

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击 Tampermonkey 图标 → 创建新脚本
3. 清空编辑器内容，粘贴 `chaoxing-homework-checker.user.js` 全部内容
4. `Ctrl+S` 保存
5. 访问任意 `chaoxing.com` 页面，右下角出现按钮即安装成功

## 使用

- 点击右下角浮动按钮打开作业面板
- 首次打开自动加载所有课程作业（耗时取决于课程数量）
- 点击课程名称展开该课程的作业列表
- 使用顶部筛选按钮切换显示状态
- 点击「刷新数据」清除缓存重新加载

## API 结构

开发过程中通过浏览器 CDP 协议逆向分析得出：

| 步骤 | 端点 | 说明 |
|------|------|------|
| 课程列表 | `mooc1-api.chaoxing.com/mycourse/backclazzdata` | JSON 接口，返回所有已加入课程 |
| 获取 workEnc | `mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu` | HTML 页面，解析 `<input id="workEnc">` |
| 作业列表 | `mooc1.chaoxing.com/mooc2/work/list` | HTML 页面，需 `enc` + `ut=s` 参数 |

关键参数：
- `courseId` — 课程 ID
- `classId` — 班级 ID
- `cpi` — 课程人员 ID
- `workEnc` — 每课程加密令牌，从步骤 2 的 HTML 中提取
- `ut=s` — 必须参数，标识学生身份

## 技术栈

- Tampermonkey 用户脚本
- `GM_xmlhttpRequest` 绕过跨域限制
- `GM_setValue` / `GM_getValue` 本地缓存
- DOMParser 解析 HTML 响应
- 原生 CSS，无外部依赖

## 限制

- 仅支持学生账号（`roletype: 3`）
- 作业状态依赖平台 HTML 结构，平台更新可能导致解析失效
- 缓存期间不会自动刷新，需手动点击刷新按钮

## 文件结构

```
chaoxing-homework-checker/
├── chaoxing-homework-checker.user.js   # 篡改猴脚本主文件
└── README.md
```

## 开发记录

开发工具：Claude Code + Codex (GPT-5.5) 协作

1. 通过 CDP Proxy 连接用户 Chrome，获取学习通登录态
2. 探索课程列表 API（JSON 接口，直接可用）
3. 尝试作业列表 JSON API → 返回 403，不可用
4. 通过 Codex 探索发现 workEnc 机制：需先从课程页提取加密令牌
5. 确认作业列表为 HTML 接口，解析 `<li>` 元素获取作业数据
6. 生成完整用户脚本（378 行）
