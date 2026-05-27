import { FundHoldStatus } from '@prisma/client';
import { resolveFundHoldStatusFromMethod } from './payment-outcomes';

describe('resolveFundHoldStatusFromMethod', () => {
  it('confirms UPI payments', () => {
    expect(resolveFundHoldStatusFromMethod('upi')).toBe(
      FundHoldStatus.confirmed,
    );
  });

  it('leaves card payments pending', () => {
    expect(resolveFundHoldStatusFromMethod('card')).toBe(
      FundHoldStatus.pending,
    );
  });

  it('fails net banking payments', () => {
    expect(resolveFundHoldStatusFromMethod('netbanking')).toBe(
      FundHoldStatus.failed,
    );
  });
});
