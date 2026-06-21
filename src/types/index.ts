export interface EntanglementPathNode {
  term: string;
  connectionToNext: string;
  detail: string;
}

export interface EntanglementPath {
  title: string;
  hook: string;
  surprise: string;
  surpriseIndex: number;
  connectionFromStart: string;
  nodes: EntanglementPathNode[];
  summary: string;
}

export interface EntanglementResult {
  id: string;
  termA: string;
  termB: string;
  paths: EntanglementPath[];
  createdAt: string;
}

export interface ApiErrorPayload {
  requestId: string;
  error: {
    code:
      | "E_BAD_REQUEST"
      | "E_RATE_LIMIT"
      | "E_MODEL_TIMEOUT"
      | "E_PROVIDER_UNAVAILABLE"
      | "E_INVALID_MODEL_OUTPUT"
      | "E_INTERNAL";
    message: string;
    retryable: boolean;
  };
}

export interface ApiSuccessPayload<T> {
  requestId: string;
  data: T;
}

export interface EntangleRequest {
  termA: string;
  termB: string;
  regenerate?: boolean;
}

export interface DailyPairResult {
  date: string;
  termA: string;
  domainA: string;
  termB: string;
  domainB: string;
}
