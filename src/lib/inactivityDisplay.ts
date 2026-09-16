import type { TimelineEntry } from "./taskTypes";

/** Cumulative hours after inactivity anchor before each strike — mirrors backend policy. */
export const INACTIVITY_STRIKE_HOURS = [72, 144, 192] as const;

const MAX_REMINDERS = INACTIVITY_STRIKE_HOURS.length;

function strikesInDoneStint(
  entries: TimelineEntry[],
  inactivityAnchorMs: number,
): TimelineEntry[] {
  return entries.filter((e) => {
    if (e.entryType !== "alert") return false;
    const meta = e.metadata as { alertType?: string } | undefined;
    if (meta?.alertType !== "sla_warning") return false;
    const ts = new Date(e.timestamp).getTime();
    return ts >= inactivityAnchorMs;
  });
}

export function computeInactivityAnchorMs(
  statusEnteredAt: string,
  effectiveDeadline: string,
): number {
  return Math.max(
    new Date(statusEnteredAt).getTime(),
    new Date(effectiveDeadline).getTime(),
  );
}

export interface InactivityUiState {
  strikeCount: number;
  maxStrikes: number;
  /** Primary message — same wording for requestor and acceptor. */
  headline: string;
  /** Optional second line (e.g. time until next reminder). */
  detail: string | null;
  beforeDeadline: boolean;
  /** @deprecated Use headline */
  reviewPeriodLabel?: string | null;
  /** @deprecated Use headline/detail */
  strikeBanner?: string | null;
  /** @deprecated Use detail */
  countdownLabel?: string | null;
}

function formatCountdown(hours: number): string {
  if (hours < 1) {
    const mins = Math.max(1, Math.ceil(hours * 60));
    return `${mins} minute${mins === 1 ? "" : "s"}`;
  }
  if (hours < 48) {
    const h = Math.ceil(hours);
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function reminderHeadline(strikeCount: number): string {
  if (strikeCount <= 0) {
    return "This task is waiting for a decision (accept work or raise a dispute).";
  }
  if (strikeCount === 1) {
    return "Reminder 1 of 3 — still waiting for a decision on this task.";
  }
  if (strikeCount === 2) {
    return "Reminder 2 of 3 — please resolve this task soon.";
  }
  return "Reminder 3 of 3 — task closed automatically after no decision was made.";
}

function buildInactivityCopy(options: {
  beforeDeadline: boolean;
  strikeCount: number;
  strikePending: boolean;
  nextReminderIndex: number;
  hoursUntilNext: number | null;
}): { headline: string; detail: string | null } {
  const { beforeDeadline, strikeCount, strikePending, nextReminderIndex, hoursUntilNext } =
    options;

  if (beforeDeadline) {
    return {
      headline: "Work is complete. A decision is needed — reminders begin after the deadline.",
      detail: null,
    };
  }

  if (strikeCount >= MAX_REMINDERS) {
    return {
      headline: reminderHeadline(MAX_REMINDERS),
      detail: null,
    };
  }

  const headline = reminderHeadline(strikeCount);

  if (strikePending) {
    return {
      headline,
      detail: `Reminder ${nextReminderIndex} of ${MAX_REMINDERS} will be recorded shortly.`,
    };
  }

  if (hoursUntilNext != null && hoursUntilNext > 0 && strikeCount < MAX_REMINDERS) {
    const nextNum = strikeCount + 1;
    return {
      headline,
      detail: `Reminder ${nextNum} of ${MAX_REMINDERS} in ${formatCountdown(hoursUntilNext)} if nothing changes.`,
    };
  }

  return { headline, detail: null };
}

/** Read-only inactivity UI for `done` tasks (server reminders + countdown). */
export function getInactivityUiState(
  status: string,
  statusEnteredAt: string | undefined,
  effectiveDeadline: string | undefined,
  entries: TimelineEntry[],
): InactivityUiState | null {
  if (status !== "done" || !statusEnteredAt || !effectiveDeadline) return null;

  const anchorMs = computeInactivityAnchorMs(statusEnteredAt, effectiveDeadline);
  const beforeDeadline = Date.now() < anchorMs;

  if (beforeDeadline) {
    const copy = buildInactivityCopy({
      beforeDeadline: true,
      strikeCount: 0,
      strikePending: false,
      nextReminderIndex: 1,
      hoursUntilNext: null,
    });
    return {
      strikeCount: 0,
      maxStrikes: MAX_REMINDERS,
      headline: copy.headline,
      detail: copy.detail,
      beforeDeadline: true,
      reviewPeriodLabel: copy.headline,
    };
  }

  const strikeCount = strikesInDoneStint(entries, anchorMs).length;
  const hoursElapsed = (Date.now() - anchorMs) / (1000 * 60 * 60);

  let dueLevel = 0;
  for (let i = 0; i < INACTIVITY_STRIKE_HOURS.length; i++) {
    if (hoursElapsed >= INACTIVITY_STRIKE_HOURS[i]) dueLevel = i + 1;
  }

  const strikePending =
    dueLevel > strikeCount && strikeCount < MAX_REMINDERS;
  const nextThreshold = INACTIVITY_STRIKE_HOURS[strikeCount];
  const hoursUntilNext =
    nextThreshold != null ? Math.max(0, nextThreshold - hoursElapsed) : null;

  const copy = buildInactivityCopy({
    beforeDeadline: false,
    strikeCount,
    strikePending,
    nextReminderIndex: strikeCount + 1,
    hoursUntilNext,
  });

  if (!copy.detail && strikeCount === 0 && dueLevel === 0 && hoursUntilNext == null) {
    return null;
  }

  return {
    strikeCount,
    maxStrikes: MAX_REMINDERS,
    headline: copy.headline,
    detail: copy.detail,
    beforeDeadline: false,
    strikeBanner: copy.headline,
    countdownLabel: copy.detail,
  };
}

/** @deprecated Use getInactivityUiState */
export function inactivityBannerFromTimeline(
  status: string,
  entries: TimelineEntry[],
  statusEnteredAt?: string,
  effectiveDeadline?: string,
): string | null {
  const state = getInactivityUiState(
    status,
    statusEnteredAt,
    effectiveDeadline,
    entries,
  );
  if (!state) return null;
  return state.detail ? `${state.headline} ${state.detail}` : state.headline;
}
