import { clearFundHoldIds } from "@/lib/payments/payment-session";

const TASK_STORAGE_KEYS = [
  "reliyo_tasks",
  "reliyo_accepted_tasks",
  "reliyo_force_close_requests",
  "reliyo_dsp4_status",
] as const;

/** Clear client-side task/payment caches so the next user session cannot see stale data. */
export function clearUserLocalSession(): void {
  if (typeof sessionStorage !== "undefined") {
    clearFundHoldIds();
  }
  if (typeof localStorage === "undefined") return;
  for (const key of TASK_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}
