import { env } from "@/lib/env";
import { getAccessToken, setAccessToken } from "@/lib/auth/session";
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

type RequestOptions = RequestInit & { _authRetried?: boolean };

async function refreshAccessTokenFromCookie(): Promise<boolean> {
  const traceId = getClientTraceId();
  const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Trace-Id": traceId,
    },
  });
  if (!response.ok) return false;

  const text = await response.text();
  if (!text) return false;

  try {
    const parsed = JSON.parse(text) as ApiSuccessResponse<{ accessToken: string }>;
    if (parsed.data?.accessToken) {
      setAccessToken(parsed.data.accessToken);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function friendlyAuthMessage(status: number, body?: ApiErrorBody): string | undefined {
  if (status !== 401) return undefined;
  if (body?.code === "AUTH_SUSPENDED") return body.message;
  return "Your session expired. Please sign in again.";
}

async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const url = `${env.apiBaseUrl}${path}`;
  const startedAt = performance.now();
  const traceId = getClientTraceId();

  try {
    const token = getAccessToken();
    const response = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Trace-Id": traceId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

      if (
        response.status === 401 &&
        !init?._authRetried &&
        !path.startsWith("/auth/")
      ) {
        const refreshed = await refreshAccessTokenFromCookie();
        if (refreshed) {
          return request<T>(path, { ...init, _authRetried: true });
        }
      }

      const message =
        friendlyAuthMessage(response.status, body) ??
        body?.message ??
        "Request failed";
      throw new ApiClientError(message, response.status, body);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }
    let parsed: ApiSuccessResponse<T>;
    try {
      parsed = JSON.parse(text) as ApiSuccessResponse<T>;
    } catch {
      throw new ApiClientError("Invalid response from server", response.status);
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError("Network request failed", 0);
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
