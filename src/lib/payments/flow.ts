import type { FundHold } from "@/lib/payments/api";
import { confirmFundHoldCheckout, pollFundHoldUntilSettled } from "@/lib/payments/api";
import { openRazorpayCheckout } from "@/lib/payments/razorpay";
import { rememberCheckoutSuccess } from "@/lib/payments/payment-session";

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
    const response = await openRazorpayCheckout(hold.checkout, payer);
    rememberCheckoutSuccess({
      holdId: hold.id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpayOrderId: response.razorpay_order_id,
      razorpaySignature: response.razorpay_signature,
    });
    try {
      return await confirmFundHoldCheckout(hold.id, {
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature,
      });
    } catch {
      // Webhook may still arrive (tunnel); poll as fallback.
      return pollFundHoldUntilSettled(hold.id, {
        maxAttempts: 30,
        intervalMs: 2000,
      });
    }
  }

  return hold;
}
