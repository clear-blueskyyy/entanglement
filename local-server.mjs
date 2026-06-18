/**
 * 本地 API 测试服务器（仅供开发测试，不上线）
 * 用法：node local-server.mjs
 * 监听 3001 端口，处理 /api/entangle 和 /api/daily-pair
 *
 * ────────────────────────────────────────────────────────────────────────
 * 注意：本文件是 TypeScript api/ 目录的 JavaScript 镜像，用于本地测试。
 * 由于 Node.js 不直接运行 .ts 文件，核心逻辑在此保持同步复制。
 *
 * 与 TypeScript 模块的对应关系：
 *   PROMPT 相关常量 / buildEntangleSystemPrompt() / buildEntangleUserPrompt()  → api/_lib/prompt/entangle.ts
 *   校验 / validatePaths() / 错误分类        → api/_lib/validate.ts
 *   Fallback 数据 / buildFallbackPaths()     → api/_lib/fallback.ts
 *   LLM 调用 / getChatProviderConfig()       → api/_lib/llm.ts
 *   entangle HTTP 处理                       → api/entangle.ts
 *   daily-pair HTTP 处理                     → api/daily-pair.ts
 *
 * 修改任何逻辑时，请同步更新对应的 TypeScript 源文件。
 * ────────────────────────────────────────────────────────────────────────
 */

import http from "node:http";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";

// ─── 环境变量加载 ─────────────────────────────────────────────────────────────

const envPath = new URL(".env", import.meta.url).pathname;
try {
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    process.env[key] = val;
  }
  const configuredProvider = process.env.FRIDAY_APP_ID
    ? `FRIDAY (model: ${process.env.FRIDAY_MODEL || "gpt-5.4"})`
    : process.env.OPENAI_API_KEY
      ? `OpenAI (model: ${process.env.OPENAI_MODEL || "gpt-4o-mini"}, base: ${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"})`
      : process.env.DEEPSEEK_API_KEY
        ? `DeepSeek (model: ${process.env.DEEPSEEK_MODEL || "deepseek-v4-pro"}, base: ${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1"})`
        : process.env.ZHIPU_API_KEY
          ? `Zhipu (model: ${process.env.ZHIPU_MODEL || "glm-4-flash"})`
          : "未配置（请在 .env 中配置至少一个 provider 的 key）";
  console.log("✅ .env 加载完成，当前 Provider:", configuredProvider);
} catch {
  console.warn("⚠️  未找到 .env 文件，将使用系统环境变量");
}

const PORT = Number(process.env.LOCAL_API_PORT || 3001);

// ─── Provider 配置（对应 api/_lib/llm.ts） ────────────────────────────────────

const FRIDAY_BASE_URL = "https://aigc.sankuai.com/v1/openai/native";
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const ZHIPU_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const DEFAULT_FRIDAY_MODEL = "gpt-5.4";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-pro";
const DEFAULT_ZHIPU_MODEL = "glm-4-flash";

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

function getChatProviderConfig() {
  const fridayAppId = process.env.FRIDAY_APP_ID?.trim();
  if (fridayAppId) {
    const baseUrl = normalizeBaseUrl(process.env.FRIDAY_BASE_URL?.trim() || FRIDAY_BASE_URL);
    return {
      provider: "friday",
      endpoint: `${baseUrl}/chat/completions`,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${fridayAppId}` },
      model: process.env.FRIDAY_MODEL?.trim() || DEFAULT_FRIDAY_MODEL,
    };
  }
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiApiKey) {
    const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL?.trim() || OPENAI_BASE_URL);
    return {
      provider: "openai",
      endpoint: `${baseUrl}/chat/completions`,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiApiKey}` },
      model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
    };
  }
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekApiKey) {
    const baseUrl = normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL?.trim() || DEEPSEEK_BASE_URL);
    return {
      provider: "deepseek",
      endpoint: `${baseUrl}/chat/completions`,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekApiKey}` },
      model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL,
    };
  }
  const zhipuApiKey = process.env.ZHIPU_API_KEY?.trim();
  if (zhipuApiKey) {
    return {
      provider: "zhipu",
      endpoint: ZHIPU_ENDPOINT,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${createZhipuToken(zhipuApiKey)}` },
      model: process.env.ZHIPU_MODEL?.trim() || DEFAULT_ZHIPU_MODEL,
    };
  }
  throw new Error("MODEL_API_KEY is missing");
}

function createZhipuToken(apiKey) {
  const [id, secret] = apiKey.split(".");
  if (!id || !secret) throw new Error("invalid zhipu api key format");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60;
  const encode = (data) => Buffer.from(JSON.stringify(data)).toString("base64url");
  const tokenData = `${encode({ alg: "HS256", sign_type: "SIGN" })}.${encode({ api_key: id, exp, timestamp: now })}`;
  const sig = crypto.createHmac("sha256", secret).update(tokenData).digest("base64url");
  return `${tokenData}.${sig}`;
}

