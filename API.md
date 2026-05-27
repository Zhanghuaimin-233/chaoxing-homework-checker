# 学习通 API 文档

本文档记录通过 CDP (Chrome DevTools Protocol) 逆向分析得到的学习通 API 接口。

---

## 1. 课程列表接口

**端点**: `GET https://mooc1-api.chaoxing.com/mycourse/backclazzdata`

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `view` | string | 固定值 `json` |
| `rss` | string | 固定值 `1` |

**响应**: JSON

```json
{
  "result": 1,
  "msg": "获取成功",
  "channelList": [
    {
      "content": {
        "id": 143971539,          // classId — 班级ID
        "cpi": 354331126,         // cpi — 课程人员ID
        "isretire": 0,            // 0=正常, -1=已结课, 1=已归档
        "endDate": "2028-03-30 12:58",
        "course": {
          "data": [
            {
              "id": 262350078,    // courseId — 课程ID
              "name": "形势与政策",
              "teacherfactor": "张三"
            }
          ]
        }
      }
    }
  ]
}
```

**关键字段**:
- `channelList[].content.id` → `classId`
- `channelList[].content.cpi` → `cpi`
- `channelList[].content.course.data[].id` → `courseId`
- `channelList[].content.isretire` → 课程状态（`0` 正常, `-1` 已结课, `1` 已归档）
- `channelList[].content.endDate` → 课程结束时间

---

## 2. 获取 workEnc

**端点**: `GET https://mooc1.chaoxing.com/visit/stucoursemiddle`

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `courseid` | number | 课程ID |
| `clazzid` | number | 班级ID |
| `cpi` | number | 课程人员ID |
| `ismooc2` | string | 固定值 `1` |
| `v` | string | 固定值 `2` |

**行为**: 重定向到 `mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu?enc=...`

**提取方式**:
1. 从 HTML 中查找 `<input id="workEnc" value="...">`
2. 备用：从页面 URL 或 HTML 中正则匹配 `enc=([a-f0-9]{32})`

**workEnc**: 32位 hex 字符串，每课程独立，用于后续作业列表请求。

---

## 3. 作业列表接口

**端点**: `GET https://mooc1.chaoxing.com/mooc-ans/mooc2/work/list`

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `courseId` | number | 课程ID |
| `classId` | number | 班级ID |
| `cpi` | number | 课程人员ID |
| `enc` | string | workEnc（32位hex） |
| `pageNum` | number | 页码，从1开始 |

**响应**: HTML 页面

### 3.1 作业条目结构

每个作业条目为 `<li data="...">` 元素，包含以下子元素：

```html
<li data="https://mooc1.chaoxing.com/mooc-ans/mooc2/work/task?...">
  <!-- 作业类型标签 -->
  <div class="tag icon-zy"></div>        <!-- 普通作业 -->
  <div class="tag icon-zy-g"></div>      <!-- 已完成作业 -->
  <div class="tag icon-hp-gy"></div>     <!-- 互评作业 -->

  <div class="right-content">
    <!-- 作业标题 -->
    <p class="overHidden2 fl">作业标题</p>

    <!-- 状态文本 -->
    <p class="status fl">未交</p>

    <!-- 互评标签（仅互评类作业） -->
    <i class="label fl">互评</i>

    <!-- 智能分析按钮（部分作业） -->
    <a class="listSubmit fl insightBtn" href="...">智能分析</a>
  </div>

  <!-- 截止时间（仅未过期的普通作业） -->
  <!-- ⚠️ 已过期的作业：.time 元素被完全移除，status 仍为"未交" -->
  <div class="time notOver" tabindex="0">
    <img src="//mooc1.chaoxing.com/mooc-ans/mooc2/images/endTime.png">
    剩余90小时37分钟
  </div>
</li>
```

### 3.2 字段说明

