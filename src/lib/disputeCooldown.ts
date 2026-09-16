/**
 * Tiered dispute cooldown — mirrors backend `lifecycle.types.ts`.
 * DSP1 is immediate; later rounds shorten 48h → 24h → 12h.
 * Clock starts at the last raise and resets when work returns to `done`.
 */
import { MAX_DISPUTES } from "./disputeId";

export const DISPUTE_COOLDOWN_HOURS_BY_ROUND = [0, 48, 24, 12] as const;

const HOUR_MS = 60 * 60 * 1000;

export function disputeCooldownHoursForCount(disputeCount: number): number {
  const index = Math.min(
    Math.max(disputeCount, 0),
    DISPUTE_COOLDOWN_HOURS_BY_ROUND.length - 1,
  );
  return DISPUTE_COOLDOWN_HOURS_BY_ROUND[index];
}

export function disputeCooldownMsForCount(disputeCount: number): number {
  return disputeCooldownHoursForCount(disputeCount) * HOUR_MS;
}

export function disputeCooldownRemainingMs(options: {
  status: string;
  disputeCount: number;
  statusEnteredAt: string | undefined;
  lastDisputeAt: string | undefined;
  nowMs: number;
}): number {
  const { status, disputeCount, statusEnteredAt, lastDisputeAt, nowMs } = options;
  if (disputeCount <= 0 || disputeCount >= MAX_DISPUTES) return 0;
  const cooldownMs = disputeCooldownMsForCount(disputeCount);
  if (cooldownMs <= 0 || !lastDisputeAt) return 0;

  const disputeMs = new Date(lastDisputeAt).getTime();
  if (Number.isNaN(disputeMs)) return 0;

  if (status === "done" && statusEnteredAt) {
    const doneMs = new Date(statusEnteredAt).getTime();
    if (!Number.isNaN(doneMs) && doneMs > disputeMs) return 0;
  }

  return Math.max(0, disputeMs + cooldownMs - nowMs);
}
