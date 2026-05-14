/**
 * 3-Strike inactivity engine for REQUESTOR deadlocks only.
 * Applies to tasks in "done" status where the
 * requestor is the party who must act (review work or submit rating).
 * This rule does NOT apply to acceptor inactivity.
 *
 * Strike 1: After 3 days (72h) of inactivity
 * Strike 2: After 3 more days (144h total)
 * Strike 3: After 2 more days (192h total) → auto-close
 */

import { differenceInHours, addHours, formatDistanceToNow } from "date-fns";
import type { TimelineEntry } from "./taskTypes";
import { pushNotification } from "./notifications";

const STRIKE_HOURS = [72, 144, 192]; // cumulative hours for each strike

export interface InactivityState {
  currentStrike: number;
  shouldAutoClose: boolean;
  nextStrikeAt: Date | null;
  pendingEntries: TimelineEntry[];
  bannerMessage: string | null;
}

function generateStrikeId(strike: number): string {
  return `strike-${strike}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const STRIKE_MESSAGES = [
  "⚠️ Strike 1/3: Requestor has been inactive for 3 days. Please review the task to avoid auto-closure.",
  "⚠️ Strike 2/3: Requestor has been inactive for 6 days. Task will auto-close in 2 days if no action is taken.",
  "⚠️ Strike 3/3: Task has been automatically closed due to requestor inactivity.",
];

export function checkInactivity(
  taskId: string,
  statusEnteredAt: string | undefined,
  currentStatus: string,
  existingEntries: TimelineEntry[]
): InactivityState {
  const empty: InactivityState = {
    currentStrike: 0,
    shouldAutoClose: false,
    nextStrikeAt: null,
    pendingEntries: [],
    bannerMessage: null,
  };

  if (currentStatus !== "done" || !statusEnteredAt) {
    return empty;
  }

  const enteredAt = new Date(statusEnteredAt);
  const hoursElapsed = differenceInHours(new Date(), enteredAt);

  let currentStrike = 0;
  for (let i = 0; i < STRIKE_HOURS.length; i++) {
    if (hoursElapsed >= STRIKE_HOURS[i]) currentStrike = i + 1;
  }

  // Count existing strike entries to avoid duplicates
  const existingStrikeCount = existingEntries.filter(
    (e) => e.systemGenerated && e.entryType === "alert" && e.metadata?.alertType === "sla_warning"
  ).length;

  const pendingEntries: TimelineEntry[] = [];
  for (let i = existingStrikeCount; i < currentStrike; i++) {
    pendingEntries.push({
      id: generateStrikeId(i + 1),
      taskId,
      author: "System",
      authorRole: "system",
      message: STRIKE_MESSAGES[i],
      timestamp: new Date(enteredAt.getTime() + STRIKE_HOURS[i] * 3600000).toISOString(),
      systemGenerated: true,
      entryType: "alert",
      metadata: { alertType: "sla_warning" },
    });
  }

  const shouldAutoClose = currentStrike >= 3;

  let nextStrikeAt: Date | null = null;
  let bannerMessage: string | null = null;

  if (!shouldAutoClose) {
    const nextHours = STRIKE_HOURS[currentStrike] || STRIKE_HOURS[0];
    nextStrikeAt = addHours(enteredAt, nextHours);

    if (currentStrike === 0) {
      bannerMessage = `Inactivity reminder will trigger in ${formatDistanceToNow(nextStrikeAt)}.`;
    } else if (currentStrike === 1) {
      bannerMessage = `Strike 1/3 issued. Next reminder in ${formatDistanceToNow(nextStrikeAt)}.`;
    } else if (currentStrike === 2) {
      bannerMessage = `Strike 2/3 issued. Task will auto-close in ${formatDistanceToNow(nextStrikeAt)}.`;
    }
  } else {
    bannerMessage = "Task auto-closed due to requestor inactivity (3 strikes).";
  }

  return { currentStrike, shouldAutoClose, nextStrikeAt, pendingEntries, bannerMessage };
}

/**
 * Push high-priority notifications and simulated email alerts for each new strike.
 * Called after checkInactivity returns pendingEntries.
 */
export function sendStrikeNotifications(
  task: { id: string; taskId?: string; title: string; },
  pendingEntries: TimelineEntry[],
  requestorEmail: string | undefined
): void {
  pendingEntries.forEach((entry) => {
    // Determine strike number from message
    let strikeLabel = "Inactivity Warning";
    if (entry.message.includes("1/3")) strikeLabel = "Strike 1/3: Inactivity Warning";
    else if (entry.message.includes("2/3")) strikeLabel = "Strike 2/3: Inactivity Warning";
    else if (entry.message.includes("3/3")) strikeLabel = "Strike 3/3: Task Auto-Closed";

    // Push notification to requestor
    pushNotification({
      taskId: task.id,
      taskDisplayId: task.taskId || task.id,
      taskTitle: task.title,
      type: "rating_required" as const, // re-use high-priority type for strike reminders
      priority: "critical" as const,
      target: "requestor" as const,
      title: strikeLabel,
      message: entry.message,
    });

    // Simulate email alert (frontend-only — log to console)
    if (requestorEmail) {
      console.info(
        `[EMAIL ALERT] To: ${requestorEmail} | Subject: ${strikeLabel} — "${task.title}" | Body: ${entry.message}`
      );
    } else {
      console.warn(
        `[EMAIL ALERT SKIPPED] No email on file for requestor. Strike: ${strikeLabel} — "${task.title}"`
      );
    }
  });
}