| 选择器 | 字段 | 说明 |
|--------|------|------|
| `li[data]` | `data` 属性 | 作业详情页 URL |
| `.overHidden2` | title | 作业标题 |
| `.status` | status | 状态文本（见状态表） |
| `.time` | deadline | 截止时间描述文本 |
| `.time` 的 class | `notOver` | 未过期时含此 class |
| `.label` | label | 互评标签（`互评` 或空） |
| `.tag` 的 class | type | `icon-zy`=普通, `icon-zy-g`=已完成, `icon-hp-gy`=互评 |

### 3.3 状态文本（繁简混合）

| 状态 | 分类 | 正则匹配 |
|------|------|----------|
| 未交 / 未提交 | 红色（待办） | `/未交\|未提交/` |
| 待互評 / 待互评 | 紫色（互评） | `/待互評\|待互评/` |
| 待批閱 / 待批阅 / 待批改 | 黄色（待批） | `/待批閱\|待批阅\|待批改/` |
| 已完成 / 已批改 / 已互評 / 已互评 | 绿色（完成） | `/已完成\|已批改\|已互評\|已互评/` |
| 已互评 | 绿色 | `/已互評\|已互评/` |

### 3.4 截止时间格式

**未过期作业**:
```html
<div class="time notOver" tabindex="0">
  <img src="...endTime.png">剩余90小时37分钟
</div>
```
- class 含 `notOver` 表示未过期
- 文本格式：`剩余X小时Y分钟`

**已过期作业**: `.time` 元素被**完全移除**（不是 class 变化），status 仍为"未交"
```html
<!-- 已过期的作业：无 .time 元素 -->
<li data="...">
  <div class="tag icon-zy-g"></div>
  <div class="right-content">
    <p class="overHidden2 fl">作业标题</p>
    <p class="status fl">未交</p>
  </div>
  <div class="clearfix"></div>
</li>
```

**无截止时间**: 不存在 `.time` 元素（如已提交的作业，或已过期的作业）

### 3.5 互评详情页

**端点**: `GET https://mooc1.chaoxing.com/mooc-ans/mooc2/work/eval-list`

**参数**: 同作业列表（`courseId`, `classId`, `cpi`, `enc`）+ `workId`, `answerId`

**互评时间** (`.hpInfo` 元素):
```html
<p class="hpInfo">互评时间：05-08 19:39 至 05-12 16:39</p>
```
- 格式：`互评时间：MM-DD HH:mm 至 MM-DD HH:mm`
- "至"后的日期为互评截止时间
- ⚠️ **此元素仅在详情页存在，作业列表页无此信息**

### 3.6 分页

```html
<div id="page">
  <li class="xl-prevPage">上一页</li>
  <li class="xl-active">1</li>
  <li>2</li>
  <li class="xl-nextPage">下一页</li>
</div>
```
- 页码从 `#page` 内的 `<li>` 文本提取
- 排除 `xl-prevPage` 和 `xl-nextPage` class
- 取最大数字作为 `totalPages`

---

## 4. 作业详情页

**端点**: `GET https://mooc1.chaoxing.com/mooc-ans/mooc2/work/task`

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `courseId` | number | 课程ID |
| `classId` | number | 班级ID |
| `cpi` | number | 课程人员ID |
| `workId` | number | 作业ID |
| `answerId` | number | 答案ID |
| `enc` | string | workEnc |

---

## 5. 关键参数来源

| 参数 | 来源 | 提取方式 |
|------|------|----------|
| `courseId` | 课程列表接口 | `channelList[].content.course.data[].id` |
| `classId` | 课程列表接口 | `channelList[].content.id` |
| `cpi` | 课程列表接口 | `channelList[].content.cpi` |
| `workEnc` | 课程中间页 | `<input id="workEnc">` 或 URL 中 `enc=` |
| `workId` | 作业列表页 | `li[data]` URL 中 `workId=` |
| `answerId` | 作业列表页 | `li[data]` URL 中 `answerId=` |

---

## 6. 请求限制

- 并发控制：建议不超过 3 路并发
- 请求间隔：同课程内分页请求间隔 500ms
- 超时：15 秒
- 重试：最多 2 次（仅 Timeout/Network error/HTTP 5xx）
- 风控：短时间大量请求可能触发验证码
