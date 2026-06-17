const STORAGE_KEY = "reliyo_payment_holds";
const MAX_STORED = 8;

export function rememberFundHoldId(id: string): void {
  if (typeof sessionStorage === "undefined") return;
  const ids = loadFundHoldIds().filter((x) => x !== id);
  ids.unshift(id);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_STORED)));
}

export function loadFundHoldIds(): string[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function clearFundHoldIds(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(CHECKOUT_KEY);
}

const CHECKOUT_KEY = "reliyo_checkout_success";

export interface StoredCheckoutSuccess {
  holdId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export function rememberCheckoutSuccess(payload: StoredCheckoutSuccess): void {
  if (typeof sessionStorage === "undefined") return;
  const all = loadCheckoutSuccesses().filter((x) => x.holdId !== payload.holdId);
  all.unshift(payload);
  sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(all.slice(0, MAX_STORED)));
}

export function loadCheckoutSuccesses(): StoredCheckoutSuccess[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CHECKOUT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadCheckoutSuccessForHold(holdId: string): StoredCheckoutSuccess | null {
  return loadCheckoutSuccesses().find((x) => x.holdId === holdId) ?? null;
}
