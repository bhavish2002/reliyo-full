import { FundHoldStatus } from '@prisma/client';

/** Dev/mock gateway outcomes — must match frontend PaymentGateway simulation. */
export function resolveFundHoldStatusFromMethod(
  paymentMethod: string,
): FundHoldStatus {
  switch (paymentMethod) {
    case 'upi':
      return FundHoldStatus.confirmed;
    case 'card':
      return FundHoldStatus.pending;
    case 'netbanking':
      return FundHoldStatus.failed;
    default:
      return FundHoldStatus.failed;
  }
}
