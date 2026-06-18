# ENTANGLEMENT / 纠缠 —— 产品需求文档 (PRD)

> **版本**: v1.0  
> **日期**: 2026-05-05  
> **范围**: 示例路径加载后的完整结果页展示  
> **目标**: 精准到可以用本文档复刻此网页的每一个像素与交互

---

## 一、产品概述

### 1.1 产品定义

| 字段 | 值 |
|------|------|
| 产品名称 | ENTANGLEMENT / 纠缠 |
| 标语 | 万物皆有暗线 |
| 产品定位 | 碎片时间的智性消遣 |
| 核心动作 | 输入两个词 → 逐跳揭示它们之间的隐秘关联路径 |
| 体验时长 | 单次 2–5 分钟闭环 |
| 情绪基调 | 好奇 + 挑逗（智性愉悦） |
| 视觉对标 | Nautilus 杂志（暗色、学术感、克制、大留白） |

### 1.2 页面全局结构

页面为单页应用（SPA），采用垂直堆叠布局。页面从上到下依次为：

1. **星网背景层**（全局固定，z-index: 0）
2. **环境光晕层**（全局绝对定位，z-index: 0）
3. **内容层**（z-index: 1）
   - 3a. **首屏 Hero 卡片**（可收缩上移）
   - 3b. **结果页卡片** 或 **空态卡片**（二选一）

当结果页出现时，首屏 Hero 执行收缩上移动画，结果页卡片在下方展开，整体形成单页连续过渡。

---

## 二、Design Tokens（设计令牌）

> 所有模块的样式均引用以下令牌，不得硬编码色值或数值。

### 2.1 色彩系统

| 令牌名 | 色值 | 语义用途 |
|--------|------|----------|
| `--bg-deep` | `#07080f` | 页面底色（最深黑） |
| `--bg-mid` | `#0b1026` | 环境渐变中段、深度背景 |
| `--bg-card` | `rgba(10, 16, 28, 0.9)` | 内容卡片背景 |
| `--bg-card-inner` | `rgba(7, 12, 22, 0.92)` | 路径舞台内层背景 |
| `--amber` | `#d4a853` | 琥珀金主点缀色 |
| `--amber-glow` | `rgba(212, 168, 83, 0.28)` | 琥珀金发光/阴影色 |
| `--amber-dim` | `rgba(212, 168, 83, 0.12)` | 琥珀金弱化背景色 |
| `--cool-white` | `#e8e6e3` | 冷白色（次要文本、节点文字） |
| `--silver` | `#6b7280` | 淡银色 |
| `--silver-light` | `#9ca3af` | 浅银色（标签、弱文本） |
| `--text-primary` | `#f0ece6` | 主文本色（标题、重要正文） |
| `--text-secondary` | `#b0ada6` | 次要文本色（说明、副本） |
| `--text-muted` | `#7a7770` | 弱化文本色（占位符、禁用） |
| `--border-subtle` | `rgba(212, 168, 83, 0.1)` | 微弱边框 |
| `--border-mid` | `rgba(212, 168, 83, 0.18)` | 中等边框 |
| `--border-strong` | `rgba(212, 168, 83, 0.36)` | 强边框（锚点节点、主按钮态） |

**星点色彩（SVG 填充）**：

| 星点色调 | 色值 | 用途 |
|----------|------|------|
| `warm` | `#f0d080` | 暖色星点核心 |
| `cool` | `#c0d0f0` | 冷色星点核心 |
| `soft` | `#e0e0e0` | 柔和星点核心 |

### 2.2 字体系统

| 令牌名 | 字体族 | 用途 |
|--------|--------|------|
| `--font-display-en` | `"Playfair Display", serif` | 英文品牌名、仪式编号 |
| `--font-display-cn` | `"Noto Serif SC", serif` | 中文标题、路线标题、节点名、概要文字 |
| `--font-body` | `"Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif` | 所有正文副本 |

### 2.3 圆角系统

| 令牌名 | 值 | 用途 |
|--------|------|------|
| `--radius-lg` | `28px` | 卡片、Hero 区 |
| `--radius-md` | `20px` | 路径舞台、内容卡、输入框 |
| `--radius-sm` | `14px` | 路径标签、小卡片 |
| `--radius-pill` | `999px` | 按钮、药片状标签 |

### 2.4 动效令牌

| 令牌名 | 值 | 用途 |
|--------|------|------|
| `--ease` | `cubic-bezier(0.4, 0, 0.2, 1)` | 全局统一缓动曲线 |

### 2.5 渐变配方

**页面 body 背景**：
```css
background:
  radial-gradient(ellipse at 18% 15%, rgba(212,168,83,0.06), transparent 40%),
  radial-gradient(ellipse at 82% 10%, rgba(180,140,60,0.04), transparent 32%),
  radial-gradient(ellipse at 50% 85%, rgba(212,168,83,0.03), transparent 28%),
  linear-gradient(180deg, #07080f 0%, #0b1026 45%, #07080f 100%);
```

**卡片伪元素高光**：
```css
background: linear-gradient(135deg, rgba(212,168,83,0.02), transparent 28%);
```

**主按钮渐变**：
```css
background: linear-gradient(135deg, #d4a853, #c49a3c);
```

---

## 三、全局背景层

### 3.1 星网背景（Starfield）

| 属性 | 值 |
|------|------|
| 容器类名 | `.starfield` |
| 定位 | `position: fixed; inset: 0; z-index: 0; pointer-events: none;` |
| 实现方式 | SVG `<svg>` 内嵌 `<line>` + `<circle>` |

背景层还包含 `.starfield-planets` 轨道动画层（6 个 `.orbit-body`，色调 amber/violet/pearl/cobalt）、`.starfield-grid` 网格背景、`.starfield-film-grain` 胶片颗粒层。

**星点数据**：共 37 颗星，每颗含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `x` | number | SVG viewBox 坐标（0–100） |
| `y` | number | SVG viewBox 坐标（0–100） |
| `size` | number | 核心圆半径（1.1–2.8） |
| `opacity` | number | 核心圆透明度（0.38–0.95） |
| `delay` | number | 闪烁动画延迟（0.2–2.9s） |
| `tone` | `"warm" \| "cool" \| "soft"` | 色调分类 |

每颗星渲染为 `<g>` 包含两个 `<circle>`：
- **光晕圆**（`.star-halo`）：半径 = `size × 1.8`，透明度 = `opacity × 0.28`，带 `filter: blur(0.3px)`
- **核心圆**（`.star-core`）：半径 = `size`，透明度 = `opacity`，色调由 `tone` 决定

**星线数据**：共 39 条连线，每条为 `[fromIndex, toIndex]` 的二元组，渲染为 `<line>` 元素。

**SVG 属性**：
- `viewBox="0 0 100 100" preserveAspectRatio="none"`
- 星线样式：`stroke: rgba(255,255,255,0.035); stroke-width: 0.06; stroke-linecap: round;`

### 3.2 星网动画

| 动画名 | 时长 | 缓动 | 方向 | 效果 |
|--------|------|------|------|------|
| `star-twinkle` | 5s | ease-in-out | infinite alternate | 星点透明度 1 → 0.65 → 1 |
| `star-drift` | 30s | ease-in-out | infinite alternate | 整体 `translateX(-0.08%) → translateX(0.08%)` |

星线动画延迟：`index × 0.12s`（逐条错开入场）  
星点动画延迟：每颗星各自的 `delay` 值

### 3.3 暗角蒙版（Vignette）

| 属性 | 值 |
|------|------|
| 类名 | `.starfield-vignette` |
| 样式 | `position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 32%, rgba(7,8,15,0.6) 100%);` |

### 3.4 环境光晕（Ambient Glow）

两个模糊光球，绝对定位，`z-index: 0`，`pointer-events: none`：

