import type { TimelineEntry } from "./taskTypes";

/** Read-only banner text from server-posted sla_warning timeline events (B6). */
export function inactivityBannerFromTimeline(
  status: string,
  entries: TimelineEntry[],
): string | null {
  if (status !== "done") return null;

  const strikes = entries.filter(
    (e) =>
      e.entryType === "alert" &&
      (e.metadata as { alertType?: string } | undefined)?.alertType === "sla_warning",
  );

  if (strikes.length === 0) return null;
  if (strikes.length >= 3) return null;

  const last = strikes[strikes.length - 1];
  return last.message;
}
