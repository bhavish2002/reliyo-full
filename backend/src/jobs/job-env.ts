/** Parse boolean env flags for background jobs (off unless explicitly enabled). */
export function envFlagEnabled(
  value: string | undefined,
  defaultValue = false,
): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function defaultInactivityJobEnabled(): boolean {
  const nodeEnv = (process.env.NODE_ENV ?? 'development').trim().toLowerCase();
  // Off in production/test unless explicitly enabled; on for local dev/staging profiles.
  return nodeEnv !== 'production' && nodeEnv !== 'test';
}

export function isInactivityJobEnabled(): boolean {
  return envFlagEnabled(
    process.env.INACTIVITY_JOB_ENABLED,
    defaultInactivityJobEnabled(),
  );
}

export function isWebhookRetryJobEnabled(): boolean {
  return envFlagEnabled(process.env.WEBHOOK_RETRY_JOB_ENABLED, false);
}
