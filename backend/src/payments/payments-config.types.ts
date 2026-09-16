export interface CheckoutConfigDto {
  provider: 'razorpay';
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
}

export interface PaymentsConfigDto {
  mode: 'mock' | 'live';
  psp: string;
  checkoutEnabled: boolean;
  razorpayKeyId?: string;
  webhookPath: string;
  /** Currencies accepted by the active checkout provider (Razorpay India: INR only). */
  supportedCheckoutCurrencies: string[];
}
