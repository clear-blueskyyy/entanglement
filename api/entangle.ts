/**
 * /api/entangle — 关联路径推理接口
 *
 * 职责：HTTP 路由、参数校验、错误响应映射。
 * 不包含任何 prompt 文本、校验规则或 fallback 数据——
 * 这些内容分别维护在：
 *   - api/_lib/prompt/entangle.ts  （prompt 模板，产品调优入口）
 *   - api/_lib/validate.ts         （结构校验 + 质量过滤）
 *   - api/_lib/fallback.ts         （应急保底路径）
 *   - api/_lib/llm.ts              （模型调用 + provider 路由）
 */

import {
  buildRequestId,
  callZhipuChat,
  checkRateLimit,
  createErrorPayload,
  extractJson,
  jsonResponse,
  parseJsonBody,
} from "./_lib/llm.js";

import {
  buildAttempts,
  buildEntangleSystemPrompt,
  buildEntangleUserPrompt,
} from "./_lib/prompt/entangle.js";
import { validateResult, isAbortError, isInvalidModelOutputError, TERM_MAX_LENGTH } from "./_lib/validate.js";
import { buildFallbackPaths, shouldFallbackToSafePath } from "./_lib/fallback.js";

// ─── 路径生成核心（多轮尝试） ─────────────────────────────────────────────────

async function generatePaths(termA: string, termB: string, regenerate: boolean) {
  let lastError: unknown = null;

  for (const attempt of buildAttempts()) {
    // 系统 prompt 完全静态（不拼接轮次指令），轮次策略已合并进 buildEntangleUserPrompt 的 strategyRule
    const systemPrompt = buildEntangleSystemPrompt(attempt.goodCaseIndices, attempt.badCaseIndices);
    const messages = [
      { role: "system" as const, content: systemPrompt },
      {
        role: "user" as const,
        content: buildEntangleUserPrompt(termA, termB, regenerate, attempt.strategy),
      },
    ];

    try {
      const content = await callZhipuChat(messages, attempt.timeoutMs);
      const rawParsed = extractJson(content);
      const raw = Array.isArray(rawParsed) ? { paths: rawParsed } : rawParsed;
      return validateResult(raw, termA, termB);
    } catch (error) {
      console.warn(
        `[entangle] attempt ${attempt.strategy} failed:`,
        error instanceof Error ? error.message : error
      );
      lastError = error;
    }
  }

  if (shouldFallbackToSafePath(lastError)) {
    return buildFallbackPaths(termA, termB, regenerate);
  }

  throw lastError;
}

// ─── HTTP 处理器 ──────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  const requestId = buildRequestId();

  if (req.method === "OPTIONS") {
    jsonResponse(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST") {
    jsonResponse(res, 405, createErrorPayload(requestId, "E_BAD_REQUEST", "仅支持 POST 请求", false));
    return;
  }

  // 频率限制
  const ip =
    String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (!checkRateLimit(`entangle:${ip}`)) {
    jsonResponse(res, 429, createErrorPayload(requestId, "E_RATE_LIMIT", "请求过于频繁，请稍后再试。", true));
    return;
  }

  // 解析请求体
  let body: Record<string, unknown>;
  try {
    body = parseJsonBody(req.body);
  } catch {
    jsonResponse(res, 400, createErrorPayload(requestId, "E_BAD_REQUEST", "请求体不是合法 JSON", false));
    return;
  }

  // 参数校验
  const termA = String(body.termA ?? "").trim();
  const termB = String(body.termB ?? "").trim();
  const regenerate = Boolean(body.regenerate);

  if (!termA || !termB) {
    jsonResponse(res, 400, createErrorPayload(requestId, "E_BAD_REQUEST", "termA 与 termB 必填", false));
    return;
  }
  if (termA === termB) {
    jsonResponse(res, 400, createErrorPayload(requestId, "E_BAD_REQUEST", "termA 与 termB 不能相同", false));
    return;
  }
  if (termA.length > TERM_MAX_LENGTH || termB.length > TERM_MAX_LENGTH) {
    jsonResponse(
      res,
      400,
      createErrorPayload(requestId, "E_BAD_REQUEST", `termA 与 termB 长度不能超过 ${TERM_MAX_LENGTH} 字符`, false)
    );
    return;
  }

  // 生成路径
  try {
    const paths = await generatePaths(termA, termB, regenerate);
    jsonResponse(res, 200, {
      requestId,
      data: {
        id: `ent_${Date.now()}`,
        termA,
        termB,
        paths,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    // 超时
    if (isAbortError(error)) {
      jsonResponse(res, 504, createErrorPayload(requestId, "E_MODEL_TIMEOUT", "模型多轮生成超时，请重试", true));
      return;
    }

    // 模型输出质量不达标
    if (isInvalidModelOutputError(error)) {
      jsonResponse(
        res,
        502,
        createErrorPayload(requestId, "E_INVALID_MODEL_OUTPUT", "模型多轮生成后仍未通过质量校验，请重试", true)
      );
      return;
    }

    const message = error instanceof Error ? error.message : "unknown";

    // Provider 配置缺失
    if (message.includes("MODEL_API_KEY is missing")) {
      jsonResponse(
        res,
        503,
        createErrorPayload(
          requestId,
          "E_PROVIDER_UNAVAILABLE",
          "似乎还缺少一些必要的环境变量设置。别担心，您可以先点击 [示例路径] 进行体验",
          false
        )
      );
      return;
    }

    // API Key 格式错误
    if (message.includes("invalid zhipu api key format")) {
      jsonResponse(
        res,
        503,
        createErrorPayload(requestId, "E_PROVIDER_UNAVAILABLE", "ZHIPU_API_KEY 格式不正确，请检查 key 是否完整", false)
      );
      return;
    }

    // 上游服务不可用
    if (message.includes("provider status")) {
      jsonResponse(res, 503, createErrorPayload(requestId, "E_PROVIDER_UNAVAILABLE", "上游服务暂不可用，请稍后重试", true));
      return;
    }

    jsonResponse(res, 500, createErrorPayload(requestId, "E_INTERNAL", "服务内部错误", true));
  }
}
