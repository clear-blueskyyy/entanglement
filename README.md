# 纠缠（Entanglement）

> 一个把两个遥远词语"编织"成可逐步揭示路径的网页产品。当前项目已完成高保真前端体验，并把本地真实 API 链路收口到"可用态"（模型不稳定时可服务端兜底返回路径）；下一步重点是继续提升真实输出质量与线上稳定性。

---

## 先看这里

如果你是下一个接手这个项目的对话 / Agent，建议按这个顺序理解项目：

1. 先读本文件：了解当前现状、代码入口、已完成内容、未完成内容、运行方式
2. 再读 `项目文档.md`：理解产品为什么存在、什么算"做对了"
3. 再读 `DESIGN-SPEC.md`：理解当前确定下来的 UI/UX 风格与交互节奏
4. 再读 `PRODUCT-REQUIREMENTS.md`：这是"示例路径结果页"的像素级 PRD，可直接照着复刻页面
5. 再读 `DEPLOYMENT-RUNBOOK.md`：部署与域名绑定手册，含 Vercel 项目信息、环境变量配置、故障排查
6. 再读 `tech-implementation-log.md` 和 `vibe-coding-log.md`：了解这轮 Vibe Coding 的关键决策、岔路和经验教训
7. 最后直接看代码：`src/App.tsx`、`src/components/PathReveal.tsx`、`src/styles.css`、`api/entangle.ts`

一句话概括当前状态：

- **设计方向已定稿**
- **前端主体验已做出来**
- **本地开发环境与真实 API 链路已稳定可用**
- **模型失败时已可自动降级到服务端保底路径**
- **分享卡片已落地，历史记录不做（当前阶段）**
- **下一阶段主线：质量收口 + 线上稳定性验证**

---

## 当前项目现状

### 已完成

- 完成了新一版首页 + 结果页的视觉重构，整体风格已从"输入框堆砌"升级为更完整的作品感体验
- 已实现单页结构：Hero 首屏 → 结果页展开 → 首屏收缩上移
- 已实现星网背景、环境光晕、双列 Hero、结果区 `Constellation` 路径体验
- 已实现逐跳揭示、粒子流动、节点详情、收尾仪式（ceremony）
- 已提供"先看示例路径"静态预览能力，方便脱离真实 API 做设计评审
- 已接入本地 / Serverless API：
  - `POST /api/entangle`
  - `POST /api/daily-pair`
- 已补齐输入校验、请求超时、错误提示、非 JSON 响应兜底
- 已实现前端重试与缓存回退（失败时可回到最近成功结果）
- 已实现服务端保底路径策略：当模型超时/输出不合规/上游不稳定时，`/api/entangle` 仍返回可揭示路径，避免主流程中断
- 已对齐 `api/entangle.ts` 与 `local-server.mjs` 的校验与兜底行为
- 已验证本地构建可通过，项目可启动并可在 CatPaw 内预览

### 还没完成

- 历史记录持久化（当前阶段不做）
- 部署后的真实线上验证（含环境变量、监控与异常观测）
- 继续打磨真实模型输出质量，使其更接近示例预览完成度
- 让保底路径从"可用"进一步提升到"更贴近输入语义"

### 当前最重要目标

下一个开发对话应以这件事为主线：

> **把已经定下来的设计和交互，继续落地成"真的能稳定使用"的网页产品。**

不是重新讨论设计方向，也不是回到最初的"能不能随便跑起来"，而是在现有设计基线之上继续工程化。

---

## 你要先知道的关键背景

### 1. 这个项目已经经历过一次方向重置

最开始虽然技术上基本可跑，但用户明确反馈：

- 页面像输入框和文本堆砌
- 完全不像一个成品
- prompt 生成的路径也很浅显

因此项目发生了关键转向：

- **先暂停纠结技术细节和 prompt 微调**
- **先把产品的呈现、视觉语言、交互节奏做对**

所以现在的优先级不是"从头想做什么页面"，而是：

- 维护并延续当前确定好的设计语言
- 基于现有页面继续做可用性与工程化
- 不要轻易推翻当前设计基线

### 2. 当前设计锚点已经明确，不要漂移

当前设计锚点如下：

- 产品定位：**碎片时间的智性消遣**
- 情绪：**好奇 + 挑逗**
- 视觉参考：**Nautilus 杂志**
- 品牌表达：`ENTANGLEMENT / 纠缠`
- 标语：`万物皆有暗线`
- 背景隐喻：**太空星网 / 暗线 / 微光 / 克制**
- 结果页核心体验：**逐节点揭示，而不是一次全部摊开**
- 收尾方式：**有 ceremony，有路径概览，有结束动作**

