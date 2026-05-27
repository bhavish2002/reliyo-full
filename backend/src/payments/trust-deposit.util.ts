/** Policy: trust deposit = 10% of task reward (Sprint 0 financial spec). */
export const TRUST_DEPOSIT_PERCENT = 10;

export function computeTrustDepositAmount(reward: number): number {
  return parseFloat((reward * (TRUST_DEPOSIT_PERCENT / 100)).toFixed(2));
}
