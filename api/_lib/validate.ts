/**
 * entangle 结果校验模块
 *
 * 职责：只负责校验模型输出的结构完整性与内容质量。
 * - 结构校验（硬性）：字段是否存在、长度是否合规、节点是否重复等
 * - 质量过滤（软性）：是否使用万能桥接词、是否有足够语义锚点等
 *
 * 调优质量标准时只需修改此文件，不需要碰 prompt/ 或 entangle.ts。
 */

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

export type NormalizedNode = {
  term: string;
  connectionToNext: string;
  detail: string;
};

export type NormalizedPath = {
  title: string;
  hook: string;
  surprise: string;
  surpriseIndex: number;
  nodes: NormalizedNode[];
  summary: string;
};

// ─── 长度阈值常量 ─────────────────────────────────────────────────────────────

export const TERM_MAX_LENGTH = 32;
const NODE_TERM_MIN_LENGTH = 2;
const NODE_TERM_MAX_LENGTH = 18;
const MIN_DETAIL_LENGTH = 12;
const MIN_CONNECTION_LENGTH = 8;
const MIN_TITLE_LENGTH = 4;
const MIN_SURPRISE_LENGTH = 12;
const MIN_HOOK_LENGTH = 16;
const MIN_SUMMARY_LENGTH = 36;

// ─── 禁用词与模式（万能桥接词黑名单） ────────────────────────────────────────

/**
 * 绝对禁用的万能桥接词。
 * 这些词放到任何两个话题之间都能"成立"，因此对用户没有价值。
 * 发现新的万能词后直接追加到此列表。
 */
export const FORBIDDEN_BRIDGES = [
  "技术进步",
  "全球化",
  "社会变迁",
  "人类文明",
  "时代发展",
  "财务压力",
  "时间自由",
  "时间上的自由",
  "工作专注度",
  "工作效率",
  "工作效率下降",
  "稳定收入",
  "梦想与现实",
  "选择困难",
  "生活方式",
  "风险偏好",
  "抽象联系",
  "社会情绪",
  "平台生态",
  "商业逻辑",
  "文化符号",
  "传播链路",
  "行业标准",
  "支付通道",
  "监管条款",
];

/** 抽象词尾模式：匹配"XX问题"、"XX趋势"等万能节点 */
const ABSTRACT_PATTERNS = [
  /人类文明$/,
  /时代发展$/,
  /.+(逻辑|趋势|现象|结构|问题|困境)$/,
];

/** 完全由通用领域词 + 通用后缀构成的节点，无具体指向 */
const GENERIC_NODE_PATTERNS = [
  /^(社会|文化|经济|技术|商业|产业|政策|平台|舆论|媒介|资本|公共)(逻辑|结构|环境|现象|问题|机制|系统|趋势)$/,
  /^(资源|利益|注意力|情绪|需求)(分配|流动|博弈)$/,
  /^(规则|机制|体系|系统|框架)$/,
];

/** 弱连接句式模式：只是在说"有关系"，但没有说明机制 */
const GENERIC_CONNECTION_PATTERNS = [
  /^两者(都)?(与|在).*(有关|相关)[。！]?$/,
  /^本质上(是|属于).*[。！]?$/,
  /^这(一|个).*(说明|体现|反映|意味着).*[。！]?$/,
  /^它(让|使|把).*(联系起来|连接起来|串起来).*[。！]?$/,
];

/** 低信号词：出现此类词说明描述过于宽泛 */
const LOW_SIGNAL_CONNECTION_FRAGMENTS = [
  "相关", "联系", "体现", "反映", "说明",
  "意味着", "折射", "连接", "串起来", "放在同一", "带到", "语境",
];

const LOW_SIGNAL_DETAIL_FRAGMENTS = [
  "一种", "某种", "相关内容", "重要组成", "值得关注",
  "密切相关", "可以理解为", "常被视为", "关键一环", "放大器",
];

/** 机制信号词：出现此类词说明描述有实质机制 */
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

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isForbiddenBridge(term: string, termA: string, termB: string): boolean {
  if (!term) return true;
  if (term === termA || term === termB) return true;
  if (FORBIDDEN_BRIDGES.includes(term)) return true;
  if (GENERIC_NODE_PATTERNS.some((pattern) => pattern.test(term))) return true;
  return ABSTRACT_PATTERNS.some((pattern) => pattern.test(term));
}

function hasAnyFragment(text: string, fragments: string[]): boolean {
  return fragments.some((fragment) => text.includes(fragment));
}

function countFragments(text: string, fragments: string[]): number {
  return fragments.filter((fragment) => text.includes(fragment)).length;
}

function countNodesWithAnyFragment(nodes: NormalizedNode[], fragments: string[]): number {
  return nodes.filter((node) => fragments.some((fragment) => node.term.includes(fragment))).length;
}