如果后续开发中出现取舍冲突，请优先保护这些锚点。

### 3. 当前有"设计预览态"和"真实接口态"两条线

这是项目现在最重要的理解点之一：

- **设计预览态**：依赖前端内置的 `previewResult`，用于快速展示完整体验
- **真实接口态**：依赖本地 `local-server.mjs` 或 Vercel `api/*.ts` 返回模型结果

这两条线目前已经共存并完成可用性收口（真实链路失败时不会直接中断）。

也就是说：

- 页面已经很好看
- 交互节奏已经明确
- 真实链路已可稳定走通（含服务端兜底）
- 但"高质量真实输出 + 产品体验"之间仍有落差，需要继续开发补齐

---

## 当前代码结构索引

### 前端核心文件

| 文件 | 作用 |
|------|------|
| `src/App.tsx` | 应用主壳；负责 Hero、示例路径加载、结果区切换、每日配对、状态管理、滚动联动、星网背景数据 |
| `src/components/PathReveal.tsx` | 路径揭示主组件；负责路径 tabs、逐跳揭示、粒子流、节点详情、收尾仪式 |
| `src/styles.css` | 全局样式；包含 design tokens、页面布局、星网背景、Hero、结果区、动效、响应式 |
| `src/services/api.ts` | 前端 API 封装；开发环境走 `localhost:3001`，生产环境走同源 `/api/*`；前端请求超时 60 秒 |
| `src/types/index.ts` | 前后端共享数据类型定义 |
| `src/main.tsx` | React 入口 |

### 后端 / 接口核心文件

| 文件 | 作用 |
|------|------|
| `api/entangle.ts` | 线上 / Vercel 的路径生成接口；负责 HTTP 路由、参数校验、错误响应映射；**不包含** prompt 文本、校验规则或 fallback 数据 |
| `api/daily-pair.ts` | 线上 / Vercel 的每日配对接口 |
| `api/_lib/llm.ts` | 模型调用 + provider 路由；支持 Friday / OpenAI / DeepSeek / 智谱 GLM 四个 provider，按优先级自动选取；含速率限制、JSON 提取等公共能力 |
| `api/_lib/prompt/entangle.ts` | Prompt 模板；包含系统 prompt、好例/坏例、三轮 attempt 策略；产品调优的核心入口 |
| `api/_lib/validate.ts` | 结构校验 + 质量过滤；包含 `FORBIDDEN_BRIDGES` 黑名单、`validateResult()`、`collectPathIssues()`、错误分类工具函数，导出 `TERM_MAX_LENGTH` 常量 |
| `api/_lib/fallback.ts` | 保底路径模块；在 `ENTANGLE_ENABLE_FALLBACK=1` 且 provider 不可用时触发，提供应急路径防止页面空白 |
| `local-server.mjs` | 本地开发调试用 API 服务器，是 `api/` TypeScript 文件的 JavaScript 镜像；**修改任何业务逻辑时需同步更新对应的 TypeScript 源文件** |
| `vercel.json` | Vercel 函数配置；将 `api/*.ts` 的 `maxDuration` 设为 60 秒（默认 30 秒不够用，三轮 attempt 最长约 55 秒） |

### 文档文件

| 文件 | 作用 | 建议用途 |
|------|------|----------|
| `README.md` | 当前交接入口 | 新对话先读这个 |
| `项目文档.md` | 产品定义文档 | 用来判断"做什么 / 不做什么" |
| `技术交付文档.md` | 较早期的产品+技术交付说明 | 可参考，但以当前 README + 设计文档 + 代码现状为准 |
| `DESIGN-SPEC.md` | UI/UX 设计规范 | 用来约束风格、动效、结构 |
| `PRODUCT-REQUIREMENTS.md` | 结果页像素级 PRD | 需要复刻页面细节时直接查这里 |
| `DEPLOYMENT-RUNBOOK.md` | 部署与域名绑定手册 | 部署、环境变量配置、故障排查时必读 |
| `MODEL-SELECTION.md` | 模型选型评估报告 | 换模型或评估 provider 时查这里 |
| `vibe-coding-log.md` | 产品过程记录 | 看关键决策和 why |
| `tech-implementation-log.md` | 技术实现记录 | 看已做事项、坑点、后续建议 |

