/**
 * Dispute ID generator.
 * Format: RLY-DSP{n}-YYYY-XXXXXX (derived from task ID)
 * Max 4 disputes per task. Dispute 4 is automatically escalated.
 */

export const MAX_DISPUTES = 4;
export const ESCALATION_THRESHOLD = 4;

export function generateDisputeId(taskId: string | undefined, disputeNumber: number): string {
  if (!taskId) return `DSP${disputeNumber}`;
  // taskId format: RLY-TSK-YYYY-XXXXXX
  const parts = taskId.split("-");
  if (parts.length >= 4) {
    return `${parts[0]}-DSP${disputeNumber}-${parts[2]}-${parts.slice(3).join("-")}`;
  }
  return `DSP${disputeNumber}-${taskId}`;
}

export function isEscalated(disputeNumber: number): boolean {
  return disputeNumber >= ESCALATION_THRESHOLD;
}
