import type { FundHold } from "@/lib/payments/api";
import { pollFundHoldUntilSettled } from "@/lib/payments/api";
import { openRazorpayCheckout } from "@/lib/payments/razorpay";

export interface PayerProfile {
  name?: string;
  email?: string;
  contact?: string;
}

/**
 * After fund hold creation: open Razorpay Checkout when server returns checkout config,
 * then poll until webhook confirms (live mode). Mock mode returns immediately from API.
 */
export async function settleFundHold(
  hold: FundHold,
  payer?: PayerProfile,
): Promise<FundHold> {
  if (hold.status === "confirmed" || hold.status === "failed") {
    return hold;
  }

  if (hold.checkout) {
    await openRazorpayCheckout(hold.checkout, payer);
    return pollFundHoldUntilSettled(hold.id);
  }

  return hold;
}
