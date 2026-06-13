import {
  buildRequestId,
  callZhipuChat,
  checkRateLimit,
  createErrorPayload,
  extractJson,
  jsonResponse,
  parseJsonBody,
} from "./_lib/llm.js";

type TopicItem = {
  term: string;
  domain: string;
};

const fallbackTopics: TopicItem[] = [
  { term: "深海采矿", domain: "自然/科学" },
  { term: "韩国大选", domain: "政治/社会" },
  { term: "AI Agent", domain: "科技" },
  { term: "独立电影", domain: "文化/艺术" },
  { term: "消费降级", domain: "商业/经济" },
];

const DATE_LABEL_MAX_LENGTH = 32;

function randomPair(items: TopicItem[]) {
  const pool = items.filter((item) => item.term && item.domain);
  if (pool.length < 2) {
    return {
      termA: fallbackTopics[0].term,
      domainA: fallbackTopics[0].domain,
      termB: fallbackTopics[1].term,
      domainB: fallbackTopics[1].domain,
    };
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const first = shuffled[0];
  let second = shuffled.find((item) => item.domain !== first.domain);
  if (!second) {
    second = shuffled[1];
  }

  return {
    termA: first.term,
    domainA: first.domain,
    termB: second.term,
    domainB: second.domain,
  };
}

function buildPrompt(dateLabel: string) {
  return [
    `今天是 ${dateLabel}。请生成5个来自不同领域的话题词。`,
    "要求：",
    "1. 领域至少覆盖：科技、政治/社会、文化/艺术、自然/科学、商业/经济。",
    "2. 每个话题必须是真实存在、可被验证的事物/概念/事件。",
    "3. 严禁编造不存在的热点、新闻或事件。",
    "4. 每个话题词 2-8 字，避免同义重复。",
    "5. 只返回 JSON 数组，不要返回解释。",
    "格式：",
    '[{"term":"话题名","domain":"领域"}]',
  ].join("\n");
}

function normalizeTopics(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const record = item as Record<string, unknown>;
      const term = String(record.term ?? "").trim();
      const domain = String(record.domain ?? "").trim();
      if (!term || !domain) return null;
      return { term, domain };
    })
    .filter(Boolean) as TopicItem[];
}

export default async function handler(req: any, res: any) {
  const requestId = buildRequestId();

  if (req.method === "OPTIONS") {
    jsonResponse(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST") {
    jsonResponse(
      res,
      405,
      createErrorPayload(requestId, "E_BAD_REQUEST", "仅支持 POST 请求", false)
    );
    return;
  }

  const ip =
    String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const allow = checkRateLimit(`pair:${ip}`);
  if (!allow) {
    jsonResponse(
      res,
      429,
      createErrorPayload(
        requestId,
        "E_RATE_LIMIT",
        "请求过于频繁，请稍后再试。",
        true
      )
    );
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = parseJsonBody(req.body);
  } catch {
    jsonResponse(
      res,
      400,
      createErrorPayload(requestId, "E_BAD_REQUEST", "请求体不是合法 JSON", false)
    );
    return;
  }

  try {
    const rawDate = typeof body.date === "string" ? body.date.trim() : "";
    const dateLabel = rawDate || new Date().toISOString().slice(0, 10);

    if (dateLabel.length > DATE_LABEL_MAX_LENGTH) {
      jsonResponse(
        res,
        400,
        createErrorPayload(
          requestId,
          "E_BAD_REQUEST",
          `date 长度不能超过 ${DATE_LABEL_MAX_LENGTH} 字符`,
          false
        )
      );
      return;
    }

    let topics = fallbackTopics;

    try {
      const content = await callZhipuChat([
        {
          role: "system",
          content: "你必须只返回 JSON 数组，不允许包含 markdown 或解释。",
        },
        {
          role: "user",
          content: buildPrompt(dateLabel),
        },
      ], 18000);

      const raw = extractJson(content);
      const parsed = normalizeTopics(raw);
      if (parsed.length >= 2) {
        topics = parsed;
      }
    } catch {
      // Fallback to predefined real topics when model output is invalid.
      topics = fallbackTopics;
    }

    jsonResponse(res, 200, {
      requestId,
      data: {
        date: dateLabel,
        ...randomPair(topics),
      },
    });
  } catch {
    jsonResponse(
      res,
      500,
      createErrorPayload(requestId, "E_INTERNAL", "服务内部错误", true)
    );
  }
}