### 视觉参考资产

| 文件 | 说明 |
|------|------|
| `example-path-snapshot-2026-05-06.png` | 示例路径加载后、尚未逐跳展开的页面快照 |
| `example-path-all-revealed-2026-05-06.png` | 示例路径全部点亮后的完整结果页快照 |

---

## 当前真实能力边界

### 现在已经能用的能力

- 首页展示品牌、输入、今日推荐、示例路径入口
- 可通过按钮直接加载示例结果页
- 可通过真实 API 生成每日配对和路径
- 结果页支持 1 条或多条路径切换
- 每条路径支持 3-5 个中间节点的逐个揭示
- 全部揭示后会触发收尾仪式并展示路径概览
- 当模型输出异常、超时或上游波动时，`/api/entangle` 会自动返回保底可用路径（需显式开启 `ENTANGLE_ENABLE_FALLBACK=1`，不中断主流程）
- 前端在请求失败时支持重试、示例回退和本地缓存回退
- 当所有 provider 的 key 均缺失时，后端返回友好提示语，前端展示"可先点击 [示例路径] 进行体验"

### 现在仍有落差的部分

- 示例路径展示的完成度，仍高于真实 AI 输出的平均质量
- 线上环境下的稳定性与观测（日志、告警、限流持久化）还未完成
- 保底路径可用性已解决，但语义贴合度仍可继续提升

---

## 已知重要事实 / 容易踩坑点

### 1. 开发环境需要两个进程同时运行

- `src/services/api.ts` 在开发环境会请求 `http://localhost:3001`
- `local-server.mjs` 实际监听端口也是 `3001`（可通过 `LOCAL_API_PORT` 环境变量覆盖）
- 前端 dev server（Vite 默认 5173）和后端 local-server（3001）需要**同时运行**，没有合并启动的 npm 脚本，需要两个终端分别执行

### 2. Vite 默认是 `5173`，但本机可能自动切到 `5174`

当前这台机器上曾出现：

- `5173` 被占用
- Vite 自动切换到 `5174`

所以新对话里如果要打开本地预览，不要死盯 `5173`，先看 dev server 实际输出。

### 3. LLM Provider 优先级与环境变量

`api/_lib/llm.ts` 按以下优先级自动路由（检测到哪个 key 就用哪个）：

| 优先级 | Provider | 必填 key | 适用场景 |
|--------|----------|----------|----------|
| 1 | Friday | `FRIDAY_APP_ID` | 美团内网专用，**公网不可达**，仅限本地开发 |
| 2 | OpenAI | `OPENAI_API_KEY` | **当前生产环境实际使用**（配合 `OPENAI_BASE_URL` 可接硅基流动等中转） |
| 3 | DeepSeek | `DEEPSEEK_API_KEY` | 可直接配置 DeepSeek 官方 Key |
| 4（最低）| 智谱 GLM | `ZHIPU_API_KEY` | 格式必须是 `id.secret`；已验证超时严重，不推荐 |

**当前生产环境（`entanglement.doudou.design`）的实际配置**：使用硅基流动（SiliconFlow）中转站路由到 DeepSeek V3，通过 OpenAI provider 接入：

```
OPENAI_API_KEY  = <硅基流动的 Key>
OPENAI_BASE_URL = https://api.siliconflow.cn/v1
OPENAI_MODEL    = deepseek-ai/DeepSeek-V3
```

> 之所以用中转站而不是直连 DeepSeek：Vercel 节点部署在海外，DeepSeek 直连跨境不稳定；硅基流动服务器在亚洲，对 Vercel 节点更友好。详见 `DEPLOYMENT-RUNBOOK.md` 7.6 节。

当所有 provider 的 key 均缺失时，后端返回 503，前端会展示：

> "似乎还缺少一些必要的环境变量设置。别担心，您可以先点击 [示例路径] 进行体验"

当 `ZHIPU_API_KEY` 格式不正确时，返回 503：

> "ZHIPU_API_KEY 格式不正确，请检查 key 是否完整"

### 4. 校验逻辑在 `api/_lib/validate.ts`，不在 `api/entangle.ts`