async function callLLM(messages, timeoutMs = 25000) {
  const provider = getChatProviderConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(provider.endpoint, {
      method: "POST",
      headers: provider.headers,
      body: JSON.stringify({ model: provider.model, temperature: 0.75, messages }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const detail = (await resp.text()).slice(0, 300);
      throw new Error(`provider status ${resp.status}${detail ? `: ${detail}` : ""}`);
    }
    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content?.trim()) throw new Error("empty model content");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return JSON.parse(fenced[1].trim());
  const fb = text.indexOf("{");
  const lb = text.lastIndexOf("}");
  if (fb !== -1 && lb > fb) return JSON.parse(text.slice(fb, lb + 1));
  const fa = text.indexOf("[");
  const la = text.lastIndexOf("]");
  if (fa !== -1 && la > fa) return JSON.parse(text.slice(fa, la + 1));
  throw new Error("cannot extract json");
}

// ─── HTTP 工具 ────────────────────────────────────────────────────────────────

function buildRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function jsonReply(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function createErrorPayload(requestId, code, message, retryable) {
  return { requestId, error: { code, message, retryable } };
}

// ─── Validate（对应 api/_lib/validate.ts） ────────────────────────────────────

const TERM_MAX_LENGTH = 32;
const NODE_TERM_MIN_LENGTH = 2;
const NODE_TERM_MAX_LENGTH = 18;
const MIN_DETAIL_LENGTH = 12;
const MIN_CONNECTION_LENGTH = 8;
const MIN_TITLE_LENGTH = 4;
const MIN_SURPRISE_LENGTH = 12;
const MIN_HOOK_LENGTH = 16;
const MIN_SUMMARY_LENGTH = 36;

const FORBIDDEN_BRIDGES = [
  "技术进步", "全球化", "社会变迁", "人类文明", "时代发展",
  "财务压力", "时间自由", "时间上的自由", "工作专注度", "工作效率",
  "工作效率下降", "稳定收入", "梦想与现实", "选择困难", "生活方式",
  "风险偏好", "抽象联系", "社会情绪", "平台生态", "商业逻辑",
  "文化符号", "传播链路", "行业标准", "支付通道", "监管条款",
];
const ABSTRACT_PATTERNS = [/人类文明$/, /时代发展$/, /.+(逻辑|趋势|现象|结构|问题|困境)$/];
const GENERIC_NODE_PATTERNS = [
  /^(社会|文化|经济|技术|商业|产业|政策|平台|舆论|媒介|资本|公共)(逻辑|结构|环境|现象|问题|机制|系统|趋势)$/,
  /^(资源|利益|注意力|情绪|需求)(分配|流动|博弈)$/,
  /^(规则|机制|体系|系统|框架)$/,
];
const GENERIC_CONNECTION_PATTERNS = [
  /^两者(都)?(与|在).*(有关|相关)[。！]?$/,
  /^本质上(是|属于).*[。！]?$/,
  /^这(一|个).*(说明|体现|反映|意味着).*[。！]?$/,
  /^它(让|使|把).*(联系起来|连接起来|串起来).*[。！]?$/,
];
const LOW_SIGNAL_CONNECTION_FRAGMENTS = [
  "相关", "联系", "体现", "反映", "说明", "意味着",
  "折射", "连接", "串起来", "放在同一", "带到", "语境",
];
const LOW_SIGNAL_DETAIL_FRAGMENTS = [
  "一种", "某种", "相关内容", "重要组成", "值得关注",
  "密切相关", "可以理解为", "常被视为", "关键一环", "放大器",
];
const MECHANISM_SIGNAL_FRAGMENTS = [
"因为", "通过", "迫使", "导致", "使得", "倒逼",
"依赖", "授权", "许可", "定价", "分发", "选票",
"预算", "供应", "合同", "投票", "补贴", "诉讼", "推荐", "融资",
"同源", "共同的因", "镜像", "翻转", "承重", "接口", "换装", "校对", "排程",
];
const GENERIC_CARRIER_NODE_FRAGMENTS = [
"麦克风",
"舞台设备",
"演出设备",
"直播平台",
"流媒体平台",
"众筹平台",
"链上钱包",
"支付工具",
"跨境支付",
];
const REPLACEABLE_REASONING_FRAGMENTS = [
"都离不开",
"都能被放进",
"都能通过",
"总需要",
"更方便地收款",
"更容易筹到钱",
"天然能",
"更容易和技术系统连接",
];

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isForbiddenBridge(term, termA, termB) {
  if (!term) return true;
  if (term === termA || term === termB) return true;
  if (FORBIDDEN_BRIDGES.includes(term)) return true;
  if (GENERIC_NODE_PATTERNS.some((p) => p.test(term))) return true;
  return ABSTRACT_PATTERNS.some((p) => p.test(term));
}

function countFragments(text, fragments) {
  return fragments.filter((f) => text.includes(f)).length;
}

function countNodesWithAnyFragment(nodes, fragments) {
  return nodes.filter((node) => fragments.some((fragment) => node.term.includes(fragment))).length;
}

function hasAnyFragment(text, fragments) {
  return fragments.some((f) => text.includes(f));
}

function isWeakConnection(connectionToNext) {
  if (GENERIC_CONNECTION_PATTERNS.some((p) => p.test(connectionToNext))) return true;
  const low = countFragments(connectionToNext, LOW_SIGNAL_CONNECTION_FRAGMENTS);
  const mech = countFragments(connectionToNext, MECHANISM_SIGNAL_FRAGMENTS);
  return low >= 2 || (low >= 1 && mech === 0 && connectionToNext.length < 20);
}

function isWeakDetail(detail) {
  const low = countFragments(detail, LOW_SIGNAL_DETAIL_FRAGMENTS);
  const mech = countFragments(detail, MECHANISM_SIGNAL_FRAGMENTS);
  return low >= 1 && mech === 0;
}

function isReplaceablePath(path) {
  const narrativeText = `${path.hook} ${path.surprise} ${path.summary} ${path.nodes
    .map((node) => node.connectionToNext)
    .join(" ")}`;
  const carrierHits = countNodesWithAnyFragment(path.nodes, GENERIC_CARRIER_NODE_FRAGMENTS);
  return carrierHits >= 2 && hasAnyFragment(narrativeText, REPLACEABLE_REASONING_FRAGMENTS);
}

function getInputAnchors(term) {
  const normalized = normalizeText(term);
  const anchors = new Set();
  const compact = normalized.replace(/\s+/g, "");
  const latinParts = normalized.match(/[A-Za-z0-9][A-Za-z0-9-]{1,}/g) ?? [];
  for (const part of latinParts) anchors.add(part.toLowerCase());
  if (compact.length > 0) {
    anchors.add(compact);
    const maxSize = Math.min(4, compact.length);
    for (let size = 2; size <= maxSize; size++) {
      for (let i = 0; i <= compact.length - size; i++) {
        anchors.add(compact.slice(i, i + size));
      }
    }
  }
  return Array.from(anchors).filter((a) => a.length >= 2).slice(0, 10);
}

function countAnchorHits(text, anchors) {
  const lower = text.toLowerCase();
  return anchors.filter((a) => lower.includes(a.toLowerCase())).length;
}

function collectPathIssues(path, termA, termB) {
  const issues = [];
  const metaText = `${path.hook} ${path.surprise} ${path.summary}`;
  const allText = `${path.title} ${metaText} ${path.nodes
    .map((n) => `${n.term} ${n.connectionToNext} ${n.detail}`)
    .join(" ")}`;

  if (!metaText.includes(termA) || !metaText.includes(termB)) issues.push("meta missing input anchor");
  if (path.nodes.filter((n) => isForbiddenBridge(n.term, termA, termB)).length >= 1) issues.push("generic node");
  if (path.nodes.filter((n) => isWeakConnection(n.connectionToNext)).length >= 2) issues.push("generic connections");
  if (path.nodes.filter((n) => isWeakDetail(n.detail)).length >= 2) issues.push("generic details");

  const anchorHits =
    countAnchorHits(allText, getInputAnchors(termA)) +
    countAnchorHits(allText, getInputAnchors(termB));
  if (anchorHits < 2) issues.push("insufficient semantic anchor");
  if (path.surpriseIndex < 4) issues.push("surprise too weak");
  if (hasAnyFragment(path.title + path.summary, ["保底", "模板", "通用机制", "万能中介"])) issues.push("template framing");
  if (isReplaceablePath(path)) issues.push("replaceable carrier path");

  return issues;
}

function validatePaths(input, termA, termB) {
  if (typeof input !== "object" || input === null) throw new Error("invalid response shape");
  const paths = input.paths;
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > 3) throw new Error("paths must be 1-3");

  const normalizedPaths = paths.map((path) => {
    if (typeof path !== "object" || path === null) throw new Error("path invalid");
    const title = normalizeText(path.title);
    const hook = normalizeText(path.hook);
    const surprise = normalizeText(path.surprise);
    const summary = normalizeText(path.summary);
    const surpriseIndex = Number(path.surpriseIndex ?? 0);
    const nodes = path.nodes;

    if (!title || !hook || !surprise || !summary) throw new Error("path meta missing");
    if (title.length < MIN_TITLE_LENGTH) throw new Error("title too short");
    if (surprise.length < MIN_SURPRISE_LENGTH) throw new Error("surprise too short");
    if (hook.length < MIN_HOOK_LENGTH || summary.length < MIN_SUMMARY_LENGTH) throw new Error("path copy too short");
    if (!Number.isInteger(surpriseIndex) || surpriseIndex < 1 || surpriseIndex > 10) throw new Error("surprise index invalid");
    if (!Array.isArray(nodes) || nodes.length < 3 || nodes.length > 5) throw new Error("node count must be 3-5");

    const seenTerms = new Set();
    const normalizedNodes = nodes.map((node) => {
      if (typeof node !== "object" || node === null) throw new Error("node invalid");
      const term = normalizeText(node.term);
      const connectionToNext = normalizeText(node.connectionToNext);
      const detail = normalizeText(node.detail);
      if (!term || !connectionToNext || !detail) throw new Error("node fields missing");
      if (term.length < NODE_TERM_MIN_LENGTH || term.length > NODE_TERM_MAX_LENGTH) throw new Error("node term length invalid");
      if (connectionToNext.length < MIN_CONNECTION_LENGTH) throw new Error("connection too short");
      if (detail.length < MIN_DETAIL_LENGTH) throw new Error("node detail too short");
      if (isForbiddenBridge(term, termA, termB)) throw new Error("forbidden bridge node");
      if (seenTerms.has(term)) throw new Error("duplicate node");
      seenTerms.add(term);
      return { term, connectionToNext, detail };
    });

    return { title, hook, surprise, surpriseIndex, nodes: normalizedNodes, summary };
  });

  const filtered = normalizedPaths.filter((p) => collectPathIssues(p, termA, termB).length < 2);
  if (filtered.length === 0) throw new Error("path quality too weak");
  filtered.sort((a, b) => b.surpriseIndex - a.surpriseIndex || b.nodes.length - a.nodes.length);
  return filtered;
}

// ─── Fallback（对应 api/_lib/fallback.ts） ────────────────────────────────────

const DOMAIN_FALLBACK_NODES = {
  tech: [
    { term: "开源协议", detail: "代码共享的边界条件，会重塑商业竞争与协作的版图。" },
    { term: "算力定价", detail: "计算资源的成本结构，会筛选出哪些应用能规模化落地。" },
    { term: "数据标注产业", detail: "AI 背后的手工劳动层，其成本与分布会反噬模型能力的天花板。" },
    { term: "开发者社区", detail: "技术采纳的第一张多米诺骨牌，社区情绪会提前锁定标准走向。" },
  ],
  politics: [
    { term: "选区划分", detail: "地理边界的数学游戏，会系统性地放大或稀释特定群体的声音。" },
    { term: "党内初选规则", detail: "候选人筛选的漏斗设计，决定了最终选项的意识形态区间。" },
    { term: "利益集团游说", detail: "政策制定的隐形输入端，能把行业焦虑翻译成法律条文。" },
    { term: "选民登记制度", detail: "参与门槛的微小调整，会显著改变投票人口的构成。" },
  ],
  culture: [
    { term: "策展人网络", detail: "品味的中介层，谁能定义什么是好作品，谁就掌握了文化资本。" },
    { term: "盗版传播路径", detail: "灰色流通渠道，往往比正版更早抵达边缘市场并培育需求。" },
    { term: "粉丝社群组织", detail: "情感劳动的集体形态，能把消费行为转化成生产性力量。" },
    { term: "独立发行渠道", detail: "绕过主流平台的替代路径，维持着文化多样性的最小剂量。" },
  ],
  business: [
    { term: "账期谈判", detail: "谁垫付资金的时间差，谁就承担了供应链的实际风险。" },
    { term: "渠道返点结构", detail: "隐藏在定价背后的分配游戏，决定了销售动力的流向。" },
    { term: "库存周转率", detail: "货物停留的时间成本，会把市场信号放大或扭曲后传导。" },
    { term: "供应链金融", detail: "基于交易数据的信贷创新，让过去无法抵押的资产变成流动性。" },
  ],
  nature: [
    { term: "迁徙路线", detail: "物种移动的古老通道，一旦被切断会触发连锁生态崩溃。" },
    { term: "水文节律", detail: "水的时空分布模式，塑造了文明能触及的地理边界。" },
    { term: "土壤微生物", detail: "地下的生命网络，决定了农业的韧性与碳储存潜力。" },
    { term: "授粉网络", detail: "植物与昆虫的古老契约，其瓦解会直接威胁食物系统根基。" },
  ],
  general: [
    { term: "平台推荐系统", detail: "平台的分发规则会改变信息被看见的顺序，直接重排公众关注焦点。" },
    { term: "供应链排期", detail: "当排期被卡住时，企业和政策会一起被迫调整优先级与投入节奏。" },
    { term: "地方就业结构", detail: "就业结构会把宏观议题映射成家庭层面的具体选择和投票偏好。" },
    { term: "媒体议程设置", detail: "媒体如何组织议题会决定大众先理解哪一层因果，再判断立场。" },
  ],
};

const DYNAMIC_CONNECTION_TEMPLATES = [
  "围绕{start}的讨论一旦进入{node}层面，关注点会从现象转向更可执行的现实约束。",
  "{node}会改变资源与注意力的分配方式，让链路继续向{end}靠近。",
  "当{node}被放大后，前面的变化会被翻译成{end}能够感知的结果。",
  "在{node}这一步，{start}不再只是话题，而会变成必须处理的现实条件。",
  "{node}提供了中间语境，让{start}与{end}终于落在同一张问题地图上。",
];

function detectDomain(term) {
  const techKeywords = ["ai", "算法", "代码", "芯片", "互联网", "数据", "软件", "硬件", "智能", "模型", "科技", "技术", "平台", "应用"];
  const politicsKeywords = ["选举", "政府", "政策", "政治", "政党", "投票", "议会", "立法", "监管", "民主", "治理", "公共"];
  const cultureKeywords = ["电影", "音乐", "艺术", "文学", "小说", "游戏", "创作", "文化", "审美", "风格", "亚文化", "流行", "歌手"];
  const businessKeywords = ["市场", "商业", "企业", "公司", "投资", "金融", "经济", "消费", "品牌", "利润", "营收", "创业"];
  const natureKeywords = ["生态", "环境", "气候", "自然", "物种", "海洋", "森林", "能源", "地质", "生物", "地球", "资源"];
  const t = term.toLowerCase();
  if (techKeywords.some((k) => t.includes(k))) return "tech";
  if (politicsKeywords.some((k) => t.includes(k))) return "politics";
  if (cultureKeywords.some((k) => t.includes(k))) return "culture";
  if (businessKeywords.some((k) => t.includes(k))) return "business";
  if (natureKeywords.some((k) => t.includes(k))) return "nature";
  return "general";
}

function stableHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return hash;
}

