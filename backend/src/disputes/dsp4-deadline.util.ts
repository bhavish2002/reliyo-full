/** DR-005 / PRODUCT-WORKFLOW §Disputes — DSP4 Resolved Valid rework window. */
const MIN_REWORK_DAYS = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeDsp4ReworkDeadline(
  deadline: Date,
  extendedDeadline: Date | null,
  now: Date = new Date(),
): Date {
  const effective = extendedDeadline ?? deadline;
  if (effective.getTime() <= now.getTime()) {
    return new Date(now.getTime() + MIN_REWORK_DAYS * MS_PER_DAY);
  }

  const daysRemaining = Math.ceil(
    (effective.getTime() - now.getTime()) / MS_PER_DAY,
  );
  if (daysRemaining >= MIN_REWORK_DAYS) {
    return effective;
  }

  return new Date(effective.getTime() + MIN_REWORK_DAYS * MS_PER_DAY);
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