- `api/_lib/validate.ts` 中 `validateResult()` 硬性校验：`paths.length` 必须在 **1-3** 之间，每条路径的 `nodes.length` 必须在 **3-5** 之间
- `api/entangle.ts` 只做 HTTP 路由和参数校验（`termA`/`termB` 非空、不相同、不超过 32 字符）
- Prompt 文本（包含好例/坏例、三轮策略）完全在 `api/_lib/prompt/entangle.ts`
- Fallback 路径完全在 `api/_lib/fallback.ts`

### 5. 三处超时配置必须同步

| 位置 | 配置值 | 说明 |
|------|--------|------|
| `src/services/api.ts` `REQUEST_TIMEOUT_MS` | 60 秒 | 前端请求超时 |
| `vercel.json` `maxDuration` | 60 秒 | Vercel 函数最大执行时间 |
| `api/_lib/prompt/entangle.ts` `ATTEMPT_TIMEOUTS_MS` | [55, 50, 50] 秒 | 三轮 attempt 各自超时 |

如果修改其中任何一处，另外两处也必须同步评估。详见 `DEPLOYMENT-RUNBOOK.md` 故障排查章节。

### 6. `local-server.mjs` 是 TypeScript 源文件的手动镜像

`local-server.mjs` 的文件注释明确说明它是"TypeScript api/ 目录的 JavaScript 镜像，用于本地测试"，修改任何逻辑时需同步更新对应的 TypeScript 源文件。注意：`local-server.mjs` 的 provider 检测逻辑目前只检查 Friday / OpenAI / 智谱三个，DeepSeek 尚未同步（TypeScript 源文件已支持四个）。

### 7. 文档不是完全同一时期写的，要分清"哪个更新"

建议优先级：

1. **代码现状**
2. **README 里的当前状态说明**
3. **`DESIGN-SPEC.md` + `PRODUCT-REQUIREMENTS.md`**
4. **`tech-implementation-log.md` / `vibe-coding-log.md`**
5. **`技术交付文档.md`**（更偏早期总体交付定义，部分内容未完全实现）

### 8. 当前最值得保护的是体验骨架，而不是旧方案

已明确证明有效的体验骨架：

- 高质感 Hero
- 单页连续过渡
- 逐跳揭示
- 粒子流 / 节点发光 / ceremony
- 最后才给路径概览

后续开发时，应该基于这套骨架迭代，而不是退回普通列表页。

---

## 本地开发方式

### 环境要求

- Node.js 18+
- 已在这台机器上验证过 `Node v24.15.0`

### 安装依赖

```bash
npm install
```

### 配置环境变量

```bash
cp .env.example .env
```

`.env.example` 的完整变量说明（实际只需填写其中一个 provider 的 key，其余保持注释即可）：

```bash
# Friday One-API（优先使用，美团内网，仅本地开发可用）
FRIDAY_APP_ID=your_friday_app_id_here
FRIDAY_BASE_URL=https://aigc.sankuai.com/v1/openai/native
FRIDAY_MODEL=gpt-5.4

# OpenAI / 兼容接口（生产环境推荐；可指向硅基流动等中转站）
# 当前生产环境配置示例（硅基流动中转 DeepSeek V3）：
# OPENAI_API_KEY=your_siliconflow_key_here
# OPENAI_BASE_URL=https://api.siliconflow.cn/v1
# OPENAI_MODEL=deepseek-ai/DeepSeek-V3
#
# 直接使用 OpenAI 官方：
# OPENAI_API_KEY=your_openai_api_key_here
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=gpt-4o-mini

# DeepSeek 官方 API（直连，Vercel 节点海外访问可能不稳定）
# DEEPSEEK_API_KEY=your_deepseek_api_key_here
# DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
# DEEPSEEK_MODEL=deepseek-v4-pro

# 智谱 GLM API Key（优先级最低，已验证超时严重，不推荐）
# 注意：格式必须是"id.secret"
# ZHIPU_API_KEY=your_zhipu_api_key_here
# ZHIPU_MODEL=glm-4-flash

# 保底路径开关（值为 "1" 时启用，provider 不可用时触发应急路径）
# ENTANGLE_ENABLE_FALLBACK=1

# 本地 API 服务端口（默认 3001）
# LOCAL_API_PORT=3001
```

不要把真实 key 写进代码或 README。生产环境应配置在 Vercel 项目的环境变量中（详见 `DEPLOYMENT-RUNBOOK.md`）。

### 启动本地 API（开发态）

```bash
node local-server.mjs
```

默认监听：`http://localhost:3001`

### 启动前端

新开一个终端（两个进程需要同时运行）：

```bash
npm run dev
```

