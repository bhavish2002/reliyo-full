import {
  TRUST_DEPOSIT_PERCENT,
  computeTrustDepositAmount,
} from './trust-deposit.util';

describe('computeTrustDepositAmount', () => {
  it('uses 10% of reward', () => {
    expect(TRUST_DEPOSIT_PERCENT).toBe(10);
    expect(computeTrustDepositAmount(300)).toBe(30);
    expect(computeTrustDepositAmount(500)).toBe(50);
  });
});
