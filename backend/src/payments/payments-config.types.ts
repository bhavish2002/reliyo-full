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
}