默认预期：`http://localhost:5173`

如果端口冲突，Vite 会自动切到其他端口（这台机器上曾实际跑在 `http://localhost:5174`）。

### 构建验证

```bash
npm run build
```

当前状态：已多次验证通过（含本轮更新）。

---

## 接口与数据流

### 前端到后端

- 前端调用入口：`src/services/api.ts`
- 开发环境：请求 `localhost:3001`
- 生产环境：请求同源 `/api/*`
- 前端请求超时：60 秒

### 核心接口

#### `POST /api/entangle`

请求体：

```json
{
  "termA": "深海采矿",
  "termB": "韩国大选",
  "regenerate": false
}
```

参数约束：

- `termA` 和 `termB` 必填，不能相同，长度不能超过 32 字符（超出返回 400）
- 频率限制：每 IP 每 60 秒最多 25 次请求（超出返回 429）

成功响应（200）：

```json
{
  "requestId": "req_abc123_xyz",
  "data": {
    "id": "ent_1748000000000",
    "termA": "深海采矿",
    "termB": "韩国大选",
    "paths": [...],
    "createdAt": "2026-05-06T12:00:00.000Z"
  }
}
```

每条 `path` 的结构：

```ts
interface NormalizedPath {
  title: string;
  hook: string;
  surprise: string;
  surpriseIndex: number;   // 1-10 整数
  nodes: NormalizedNode[]; // 3-5 个节点
  summary: string;
}

interface NormalizedNode {
  term: string;
  connectionToNext: string;
  detail: string;
}
```

生成策略：`api/_lib/prompt/entangle.ts` 中定义了三轮 attempt，按顺序尝试直到通过校验：

| 轮次 | 策略 | 目标路径数 | 超时 |
|------|------|-----------|------|
| 1 | `balanced` | 1-3 条，优先 2 条 | 55 秒 |
| 2 | `anti_generic` | 1-2 条 | 50 秒 |
| 3 | `single_path` | 1 条高置信路径 | 50 秒 |

#### `POST /api/daily-pair`

请求体：

```json
{
  "date": "2026-05-06"
}
```

参数约束：

- `date` 为可选字段，缺省取当天 ISO 日期
- `date` 长度不能超过 32 字符（超出返回 400）
- 频率限制：同 `/api/entangle`

成功响应（200）：

```json
{
  "requestId": "req_abc123_xyz",
  "data": {
    "date": "2026-05-06",
    "termA": "深海采矿",
    "domainA": "自然/科学",
    "termB": "韩国大选",
    "domainB": "政治/社会"
  }
}
```

#### 统一错误响应格式

所有接口的错误响应结构：

```json
{
  "requestId": "req_abc123_xyz",
  "error": {
    "code": "E_BAD_REQUEST",
    "message": "termA 与 termB 必填",
    "retryable": false
  }
}
```

错误码说明：

| code | HTTP 状态 | retryable | 说明 |
|------|-----------|-----------|------|
| `E_BAD_REQUEST` | 400 | false | 参数校验失败 |
| `E_RATE_LIMIT` | 429 | true | 频率超限 |
| `E_MODEL_TIMEOUT` | 504 | true | 模型多轮生成超时 |
| `E_PROVIDER_UNAVAILABLE` | 503 | false/true | provider 不可用或 key 缺失/格式错误 |
| `E_INVALID_MODEL_OUTPUT` | 502 | true | 模型输出多轮仍未通过质量校验 |
| `E_INTERNAL` | 500 | true | 服务内部错误 |

---

## 设计与产品的"源码级索引"

如果下一个对话要快速开始开发，建议按下面顺序读代码：

### 先读页面壳

- `src/App.tsx`
  - 看 `loadingHints`
  - 看 `curatedExamples`
  - 看 `previewResult`
  - 看 Hero 区结构
  - 看 `result ? ... : empty-state` 的分支
  - 看 `loadPreviewExperience()`（API 不可用时的降级体验入口）

### 再读结果页核心

- `src/components/PathReveal.tsx`
  - 看 `activePathIndex`
  - 看 `revealedCount`
  - 看 `pulseIndex`
  - 看 `ceremonyActive`
  - 看 `handleRevealNext()`
  - 看 `finale-shell`

### 再读样式系统

- `src/styles.css`
  - 看 `:root` design tokens
  - 看 `.card-hero`
  - 看 `.result-shell`
  - 看 `.constellation-*`
  - 看 `.edge-*`
  - 看 `.finale-*`
  - 看响应式断点

