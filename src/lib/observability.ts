import { isDevelopment } from "@/lib/env";

type LogLevel = "info" | "warn" | "error";

interface TracePayload {
  event: string;
  data?: Record<string, unknown>;
}

const TRACE_STORAGE_KEY = "reliyo_client_trace_id";

function randomTraceSegment(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Stable per-tab trace id for correlating UI logs with future backend logs. */
export function getClientTraceId(): string {
  try {
    let id = sessionStorage.getItem(TRACE_STORAGE_KEY);
    if (!id) {
      id = `cli_${randomTraceSegment()}`;
      sessionStorage.setItem(TRACE_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `cli_${randomTraceSegment()}`;
  }
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!isDevelopment() && level === "info") {
    return;
  }

  const payload = data ? { message, traceId: getClientTraceId(), ...data } : { message, traceId: getClientTraceId() };
  if (level === "info") console.info(payload);
  if (level === "warn") console.warn(payload);
  if (level === "error") console.error(payload);
}

export function traceEvent({ event, data }: TracePayload): void {
  log("info", `trace:${event}`, data);
}

export function reportUiError(error: unknown, context: string): void {
  log("error", `ui-error:${context}`, {
    traceId: getClientTraceId(),
    error: error instanceof Error ? error.message : String(error),
  });
}