function buildFallbackPaths(termA, termB, regenerate) {
  const domainA = detectDomain(termA);
  const domainB = detectDomain(termB);
  const pool = [...(DOMAIN_FALLBACK_NODES[domainA] || DOMAIN_FALLBACK_NODES.general),
                ...(DOMAIN_FALLBACK_NODES[domainB] || DOMAIN_FALLBACK_NODES.general),
                ...DOMAIN_FALLBACK_NODES.general]
    .filter((c, i, arr) => arr.findIndex((x) => x.term === c.term) === i);
  const source = pool.length >= 3 ? pool : DOMAIN_FALLBACK_NODES.general;
  const startIndex = stableHash(`${termA}::${termB}`) % source.length;
  const picked = new Set();
  for (let step = 0; step < source.length && picked.size < 3; step++) {
    picked.add(source[(startIndex + step) % source.length]);
  }
  const nodes = Array.from(picked).slice(0, 3).map((c, i) => ({
    term: c.term,
    connectionToNext: DYNAMIC_CONNECTION_TEMPLATES[(startIndex + i) % DYNAMIC_CONNECTION_TEMPLATES.length]
      .replace(/{start}/g, termA).replace(/{end}/g, termB).replace(/{node}/g, c.term),
    detail: c.detail,
  }));
  return [{
    title: regenerate ? "低优先保底线" : "应急保底线",
    hook: `这不是优先结果，而是在真实生成完全失败时，临时用具体机制把 ${termA} 与 ${termB} 托住。`,
    surprise: `真正应该优化的不是这条保底线，而是让 ${termA} 到 ${termB} 的真实路径稳定产出。`,
    surpriseIndex: 5,
    nodes,
    summary: `只有在明确开启保底模式后，这条路径才会作为应急结果返回；默认应继续争取真实生成，而不是用模板遮住失败。`,
  }];
}

