import { apiClient } from "@/lib/api/client";

export type FundHoldPurpose = "task_reward" | "trust_deposit";
export type FundHoldStatus = "pending" | "confirmed" | "failed";
export type PaymentMode = "mock" | "live";

export interface CheckoutConfig {
  provider: "razorpay";
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
}

export interface FundHold {
  id: string;
  purpose: FundHoldPurpose;
  amount: number;
  currency: string;
  status: FundHoldStatus;
  provider?: string;
  providerIntentId?: string;
  checkout?: CheckoutConfig;
  paymentMethod?: string;
  targetTaskId?: string;
  confirmedAt?: string;
  failedAt?: string;
  createdAt: string;
}

export interface UserTransaction {
  id: string;
  kind: 'fund_hold';
  purpose: FundHoldPurpose;
  role: 'requestor' | 'acceptor';
  amount: number;
  currency: string;
  status: FundHoldStatus;
  paymentMethod?: string;
  provider: string;
  providerPaymentId?: string;
  taskId?: string;
  taskDisplayId?: string;
  taskTitle?: string;
  taskStatus?: string;
  taskCancelled?: boolean;
  settlementScenario?: string;
  settlementAt?: string;
  createdAt: string;
  confirmedAt?: string;
  failedAt?: string;
}

export function listUserTransactions() {
  return apiClient.get<{ items: UserTransaction[]; total: number }>(
    '/payments/fund-holds/transactions/list',
  );
}

export interface PaymentsConfig {
  mode: PaymentMode;
  psp: string;
  checkoutEnabled: boolean;
  razorpayKeyId?: string;
  webhookPath: string;
}

export function getPaymentsConfig() {
  return apiClient.get<PaymentsConfig>("/payments/config");
}

export function createFundHold(payload: {
  purpose: FundHoldPurpose;
  amount: number;
  currency?: string;
  paymentMethod: string;
  taskId?: string;
}) {
  return apiClient.post<FundHold>("/payments/fund-holds", payload);
}

export function getFundHold(id: string) {
  return apiClient.get<FundHold>(`/payments/fund-holds/${id}`);
}

export interface ConfirmCheckoutPayload {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

/** Verify Razorpay Checkout success server-side and confirm the fund hold (live mode). */
export function confirmFundHoldCheckout(holdId: string, payload: ConfirmCheckoutPayload) {
  return apiClient.post<FundHold>(`/payments/fund-holds/${holdId}/confirm-checkout`, payload);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll until hold is confirmed or failed (webhook-driven in live mode). */
export async function pollFundHoldUntilSettled(
  id: string,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<FundHold> {
  const maxAttempts = options?.maxAttempts ?? 30;
  const intervalMs = options?.intervalMs ?? 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const hold = await getFundHold(id);
    if (hold.status === "confirmed" || hold.status === "failed") {
      return hold;
    }
    await sleep(intervalMs);
  }

  throw new Error("Payment confirmation timed out. Check your bank or try again.");
}
