/** DR-005 / PRODUCT-WORKFLOW §Disputes — DSP4 Resolved Valid rework window. */
const MIN_REWORK_DAYS = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Guarantees a 10-day rework window without ever shortening an existing deadline:
 *   - deadline already passed  → 10 days from the review date
 *   - remaining time < 10 days → 10 days from the review date
 *   - remaining time >= 10 days → deadline left untouched
 */
export function computeDsp4ReworkDeadline(
  deadline: Date,
  extendedDeadline: Date | null,
  now: Date = new Date(),
): Date {
  const effective = extendedDeadline ?? deadline;
  const tenDaysOut = new Date(now.getTime() + MIN_REWORK_DAYS * MS_PER_DAY);
  return tenDaysOut.getTime() > effective.getTime() ? tenDaysOut : effective;
}

export function isDsp4ReworkWindowActive(
  dsp4Status: string | null | undefined,
  reworkDeadline: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (dsp4Status !== 'resolved_valid' || !reworkDeadline) {
    return false;
  }
  return reworkDeadline.getTime() > now.getTime();
}
