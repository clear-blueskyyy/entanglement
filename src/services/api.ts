import type {
  ApiErrorPayload,
  ApiSuccessPayload,
  DailyPairResult,
  EntanglementPath,
  EntangleRequest,
  EntanglementResult,
} from "../types";

const REQUEST_TIMEOUT_MS = 60_000;

function getApiBaseUrl() {
  if (!import.meta.env.DEV) {
    return "";
  }

  if (typeof window === "undefined") {
    return "http://localhost:3001";
  }

  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

const API_BASE_URL = getApiBaseUrl();

type ClientErrorCode = ApiErrorPayload["error"]["code"] | "E_NETWORK" | "E_RESPONSE_FORMAT";

type ApiRequestErrorOptions = {
  code?: ClientErrorCode;
  retryable?: boolean;
  status?: number;
  requestId?: string;
};

export class ApiRequestError extends Error {
  code?: ClientErrorCode;
  retryable: boolean;
  status?: number;
  requestId?: string;

  constructor(message: string, options: ApiRequestErrorOptions = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.code = options.code;
    this.retryable = options.retryable ?? true;
    this.status = options.status;
    this.requestId = options.requestId;
  }
}

function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function isApiError(value: unknown): value is ApiErrorPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.requestId !== "string") {
    return false;
  }

  const error = candidate.error as Record<string, unknown> | undefined;
  if (!error) {
    return false;
  }

  return (
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    typeof error.retryable === "boolean"
  );
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiRequestError("请求超时，请稍后重试。", {
        code: "E_MODEL_TIMEOUT",
        retryable: true,
      });
    }
    throw new ApiRequestError("网络异常，请检查连接后重试。", {
      code: "E_NETWORK",
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  let json: unknown = null;
  const rawText = await response.text();

  if (rawText) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      if (!response.ok) {
        throw new ApiRequestError(`请求失败（${response.status}）`, {
          status: response.status,
          retryable: response.status >= 500,
        });
      }

      throw new ApiRequestError("服务响应格式异常，请稍后重试。", {
        code: "E_RESPONSE_FORMAT",
        status: response.status,
        retryable: true,
      });
    }
  }

  if (!response.ok) {
    if (isApiError(json)) {
      throw new ApiRequestError(json.error.message, {
        code: json.error.code,
        retryable: json.error.retryable,
        status: response.status,
        requestId: json.requestId,
      });
    }

    throw new ApiRequestError(`请求失败（${response.status}），请稍后重试。`, {
      status: response.status,
      retryable: response.status >= 500,
    });
  }

  if (json === null) {
    throw new ApiRequestError("服务返回为空，请稍后重试。", {
      code: "E_RESPONSE_FORMAT",
      status: response.status,
      retryable: true,
    });
  }

  return json as T;
}

export async function createEntanglement(
  payload: EntangleRequest
): Promise<ApiSuccessPayload<EntanglementResult>> {
  const response = await fetchWithTimeout(buildApiUrl("/api/entangle"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<ApiSuccessPayload<EntanglementResult>>(response);
}

export async function getDailyPair(date?: string): Promise<ApiSuccessPayload<DailyPairResult>> {
  const response = await fetchWithTimeout(buildApiUrl("/api/daily-pair"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(date ? { date } : {}),
  });

  return parseResponse<ApiSuccessPayload<DailyPairResult>>(response);
}

// ─── 流式接口 ─────────────────────────────────────────────────────────────────

type StreamCallbacks = {
  onPath: (path: EntanglementPath) => void;
  onDone: (requestId: string) => void;
  onError: (err: ApiRequestError) => void;
};

/**
 * 流式纠缠请求。
 * 服务端以 SSE 逐条返回 path，第一条 path 到达时立即触发 onPath。
 * 返回取消函数——调用后中断 fetch，不再触发任何回调。
 */
export function createEntanglementStream(
  payload: EntangleRequest,
  { onPath, onDone, onError }: StreamCallbacks
): () => void {
  const controller = new AbortController();

  async function run() {
    let response: Response;
    try {
      response = await fetch(buildApiUrl("/api/entangle"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      onError(new ApiRequestError("网络异常，请检查连接后重试。", { code: "E_NETWORK", retryable: true }));
      return;
    }

    // 非 200 且非 SSE：尝试解析 JSON 错误体
    if (!response.ok) {
      try {
        const json = (await response.json()) as Record<string, unknown>;
        if (isApiError(json)) {
          onError(new ApiRequestError(json.error.message, {
            code: json.error.code,
            retryable: json.error.retryable,
            status: response.status,
            requestId: json.requestId,
          }));
          return;
        }
      } catch { /* ignore */ }
      onError(new ApiRequestError(`请求失败（${response.status}），请稍后重试。`, {
        status: response.status,
        retryable: response.status >= 500,
      }));
      return;
    }

    if (!response.body) {
      onError(new ApiRequestError("服务响应为空，请稍后重试。", { code: "E_RESPONSE_FORMAT", retryable: true }));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let lineBuffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";

        let i = 0;
        while (i < lines.length) {
          const line = lines[i].trim();

          if (line.startsWith("event: ")) {
            const eventName = line.slice(7);
            const dataLine = lines[i + 1]?.trim() ?? "";
            const rawData = dataLine.startsWith("data: ") ? dataLine.slice(6) : "";
            i += 2; // 跳过 event 行 + data 行

            if (!rawData) continue;

            try {
              const data = JSON.parse(rawData) as Record<string, unknown>;

              if (eventName === "path") {
                onPath(data as unknown as EntanglementPath);
              } else if (eventName === "done") {
                onDone(String(data.requestId ?? ""));
              } else if (eventName === "error") {
                onError(new ApiRequestError(
                  String(data.message ?? "请求失败"),
                  {
                    code: (data.code as ApiRequestError["code"]) ?? undefined,
                    retryable: Boolean(data.retryable ?? true),
                  }
                ));
              }
            } catch {
              // 忽略格式异常的单条 SSE 数据
            }
          } else {
            i++;
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      onError(new ApiRequestError("连接中断，请稍后重试。", { code: "E_NETWORK", retryable: true }));
    } finally {
      reader.releaseLock();
    }
  }

  run();
  return () => controller.abort();
}