function isWeakConnection(connectionToNext: string): boolean {
  if (GENERIC_CONNECTION_PATTERNS.some((pattern) => pattern.test(connectionToNext))) {
    return true;
  }
  const lowSignalHits = countFragments(connectionToNext, LOW_SIGNAL_CONNECTION_FRAGMENTS);
  const mechanismHits = countFragments(connectionToNext, MECHANISM_SIGNAL_FRAGMENTS);
  return (
    lowSignalHits >= 2 ||
    (lowSignalHits >= 1 && mechanismHits === 0 && connectionToNext.length < 20)
  );
}

function isWeakDetail(detail: string): boolean {
  const lowSignalHits = countFragments(detail, LOW_SIGNAL_DETAIL_FRAGMENTS);
  const mechanismHits = countFragments(detail, MECHANISM_SIGNAL_FRAGMENTS);
  return lowSignalHits >= 1 && mechanismHits === 0;
}

function isReplaceablePath(path: NormalizedPath): boolean {
  const narrativeText = `${path.hook} ${path.surprise} ${path.summary} ${path.nodes
    .map((node) => node.connectionToNext)
    .join(" ")}`;
  const carrierHits = countNodesWithAnyFragment(path.nodes, GENERIC_CARRIER_NODE_FRAGMENTS);
  return carrierHits >= 2 && hasAnyFragment(narrativeText, REPLACEABLE_REASONING_FRAGMENTS);
}

function getInputAnchors(term: string): string[] {
  const normalized = normalizeText(term);
  const anchors = new Set<string>();
  const compact = normalized.replace(/\s+/g, "");
  const latinParts = normalized.match(/[A-Za-z0-9][A-Za-z0-9-]{1,}/g) ?? [];

  for (const part of latinParts) {
    anchors.add(part.toLowerCase());
  }

  if (compact.length > 0) {
    anchors.add(compact);
    const maxSize = Math.min(4, compact.length);
    for (let size = 2; size <= maxSize; size += 1) {
      for (let index = 0; index <= compact.length - size; index += 1) {
        anchors.add(compact.slice(index, index + size));
      }
    }
  }

  return Array.from(anchors)
    .filter((item) => item.length >= 2)
    .slice(0, 10);
}

function countAnchorHits(text: string, anchors: string[]): number {
  const lower = text.toLowerCase();
  return anchors.filter((anchor) => lower.includes(anchor.toLowerCase())).length;
}

// ─── 质量问题收集 ─────────────────────────────────────────────────────────────

/**
 * 收集单条路径的质量问题列表。
 * 返回空数组 = 无问题；返回 >= 2 个问题 = 被过滤掉。
 * 调整过滤严格度时修改 validateResult 中的阈值，而不是这里。
 */
export function collectPathIssues(
  path: NormalizedPath,
  termA: string,
  termB: string
): string[] {
  const issues: string[] = [];
  const metaText = `${path.hook} ${path.surprise} ${path.summary}`;
  const allText = `${path.title} ${metaText} ${path.nodes
    .map((node) => `${node.term} ${node.connectionToNext} ${node.detail}`)
    .join(" ")}`;

  if (!metaText.includes(termA) || !metaText.includes(termB)) {
    issues.push("meta missing input anchor");
  }

  const weakNodes = path.nodes.filter((node) =>
    isForbiddenBridge(node.term, termA, termB)
  ).length;
  if (weakNodes >= 1) {
    issues.push("generic node");
  }

  const weakConnections = path.nodes.filter((node) =>
    isWeakConnection(node.connectionToNext)
  ).length;
  if (weakConnections >= 2) {
    issues.push("generic connections");
  }

  const weakDetails = path.nodes.filter((node) => isWeakDetail(node.detail)).length;
  if (weakDetails >= 2) {
    issues.push("generic details");
  }

  const anchorHits =
    countAnchorHits(allText, getInputAnchors(termA)) +
    countAnchorHits(allText, getInputAnchors(termB));
  if (anchorHits < 2) {
    issues.push("insufficient semantic anchor");
  }

  if (path.surpriseIndex < 4) {
    issues.push("surprise too weak");
  }

  if (hasAnyFragment(path.title + path.summary, ["保底", "模板", "通用机制", "万能中介"])) {
    issues.push("template framing");
  }

  if (isReplaceablePath(path)) {
    issues.push("replaceable carrier path");
  }

  return issues;
}

// ─── 单条路径校验（供流式路径直接调用） ───────────────────────────────────────

/**
 * 校验并标准化单条路径对象（供流式路径直接调用）。
 * - 结构校验失败：直接抛出 Error
 * - 质量过滤：issues >= 2 时抛出 Error
 * 通过则返回 NormalizedPath。
 */
export function validateSinglePath(
  path: unknown,
  termA: string,
  termB: string
): NormalizedPath {
  // 结构校验（复用 normalizeOnePath，定义在下方）
  const normalized = normalizeOnePath(path, termA, termB);

  // 质量过滤：流式路径不能靠多条路径兜底，直接 throw
  if (collectPathIssues(normalized, termA, termB).length >= 2) {
    throw new Error("path quality too weak");
  }

  return normalized;
}