### 最后读后端能力边界

- `api/entangle.ts`
  - 看 HTTP 路由与参数校验
  - 看错误响应映射
- `api/_lib/prompt/entangle.ts`
  - 看 prompt 约束与好例/坏例
  - 看三轮 attempt 策略（`buildAttempts()`）
- `api/_lib/validate.ts`
  - 看 `FORBIDDEN_BRIDGES` 黑名单
  - 看 `validateResult()` 硬性校验
  - 看 `collectPathIssues()` 质量过滤
- `api/_lib/fallback.ts`
  - 看 `shouldFallbackToSafePath()` 触发条件
  - 看 `buildFallbackPaths()` 保底节点库
- `api/daily-pair.ts`
  - 看 topic 生成逻辑和 fallback
- `api/_lib/llm.ts`
  - 看 `getChatProviderConfig()` 四 provider 路由逻辑
  - 看 `checkRateLimit()` 频率限制

---

## 现在推荐的开发优先级

如果下一轮继续推进"从可用到高质量稳定"，建议按下面优先级推进：

### P0：线上可用性闭环

- 完成线上环境变量与部署验证（参见 `DEPLOYMENT-RUNBOOK.md`；生产环境当前使用硅基流动中转 DeepSeek V3，通过 `OPENAI_API_KEY` + `OPENAI_BASE_URL` + `OPENAI_MODEL` 配置）
- 增加基础观测能力（至少请求日志、错误占比、超时占比）
- 确保线上也具备与本地一致的兜底行为，不出现链路断裂

### P1：真实输出质量收口

- 提升真实路径与输入语义贴合度，减少"通用桥接"观感
- 继续优化路径文案质量门槛与筛选策略（调优入口：`api/_lib/validate.ts` 和 `api/_lib/prompt/entangle.ts`）
- 优化重试与 regenerate 的用户感知文案

### P2：增强项

- 更丰富的连线描边进场
- 更稳的限流（KV / Redis）
- 记住展开状态 / 回放体验

---

## 当前判断"做对了没"的标准

下一个对话不要只盯着"功能有了没"，更要用下面标准判断：

- 用户打开第一页会不会想点
- 输入两个词之后，等待过程是否有情绪和节奏
- 每揭示一跳时，是否真的有"再看下一步"的冲动
- 全部揭示后，是否有记忆点和值得截图的时刻
- 真实模型输出是否已经接近示例路径页的体验水准

一句话：

> 这个项目的胜负手，不是"能不能解释两个词"，而是"能不能把这条解释包装成一个值得体验、值得截图、值得分享的网页产品"。

---

## 给下一个对话的建议开场

可以直接把下面这段话丢给下一个对话：

```text
请先完整阅读 README.md，把它当作当前项目的交接入口。这个项目的设计方向已经定稿，不要重新发散讨论页面风格，而是基于现有 React + Vite + TypeScript 项目，把当前高保真展示继续落地成稳定可用的真实网页产品。请优先关注：1）真实 API 链路与前端体验对齐；2）统一前后端规格（尤其是 paths 数量）；3）在不破坏现有 UI/UX 基线的前提下继续开发。读完 README 后，再按其中索引阅读 DESIGN-SPEC.md、PRODUCT-REQUIREMENTS.md、项目文档.md、DEPLOYMENT-RUNBOOK.md、MODEL-SELECTION.md、tech-implementation-log.md，并从 src/App.tsx、src/components/PathReveal.tsx、src/styles.css、api/entangle.ts 开始进入开发。
```

---

## 补充说明

- 当前项目是一次 Vibe Coding 实践，但现在已经进入"从体验 demo 走向可用产品"的阶段
- 后续开发时，尽量少做"从零重来"，多做"在现有骨架上收口和补齐"
- 如果要改设计，请先对照 `DESIGN-SPEC.md` 和 `PRODUCT-REQUIREMENTS.md`
- 如果要改产品边界，请先对照 `项目文档.md`
- 如果要部署或排查线上问题，请先看 `DEPLOYMENT-RUNBOOK.md`
- 如果要换模型或评估 provider，请先看 `MODEL-SELECTION.md`
- 如果要理解为什么会变成现在这样，请先看 `vibe-coding-log.md`
- 如果要了解技术决策细节、已知坑点和后续建议，请先看 `tech-implementation-log.md`

祝下一轮开发顺利接棒。
