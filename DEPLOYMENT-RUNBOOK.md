# Entanglement 部署与域名绑定手册

> 目标：让没有项目背景的 AI 或新同学，也能独立完成本项目的线上更新发布与域名绑定。

## 1. 项目线上信息（先记住）

- Vercel Team（scope）：`doudou-projects`
- Vercel Project：`taggling`
- 生产默认域名：`https://taggling.vercel.app`
- 当前自定义域名：`https://entanglement.doudou.design`
- 代码仓库：`clear-blueskyyy/entanglement`
- 项目已绑定 `.vercel/project.json`，正常情况下不需要重新 link

## 2. 一次性初始化（首次接手机器时做）

### 2.1 准备 Node.js（若命令不可用）

CatPaw 非交互 shell 里有时没有自动加载 PATH，先执行：

```bash
NVM_LATEST=$(ls -d "$HOME/.nvm/versions/node"/v* 2>/dev/null | sort -V | tail -1)
export PATH="$NVM_LATEST/bin:$PATH"
node -v
npm -v
```

如果这里失败，说明机器没装 Node，请先安装 Node 18+。

### 2.2 验证 Vercel CLI 与登录状态

```bash
npx vercel --version
npx vercel whoami
```

- 如果 `whoami` 失败，执行：`npx vercel login --github`
- 浏览器完成授权后，再跑一次 `npx vercel whoami`

### 2.3 验证项目绑定

确认本地文件 `.vercel/project.json` 内容对应：

- `projectName` 应为 `taggling`
- `orgId` 应为 `team_d95OMxW3yheMAWZ1g6odLlnF`

如果不一致，执行：

```bash
npx vercel link --project taggling --scope doudou-projects --yes
```

## 3. 生产环境变量（部署前必须检查）

后端模型 Provider 优先级来自 `api/_lib/llm.ts`（检测到哪个 key 就用哪个）：

1. `FRIDAY_APP_ID`（美团内网，**公网 Vercel 节点不可达，生产不可用**）
2. `OPENAI_API_KEY`（**当前生产环境实际使用**，可指向中转站）
3. `DEEPSEEK_API_KEY`（DeepSeek 官方直连，Vercel 节点海外访问可能不稳定）
4. `ZHIPU_API_KEY`（已验证超时严重，不推荐）

### 3.1 生产建议

**当前生产方案（推荐）**：硅基流动（SiliconFlow）中转站路由到 DeepSeek V3，延迟稳定：

```
OPENAI_API_KEY  = <硅基流动的 Key>
OPENAI_BASE_URL = https://api.siliconflow.cn/v1
OPENAI_MODEL    = deepseek-ai/DeepSeek-V3
```

