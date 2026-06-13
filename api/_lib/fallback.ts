/**
 * entangle 保底路径模块
 *
 * 职责：只负责在主链路完全失败时提供应急路径，防止页面空白。
 * - 不允许当作"质量不够就用保底"的替代品
 * - 只在 ENTANGLE_ENABLE_FALLBACK=1 且 provider 不可用时触发
 *
 * 如需调整保底节点库，只修改此文件的数据部分，不需要碰业务逻辑。
 */

import type { NormalizedPath } from "./validate.js";

// ─── 保底节点库（按领域分组） ─────────────────────────────────────────────────

/**
 * 各领域的备用节点数据。
 * 节点必须是真实可指认的，不允许使用万能桥接词，保持与正式 prompt 同等质量要求。
 */
const DOMAIN_FALLBACK_NODES: Record<string, Array<{ term: string; detail: string }>> = {
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

// ─── 领域检测 ─────────────────────────────────────────────────────────────────

function detectDomain(term: string): string {
  const techKeywords = [
    "ai", "算法", "代码", "芯片", "互联网", "数据", "软件", "硬件",
    "智能", "模型", "科技", "技术", "平台", "应用",
  ];
  const politicsKeywords = [
    "选举", "政府", "政策", "政治", "政党", "投票", "议会",
    "立法", "监管", "民主", "治理", "公共",
  ];
  const cultureKeywords = [
    "电影", "音乐", "艺术", "文学", "小说", "游戏", "创作",
    "文化", "审美", "风格", "亚文化", "流行", "歌手",
  ];
  const businessKeywords = [
    "市场", "商业", "企业", "公司", "投资", "金融", "经济",
    "消费", "品牌", "利润", "营收", "创业",
  ];
  const natureKeywords = [
    "生态", "环境", "气候", "自然", "物种", "海洋",
    "森林", "能源", "地质", "生物", "地球", "资源",
  ];

  const termLower = term.toLowerCase();
  if (techKeywords.some((keyword) => termLower.includes(keyword))) return "tech";
  if (politicsKeywords.some((keyword) => termLower.includes(keyword))) return "politics";
  if (cultureKeywords.some((keyword) => termLower.includes(keyword))) return "culture";
  if (businessKeywords.some((keyword) => termLower.includes(keyword))) return "business";
  if (natureKeywords.some((keyword) => termLower.includes(keyword))) return "nature";
  return "general";
}

// ─── 稳定哈希（用于保底结果的确定性选取） ────────────────────────────────────

function stableHash(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

// ─── 保底路径构建 ─────────────────────────────────────────────────────────────

/**
 * 构造应急保底路径。
 * 仅在 shouldFallbackToSafePath 返回 true 时调用，不可用于掩盖生成质量问题。
 */
export function buildFallbackPaths(
  termA: string,
  termB: string,
  regenerate: boolean
): NormalizedPath[] {
  const domainA = detectDomain(termA);
  const domainB = detectDomain(termB);
  const primaryPool = DOMAIN_FALLBACK_NODES[domainA] || DOMAIN_FALLBACK_NODES.general;
  const secondaryPool = DOMAIN_FALLBACK_NODES[domainB] || DOMAIN_FALLBACK_NODES.general;
  const mixedPool = [
    ...primaryPool,
    ...secondaryPool,
    ...DOMAIN_FALLBACK_NODES.general,
  ].filter(
    (candidate, index, array) =>
      array.findIndex((item) => item.term === candidate.term) === index
  );

  const source = mixedPool.length >= 3 ? mixedPool : DOMAIN_FALLBACK_NODES.general;
  const startIndex = stableHash(`${termA}::${termB}`) % source.length;
  const picked = new Set<(typeof source)[number]>();

  for (let step = 0; step < source.length && picked.size < 3; step += 1) {
    picked.add(source[(startIndex + step) % source.length]);
  }

  const pickedArray = Array.from(picked).slice(0, 3);
  const nodes = pickedArray.map((candidate, index) => ({
    term: candidate.term,
    connectionToNext: DYNAMIC_CONNECTION_TEMPLATES[
      (startIndex + index) % DYNAMIC_CONNECTION_TEMPLATES.length
    ]
      .replace(/{start}/g, termA)
      .replace(/{end}/g, termB)
      .replace(/{node}/g, candidate.term),
    detail: candidate.detail,
  }));

  return [
    {
      title: regenerate ? "低优先保底线" : "应急保底线",
      hook: `这不是优先结果，而是在真实生成完全失败时，临时用具体机制把 ${termA} 与 ${termB} 托住。`,
      surprise: `真正应该优化的不是这条保底线，而是让 ${termA} 到 ${termB} 的真实路径稳定产出。`,
      surpriseIndex: 5,
      nodes,
      summary: `只有在明确开启保底模式后，这条路径才会作为应急结果返回；默认应继续争取真实生成，而不是用模板遮住失败。`,
    },
  ];
}

// ─── fallback 触发条件 ────────────────────────────────────────────────────────

/**
 * 判断是否应该触发保底路径。
 * 条件：显式开启 ENTANGLE_ENABLE_FALLBACK=1，且错误来自 provider 不可用（非质量问题）。
 */
export function shouldFallbackToSafePath(error: unknown): boolean {
  if (process.env.ENTANGLE_ENABLE_FALLBACK !== "1") return false;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("provider status") ||
    message.includes("zhipu_api_key") ||
    message.includes("invalid zhipu api key format") ||
    message.includes("abort")
  );
}
