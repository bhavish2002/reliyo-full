export interface CreatePaymentIntentInput {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  provider: string;
  providerIntentId: string;
  amount: number;
  currency: string;
  /** Razorpay order status; fund hold remains pending until webhook. */
  providerStatus: string;
}
