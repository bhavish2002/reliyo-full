import { isDevelopment } from "@/lib/env";

type LogLevel = "info" | "warn" | "error";

interface TracePayload {
  event: string;
  data?: Record<string, unknown>;
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!isDevelopment() && level === "info") {
    return;
  }

  const payload = data ? { message, ...data } : { message };
  if (level === "info") console.info(payload);
  if (level === "warn") console.warn(payload);
  if (level === "error") console.error(payload);
}

export function traceEvent({ event, data }: TracePayload): void {
  log("info", `trace:${event}`, data);
}

export function reportUiError(error: unknown, context: string): void {
  log("error", `ui-error:${context}`, {
    error: error instanceof Error ? error.message : String(error),
  });
}
