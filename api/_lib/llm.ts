import crypto from "node:crypto";

const FRIDAY_BASE_URL = "https://aigc.sankuai.com/v1/openai/native";
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const ZHIPU_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const DEFAULT_FRIDAY_MODEL = "gpt-5.4";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-pro";
const DEFAULT_ZHIPU_MODEL = "glm-4-flash";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function buildRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function jsonResponse(res: any, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(payload));
}

export function createErrorPayload(
  requestId: string,
  code:
    | "E_BAD_REQUEST"
    | "E_RATE_LIMIT"
    | "E_MODEL_TIMEOUT"
    | "E_PROVIDER_UNAVAILABLE"
    | "E_INVALID_MODEL_OUTPUT"
    | "E_INTERNAL",
  message: string,
  retryable: boolean
) {
  return {
    requestId,
    error: {
      code,
      message,
      retryable,
    },
  };
}

export function parseJsonBody(rawBody: unknown): Record<string, unknown> {
  if (!rawBody) return {};
  if (typeof rawBody === "string") {
    return JSON.parse(rawBody) as Record<string, unknown>;
  }
  if (typeof rawBody === "object") {
    return rawBody as Record<string, unknown>;
  }
  throw new Error("invalid body");
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function getChatProviderConfig() {
  const fridayAppId = process.env.FRIDAY_APP_ID?.trim();
  if (fridayAppId) {
    const baseUrl = normalizeBaseUrl(process.env.FRIDAY_BASE_URL?.trim() || FRIDAY_BASE_URL);
    return {
      provider: "friday" as const,
      endpoint: `${baseUrl}/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fridayAppId}`,
      },
      model: process.env.FRIDAY_MODEL?.trim() || DEFAULT_FRIDAY_MODEL,
    };
  }

  const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiApiKey) {
    const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL?.trim() || OPENAI_BASE_URL);
    return {
      provider: "openai" as const,
      endpoint: `${baseUrl}/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
    };
  }

  const deepseekApiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekApiKey) {
    const baseUrl = normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL?.trim() || DEEPSEEK_BASE_URL);
    return {
      provider: "deepseek" as const,
      endpoint: `${baseUrl}/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL,
    };
  }

  const zhipuApiKey = process.env.ZHIPU_API_KEY?.trim();
  if (zhipuApiKey) {
    return {
      provider: "zhipu" as const,
      endpoint: ZHIPU_ENDPOINT,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${createZhipuToken(zhipuApiKey)}`,
      },
      model: process.env.ZHIPU_MODEL?.trim() || DEFAULT_ZHIPU_MODEL,
    };
  }

  throw new Error("MODEL_API_KEY is missing");
}

function createZhipuToken(apiKey: string) {
  const [id, secret] = apiKey.split(".");
  if (!id || !secret) {
    throw new Error("invalid zhipu api key format");
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60;
  const header = {
    alg: "HS256",
    sign_type: "SIGN",
  };
  const payload = {
    api_key: id,
    exp,
    timestamp: now,
  };

  const encode = (data: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(data)).toString("base64url");

  const tokenData = `${encode(header)}.${encode(payload)}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(tokenData)
    .digest("base64url");

  return `${tokenData}.${signature}`;
}

export async function* callZhipuChatStream(
  messages: ChatMessage[],
  timeoutMs = 25000
): AsyncGenerator<string> {
  const provider = getChatProviderConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: provider.headers,
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.75,
        messages,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`provider status ${response.status}${detail ? `: ${detail}` : ""}`);
    }

    if (!response.body) {
      throw new Error("empty response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let lineBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data) as Record<string, any>;
          const content = parsed?.choices?.[0]?.delta?.content;
          if (typeof content === "string" && content) {
            yield content;
          }
        } catch {
          // 跳过格式异常的 SSE 行
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function callZhipuChat(messages: ChatMessage[], timeoutMs = 25000) {
  const provider = getChatProviderConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: provider.headers,
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.75,
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`provider status ${response.status}${detail ? `: ${detail}` : ""}`);
    }

    const json = (await response.json()) as Record<string, any>;
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("empty model content");
    }

    return content;
  } finally {
    clearTimeout(timer);
  }
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const maybe = text.slice(firstBrace, lastBrace + 1);
    return JSON.parse(maybe);
  }

  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const maybe = text.slice(firstBracket, lastBracket + 1);
    return JSON.parse(maybe);
  }

  throw new Error("cannot extract json");
}

const memoryRateMap = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(key: string, limit = 25, windowMs = 60_000) {
  const now = Date.now();
  const hit = memoryRateMap.get(key);
  if (!hit || now - hit.windowStart > windowMs) {
    memoryRateMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (hit.count >= limit) {
    return false;
  }
  hit.count += 1;
  memoryRateMap.set(key, hit);
  return true;
}
