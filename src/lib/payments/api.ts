import { apiClient } from "@/lib/api/client";

export type FundHoldPurpose = "task_reward" | "trust_deposit";
export type FundHoldStatus = "pending" | "confirmed" | "failed";

export interface FundHold {
  id: string;
  purpose: FundHoldPurpose;
  amount: number;
  currency: string;
  status: FundHoldStatus;
  paymentMethod?: string;
  confirmedAt?: string;
  failedAt?: string;
  createdAt: string;
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