function shouldFallbackToSafePath(error) {
  if (process.env.ENTANGLE_ENABLE_FALLBACK !== "1" || !(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("provider status") || msg.includes("zhipu_api_key") ||
         msg.includes("invalid zhipu api key format") || msg.includes("abort");
}

// ─── Prompt（对应 api/_lib/prompt/entangle.ts） ───────────────────────────────

const WONDER_TYPES = [
  "1. 共因揭示（Common Cause）：A 和 B 看似无关，实为同一历史事件、物质条件或制度变迁的两个侧影；枢纽节点就是那个共同的因。示例形状：咖啡 <- 殖民贸易路线 -> 糖。",
  "2. 结构同构（Isomorphism）：A 领域与 B 领域内部的资金、权力、注意力或物质流转结构高度同构；枢纽节点就是两侧共用的结构骨架。示例形状：教堂捐赠体系 <-> 开源软件赞助体系。",
  "3. 角色反转（Inversion）：B 本质上是 A 的反面、阴影或副产品，正因为是反面才暴露 A 的本质；枢纽节点就是让反面显形的机制。示例形状：维生素 C <- 坏血病 -> 英国海军霸权。",
  "4. 尺度跳跃（Scale Shift）：一个微观的小物件、小格式或小动作，意外解释了宏观议题，反之亦然；枢纽节点必须完成尺度跨越。示例形状：一粒沙 -> 晶圆良率 -> 地缘政治。",
  "5. 物质入口（Material Anchor）：一个极具体、极不起眼的物，是 A -> B 成立的承重点；枢纽节点必须是可摸到、可买到、可写明的东西。示例形状：40 英尺集装箱 -> 全球化。",
  "6. 中介悖论（Despised Middleman）：A 和 B 的连接依赖一个被主流叙事低估、看不上或视而不见的第三方；枢纽节点通常是二手商、翻译、维修工、代理人之类的中介角色。示例形状：字幕组 -> 中国 ACG 审美 -> 游戏出海。",
];

const GOOD_CASES = [
[
"好例 1（咖啡 -> 糖，共因揭示）：",
'{"paths":[{"title":"苦甜同源","hook":"真正把咖啡拐向糖的，不是口味偏好，而是同一套殖民贸易路线把两者一起塞进了欧洲早餐桌。","surprise":"咖啡和糖看起来只是杯中搭配，但更早让它们绑定的是加勒比种植园与跨洋航运保险。","surpriseIndex":8,"nodes":[{"term":"殖民贸易路线","connectionToNext":"欧洲商船为了提高单次航程利润，把咖啡与甘蔗制品放进同一套跨洋运输网络与港口结算体系。","detail":"它不是抽象的全球化，而是具体的船期、港口、保险和账册安排，决定了哪些货物会被一起规模化流通。"},{"term":"加勒比种植园","connectionToNext":"种植园同时稳定输出咖啡豆与蔗糖原料，让欧洲市场把两者视为可以成套消费的殖民商品。","detail":"这里的关键不是农业本身，而是被强制劳动和出口合同绑定的单一种植结构。"},{"term":"欧洲早餐桌","connectionToNext":"当咖啡和糖在早餐场景里形成固定搭配，终点就不再是两种商品，而是一套共同被消费的日常制度。","detail":"消费习惯会把原本分开的商品重新打包，变成稳定的味觉和阶层象征。"}],"summary":"这条路径的妙点在于它不是说咖啡配糖，而是揭出两者背后同一个因：殖民贸易路线与种植园制度先把它们捆在一起，后来才长成今天的日常口味。"}]}'
].join("\n"),
[
"好例 2（教堂捐赠体系 -> 开源软件赞助体系，结构同构）：",
'{"paths":[{"title":"捐赠骨架","hook":"教堂捐赠体系和开源软件赞助体系并不是气质相似，而是它们都靠同一种公开捐献换取声望与持续维护。","surprise":"两者最像的地方不是信仰或技术，而是捐赠名单、道德正当性和维护劳动被同一套结构绑定。","surpriseIndex":8,"nodes":[{"term":"公开捐献名录","connectionToNext":"当捐献者名字被公开展示，资金流入就会同时转化成声望竞争与身份表态。","detail":"名录的作用不是记账，而是把私人出资变成可见的社会排序。"},{"term":"维护者劳动","connectionToNext":"一旦声望与资金稳定流向维护者，体系就能长期运转，并把赞助关系固化成持续供养。","detail":"无论是修道院抄经还是开源项目维护，真正昂贵的都是持续而不显眼的日常劳动。"},{"term":"赞助正当性","connectionToNext":"当赞助被包装成守护共同体的正当行为，终点就自然落到现代开源赞助体系。","detail":"它提供了一种公开解释：出资不是单纯购买，而是在购买自身的道德位置与共同体席位。"}],"summary":"这条路径的妙点在于它抓的不是题材，而是骨架：公开捐献、持续维护、正当性回报，这套结构从教堂延续到开源世界，换了内容却没换流转方式。"}]}'
].join("\n"),
[
"好例 3（维生素 C -> 英国海军霸权，角色反转）：",
'{"paths":[{"title":"缺乏胜利","hook":"把维生素 C 拐向英国海军霸权的，不是营养学常识，而是坏血病这个反面先暴露了远洋战争真正的瓶颈。","surprise":"真正帮助英国海军赢得续航优势的，不是更大的炮，而是如何避免船员先被坏血病拖垮。","surpriseIndex":9,"nodes":[{"term":"坏血病","connectionToNext":"当远洋船员因为维生素 C 缺乏大量失能，舰队就会被迫把补给问题当成军事问题处理。","detail":"它让营养不再只是医学议题，而变成决定舰队是否还能继续航行和作战的刚性约束。"},{"term":"长期远洋补给","connectionToNext":"一旦补给体系开始稳定携带柑橘汁或替代来源，舰队的有效续航就明显拉长。","detail":"补给改造的关键不在食物好不好吃，而在是否能被标准化储存、分发和执行。"},{"term":"海军续航优势","connectionToNext":"当英国舰队比对手更能持续留在海上，海权控制就会积累成殖民扩张与贸易护航优势。","detail":"霸权往往不是一次战役打出来的，而是长期留在关键航道上的能力慢慢堆出来的。"}],"summary":"这条路径的妙点在于它用坏血病这个反面解释了维生素 C 的政治重量：不是营养成分本身塑造了海权，而是缺了它，海军霸权根本撑不起来。"}]}'
].join("\n"),
[
"好例 4（一粒沙 -> 地缘政治，尺度跳跃）：",
'{"paths":[{"title":"沙到芯片","hook":"真正让一粒沙拐向地缘政治的，不是比喻，而是高纯石英砂会直接决定先进晶圆的良率与供应安全。","surprise":"最让人意外的一跳不是沙子进了工厂，而是晶圆良率这种微观数字会反过来触发国家级出口管制。","surpriseIndex":9,"nodes":[{"term":"高纯石英砂","connectionToNext":"只有杂质极低的石英材料才能稳定进入硅片制造，原料纯度会直接压到后续制程表现。","detail":"它看起来只是原材料，但实际决定了芯片制造能否进入高良率区间。"},{"term":"晶圆良率","connectionToNext":"当良率稍有波动，先进芯片的供给与成本都会剧烈变化，产业链因此把原料问题上升为战略问题。","detail":"良率不是技术宅指标，它决定一条产线能不能赚钱、能不能稳定供货。"},{"term":"先进芯片出口管制","connectionToNext":"一旦芯片成为战略稀缺品，国家就会通过出口管制和设备限制把竞争升级到地缘政治层面。","detail":"这里连接政治的不是抽象科技竞争，而是具体产能、交付周期和卡脖子能力。"}],"summary":"这条路径的妙点在于完成了尺度跳跃：一粒沙之所以能走到地缘政治，不靠隐喻，而靠石英纯度影响良率，良率再影响国家对先进芯片的控制策略。"}]}'
].join("\n"),
[
"好例 5（40 英尺集装箱 -> 全球化，物质入口）：",
'{"paths":[{"title":"箱体承重","hook":"40 英尺集装箱之所以能拐向全球化，不是因为它象征现代物流，而是它把海运、港口、卡车和仓库第一次锁进同一套标准尺寸。","surprise":"真正托住全球化的，不是宏大叙事，而是一个能被吊机、码头和车架共同识别的铁箱尺寸。","surpriseIndex":9,"nodes":[{"term":"标准箱体尺寸","connectionToNext":"当船公司、港口和卡车都围绕同一尺寸投资设备，货物换装成本就会被大幅压低。","detail":"尺寸标准的力量在于它能写进设备规格、运输合同和保险条款，而不是停留在口头协作。"},{"term":"港口装卸设备","connectionToNext":"统一尺寸让吊机、堆场和调度软件可以批量处理货柜，海量货物流转因此变得可预测。","detail":"设备标准化把原本依赖人工拆装的零碎流程，改造成按分钟计费的工业流水线。"},{"term":"跨国供应链排程","connectionToNext":"当运输时间与换装成本稳定下来，企业才敢把生产拆散到不同国家，终点也就落到了全球化分工。","detail":"供应链全球化依赖的不是愿景，而是排程可以写进合同、库存可以按船期兑现。"}],"summary":"这条路径的妙点在于抓住了一个很小但不能替代的物：40 英尺集装箱不是背景道具，而是把全球化真正承重起来的标准接口。"}]}'
].join("\n"),
[
"好例 6（字幕组 -> 游戏出海，中介悖论）：",
'{"paths":[{"title":"民间翻译层","hook":"字幕组能拐向游戏出海，不是因为二次元都爱同一套梗，而是民间翻译先悄悄把术语、语气和受众期待训练出来了。","surprise":"最容易被忽略的一跳不是发行商，而是那些不被正式承认、却长期在做翻译校对和口味教育的字幕组。","surpriseIndex":8,"nodes":[{"term":"民间翻译校对","connectionToNext":"字幕组长期处理语气词、梗和文化差异，先把一套可复用的表达习惯训练给核心用户。","detail":"它们不只是搬运文本，而是在没有正式预算的情况下替平台完成早期本地化测试。"},{"term":"ACG 术语共识","connectionToNext":"当一批玩家已经习惯某套翻译和表达，游戏发行时就会优先沿用这些被社区验证过的说法。","detail":"术语共识降低了正式本地化的试错成本，也减少了作品进入新市场时的理解摩擦。"},{"term":"海外发行本地化","connectionToNext":"发行团队一旦能复用现成的语言共识和用户口味，游戏出海就更容易跨过翻译与接受度门槛。","detail":"这里真正省下来的不是字数，而是测试周期、返工成本和用户初次接触时的误解风险。"}],"summary":"这条路径的妙点在于它把被主流叙事忽略的字幕组放回中心：真正托着游戏出海前进的，常常不是最后签约的人，而是更早完成语言磨合的灰度中介层。"}]}'
].join("\n"),
[
"好例 7（深海采矿 -> 韩国大选，实战标杆）：",
'{"paths":[{"title":"审批外溢","hook":"深海采矿拐向韩国大选，不是因为海洋议题天然政治化，而是环保审批会先被抗议组织和青年动员机制接住。","surprise":"从深海采矿走到韩国大选，最关键的一跳不是矿本身，而是审批争议如何折成青年选民的政策情绪。","surpriseIndex":9,"nodes":[{"term":"深海采矿环保审批","connectionToNext":"一旦采矿许可进入审批阶段，环保组织就能把原本专业的海洋工程议题改写成公共争议。","detail":"深海项目必须面对跨部门审批、环境评估和合法性审查，争议会被制度化放大。"},{"term":"NGO诉讼与抗议","connectionToNext":"当诉讼和抗议持续出现，候选人就会被迫对资源开发、产业安全和环境立场作出表态。","detail":"这一步不是情绪宣泄，而是把审批争议翻译进媒体议程和政党攻防。"},{"term":"青年团体政策动员","connectionToNext":"一旦青年团体把议题接成就业、气候和代际分配问题，它就会真正进入韩国大选的叙事中心。","detail":"韩国选举对青年政策情绪极为敏感，产业与价值议题常在这里汇流。"}],"summary":"这条路径的妙点在于两端都被收住了：深海采矿不是泛泛环境新闻，韩国大选也不是抽象政治，而是通过审批争议、诉讼抗议和青年动员，连成一条很难替换国家或议题的现实链。"}]}'
].join("\n"),
[
"好例 8（外卖骑手 -> 自动驾驶，实战标杆）：",
'{"paths":[{"title":"路测外包","hook":"外卖骑手能拐向自动驾驶，不是因为两者都在路上跑，而是骑手网络先替自动驾驶提供了最贵的路况采集与标注入口。","surprise":"真正把外卖骑手接到自动驾驶的，不是替代叙事，而是路测数据和标注外包这层不显眼的训练劳动。","surpriseIndex":8,"nodes":[{"term":"路测数据采集","connectionToNext":"平台在高密度城市道路里积累的路线、停靠和异常场景，会先变成自动驾驶最需要的现实样本。","detail":"骑手跑出来的不是抽象勤劳，而是大量高频、复杂、贴近真实路况的轨迹数据。"},{"term":"标注外包团队","connectionToNext":"原始样本只有经过清洗、切片和标注，才会进入自动驾驶模型的训练流程。","detail":"这层劳动不显眼，但它决定了哪些城市动作能被模型真正学会。"},{"term":"自动驾驶训练平台","connectionToNext":"当训练平台持续吃进这些城市微场景，外卖骑手的日常劳动就被转译成自动驾驶的能力边界。","detail":"终点不是笼统的 AI，而是具体的模型训练系统和迭代闭环。"}],"summary":"这条路径的妙点在于它没有把外卖骑手抽成一般劳动者，也没有把自动驾驶抽成一般技术，而是落到路测样本、标注外包和训练平台这个工业闭环上。"}]}'
].join("\n"),
[
"好例 9（宠物殡葬 -> 县域房价，实战标杆）：",
'{"paths":[{"title":"园区回流","hook":"宠物殡葬拐向县域房价，不是因为情感消费都会影响地产，而是殡葬园区审批会先改写土地回流与财政安排。","surprise":"从宠物殡葬走到县域房价，最意外的一跳不是宠物，而是殡葬园区怎样牵动土地拍卖与地方预算。","surpriseIndex":8,"nodes":[{"term":"宠物殡葬园区土地审批","connectionToNext":"一旦园区用地进入审批流程，土地性质和周边用途就会被重新评估。","detail":"宠物殡葬不是普通门店，它常常牵涉用地边界、邻避争议和配套规划。"},{"term":"地方财政预算调整","connectionToNext":"土地用途和配套投入一变，地方财政就要重新安排基础设施与开发优先级。","detail":"县域财政空间有限，任何新增园区项目都会压到预算排序与投资节奏。"},{"term":"闲置土地回流与再拍卖","connectionToNext":"当土地回流和再拍卖节奏被改写，终点就会落到县域房价的供地预期与交易判断上。","detail":"县域房价往往不先受宏观叙事驱动，而是先受供地节奏和地方开发安排影响。"}],"summary":"这条路径的妙点在于它不是把宠物殡葬硬拽向房地产，而是先穿过园区审批、财政预算和土地回流，最后落到县域房价真正会感知的供地机制上。"}]}'
].join("\n"),
];

const BAD_CASES = [
[
"坏例 1（阿黛尔 -> AI Agent）：",
'{"paths":[{"title":"通用机制","hook":"阿黛尔和 AI Agent 都能被放进同一张图里。","surprise":"看似跨得很远，其实可以通过通用机制连上。","surpriseIndex":6,"nodes":[{"term":"监管条款","connectionToNext":"由此建立了一条从阿黛尔通向 AI Agent 的隐性通道。","detail":"这是一个重要的中间机制。"},{"term":"支付通道","connectionToNext":"它让阿黛尔的波动能够以可预测的方式传导到 AI Agent。","detail":"支付是任何产业都绕不开的一环。"},{"term":"行业标准","connectionToNext":"这个节点是阿黛尔进入 AI Agent 语境时必须经过的翻译器。","detail":"标准会把不同领域放到同一套规则里。"}],"summary":"阿黛尔和 AI Agent 都会经过监管、支付和标准，所以两者可以连起来。"}]}'
].join("\n"),
"为什么坏：节点像分析词，但放进任何输入都成立；没有枢纽节点，也没有妙感类型。",
[
"坏例 2（核聚变 -> 奶茶店）：",
'{"paths":[{"title":"能源链路","hook":"核聚变最后会影响奶茶店，因为所有行业都会受到能源成本变化影响。","surprise":"最关键的一跳是能源价格会传导到门店经营。","surpriseIndex":5,"nodes":[{"term":"发电成本","connectionToNext":"能源价格变化会进一步传导到企业经营。","detail":"发电是现代经济的重要组成。"},{"term":"物流成本","connectionToNext":"物流成本上升或下降会影响终端零售。","detail":"物流是供应链里的关键一环。"},{"term":"门店经营","connectionToNext":"门店经营变化最终会影响奶茶店。","detail":"门店经营和消费密切相关。"}],"summary":"核聚变通过能源和物流影响门店经营，所以能连到奶茶店。"}]}'
].join("\n"),
"为什么坏：节点都是真词，但整条路径只是流水账，没有意外枢纽，也没有说明为什么偏偏是这条线值得讲。",
[
"坏例 3（阿黛尔 -> AI Agent，通用载体误导）：",
'{"paths":[{"title":"舞台邻接","hook":"阿黛尔之所以能走到 AI Agent，是因为所有表演都会经过麦克风和数字化舞台。","surprise":"最关键的一跳是现场设备把真人演出带进机器系统。","surpriseIndex":5,"nodes":[{"term":"舞台麦克风","connectionToNext":"歌手上台都离不开麦克风，因此声音天然能进入机器链路。","detail":"麦克风是现场表演的基础设备。"},{"term":"巡演舞台设备","connectionToNext":"现场设备数字化以后，演出就会更容易和技术系统连接。","detail":"大型演出通常依赖一整套设备协同。"},{"term":"演出直播平台","connectionToNext":"直播平台把表演数字化后，终点就能落到 AI Agent。","detail":"平台会汇集内容与观看数据。"}],"summary":"阿黛尔通过舞台设备和直播平台进入 AI Agent 语境，所以两者可以连起来。"}]}'
].join("\n"),
"为什么坏：它抓住的是歌手的通用舞台物，不是阿黛尔的专属约束；换成别的歌手，这条路几乎照样成立。",
[
"坏例 4（稳定币 -> 同人众筹，支付工具直跳场景）：",
'{"paths":[{"title":"收款近路","hook":"稳定币会走到同人众筹，因为创作者总需要更方便地收款。","surprise":"最关键的一跳是支付工具降低门槛后，粉丝创作就更容易筹到钱。","surpriseIndex":5,"nodes":[{"term":"链上钱包","connectionToNext":"钱包让资金流动更方便，所以会自然进入创作者场景。","detail":"链上钱包是数字资产常见工具。"},{"term":"跨境支付工具","connectionToNext":"支付更顺滑后，众筹和赞助就更容易发生。","detail":"支付工具通常会降低转账摩擦。"},{"term":"众筹平台","connectionToNext":"只要平台能收款，终点就会落到同人众筹。","detail":"众筹平台负责把支持者的钱汇聚起来。"}],"summary":"稳定币通过链上支付和众筹平台连接到同人众筹，因此两者天然相通。"}]}'
].join("\n"),
"为什么坏：它只抓住收款更方便这个通用逻辑，既没收束到具体创作制度，也没收束到终点场景；换成别的跨境支付工具也差不多成立。",
];

const MODEL_ATTEMPT_TIMEOUT_MS = [55_000, 50_000, 50_000];

function buildStrategyInstruction(strategy) {
  if (strategy === "anti_generic") {
    return "本轮重点是修复泛化。输出 1-2 条即可；优先删掉换成同类词也成立的路线，不要写万能桥接词、鸡汤总结，或只是硬中介堆砌的路径。";
  }
  if (strategy === "single_path") {
    return "本轮只输出 1 条高置信路径。先选最成立的妙感类型和唯一枢纽节点，让起点与终点都被收住，再把 `connectionToNext`、`detail`、`summary` 写实。";
  }
  return "本轮输出 1-3 条路径，优先 2 条。若输出多条，尽量采用不同的妙感类型，并优先让起点与终点都被同一条现实链路收住。";
}

const BASE_SYSTEM_PROMPT = [
  '你是中文产品“纠缠”的首席路径设计师。',
  "你的任务不是解释词义，而是找出一条真实世界里成立、且让人觉得妙的隐性通道。",
  "产品目标不是把两个词勉强讲通，而是产出用户愿意看完、愿意截图、回头追问也站得住的路径。",
  "",
  "【最重要的总原则】",
  "1. 先找妙感，再选节点。不要先铺一堆硬中介再碰运气等妙点出现。",
  "2. 妙感优先于行业黑话；现实锚点优先于抽象概念；具体机制优先于泛泛相关。",
  "3. 节点只是骨架，文案同样决定质量。尤其要把 `connectionToNext`、`detail`、`summary` 写实，而不是写顺口话。",
  "4. 硬中介只是现实锚点参考，不是默认答案，更不是必经清单。",
  "",
  "【妙感类型】",
  ...WONDER_TYPES,
  "",
  "【内部工作顺序】以下步骤只在脑中完成，不要把思考过程写出来：",
  "1. 先把起点和终点还原成现实场景：人物、组织、制度、平台、材料、产品、职业、地理或利益结构。",
  "2. 判断最适合这组输入的妙感类型；如果要输出多条路径，优先选择不同的妙感类型。",
  "3. 先确定枢纽节点。它可以是共同的因、同构的骨架、让反面显形的机制、跨尺度的接口、承重的具体物，或被忽略的中介角色。",
"4. 再从枢纽节点向两端延展，补齐 3-5 个中间节点；每一步都要问自己：为什么偏偏是这条链，而不是任何输入都能套上的通用链。",
"5. 优先选择能同时收住两端的路线：如果把起点换成同类对象，或把终点换成相邻话题，这条链会明显变松，通常说明它更值得要。",
"6. 自检并删掉所有依赖抽象大词、同义改写、文化转译、情绪投射、圈层梗或虚构机构名的路线。拿不准时减少条数，不要凑数。",
  "",
  "【节点选择规范】",
  "1. 每条路径包含 3-5 个中间节点，节点不能重复，不能等于起点或终点。",
  "2. 节点必须是现实世界中可指认的对象或机制，例如：组织、制度、平台、作品、人物、材料、设备、事件、职业、合同、媒介、地理位置。",
  "3. 节点名本身优先写成可指认的名词，不要把结果判断、效果描述、气氛词、趋势词直接当节点名。坏例：创造力觉醒、菜单创新空间、灰色资金流转。好例：工坊制度、冷链展示柜、地下汇兑店。",
  "4. 以下类型都可以作为现实锚点参考，但不限于此：供应链环节、合同与许可、牌照与预算、采购与分发、土地与园区、物流与设备、基础设施、数据标注、培训体系、诉讼、补贴、税收、组织协同、媒介接口。",
  "5. 如果使用公司、项目、基金会、平台、委员会等专有名词，必须是现实中广为人知或高度确定存在的对象；拿不准时改写成更通用但真实的制度或产业类别，禁止现编机构名。",
  "6. 如果输入是句子、愿望、担忧或态度，先还原背后的现实处境与限制，不要把原句拆成鸡汤近义词。",
  "",
  "【字段书写规范】",
  "1. `title`：4-10 字，像给这条路线起一个能让人记住的名字，不要写空泛口号。",
  "2. `hook`：一句钩子，要直接说明这条路线从哪里拐过去，并显式点名起点和终点；不能写成任何输入都能套用的导语。",
  "3. `surprise`：一句话指出最妙的意外点，并点名起点和终点；`surpriseIndex` 是 1-10 的意外度分数，10 最意外。",
  '4. `connectionToNext`：你是在解释“为什么这一跳会把故事推向下一跳”。必须写清什么资源、权力、资金、数据、货物、人力或信息，通过什么机制，从上一节点传到下一节点。坏写法示例："由此建立隐性通道"、"议题转向"、"两者相关"。自检：删掉这句话后，读者是否还能理解这一步为什么成立。',
  '5. `detail`：你是在解释“这个节点为什么值得出现”。要写现实约束、制度边界、商业结构、媒介作用或物质条件。坏写法示例："关键一环"、"重要组成"、"放大器"。自检：这句描述如果换到另一个节点还成立，说明它太空。',
  '6. `summary`：40-100 字，总结整条路径到底妙在哪。必须点明妙感类型，说明枢纽节点如何让起点走到终点；不要复述节点列表，不要写“看似 A 其实 B”这种万能句型。自检：如果把起点终点换掉，这段话还成立，就说明写得太泛。',
  "",
  "【判坏标准】只要出现下面任一倾向，就应该推翻重来：",
  "- 看起来像评论区金句，而不是现实链路。",
  "- 任何一个节点放到别的输入里也一样成立。",
  "- 一条路径只是硬中介流水账，节点都真，但没有枢纽节点和妙感类型。",
  "- 节点名写成解释性结果词，例如“创造力觉醒”“某某空间”“灰色资金流转”，而不是可指认对象。",
  "- 每一跳都只是“相关”“体现”“说明”“折射”，但没有机制。",
  "- 一条路径主要靠文化联想、圈层迁移、情绪共鸣或象征意义成立。",
  "- 出现像真实机构名但你无法确认是否存在的公司、平台、项目、基金会或委员会。",
  "- 把输入改写成近义词，或者把人物、作品、制度抹平成抽象类别。",
"- 把起点换成同类对象、或把终点换成相邻话题，这条路径看起来依然差不多成立。",
  "",
  "【Bad Cases】",
  ...BAD_CASES,
  "",
  "【Good Cases】",
  ...GOOD_CASES,
  "",
  "【输出格式】",
  '{"paths":[{"title":"4-10字标题","hook":"一句钩子，说明这条路线从哪里拐过去，并回扣起点与终点","surprise":"一句话指出最妙的意外点，并回扣起点与终点","surpriseIndex":8,"nodes":[{"term":"具体节点","connectionToNext":"这一跳为何会把故事推向下一跳，要写具体机制","detail":"这个节点为何关键，要写现实信息"}],"summary":"40-100字，总结这条路径真正妙在哪里，并明确点回起点与终点"}]}',
  "全部输出必须是中文，且只能输出合法 JSON。不要输出 markdown、解释、注释或前后缀。",
].join("\n");

function buildEntangleSystemPrompt() {
  return BASE_SYSTEM_PROMPT;
}

function buildEntangleUserPrompt(termA, termB, regenerate, strategy) {
  const regenerateRule = regenerate
    ? "这是重新生成。必须显著避开第一直觉路线，优先换妙感类型、换枢纽节点、换约束条件。"
    : "默认目标是做出用户愿意看完、愿意截图分享的路径，而不是最快把两个词解释通。";

  const strategyRule = buildStrategyInstruction(strategy);

  return [
    "【本次任务】",
    `起点：${termA}`,
    `终点：${termB}`,
    "",
    "【本轮要求】",
    strategyRule,
    regenerateRule,
    "不要先在脑中铺很多候选再裁切；直接给出你最成立的 1-3 条路径。",
"每条路径都先确定妙感类型和枢纽节点，再向两端延展。",
"优先选择能让起点与终点都留下现实痕迹的链路，不要只抓一个通用载体就往另一端硬跳。",
"如果输出多条，尽量让妙感类型不同；除非你只对 1 条有把握。",
    "硬中介可以使用，但只是现实锚点参考，不是默认答案。",
    "拿不准时减少条数，不要凑数。",
  ].join("\n");
}

function buildAttempts() {
  return [
    { timeoutMs: MODEL_ATTEMPT_TIMEOUT_MS[0], strategy: "balanced", system: "这一轮优先求妙感成立。先选最合适的妙感类型和枢纽节点，再写 1-3 条路径，优先 2 条。" },
    { timeoutMs: MODEL_ATTEMPT_TIMEOUT_MS[1], strategy: "anti_generic", system: "这一轮重点修复泛化。删掉万能桥接词、鸡汤总结、流水账式硬中介堆砌；宁可少，不要凑。" },
    { timeoutMs: MODEL_ATTEMPT_TIMEOUT_MS[2], strategy: "single_path", system: "这一轮只求 1 条高置信路径。请逐跳自检 `connectionToNext`、`detail`、`summary` 是否真的具体，不要空话。" },
  ];
}

// ─── /api/entangle 处理逻辑 ───────────────────────────────────────────────────

function isInvalidModelOutputError(error) {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return [
    "invalid model output", "cannot extract json", "invalid response shape",
    "forbidden bridge", "node count", "summary", "path meta missing",
    "title too short", "surprise too short", "path copy too short",
    "surprise index invalid", "duplicate node", "node term length invalid",
    "connection too short", "node detail too short", "node fields missing",
    "path quality too weak", "generic node", "unexpected token",
    "paths must", "path invalid", "node invalid",
  ].some((kw) => msg.includes(kw));
}

async function generateEntanglePaths(termA, termB, regenerate) {
  let lastError = null;
  const baseSystemPrompt = buildEntangleSystemPrompt();
  for (const attempt of buildAttempts()) {
    const messages = [
      { role: "system", content: `${baseSystemPrompt}\n\n【本轮追加指令】\n${attempt.system}` },
      { role: "user", content: buildEntangleUserPrompt(termA, termB, regenerate, attempt.strategy) },
    ];
    try {
      const content = await callLLM(messages, attempt.timeoutMs);
      const rawParsed = extractJson(content);
      const raw = Array.isArray(rawParsed) ? { paths: rawParsed } : rawParsed;
      return validatePaths(raw, termA, termB);
    } catch (error) {
      console.warn(`[entangle] attempt ${attempt.strategy} failed:`, error instanceof Error ? error.message : error);
      lastError = error;
    }
  }
  if (shouldFallbackToSafePath(lastError)) return buildFallbackPaths(termA, termB, regenerate);
  throw lastError;
}

async function handleEntangle(body, res) {
  const requestId = buildRequestId();
  const termA = String(body.termA ?? "").trim();
  const termB = String(body.termB ?? "").trim();
  const regenerate = Boolean(body.regenerate);

  if (!termA || !termB) return jsonReply(res, 400, createErrorPayload(requestId, "E_BAD_REQUEST", "termA 与 termB 必填", false));
  if (termA === termB) return jsonReply(res, 400, createErrorPayload(requestId, "E_BAD_REQUEST", "termA 与 termB 不能相同", false));
  if (termA.length > TERM_MAX_LENGTH || termB.length > TERM_MAX_LENGTH) {
    return jsonReply(res, 400, createErrorPayload(requestId, "E_BAD_REQUEST", `输入不能超过 ${TERM_MAX_LENGTH} 字`, false));
  }

  try {
    const paths = await generateEntanglePaths(termA, termB, regenerate);
    jsonReply(res, 200, { requestId, data: { id: `ent_${Date.now()}`, termA, termB, paths, createdAt: new Date().toISOString() } });
  } catch (error) {
    console.error("[entangle error]", error?.name, error?.message);
    const message = error instanceof Error ? error.message : "unknown";

    if (message.includes("MODEL_API_KEY is missing")) {
      return jsonReply(res, 503, createErrorPayload(requestId, "E_PROVIDER_UNAVAILABLE", "未配置 FRIDAY_APP_ID、OPENAI_API_KEY 或 ZHIPU_API_KEY", false));
    }
    if (message.includes("invalid zhipu api key format")) {
      return jsonReply(res, 503, createErrorPayload(requestId, "E_PROVIDER_UNAVAILABLE", "ZHIPU_API_KEY 格式错误", false));
    }
    if (error?.name === "AbortError" || message.includes("aborted") || message.includes("AbortError")) {
      return jsonReply(res, 504, createErrorPayload(requestId, "E_MODEL_TIMEOUT", "模型多轮生成超时，请重试", true));
    }
    if (isInvalidModelOutputError(error)) {
      return jsonReply(res, 502, createErrorPayload(requestId, "E_INVALID_MODEL_OUTPUT", "模型多轮生成后仍未通过质量校验，请重试", true));
    }
    if (message.includes("provider status")) {
      return jsonReply(res, 503, createErrorPayload(requestId, "E_PROVIDER_UNAVAILABLE", "上游服务暂不可用，请稍后重试", true));
    }
    jsonReply(res, 500, createErrorPayload(requestId, "E_INTERNAL", `服务内部错误: ${message}`, true));
  }
}

// ─── /api/daily-pair 处理逻辑（对应 api/daily-pair.ts） ──────────────────────

const fallbackTopics = [
  { term: "深海采矿", domain: "自然/科学" },
  { term: "韩国大选", domain: "政治/社会" },
  { term: "AI Agent", domain: "科技" },
  { term: "独立电影", domain: "文化/艺术" },
  { term: "消费降级", domain: "商业/经济" },
];

function normalizeTopics(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const term = normalizeText(item.term);
      const domain = normalizeText(item.domain);
      if (!term || !domain) return null;
      return { term, domain };
    })
    .filter(Boolean);
}

