import { env } from "@/lib/env";
import { traceEvent } from "@/lib/observability";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/lib/api/contracts";

export class ApiClientError extends Error {
  readonly status: number;
  readonly payload?: ApiErrorResponse;

  constructor(message: string, status: number, payload?: ApiErrorResponse) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${env.apiBaseUrl}${path}`;
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    const elapsedMs = Math.round(performance.now() - startedAt);
    traceEvent({ event: "api_request", data: { path, status: response.status, elapsedMs } });

    if (!response.ok) {
      let payload: ApiErrorResponse | undefined;
      try {
        payload = (await response.json()) as ApiErrorResponse;
      } catch {
        payload = undefined;
      }
      throw new ApiClientError(payload?.message || "Request failed", response.status, payload);
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