注册硅基流动：[https://cloud.siliconflow.cn](https://cloud.siliconflow.cn)

若硅基流动不可用，可切换为 OpenAI 官方：

```
OPENAI_API_KEY  = <OpenAI 的 Key>
# OPENAI_BASE_URL 不设则默认 https://api.openai.com/v1
OPENAI_MODEL    = gpt-4o-mini
```

> ⚠️ 至少保证一个可用 Key，否则 `/api/entangle` 返回 `E_PROVIDER_UNAVAILABLE`

### 3.2 在 Vercel 控制台配置

进入：

`https://vercel.com/doudou-projects/taggling/settings/environment-variables`

按 3.1 的推荐方案配置以下三个变量（三个都要填）：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`

保存后必须重新部署一次，变量才会生效。

### 3.3 环境变量工作原理（For Reference）

**为什么 API Key 可以在 Vercel 控制台配置，而不是写在代码里？**

代码里不硬编码 Key，而是通过 `process.env` 读取运行时变量：

```typescript
const apiKey = process.env.OPENAI_API_KEY;   // 代码只负责"读"
const model  = process.env.OPENAI_MODEL;     // 具体的值由外部注入
```

整个流程分三步：

1. **你填**：在 Vercel 控制台手动创建键值对，例如 `OPENAI_API_KEY = sk-xxxxx`
2. **Vercel 注入**：部署启动时，Vercel 把控制台里配的键值对塞进进程的运行环境里
3. **代码读取**：代码执行到 `process.env.OPENAI_API_KEY` 时，读到 Vercel 注入的值

三者通过**变量名**对应——你在控制台填的键名，必须和代码里 `process.env.XXX` 的 `XXX` 完全一致，才能读到。

> ⚠️ 如果控制台没有填某个变量，代码读到的就是 `undefined`，对应功能就会报错（例如 `E_PROVIDER_UNAVAILABLE`）。

**本地开发时**同理，只是变量来源换成了项目根目录的 `.env` 文件（该文件已在 `.gitignore` 中，不会提交到 Git）。

## 4. 每次代码更新的标准部署流程

在项目根目录执行：

```bash
NVM_LATEST=$(ls -d "$HOME/.nvm/versions/node"/v* 2>/dev/null | sort -V | tail -1)
export PATH="$NVM_LATEST/bin:$PATH"

npm ci
npm run build
npx vercel --prod --yes
```

成功后会看到类似输出：

- `Production: https://xxxx.vercel.app`
- `Aliased: https://taggling.vercel.app`

## 5. 部署后验证（必须做）

### 5.1 验证域名别名是否挂到新部署

```bash
npx vercel inspect <本次部署URL>
```

在 `Aliases` 中确认至少包含：

- `https://taggling.vercel.app`
- `https://entanglement.doudou.design`

### 5.2 验证站点可访问

```bash
curl -I https://entanglement.doudou.design/
```

返回 `HTTP/2 200`（或 3xx 后到 200）即可。

### 5.3 验证 API 基本可用（可选但建议）

```bash
curl -sS -X POST https://entanglement.doudou.design/api/daily-pair -H "Content-Type: application/json" -d '{"date":"2026-06-16"}'
```

如果返回 JSON 且无 `error` 字段，说明基础链路正常。

## 6. 绑定新域名 / 新子域名（通用步骤）

本项目已绑定 `entanglement.doudou.design`。如果未来要新增（例如 `v2.doudou.design`），按下列步骤：

### 6.1 在 Vercel 添加域名

```bash
npx vercel domains add v2.doudou.design --scope doudou-projects
```

Vercel 会返回需要配置的 DNS 记录（通常推荐 A 记录）。

### 6.2 在域名服务商添加 DNS 记录

以阿里云 DNS 为例，通常配置：

- 记录类型：`A`
- 主机记录：`v2`
- 记录值：`76.76.21.21`

> 当前线上 `entanglement.doudou.design` 也是通过 A 记录指向 `76.76.21.21`。

### 6.3 等待解析生效并验证

```bash
dig +short v2.doudou.design
curl -I https://v2.doudou.design/
```

确认能解析到目标 IP 且 HTTPS 可访问。

## 7. 常见故障与处理

### 7.1 `npx: command not found`

原因：PATH 没带 nvm Node。

处理：先执行第 2.1 节的 PATH 注入命令，再重试。

### 7.2 `No existing credentials found`

原因：Vercel CLI 未登录。

处理：`npx vercel login --github`。

### 7.3 部署成功但 API 报 `E_PROVIDER_UNAVAILABLE`

原因：生产环境没有可用模型 Key。

处理：在 Vercel 配置 `OPENAI_API_KEY` 或 `ZHIPU_API_KEY`，然后 Redeploy。

### 7.4 Vercel 构建报 TS2835（api import 扩展名）

原因：`api/` 下 TypeScript 相对 import 缺少 `.js` 后缀。

处理：把 `api/*.ts` 中 `_lib` 相对 import 统一改成 `from "./_lib/xxx.js"`。

### 7.5 FUNCTION_INVOCATION_TIMEOUT（接口始终超时）

**现象**：浏览器点击纠缠按钮后，约 30 秒报超时错误，API 返回 `FUNCTION_INVOCATION_TIMEOUT`。

**根本原因**：本项目 prompt 体积大（系统指令 + 9 个好例 + 4 个坏例，约 5800 token），模型生成时间较长，有三个超时限制必须同时放宽：

| 位置 | 文件 | 变量/字段 | 旧值 | 新值 |
|---|---|---|---|---|
| Vercel 函数执行上限 | `vercel.json` | `maxDuration` | 30s | 60s |
| 服务端 fetch 超时 | `api/_lib/prompt/entangle.ts` | `ATTEMPT_TIMEOUTS_MS` | [28, 24, 24]s | [55, 50, 50]s |
| 前端 fetch 超时 | `src/services/api.ts` | `REQUEST_TIMEOUT_MS` | 30s | 60s |
| 本地开发服务器超时 | `local-server.mjs` | `MODEL_ATTEMPT_TIMEOUT_MS` | [28, 24, 24]s | [55, 50, 50]s |

**处理**：四处必须同步修改，缺一不可。`vercel.json` 决定服务器最长跑多久；`ATTEMPT_TIMEOUTS_MS` 决定服务端每轮模型请求等多久；`REQUEST_TIMEOUT_MS` 决定浏览器等多久才放弃——前端超时比服务端短会导致服务器已有结果但浏览器先断开。

### 7.6 更换 API Provider 后仍然超时

**现象**：从 DeepSeek 直连切换到其他 Provider 后，`FUNCTION_INVOCATION_TIMEOUT` 依旧。

**原因**：Vercel 默认部署在美国/新加坡节点，部分 Provider 的 API 服务器在中国大陆，跨境网络不稳定导致请求超时。

**处理**：使用服务器在亚洲且对 Vercel 节点友好的 Provider。当前使用**硅基流动（SiliconFlow）**：
- API 地址：`https://api.siliconflow.cn/v1`
- 注册：[https://cloud.siliconflow.cn](https://cloud.siliconflow.cn)
- 在 Vercel 配置以下变量（利用 `OPENAI_API_KEY` 路由）：

  ```
  OPENAI_API_KEY  = sk-xxx（硅基流动的 Key）
  OPENAI_BASE_URL = https://api.siliconflow.cn/v1
  OPENAI_MODEL    = deepseek-ai/DeepSeek-V3
  ```

配置后 Redeploy 即可。

## 8. 给 AI 执行者的最短操作清单

1. 注入 Node PATH（第 2.1 节）。
2. `npx vercel whoami`，失败就登录。
3. `npm ci && npm run build`。
4. `npx vercel --prod --yes`。
5. `npx vercel inspect <部署URL>` 检查包含 `entanglement.doudou.design`。
6. `curl -I https://entanglement.doudou.design/` 验证可访问。

以上 6 步完成，即可认为“本次更新已同步到生产域名”。