function randomPair(items) {
  const pool = items.filter((item) => item.term && item.domain);
  if (pool.length < 2) {
    return { termA: fallbackTopics[0].term, domainA: fallbackTopics[0].domain, termB: fallbackTopics[1].term, domainB: fallbackTopics[1].domain };
  }
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const first = shuffled[0];
  let second = shuffled.find((item) => item.domain !== first.domain);
  if (!second) second = shuffled[1];
  return { termA: first.term, domainA: first.domain, termB: second.term, domainB: second.domain };
}

function buildDailyPairPrompt(dateLabel) {
  return [
    `今天是 ${dateLabel}。请生成 6 个适合"纠缠"产品首页展示的真实话题词。`,
    "要求：",
    "1. 领域覆盖：科技、政治/社会、文化/艺术、自然/科学、商业/经济，允许额外补一个更有当下感的领域。",
    "2. 词必须是真实存在、可被验证、读起来有画面感的话题，不要空泛，不要编造热点。",
    "3. 优先输出能激发联想的名词短语，而不是抽象判断。",
    "4. 只返回 JSON 数组。",
    "格式：",
    '[{"term":"话题名","domain":"领域"}]',
  ].join("\n");
}

async function handleDailyPair(body, res) {
  const requestId = buildRequestId();
  const rawDate = typeof body.date === "string" ? body.date.trim() : "";
  const dateLabel = rawDate || new Date().toISOString().slice(0, 10);

  let topics = fallbackTopics;
  try {
    const content = await callLLM(
      [
        { role: "system", content: "你必须只返回 JSON 数组，不允许包含 markdown 或解释。" },
        { role: "user", content: buildDailyPairPrompt(dateLabel) },
      ],
      18000
    );
    const raw = extractJson(content);
    const parsed = normalizeTopics(raw);
    if (parsed.length >= 2) topics = parsed;
  } catch {
    topics = fallbackTopics;
  }

  jsonReply(res, 200, { requestId, data: { date: dateLabel, ...randomPair(topics) } });
}

// ─── HTTP 服务器 ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    jsonReply(res, 200, { ok: true });
    return;
  }

  let body = {};
  if (req.method === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try {
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      body = {};
    }
  }

  if (req.url === "/api/entangle") return handleEntangle(body, res);
  if (req.url === "/api/daily-pair") return handleDailyPair(body, res);
  jsonReply(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`🚀 本地 API 服务器已启动：http://localhost:${PORT}`);
  console.log("   /api/entangle   - 关联路径推理");
  console.log("   /api/daily-pair - 每日配对生成");
});
