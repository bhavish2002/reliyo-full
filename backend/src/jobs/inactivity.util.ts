/** Cumulative hours in `done` after inactivity anchor (PRODUCT-WORKFLOW §4). */
export const INACTIVITY_STRIKE_HOURS = [72, 144, 192] as const;

export type InactivityStrikeEvent = {
  createdAt: Date;
  entryType: string;
  metadata: unknown;
};

export function resolveEffectiveDeadline(
  deadline: Date,
  extendedDeadline: Date | null | undefined,
): Date {
  return extendedDeadline ?? deadline;
}

/** When both `done` and deadline passed: max(statusEnteredAt, effectiveDeadline). */
export function computeInactivityAnchor(
  statusEnteredAt: Date,
  effectiveDeadline: Date,
): Date {
  return new Date(
    Math.max(statusEnteredAt.getTime(), effectiveDeadline.getTime()),
  );
}

/** Count sla_warning strikes since the inactivity anchor for the current `done` stint. */
export function countStrikesInDoneStint(
  events: InactivityStrikeEvent[],
  inactivityAnchor: Date,
): number {
  return events.filter((e) => {
    if (e.createdAt < inactivityAnchor) return false;
    const meta = e.metadata as { alertType?: string } | null;
    return e.entryType === 'alert' && meta?.alertType === 'sla_warning';
  }).length;
}

/** Highest strike level due based on hours elapsed since inactivity anchor. */
export function computeDueStrikeLevel(hoursElapsed: number): number {
  if (hoursElapsed < 0) return 0;
  let due = 0;
  for (let i = 0; i < INACTIVITY_STRIKE_HOURS.length; i++) {
    if (hoursElapsed >= INACTIVITY_STRIKE_HOURS[i]) due = i + 1;
  }
  return due;
}

export function hoursUntilNextStrike(
  hoursElapsed: number,
  existingStrikes: number,
): number | null {
  if (hoursElapsed < 0) return null;
  if (existingStrikes >= INACTIVITY_STRIKE_HOURS.length) return null;
  const nextThreshold = INACTIVITY_STRIKE_HOURS[existingStrikes];
  if (nextThreshold == null) return null;
  return Math.max(0, nextThreshold - hoursElapsed);
}