// ─── 结构校验（不含质量过滤，供 validateResult 内部使用） ─────────────────────

function normalizeOnePath(
  path: unknown,
  termA: string,
  termB: string
): NormalizedPath {
  if (typeof path !== "object" || path === null) {
    throw new Error("path invalid");
  }

  const record = path as Record<string, unknown>;
  const title = normalizeText(record.title);
  const hook = normalizeText(record.hook);
  const surprise = normalizeText(record.surprise);
  const summary = normalizeText(record.summary);
  const surpriseIndex = Number(record.surpriseIndex ?? 0);
  const nodes = record.nodes;

  if (!title || !hook || !surprise || !summary) {
    throw new Error("path meta missing");
  }
  if (title.length < MIN_TITLE_LENGTH) {
    throw new Error("title too short");
  }
  if (surprise.length < MIN_SURPRISE_LENGTH) {
    throw new Error("surprise too short");
  }
  if (hook.length < MIN_HOOK_LENGTH || summary.length < MIN_SUMMARY_LENGTH) {
    throw new Error("path copy too short");
  }
  if (!Number.isInteger(surpriseIndex) || surpriseIndex < 1 || surpriseIndex > 10) {
    throw new Error("surprise index invalid");
  }
  if (!Array.isArray(nodes) || nodes.length !== 3) {
    throw new Error("node count must be 3");
  }

  const seenTerms = new Set<string>();
  const normalizedNodes: NormalizedNode[] = nodes.map((node) => {
    if (typeof node !== "object" || node === null) {
      throw new Error("node invalid");
    }

    const current = node as Record<string, unknown>;
    const term = normalizeText(current.term);
    const connectionToNext = normalizeText(current.connectionToNext);
    const detail = normalizeText(current.detail);

    if (!term || !connectionToNext || !detail) {
      throw new Error("node fields missing");
    }
    if (term.length < NODE_TERM_MIN_LENGTH || term.length > NODE_TERM_MAX_LENGTH) {
      throw new Error("node term length invalid");
    }
    if (connectionToNext.length < MIN_CONNECTION_LENGTH) {
      throw new Error("connection too short");
    }
    if (detail.length < MIN_DETAIL_LENGTH) {
      throw new Error("node detail too short");
    }
    if (isForbiddenBridge(term, termA, termB)) {
      throw new Error("forbidden bridge node");
    }
    if (seenTerms.has(term)) {
      throw new Error("duplicate node");
    }

    seenTerms.add(term);
    return { term, connectionToNext, detail };
  });

  return { title, hook, surprise, surpriseIndex, nodes: normalizedNodes, summary };
}

// ─── 主校验函数 ───────────────────────────────────────────────────────────────

/**
 * 校验并标准化模型返回结果。
 * - 硬性校验失败：直接抛出 Error（会触发重试）
 * - 软性质量过滤：issues < 2 的路径保留，全部不过则抛出 Error
 * - 通过后按 surpriseIndex 降序排列
 */
export function validateResult(
  input: unknown,
  termA: string,
  termB: string
): NormalizedPath[] {
  if (typeof input !== "object" || input === null) {
    throw new Error("invalid response shape");
  }

  const result = input as Record<string, unknown>;
  const paths = result.paths;
  if (!Array.isArray(paths) || paths.length !== 1) {
    throw new Error("paths must be 1");
  }

  const normalizedPaths: NormalizedPath[] = paths.map((path) => normalizeOnePath(path, termA, termB));

  const filteredPaths = normalizedPaths.filter(
    (path) => collectPathIssues(path, termA, termB).length < 2
  );
  if (filteredPaths.length === 0) {
    throw new Error("path quality too weak");
  }

  filteredPaths.sort(
    (left, right) =>
      right.surpriseIndex - left.surpriseIndex || right.nodes.length - left.nodes.length
  );
  return filteredPaths;
}

// ─── 错误分类工具 ─────────────────────────────────────────────────────────────

export function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return true;
  const message = error.message.toLowerCase();
  return message.includes("aborted") || message.includes("aborterror");
}

export function isInvalidModelOutputError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("invalid model output") ||
    message.includes("cannot extract json") ||
    message.includes("invalid response shape") ||
    message.includes("forbidden bridge") ||
    message.includes("node count") ||
    message.includes("summary") ||
    message.includes("path meta missing") ||
    message.includes("title too short") ||
    message.includes("surprise too short") ||
    message.includes("path copy too short") ||
    message.includes("surprise index invalid") ||
    message.includes("duplicate node") ||
    message.includes("node term length invalid") ||
    message.includes("connection too short") ||
    message.includes("node detail too short") ||
    message.includes("node fields missing") ||
    message.includes("path quality too weak") ||
    message.includes("generic node") ||
    message.includes("unexpected token") ||
    message.includes("paths must be") ||
    message.includes("path invalid") ||
    message.includes("node invalid")
  );
}