| 光晕 | 位置 | 背景色 | 尺寸 | 模糊 | 透明度 |
|------|------|--------|------|------|--------|
| `.ambient-left` | `top: -8rem; left: -10rem` | `var(--amber)` (#d4a853) | 32rem × 32rem | `blur(100px)` | 0.14 |
| `.ambient-right` | `bottom: 10rem; right: -12rem` | `#8b6914` | 32rem × 32rem | `blur(100px)` | 0.14 |

---

## 四、首屏 Hero 卡片

### 4.1 卡片容器

| 属性 | 值 |
|------|------|
| 类名 | `.card.card-hero` |
| 布局 | `display: grid; gap: 28px; padding: 36px;` |
| 背景 | `var(--bg-card)` + `backdrop-filter: blur(24px)` |
| 边框 | `1px solid var(--border-subtle)` |
| 圆角 | `var(--radius-lg)` (28px) |
| 阴影 | `0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)` |
| 伪元素高光 | `linear-gradient(135deg, rgba(212,168,83,0.02), transparent 28%)` |

**结果态降级**：Hero 卡片在有结果时自身添加 `.hero-condensed` 类名驱动样式变化：

| 属性 | 值 | 过渡 |
|------|------|------|
| `transform` | `scale(0.92) translateY(-16px)` | 0.6s var(--ease) |
| `opacity` | `0.35` | 0.6s var(--ease) |
| `gap` | `16px` | 0.6s var(--ease) |
| `padding` | `24px` | 0.6s var(--ease) |

**桌面端双列**（≥900px）：
```css
grid-template-columns: minmax(0, 1.1fr) minmax(400px, 0.9fr);
align-items: start;
```

### 4.2 品牌锁区（Brand Lockup）

容器 `.hero-copy`，内含 `.brand-lockup`（居中，桌面端左对齐）。

#### 4.2.1 英文品牌名

| 字段 | 值 |
|------|------|
| 文案 | `ENTANGLEMENT` |
| 类名 | `.brand-en` |
| 字体 | Playfair Display, 400 |
| 字号 | 13px |
| 字间距 | 0.35em |
| 颜色 | `var(--amber)` |
| 大写 | `text-transform: uppercase` |
| 下边距 | 6px |

#### 4.2.2 中文品牌名

| 字段 | 值 |
|------|------|
| 文案 | `纠缠` |
| 类名 | `.brand-cn` |
| 字体 | Noto Serif SC, 700 |
| 字号 | `clamp(2.6rem, 6vw, 4.2rem)` |
| 字间距 | 0.08em |
| 颜色 | `var(--text-primary)` |
| 行高 | 1.1 |

#### 4.2.3 标语

| 字段 | 值 |
|------|------|
| 文案 | `万物皆有暗线` |
| 类名 | `.brand-tagline` |
| 字号 | 15px |
| 字间距 | 0.18em |
| 颜色 | `var(--silver-light)` |
| 上边距 | 10px |

### 4.3 产品说明

| 字段 | 值 |
|------|------|
| 文案 | `输入两个真实存在、却彼此很远的词。它不会立刻给你答案，而是把中间那条看不见的暗线，设计成一段值得你亲手点亮的路径。` |
| 类名 | `.subtitle.hero-subtitle` |
| 字号 | 14px |
| 颜色 | `var(--text-secondary)` |
| 行高 | 1.8 |
| 对齐 | 居中（桌面端左对齐） |
| 最大宽度 | `52ch` |
| 上边距 | 20px |

### 4.4 意图标签组（Intent Pills）

容器 `.hero-intent`：`display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;`

三个药片标签，每个 `.intent-pill`：

| 字段 | 值 |
|------|------|
| 文案 1 | `碎片时间的智性消遣` |
| 文案 2 | `像杂志封面一样克制` |
| 文案 3 | `逐跳揭示，而非一次摊平` |
| 内边距 | `6px 14px` |
| 圆角 | `var(--radius-pill)` |
| 边框 | `1px solid var(--border-mid)` |
| 背景 | `var(--amber-dim)` |
| 颜色 | `var(--amber)` |
| 字号 | 12px |
| 字间距 | 0.04em |

### 4.5 输入舞台（Hero Stage）

容器 `.hero-stage`：`display: grid; gap: 20px; z-index: 1;`

#### 4.5.1 舞台头部

容器 `.hero-stage-header`：`display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap;`

**左侧**：
- Kicker 标签：`Pair Builder`（类名 `.section-kicker`，样式见 4.5.3）
- 标题：`先抛出一对词，再看它们会不会在星图里连上。`（类名 `.section-title`）

**右侧工具按钮组** `.hero-utility`：

| 按钮 | 类名 | 文案（默认/加载中/已有） | 功能 |
|------|------|--------------------------|------|
| 今日推荐 | `.button.secondary.subtle` | "获取今日推荐" / "拾取中..." / "换一组今日推荐" | 调用 API 获取每日配对 |
| 示例路径 | `.button.ghost.subtle` | "先看示例路径" | 加载内置示例数据 |

#### 4.5.2 配对输入框组

外层容器 `.pair-composer > .pair-composer-shell`（含 `.pair-composer-orbit-left`、`.pair-composer-orbit-right` 两个轨道装饰元素，以及 `.pair-guides` 三条引导 pill）。

内层容器 `.pair-input-shell`：`display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: end;`

**输入框 A**：

| 字段 | 值 |
|------|------|
| 标签文案 | `词 A` |
| 标签类名 | `.input-label` |
| 标签字号 | 12px |
| 标签字间距 | 0.08em |
| 标签大写 | `text-transform: uppercase` |
| 标签颜色 | `var(--silver-light)` |
| 输入框类名 | `.input.input-large` |
| 占位符 | `比如：深海采矿` |
| 最大长度 | 32 字符 |
| 输入框圆角 | `var(--radius-md)` (20px) |
| 输入框内边距 | `14px 16px` |
| 输入框最小高度 | 56px |
| 输入框字号 | 16px |
| 输入框背景 | `rgba(7,12,22,0.92)` |
| 输入框边框 | `1px solid var(--border-subtle)` |
| Focus 边框 | `var(--amber)` |
| Focus 阴影 | `0 0 0 4px var(--amber-glow)` |
| Focus 背景 | `rgba(11,16,38,0.98)` |
| 占位符颜色 | `var(--text-muted)` |

**中间连接符** `.pair-sigil`：

| 字段 | 值 |
|------|------|
| 字符 | `↔` |
| 字号 | 24px |
| 颜色 | `var(--amber)` |
| 透明度 | 0.7 |
| 下内边距 | 10px |

**输入框 B**：与 A 完全对称，占位符为 `比如：韩国大选`。

#### 4.5.3 Kicker/标签统一样式

类名合并：`.eyebrow, .section-kicker, .stage-label, .insight-label`

| 属性 | 值 |
|------|------|
| 字间距 | 0.14em |
| 大写 | `text-transform: uppercase` |
| 字号 | 11px |
| 颜色 | `var(--amber)` |
| 字重 | 600 |

#### 4.5.4 Section 标题统一样式

类名 `.section-title`：

| 属性 | 值 |
|------|------|
| 字体 | Noto Serif SC, 700 |
| 字号 | `clamp(1.3rem, 2.4vw, 1.8rem)` |
| 行高 | 1.2 |
| 颜色 | `var(--text-primary)` |

### 4.6 操作按钮组

容器 `.hero-actions`：`display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;`

#### 4.6.1 主按钮（开始纠缠）

| 字段 | 值 |
|------|------|
| 类名 | `.button.button-large` |
| 默认文案 | `开始纠缠` |
| 加载中文案 | `正在纠缠` |
| 内边距 | `14px 28px` |
| 字号 | 15px |
| 字重 | 700 |
| 圆角 | `var(--radius-pill)` |
| 颜色 | `var(--bg-deep)` |
| 背景 | `linear-gradient(135deg, var(--amber), #c49a3c)` |
| 阴影 | `0 8px 28px rgba(212,168,83,0.22)` |
| Hover 阴影 | `0 14px 36px rgba(212,168,83,0.32)` |
| Hover 位移 | `translateY(-2px)` |
| Disabled 透明度 | 0.45 |
| Disabled 光标 | `not-allowed` |

#### 4.6.2 次按钮说明

Hero 操作按钮组（`.hero-actions`）中次按钮已移除，"换一条更妙的路径"不再作为 Hero 区域的独立按钮。

### 4.7 推荐区（Recommend Stack）

容器 `.recommend-stack`：`display: grid; gap: 14px;`

#### 4.7.1 今日推荐

- 标签：`今日推荐`（类名 `.stage-label`，同 kicker 样式）
- 有数据时：渲染 `.recommend-pill.recommend-pill-primary` 按钮
  - 文案格式：`{termA} ↔ {termB}`
  - 内边距：`8px 16px`
  - 圆角：`var(--radius-pill)`
  - 边框：`1px solid var(--border-strong)`（primary）
  - 背景：`var(--amber-dim)`
  - 颜色：`var(--amber)`
  - 字号：13px
  - 字重：600
  - Hover 边框：`var(--border-strong)`
  - Hover 阴影：`0 4px 16px rgba(212,168,83,0.16)`
  - 分隔符 `↔`：颜色 `var(--amber)`，透明度 0.6
- 无数据时：渲染 `.recommend-note`
  - 文案：`给你一对可以立刻上手的起点。`
  - 字号：13px，颜色 `var(--text-muted)`

#### 4.7.2 精选示例

- 标签：`也可以从这些开始`
- 示例数据：`[["深海采矿","韩国大选"], ["雨林","说唱"], ["独立电影","AI Agent"]]`
- 渲染为 `.example-chip` 按钮
  - 文案格式：`{exampleA} ↔ {exampleB}`
  - 内边距：`8px 14px`
  - 圆角：`var(--radius-pill)`
  - 边框：`1px solid var(--border-subtle)`
  - 背景：`rgba(14,18,30,0.6)`
  - 颜色：`var(--cool-white)`
  - 字号：13px
  - Hover 位移：`translateY(-1px)`
  - Hover 边框：`var(--border-mid)`
  - Hover 阴影：`0 8px 20px rgba(0,0,0,0.3)`
  - 分隔符颜色：`var(--amber)`，透明度 0.6

### 4.8 状态行

| 字段 | 值 |
|------|------|
| 类名 | `.status.hero-status`（出错时加 `.error`） |
| 加载中文案 | 轮换 loading hints（见 4.8.1） |
| 错误文案 | API 返回的错误信息 |
| 默认文案 | `先点亮第一跳，再决定这条路径值不值得继续走下去。` |
| 字号 | 13px |
| 颜色 | `var(--text-secondary)` |
| 错误颜色 | `#ff9b9b` |

#### 4.8.1 Loading Hints（加载提示轮换）

按 `setInterval` 驱动，每 1800ms 切换一次（共 3 条，循环轮换）。

渲染结构为 `.loading-status-card > .loading-copy`（title）+ `.loading-subcopy`（detail）。

| 索引 | title | detail |
|------|-------|--------|
| 0 | `正在沿着星图校准两端的引力差……` | `先避开最直白的答案，让两个世界进入同一片暗场。` |
| 1 | `正在绕开最顺手的桥，试着找一条更站得住的暗线……` | `这一步会故意慢一点，只保留那种能留下现实痕迹的转折。` |
| 2 | `中间那几次真正关键的拐弯，正在被一点点显影出来……` | `等第一条路彻底收束，再把它递到你手里逐跳点亮。` |

---

## 五、结果页卡片（Result Shell）

### 5.1 卡片容器

| 属性 | 值 |
|------|------|
| 类名 | `.card.result-shell.result-shell-active` |
| 布局 | `display: grid; gap: 20px;` |
| 入场动画 | `shell-enter`：`opacity: 0 + translateY(32px) → opacity: 1 + translateY(0)`，0.7s var(--ease) |
| 其余样式 | 同 `.card` 基类（见 4.1） |

### 5.2 结果头部（Result Head）

容器 `.result-head`：`display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap;`

**左侧**：
- Kicker：`Constellation`
- 标题 `.result-title`：`{termA} ⟷ {termB}`
  - `display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;`
  - 分隔符 `⟷`：颜色 `var(--amber)`，透明度 0.6

**右侧**：
- 说明文字 `.panel-note.result-note`
  - 文案：`别急着看结论。每点亮一跳，都是一次把两个世界重新缝回同一张图的机会。`
  - 字号：13px
  - 颜色：`var(--text-secondary)`
  - 行高：1.75
  - 最大宽度：`40ch`

---

## 六、路径揭示组件（PathReveal）

> 这是结果页的核心交互组件，负责路径元信息展示、星座轨道揭示、节点详情和收尾仪式。

### 6.1 组件 Props

| Prop | 类型 | 说明 |
|------|------|------|
| `result` | `EntanglementResult` | 完整结果数据 |
| `onResetExperience` | `(() => void) \| undefined` | 重置回调（"换一对试试"，可选） |

### 6.2 内部状态

| 状态 | 类型 | 初始值 | 说明 |
|------|------|--------|------|
| `activePathIndex` | number | 0 | 当前选中的路径索引 |
| `revealedCount` | number | 0 | 已揭示的中间节点数 |
| `selectedNodeIndex` | number \| null | null | 当前选中（展开详情）的中间节点索引 |
| `pulseIndex` | number \| null | null | 正在播放粒子流动画的节点索引 |
| `ceremonyActive` | boolean | false | 是否进入收尾仪式 |
| `finalEdgeRevealed` | boolean | false | 控制终点连线是否点亮 |
| `isExportingShare` | boolean | — | 控制分享卡片导出状态 |
| `shareError` | string | — | 分享错误信息 |

**派生状态**：
- `isComplete = totalMiddleCount > 0 && revealedCount >= totalMiddleCount && finalEdgeRevealed`
- `totalMiddleCount = activePath.nodes.length`

**状态重置规则**：
- `result.id` 变化时：重置所有状态
- `activePathIndex` 变化时：重置 `revealedCount`、`selectedNodeIndex`、`pulseIndex`、`ceremonyActive`
- `isComplete` 变为 `true` 时：自动设置 `ceremonyActive = true`

### 6.3 路径元信息卡组（Path Meta Grid）

容器 `.path-meta-grid`：`display: grid; gap: 14px;`  
桌面端（≥900px）：`grid-template-columns: repeat(2, minmax(0, 1fr));`

#### 6.3.1 路线标题卡（Primary Insight Card）

| 属性 | 值 |
|------|------|
| 类名 | `.insight-card.insight-card-primary` |
| 内边距 | 18px |
| 圆角 | `var(--radius-md)` |
| 边框 | `1px solid var(--border-subtle)` |
| 背景 | `radial-gradient(circle at top left, rgba(212,168,83,0.1), transparent 40%) + rgba(7,12,22,0.8)` |
| Primary 特殊边框 | `var(--border-mid)` |

**内容字段**：

| 字段 | 类名 | 数据源 | 样式 |
|------|------|--------|------|
| 标签 | `.insight-label` | `路线标题` | 同 kicker 样式（11px, amber, 600, 0.14em） |
| 标题 | `.insight-title` | `activePath.title` | Noto Serif SC, 1.2rem, 700, `var(--text-primary)`, 行高 1.25 |
| 说明 | `.insight-copy` | `activePath.hook` | 13px, `var(--text-secondary)`, 行高 1.75, 上边距 8px |

#### 6.3.2 意外指数卡（Secondary Insight Card）

| 属性 | 值 |
|------|------|
| 类名 | `.insight-card.insight-card-secondary` |
| 背景 | `radial-gradient(circle at top right, rgba(212,168,83,0.06), transparent 40%) + rgba(7,12,22,0.8)` |

**内容字段**：

| 字段 | 类名 | 数据源 | 样式 |
|------|------|--------|------|
| 标签 | `.insight-label` | `意外指数` | 同 kicker |
| 分数 | `.surprise-score` | `activePath.surpriseIndex` | 1.8rem, `var(--amber)`, 行高 1 |
| 标签 | `.surprise-tag` | `surpriseLabel(activePath.surpriseIndex)` | pill 样式，内边距 4px 10px，背景 `var(--amber-dim)`，颜色 `var(--amber)`，字号 11px，字重 600，字间距 0.06em |
| 进度条 | `.surprise-meter > span` | `width: surpriseIndex * 10%` | 高 6px，圆角 pill，背景 `linear-gradient(90deg, var(--amber), #e0c06a)`，过渡 `width 0.6s var(--ease)` |
| 说明 | `.insight-copy` | `activePath.surprise` | 13px, `var(--text-secondary)` |

**surpriseLabel 映射**：

| 范围 | 标签 |
|------|------|
| ≥ 9 | `高能` |
| ≥ 7 | `够妙` |
| ≥ 5 | `有点意思` |
| < 5 | `偏稳` |

### 6.4 路径切换标签（Path Tabs）

仅在 `result.paths.length > 1` 时渲染。

容器 `.path-tabs`：`display: flex; gap: 10px; flex-wrap: wrap;`

每个标签 `.path-tab`：

| 属性 | 值 |
|------|------|
| 布局 | `display: grid; gap: 3px; min-width: 120px; text-align: left;` |
| 内边距 | `10px 14px` |
| 圆角 | `var(--radius-sm)` |
| 边框 | `1px solid var(--border-subtle)` |
| 背景 | `rgba(10,16,28,0.5)` |
| 颜色 | `var(--text-secondary)` |
| 字号 | 13px |
| 字重 | 600 |
| 主标题文案 | `路径 {index + 1}` |
| 副标题 `.path-tab-subtitle` | `path.title`，字号 11px，颜色 `var(--text-muted)`，字重 400 |

**Active 态**：
```css
background: linear-gradient(135deg, rgba(212,168,83,0.12), rgba(212,168,83,0.04));
border-color: var(--border-mid);
color: var(--amber);
box-shadow: 0 8px 24px rgba(212,168,83,0.1);
```

### 6.5 路径揭示舞台（Path Stage）

容器 `.path-stage`：

| 属性 | 值 |
|------|------|
| 布局 | `display: grid; gap: 20px;` |
| 内边距 | `24px` |
| 圆角 | `var(--radius-md)` |
| 边框 | `1px solid var(--border-subtle)` |
| 背景 | `var(--bg-card-inner)` |

#### 6.5.1 舞台头部

容器 `.path-stage-head`：`display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap;`

**左侧**：
- Kicker：`Reveal Ritual`
- 标题 `.stage-title`：`每次只揭开一跳，让中间那条暗线慢慢长出来。`
  - 字号 14px，字重 600，颜色 `var(--text-secondary)`

**控制按钮组** `.path-controls.sidecar-controls` 位于 `.reveal-sidecar` 侧栏顶部；移动端另有 `.reveal-float-bar` 底部浮动栏包含相同按钮。

| 按钮 | 类名 | 文案（未完成/中间态/已完成） | 禁用条件 |
|------|------|----------------------|----------|
| 揭示下一跳 | `.button` | `揭示下一跳（{revealedCount}/{totalMiddleCount}）` / `点亮终点连线`（所有中间节点已揭示但 `finalEdgeRevealed` 为 false 时）/ `整条路径已经点亮` | `isComplete` |
| 收起重看 | `.button.secondary` | `收起重看` | `revealedCount === 0` |

### 6.6 星座轨道（Constellation Shell）

容器 `.constellation-shell`：
```css
display: grid;
grid-template-columns: 1fr minmax(260px, 0.5fr);
gap: 24px;
align-items: start;
```

移动端（<900px）：`grid-template-columns: 1fr;`

#### 6.6.1 轨道主轨道（Constellation Track）

容器 `.constellation-track`：`display: grid; gap: 0; align-items: center;`  
属性：`aria-live="polite"`

轨道从上到下依次渲染：

**① 起点锚点节点**

| 属性 | 值 |
|------|------|
| 类名 | `.constellation-node.constellation-node-anchor.start` |
| 文案 | `result.termA` |
| 边框 | `1px solid var(--border-strong)` |
| 背景 | `radial-gradient(circle at center, rgba(212,168,83,0.14), transparent 70%) + rgba(12,18,32,0.9)` |
| 阴影 | `0 0 0 1px rgba(212,168,83,0.12), 0 0 24px rgba(212,168,83,0.12)` |
| 内边距 | `10px 18px` |
| 圆角 | `var(--radius-pill)` |
| 字重 | 600 |
| 文字类名 | `.node-text`：Noto Serif SC, 16px, `var(--amber)` |

**② 中间节点组**（循环 `activePath.nodes`）

每个中间节点位置由 `.constellation-slot` 包裹：`display: grid;`

**连接线区域** `.constellation-edge`：

| 属性 | 值 |
|------|------|
| 布局 | `position: relative; display: grid; place-items: center; padding: 14px 0; min-height: 56px;` |

内含三个子元素：

**(a) 连线** `.edge-line`：

| 属性 | 值 |
|------|------|
| 宽度 | 2px |
| 位置 | 绝对定位，水平居中，纵向占满 |
| 默认背景 | `rgba(255,255,255,0.08)` |
| 激活背景 | `linear-gradient(180deg, var(--amber), rgba(212,168,83,0.4))` |
| 激活阴影 | `0 0 12px rgba(212,168,83,0.18)` |
| Ceremony 背景 | `linear-gradient(180deg, var(--amber), var(--amber)) !important` |
| Ceremony 阴影 | `0 0 16px rgba(212,168,83,0.3) !important` |
| 过渡 | `background 0.6s var(--ease), box-shadow 0.6s var(--ease)` |

**(b) 粒子** `.edge-particle`：

| 属性 | 值 |
|------|------|
| 尺寸 | 6px × 6px |
| 圆角 | 50% |
| 背景 | `var(--amber)` |
| 阴影 | `0 0 8px var(--amber-glow)` |
| 位置 | 绝对定位，水平居中，初始 top: 0 |
| 默认透明度 | 0 |
| Traveling 态透明度 | 1 |
| Traveling 动画 | `particle-fall`：0.42s var(--ease)，从 top:0 opacity:1 → top:100% opacity:0.6 |

**(c) 连接说明文字** `.edge-copy`：

| 属性 | 值 |
|------|------|
| 字号 | 12px |
| 行高 | 1.5 |
| 颜色 | `var(--text-muted)` |
| 对齐 | 居中 |
| 最大宽度 | 240px |
| 内边距 | `4px 16px` |
| 圆角 | `var(--radius-pill)` |
| 背景 | `rgba(7,12,22,0.7)` |
| 默认透明度 | 0 |
| 激活透明度 | 1 |
| 激活颜色 | `var(--text-secondary)` |
| 过渡 | `opacity 0.4s var(--ease)` |
| 文案 | 所有中间节点上方连线均显示该节点自身的 `connectionToNext` 字段，无第一条边特殊文案 |

**节点本身**（两种状态）：

**(a) 已揭示** `.constellation-node.middle`：

| 属性 | 值 |
|------|------|
| 边框 | `1px solid var(--border-mid)` |
| 背景 | `rgba(14,20,34,0.85)` |
| 光标 | `pointer` |
| 文字 `.node-text` | 14px, `var(--cool-white)` |
| Hover/Selected 边框 | `var(--amber)` |
| Hover/Selected 阴影 | `0 0 0 1px var(--amber-glow), 0 0 20px rgba(212,168,83,0.16)` |
| Hover/Selected 缩放 | `scale(1.03)` |
| Selected 文字色 | `var(--amber)` |
| Ceremony 态 | 同 `.ceremony-node`（见 6.8） |

点击逻辑：`setSelectedNodeIndex(prev => prev === index ? null : index)`（toggle 选中/取消）

**(b) 未揭示** `.constellation-node.constellation-node-hidden`：

| 属性 | 值 |
|------|------|
| 边框 | `1px dashed var(--border-mid)` |
| 背景 | `rgba(14,20,34,0.5)` |
| 文字 `.node-text` | 20px, `var(--silver-light)`, 字间距 0.05em |
| 文案 | `?` |
| 光标 | `pointer` |
| aria-label | `揭示第 {index+1} 个中间节点` |
| Hover 边框 | `var(--amber)` |
| Hover 背景 | `rgba(212,168,83,0.06)` |
| Hover 文字色 | `var(--amber)` |
| Incoming 态动画 | `node-incoming`：0.5s var(--ease)，scale 1→0.85→0.7，opacity 1→0.3→0 |

**③ 终点连接线**（与中间连接线结构相同，文案为 `activePath.nodes[最后].connectionToNext` 或 `"最后一跳把故事收回终点"`）

**④ 终点锚点节点**

与起点锚点样式相同，类名 `.constellation-node.constellation-node-anchor.end`  
文案：`result.termB`  
Ceremony 态同 `.ceremony-node`

#### 6.6.2 揭示侧栏（Reveal Sidecar）

容器 `.reveal-sidecar`：`display: grid; gap: 14px; position: sticky; top: 20px;`  
移动端（<900px）：`position: static;`

**当前状态卡** `.path-card.reveal-card.reveal-card-primary`：

| 属性 | 值 |
|------|------|
| 内边距 | 18px |
| 圆角 | `var(--radius-md)` |
| 边框 | `1px solid var(--border-subtle)`（Primary 特殊 `var(--border-mid)`） |
| 背景 | `radial-gradient(circle at top left, rgba(212,168,83,0.08), transparent 40%) + rgba(7,12,22,0.8)` |

**未完成时**（`nextNode && !isComplete`）：

| 字段 | 文案 | 类名 | 样式 |
|------|------|------|------|
| 标签 | `当前状态` | `.insight-label` | 同 kicker |
| 摘要 | `下一跳还藏着：{nextNode.term.length <= 8 ? "一个关键转折" : "新的线索"}` | `.path-summary` | 15px, 700, Noto Serif SC, `var(--text-primary)` |
| 说明 | `点击一次，只揭开一个节点。好的路径不是一下子看懂，而是每一步都能让你重新判断它到底妙不妙。` | `.path-detail` | 13px, `var(--text-secondary)`, 行高 1.75 |

**已完成时**：

| 字段 | 文案 |
|------|------|
| 标签 | `当前状态` |
| 摘要 | `整条路径已经收束完成。` |
| 说明 | `现在可以回头检查这条路线最妙的地方，是哪一次看似偏航、实际上把终点拉近的转折。` |

**节点详情卡**（选中节点时）`.path-card.detail-card`：

| 字段 | 文案 | 类名 |
|------|------|------|
| 标签 | `当前节点` | `.insight-label` |
| 摘要 | `selectedNode.term` | `.path-summary` |
| 说明 | `selectedNode.detail` | `.path-detail` |

入场动画：`card-appear`：`opacity:0 + translateY(8px) → opacity:1 + translateY(0)`，0.4s var(--ease)

**空态提示卡**（未选中节点时）`.path-card.detail-card.muted-card`：

| 字段 | 文案 |
|------|------|
| 标签 | `节点解释` |
| 说明 | `点亮后的任意节点都可以展开。这里应该像编辑批注一样，把这一步为什么成立说清楚。` |

透明度：0.85

### 6.7 揭示逻辑

**揭示下一跳** `handleRevealNext()`：

```
1. 检查 revealedCount >= totalMiddleCount，若已满则 return
2. 记录 nextIndex = revealedCount
3. 设置 pulseIndex = nextIndex（触发粒子流）
4. 420ms 后：
   a. revealedCount + 1
   b. selectedNodeIndex = nextIndex
   c. pulseIndex = null（粒子流结束）
```

**收起重看** `handleResetPath()`：
- 重置 `revealedCount = 0`，`selectedNodeIndex = null`，`pulseIndex = null`，`ceremonyActive = false`

### 6.8 收尾仪式（Ceremony）

当 `ceremonyActive = true` 时，外层 `.path-visual-wrapper` 添加类名 `ceremony-active`。

**节点发光脉冲**：
```css
.ceremony-active .constellation-node .node-glow {
  animation: ceremony-pulse 1.2s var(--ease) forwards;
}
/* ceremony-pulse: opacity 0 → 1 (40%) → 0.5 (100%) */
```

**连线光脉冲流**：
```css
.ceremony-active .constellation-edge .edge-line::after {
  content: "";
  position: absolute;
  top: 0; left: 50%; transform: translateX(-50%);
  width: 4px; height: 8px;
  border-radius: 999px;
  background: var(--amber);
  box-shadow: 0 0 12px var(--amber-glow);
  animation: light-pulse-flow 1.4s var(--ease) forwards;
}
/* light-pulse-flow: top:0 opacity:1 → top:100% opacity:0 */
```

**连线发光**：
```css
.ceremony-active .constellation-edge .edge-line {
  animation: line-ceremony-glow 1s var(--ease) forwards;
}
/* line-ceremony-glow: box-shadow: none → 0 0 16px rgba(212,168,83,0.28) */
```

**Ceremony 节点样式** `.ceremony-node`：
- 边框：`var(--amber) !important`
- 阴影：`0 0 0 1px var(--amber-glow), 0 0 28px rgba(212,168,83,0.2) !important`
- 文字颜色：`var(--amber) !important`

### 6.9 收尾区域（Finale Shell）

仅在 `ceremonyActive = true` 时渲染。

容器 `.finale-shell`：
```css
display: grid;
gap: 20px;
animation: shell-enter 0.6s var(--ease) 0.3s both;
```

#### 6.9.1 路径概览卡

| 属性 | 值 |
|------|------|
| 类名 | `.path-card.finale-summary-card` |
| 边框 | `var(--border-mid)` |
| 背景 | `radial-gradient(circle at top left, rgba(212,168,83,0.1), transparent 40%) + rgba(7,12,22,0.84)` |

| 字段 | 文案 | 类名 | 样式 |
|------|------|------|------|
| 标签 | `路径概览` | `.insight-label` | 同 kicker |
| 概要 | `activePath.summary` | `.path-detail.summary-text` | 15px, `var(--text-primary)`, 行高 1.8 |

#### 6.9.2 收尾操作按钮

容器 `.finale-actions`：`display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;`

| 按钮 | 类名 | 文案 | 功能 | 显示条件 |
|------|------|------|------|----------|
| 再看一条路 | `.button` | `再看一条路` | `setActivePathIndex((index) => (index + 1) % result.paths.length)` | `result.paths.length > 1` |
| 下载分享卡片 | `.button.secondary` | `下载分享卡片`（导出中显示"生成中..."） | 点击触发 Canvas 生成 1200×630 PNG 并下载；`isExportingShare` 为 true 时按钮禁用并显示"生成中..." | 始终显示 |
| 换一对试试 | `.button.secondary` | `换一对试试` | 调用 `onResetExperience` | 始终显示 |

---

## 七、空态卡片（Empty State）

当 `result` 为 `null` 时渲染，替代结果页卡片。

### 7.1 卡片容器

| 属性 | 值 |
|------|------|
| 类名 | `.card.empty-state.empty-state-constellation` |
| 布局 | `display: grid; gap: 18px;` |
| 内边距 | 32px |

### 7.2 内容

- Kicker：`How It Feels`
- 标题：`它不是答案页，而是一场被慢慢揭开的路径体验。`（`.section-title`）
- `.empty-copy.empty-lead` 文案："输入只是起点，真正的乐趣在于看见一条本来不该连上的现实链路，如何被你一点点点亮。"
- `.empty-state-aside` 侧边区域

### 7.3 仪式步骤卡组（Ritual Grid）

容器 `.ritual-grid`：`display: grid; gap: 16px;`  
桌面端（≥900px）：`grid-template-columns: repeat(3, 1fr);`

每个 `.ritual-card`：

| 属性 | 值 |
|------|------|
| 布局 | `display: grid; gap: 6px;` |
| 内边距 | 18px |
| 圆角 | `var(--radius-md)` |
| 边框 | `1px solid var(--border-subtle)` |
| 背景 | `rgba(7,12,22,0.6)` |

**步骤 01**：
- 序号：`01`（`.ritual-index`：Playfair Display, 28px, 700, `var(--amber)`, 透明度 0.4, 行高 1）
- 标题：`抛出一对词`（Noto Serif SC, 15px, `var(--text-primary)`）
- 说明：`首页先像一道入口，让你把两个遥远的世界丢进来，看看它们会不会开始彼此靠近。`（13px, `var(--text-secondary)`, 行高 1.7）

**步骤 02**：
- 序号：`02`
- 标题：`一跳一跳揭示`
- 说明：`中间的节点不会一次摊平，而是由你主动点击，把最关键的那几次拐弯慢慢点亮。`

**步骤 03**：
- 序号：`03`
- 标题：`最后才亮出全貌`
- 说明：`当所有节点都被点亮，页面才把整条路径收束成一句真正成立的概览，而不是草率结论。`

---

## 八、数据结构定义

### 8.1 EntanglementResult

```typescript
interface EntanglementResult {
  id: string;           // 结果唯一标识
  termA: string;        // 输入词 A
  termB: string;        // 输入词 B
  paths: EntanglementPath[];  // 路径数组（通常 2–3 条）
  createdAt: string;    // ISO 时间戳
}
```

### 8.2 EntanglementPath

```typescript
interface EntanglementPath {
  title: string;           // 路径标题（如"稀土回路"）
  hook: string;            // 一句话钩子
  surprise: string;        // 意外之处描述
  surpriseIndex: number;   // 意外指数（1–10）
  nodes: EntanglementPathNode[];  // 中间节点数组（通常 3–5 个）
  summary: string;         // 路径概览总结
}
```

### 8.3 EntanglementPathNode

```typescript
interface EntanglementPathNode {
  term: string;                // 节点名称
  connectionToNext: string;    // 到下一节点的连接说明
  detail: string;              // 节点详细解释
}
```

### 8.4 示例数据

以"深海采矿 ↔ 韩国大选"为例，返回 3 条路径：

| 路径 | 标题 | 意外指数 | 节点数 |
|------|------|----------|--------|
| 1 | 稀土回路 | 8 | 4 |
| 2 | 海运票仓 | 7 | 4 |
| 3 | 气候转身 | 9 | 4 |

**路径 1「稀土回路」节点**：

| 序号 | term | connectionToNext | detail |
|------|------|------------------|--------|
| 1 | 海底稀土矿权 | 谁掌握新矿源，谁就可能改写高端制造最紧张的原料分布。 | 深海采矿争夺的不只是金属，而是未来稀土与关键矿物的先手布局。 |
| 2 | 半导体供应链 | 一旦关键矿物进入芯片链路，议题就会从资源开发转向产业安全。 | 半导体制造对稳定原料极度敏感，任何新矿源都会被重新估值。 |
| 3 | 三星财阀 | 在韩国，半导体景气最终会折返到财阀评价、就业预期与公众情绪。 | 三星既是产业象征，也是韩国经济情绪的放大器，任何波动都会被政治化。 |
| 4 | 青年就业焦虑 | 当就业与阶层流动被重新点燃，大选叙事就会顺着这股情绪偏转。 | 韩国年轻选民对机会结构极度敏感，产业焦虑常常会外溢成政治判断。 |

hook: `真正把故事拧起来的，不是海底本身，而是谁能把矿产变成芯片里的定价权。`  
surprise: `深海采矿最后碰到的不是海洋伦理，而是韩国年轻人对财阀与就业的情绪。`  
summary: `深海采矿看似是资源与环境话题，但一旦通过稀土进入半导体链条，它就会撞上韩国的财阀结构与青年情绪，最后折返成大选里的现实判断。`

**路径 2「海运票仓」节点**：

| 序号 | term | connectionToNext | detail |
|------|------|------------------|--------|
| 1 | 深海工程船 | 任何大规模海底开采，都离不开造船、海工装备与维修网络。 | 深海采矿不是抽象概念，它会直接拉动复杂船舶与海工设备的订单想象。 |
| 2 | 韩国造船业 | 当新一轮海工订单被讨论，韩国造船业就会被重新放回国家竞争力叙事里。 | 韩国长期占据高端造船优势，任何海上资源开发都会被本土产业迅速感知。 |
| 3 | 釜山港经济 | 造船、港口与物流就业一旦同步波动，地方城市的政治温度也会升高。 | 釜山这样的沿海城市，常把国际贸易与本地生活直接绑定在一起。 |
| 4 | 区域发展承诺 | 当地方经济成为焦点，候选人就必须回应谁能带来更稳的区域增长。 | 韩国选举高度重视区域利益，一旦地方增长叙事变化，票仓也会松动。 |

hook: `海底资源并不会直接通向选票，它先经过了一整套港口、航运与城市经济的传导。`  
surprise: `最意外的一跳，是从采矿船队跳到韩国沿海城市的票仓情绪。`  
summary: `这条路线不是从资源直接跳到政治，而是让深海采矿经过船舶、港口与地方经济，最后落回韩国选举里最现实的区域发展承诺。`

**路径 3「气候转身」节点**：

| 序号 | term | connectionToNext | detail |
|------|------|------------------|--------|
| 1 | 电池关键矿物 | 深海采矿一旦被合理化，最先被调用的理由往往是新能源转型缺矿。 | 镍、钴、锰等矿物会把深海采矿包装成绿色转型的原料前哨。 |
| 2 | 电动车产业政策 | 矿物安全被放大后，各国都会把它改写成产业补贴与制造业战略。 | 新能源竞争不是环保口号，而是补贴、供应链和产业主权的复合战场。 |
| 3 | 韩国制造业选边 | 当产业战略与环保价值冲突，候选人就必须明确自己站在哪一边。 | 韩国政治经常在出口制造与社会价值之间寻找新的平衡叙事。 |
| 4 | 大选议题排序 | 议题排序一旦变化，选民看待候选人的方式也会跟着重排。 | 真正影响投票的，不只是议题存在，而是它在竞选叙事里的先后顺序。 |

hook: `它先绕进新能源材料，再从产业政策折回韩国选举里的价值排序。`  
surprise: `深海采矿最终会逼人表态：到底把气候正义排在前面，还是把制造业安全排在前面。`  
summary: `这条路径把深海采矿接到新能源与制造业安全，再逼近韩国大选中的价值排序：气候正义、产业主权、就业稳定，到底谁应该排在最前面。`

---

## 九、完整文案清单

### 9.1 首屏 Hero 文案

| 位置 | 文案 |
|------|------|
| 品牌名英文 | ENTANGLEMENT |
| 品牌名中文 | 纠缠 |
| 标语 | 万物皆有暗线 |
| 产品说明 | 输入两个真实存在、却彼此很远的词。它不会立刻给你答案，而是把中间那条看不见的暗线，设计成一段值得你亲手点亮的路径。 |
| 意图标签 1 | 碎片时间的智性消遣 |
| 意图标签 2 | 像杂志封面一样克制 |
| 意图标签 3 | 逐跳揭示，而非一次摊平 |
| Pair Builder Kicker | Pair Builder |
| Pair Builder 标题 | 先抛出一对词，再看它们会不会在星图里连上。 |
| 输入标签 A | 词 A |
| 输入占位符 A | 比如：深海采矿 |
| 输入标签 B | 词 B |
| 输入占位符 B | 比如：韩国大选 |
| 主按钮（默认） | 开始纠缠 |
| 主按钮（加载中） | 正在纠缠 |
| 今日推荐 Kicker | 今日推荐 |
| 今日推荐按钮（无数据） | 获取今日推荐 |
| 今日推荐按钮（加载中） | 拾取中... |
| 今日推荐按钮（有数据） | 换一组今日推荐 |
| 今日推荐空态说明 | 给你一对可以立刻上手的起点。 |
| 精选示例 Kicker | 也可以从这些开始 |
| 示例路径按钮 | 先看示例路径 |
| 状态行（默认） | 先点亮第一跳，再决定这条路径值不值得继续走下去。 |

### 9.2 Loading Hints 文案

| 索引 | title | detail |
|------|-------|--------|
| 0 | 正在沿着星图校准两端的引力差…… | 先避开最直白的答案，让两个世界进入同一片暗场。 |
| 1 | 正在绕开最顺手的桥，试着找一条更站得住的暗线…… | 这一步会故意慢一点，只保留那种能留下现实痕迹的转折。 |
| 2 | 中间那几次真正关键的拐弯，正在被一点点显影出来…… | 等第一条路彻底收束，再把它递到你手里逐跳点亮。 |

### 9.3 结果页文案

| 位置 | 文案 |
|------|------|
| Constellation Kicker | Constellation |
| 结果说明 | 别急着看结论。每点亮一跳，都是一次把两个世界重新缝回同一张图的机会。 |
| 路线标题标签 | 路线标题 |
| 意外指数标签 | 意外指数 |
| Reveal Ritual Kicker | Reveal Ritual |
| Reveal Ritual 标题 | 每次只揭开一跳，让中间那条暗线慢慢长出来。 |
| 揭示按钮（进行中） | 揭示下一跳（{n}/{total}） |
| 揭示按钮（中间态） | 点亮终点连线 |
| 揭示按钮（已完成） | 整条路径已经点亮 |
| 收起按钮 | 收起重看 |
| 最后一条边默认文案 | 最后一跳把故事收回终点 |

### 9.4 侧栏文案

| 位置 | 文案 |
|------|------|
| 当前状态标签 | 当前状态 |
| 当前状态摘要（未完成，短词） | 下一跳还藏着：一个关键转折 |
| 当前状态摘要（未完成，长词） | 下一跳还藏着：新的线索 |
| 当前状态说明（未完成） | 点击一次，只揭开一个节点。好的路径不是一下子看懂，而是每一步都能让你重新判断它到底妙不妙。 |
| 当前状态摘要（已完成） | 整条路径已经收束完成。 |
| 当前状态说明（已完成） | 现在可以回头检查这条路线最妙的地方，是哪一次看似偏航、实际上把终点拉近的转折。 |
| 节点解释标签（选中） | 当前节点 |
| 节点解释标签（未选中） | 节点解释 |
| 节点解释空态说明 | 点亮后的任意节点都可以展开。这里应该像编辑批注一样，把这一步为什么成立说清楚。 |

### 9.5 收尾文案

| 位置 | 文案 |
|------|------|
| 路径概览标签 | 路径概览 |
| 再看一条路按钮 | 再看一条路 |
| 下载分享卡片按钮 | 下载分享卡片 |
| 下载分享卡片按钮（导出中） | 生成中... |
| 换一对试试按钮 | 换一对试试 |

### 9.6 空态文案

| 位置 | 文案 |
|------|------|
| How It Feels Kicker | How It Feels |
| 空态标题 | 它不是答案页，而是一场被慢慢揭开的路径体验。 |
| 空态引导文案 | 输入只是起点，真正的乐趣在于看见一条本来不该连上的现实链路，如何被你一点点点亮。 |
| 仪式 01 标题 | 抛出一对词 |
| 仪式 01 说明 | 首页先像一道入口，让你把两个遥远的世界丢进来，看看它们会不会开始彼此靠近。 |
| 仪式 02 标题 | 一跳一跳揭示 |
| 仪式 02 说明 | 中间的节点不会一次摊平，而是由你主动点击，把最关键的那几次拐弯慢慢点亮。 |
| 仪式 03 标题 | 最后才亮出全貌 |
| 仪式 03 说明 | 当所有节点都被点亮，页面才把整条路径收束成一句真正成立的概览，而不是草率结论。 |

---

## 十、动效清单

| 编号 | 动效名 | 触发条件 | 时长 | 缓动 | 效果描述 |
|------|--------|----------|------|------|----------|
| E1 | `star-twinkle` | 页面加载后持续 | 5s | ease-in-out, infinite alternate | 星点 opacity 在 1 ↔ 0.65 间呼吸 |
| E2 | `star-drift` | 页面加载后持续 | 30s | ease-in-out, infinite alternate | 整体 SVG translateX 微移 ±0.08% |
| E3 | Hero 收缩 | `result` 出现（Hero 卡片添加 `.hero-condensed`） | 600ms | var(--ease) | scale(0.92) + translateY(-16px) + opacity 0.35 |
| E4 | `shell-enter` | 结果卡片出现 | 700ms | var(--ease) | opacity:0 translateY(32px) → opacity:1 translateY(0) |
| E5 | `particle-fall` | 点击揭示下一跳 | 420ms | var(--ease) | 粒子从连线上端 top:0 落到 top:100%，opacity 1→0.6 |
| E6 | `node-incoming` | 未揭示节点正在被揭示 | 500ms | var(--ease) | scale 1→0.85→0.7，opacity 1→0.3→0（? 消融效果） |
| E7 | `card-appear` | 侧栏详情卡出现 | 400ms | var(--ease) | opacity:0 translateY(8px) → opacity:1 translateY(0) |
| E8 | `ceremony-pulse` | 收尾仪式触发 | 1200ms | var(--ease) | 所有节点 node-glow opacity 0→1→0.5 |
| E9 | `line-ceremony-glow` | 收尾仪式触发 | 1000ms | var(--ease) | 连线 box-shadow none → 0 0 16px rgba(212,168,83,0.28) |
| E10 | `light-pulse-flow` | 收尾仪式触发 | 1400ms | var(--ease) | 光脉冲伪元素沿连线从 top:0 → top:100%，opacity 1→0 |
| E11 | Finale 入场 | 收尾仪式触发 | 600ms | var(--ease), 延迟 300ms | 同 shell-enter（opacity + translateY） |
| E12 | 按钮 Hover | 鼠标悬浮 | 300ms | var(--ease) | translateY(-2px) + 阴影增强 |
| E13 | 输入框 Focus | 键盘聚焦 | 300ms | var(--ease) | 边框变琥珀金 + glow 阴影 + 背景微变 |
| E14 | 终点连线点亮 | 点亮终点连线操作触发 | — | var(--ease) | 终点连线添加 `.active` 类名，渐变色 + glow 激活动效 |

**动效原则**：所有动效时长在 300ms–1400ms 之间，统一使用 `cubic-bezier(0.4, 0, 0.2, 1)` 缓动。动效目的是给用户"思考的时间"，而非制造"等待的焦虑"。

---

## 十一、响应式断点

### 11.1 桌面端（≥900px）

| 元素 | 布局 |
|------|------|
| Hero 卡片 | `grid-template-columns: minmax(0, 1.1fr) minmax(400px, 0.9fr)` |
| 品牌锁区 | 左对齐 |
| 产品说明 | 左对齐，margin-inline: 0 |
| 意图标签 | flex-start |
| 路径元信息卡组 | `grid-template-columns: repeat(2, minmax(0, 1fr))` |
| 仪式步骤卡组 | `grid-template-columns: repeat(3, 1fr)` |
| 配对输入框 | `grid-template-columns: 1fr auto 1fr` |
| 星座轨道 | `grid-template-columns: 1fr minmax(260px, 0.5fr)` |
| 侧栏 | `position: sticky; top: 20px` |

### 11.2 平板端（641–899px）

| 元素 | 布局 |
|------|------|
| Hero 卡片 | 单列 |
| 配对输入框 | `grid-template-columns: 1fr`（垂直堆叠） |
| 星座轨道 | `grid-template-columns: 1fr`（侧栏下移） |
| 侧栏 | `position: static` |
| 连接符 | 居中，padding: 4px 0 |

### 11.3 移动端（≤640px）

| 元素 | 布局 |
|------|------|
| 页面外边距 | `padding: 20px 12px 52px` |
| 卡片/舞台内边距 | 18px |
| 卡片圆角降级 | `var(--radius-md)` |
| 品牌名字号 | 2.2rem（固定） |
| 所有按钮/标签/芯片 | `width: 100%; justify-content: center`（subtle 按钮除外） |
| 操作按钮组 | `flex-direction: column` |
| 结果标题 | `flex-direction: column; gap: 4px` |

---

## 十二、交互规则汇总

### 12.1 输入验证

| 规则 | 提示文案 | 类型 |
|------|----------|------|
| 词 A 或词 B 为空 | `请先输入两个词，再开始纠缠。` | 错误 |
| 词 A 等于词 B | `请输入两个不同的词语，再开始纠缠。` | 错误 |

### 12.2 点击行为

| 元素 | 行为 |
|------|------|
| 未揭示节点（?） | 触发 `handleRevealNext` |
| 已揭示中间节点 | toggle `selectedNodeIndex`（展开/折叠详情） |
| 示例芯片 | 填充输入框 + 清空结果 + 清空错误 |
| 今日推荐药片 | 填充输入框 + 清空结果 |
| "先看示例路径"按钮 | 填充示例数据 + 立即设置 result（跳过 API） |
| "换一对试试"按钮 | 清空 result + 清空 error + scrollTo top |
| 路径标签 | 切换 `activePathIndex` |
| "再看一条路"按钮 | 循环切换路径 `(index + 1) % paths.length` |
| "下载分享卡片"按钮 | 触发 Canvas 生成 1200×630 PNG 并下载；导出中 `isExportingShare = true`，按钮显示"生成中..."并禁用；导出完成或失败后恢复；失败时 `shareError` 记录错误信息 |

> **注**："换一条更妙的路径"次按钮已不存在于 Hero 操作区（`.hero-actions`）。

### 12.3 自动滚动

当 `result.id` 变化时，结果卡片自动 `scrollIntoView({ behavior: "smooth", block: "start" })`。

---

## 十三、页面层级关系图

```
<main class="app shell [has-result]">
  ├── <div class="starfield">                    ← 全局背景
  │     ├── <div class="starfield-vignette">     ← 暗角蒙版
  │     ├── <svg class="starfield-canvas">       ← SVG 星网
  │     │     ├── <line class="star-line"> ×39   ← 连线
  │     │     └── <g class="star-node"> ×37      ← 星点
  │     │           ├── <circle class="star-halo">
  │     │           └── <circle class="star-core">
  │     ├── <div class="starfield-planets">      ← 轨道动画层（6个.orbit-body）
  │     ├── <div class="starfield-grid">         ← 网格背景
  │     └── <div class="starfield-film-grain">   ← 胶片颗粒层
  ├── <div class="ambient ambient-left">         ← 左光晕
  ├── <div class="ambient ambient-right">        ← 右光晕
  └── <div class="container page-stack">         ← 内容层
        ├── <section class="card card-hero [hero-condensed]">
        │     ├── <div class="hero-copy">        ← 品牌区
        │     │     ├── <div class="brand-lockup">
        │     │     │     ├── <p class="brand-en">
        │     │     │     ├── <h1 class="brand-cn">
        │     │     │     └── <p class="brand-tagline">
        │     │     ├── <p class="hero-subtitle">
        │     │     ├── <div class="hero-intent">
        │     │     │     └── <div class="intent-pill"> ×3
        │     │     └── <div class="hero-deco">
        │     │           └── <div class="hero-deco-stage">
        │     │                 └── <canvas class="hero-deco-canvas">
        │     └── <div class="hero-stage">       ← 输入区
        │           ├── <div class="hero-stage-header">
        │           │     ├── <div> (kicker + title)
        │           │     └── <div class="hero-utility"> (buttons)
        │           ├── <div class="pair-composer">
        │           │     └── <div class="pair-composer-shell">
        │           │           ├── <div class="pair-composer-orbit-left">
        │           │           ├── <div class="pair-composer-orbit-right">
        │           │           ├── <div class="pair-input-shell">
        │           │           │     ├── <div class="input-group"> (词A)
        │           │           │     ├── <div class="pair-sigil"> (↔)
        │           │           │     └── <div class="input-group"> (词B)
        │           │           └── <div class="pair-guides"> (三条引导pill)
        │           ├── <div class="hero-actions"> (主按钮)
        │           ├── <div class="recommend-stack">
        │           │     ├── <div class="recommend-section"> (今日推荐)
        │           │     └── <div class="recommend-section"> (精选示例)
        │           └── <p class="status hero-status">
        └── <section class="card result-shell">  ← 结果页 (或空态)
              ├── <div class="result-head">
              │     ├── <div> (kicker + title)
              │     └── <p class="result-note">
              └── <PathReveal>
                    ├── <div class="path-meta-grid">
                    │     ├── <article class="insight-card-primary">
                    │     └── <article class="insight-card-secondary">
                    ├── <div class="path-tabs">   ← 路径切换
                    ├── <div class="path-stage">
                    │     ├── <div class="path-stage-head">
                    │     └── <div class="constellation-shell">
                    │           ├── <div class="constellation-track">
                    │           │     ├── 起点锚点
                    │           │     ├── <div class="constellation-slot"> ×N
                    │           │     │     ├── <div class="constellation-edge">
                    │           │     │     │     ├── <span class="edge-line">
                    │           │     │     │     ├── <span class="edge-particle">
                    │           │     │     │     └── <span class="edge-copy">
                    │           │     │     └── <button class="constellation-node">
                    │           │     ├── 终点连接线
                    │           │     └── 终点锚点
                    │           └── <div class="reveal-sidecar">
                    │                 ├── <div class="path-controls sidecar-controls">
                    │                 ├── <article class="reveal-card-primary">
                    │                 └── <article class="detail-card">
                    └── <div class="finale-shell">  ← 收尾仪式
                          ├── <article class="finale-summary-card">
                          └── <div class="finale-actions">
```

---

## 十四、验收标准

1. **像素级还原**：所有色值、字号、间距、圆角必须与 Design Token 一致，不得硬编码
2. **动效完整性**：E1–E14 所有动效必须实现，时长与缓动参数不得偏差超过 50ms
3. **交互完整性**：12.1–12.3 所有交互规则必须覆盖，含边界条件
4. **文案完整性**：第九章所有文案必须与实现一致，不得遗漏或自行改写
5. **响应式**：三个断点（≥900 / 641–899 / ≤640px）均需覆盖，布局切换流畅
