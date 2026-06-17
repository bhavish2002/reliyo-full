import type { CheckoutConfig } from "@/lib/payments/api";

export interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: { error: { description: string } }) => void): void;
}

export interface RazorpayConstructorOptions {
  key: string;
  order_id: string;
  name: string;
  description: string;
  currency: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: { ondismiss?: () => void };
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  /** false = do not prompt to save card (avoids Flash Checkout OTP to prefill phone) */
  remember_customer?: boolean;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayConstructorOptions) => RazorpayCheckoutInstance;
  }
}

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export async function openRazorpayCheckout(
  checkout: CheckoutConfig,
  prefill?: { name?: string; email?: string; contact?: string },
): Promise<RazorpayCheckoutResponse> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error("Unable to load Razorpay Checkout. Check your connection and try again.");
  }

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: checkout.keyId,
      order_id: checkout.orderId,
      name: checkout.name,
      description: checkout.description,
      currency: checkout.currency,
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled.")),
      },
      prefill,
      remember_customer: false,
      theme: { color: "#2563eb" },
    });

    // Do not reject here — Razorpay keeps the modal open so the user can retry
    // another method. Reject only when the modal is dismissed (ondismiss above).

    rzp.open();
  });
}
