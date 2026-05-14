import { env } from "@/lib/env";
import { traceEvent, getClientTraceId } from "@/lib/observability";
import type { ApiErrorBody, ApiErrorEnvelope, ApiSuccessResponse } from "@/lib/api/contracts";

export class ApiClientError extends Error {
  readonly status: number;
  readonly body?: ApiErrorBody;

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

function parseErrorBody(json: unknown): ApiErrorBody | undefined {
  if (!json || typeof json !== "object") return undefined;
  const o = json as Record<string, unknown>;
  if (o.error && typeof o.error === "object") {
    const e = (o.error as ApiErrorEnvelope["error"]) as Record<string, unknown>;
    if (typeof e.code === "string" && typeof e.message === "string") {
      return {
        code: e.code,
        message: e.message,
        requestId: typeof e.requestId === "string" ? e.requestId : undefined,
        details: typeof e.details === "object" && e.details !== null ? (e.details as Record<string, unknown>) : undefined,
      };
    }
  }
  if (typeof o.code === "string" && typeof o.message === "string") {
    return {
      code: o.code,
      message: o.message,
      requestId: typeof o.requestId === "string" ? o.requestId : undefined,
      details: typeof o.details === "object" && o.details !== null ? (o.details as Record<string, unknown>) : undefined,
    };
  }
  return undefined;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${env.apiBaseUrl}${path}`;
  const startedAt = performance.now();
  const traceId = getClientTraceId();

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Client-Trace-Id": traceId,
        ...(init?.headers || {}),
      },
    });

    const elapsedMs = Math.round(performance.now() - startedAt);
    traceEvent({
      event: "api_request",
      data: { path, status: response.status, elapsedMs, traceId },
    });

    if (!response.ok) {
      let body: ApiErrorBody | undefined;
      try {
        body = parseErrorBody(await response.json());
      } catch {
        body = undefined;
      }
      throw new ApiClientError(body?.message || "Request failed", response.status, body);
    }

    const data = (await response.json()) as ApiSuccessResponse<T>;
    return data.data;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError("Network request failed", 0);
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
};
