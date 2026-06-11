import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PaymentProvider } from './payment-provider.interface';
import { RazorpayPaymentProvider } from './razorpay-payment.provider';

/**
 * Resolves the active PSP adapter. Returns null in mock mode (synthetic intent IDs).
 */
@Injectable()
export class PaymentProviderRegistry {
  constructor(
    private readonly config: ConfigService,
    private readonly razorpay: RazorpayPaymentProvider,
  ) {}

  resolve(): PaymentProvider | null {
    const mode = this.config.get<string>('PAYMENT_MODE') ?? 'mock';
    const psp = this.config.get<string>('PAYMENT_PSP') ?? 'mock';
    if (mode === 'mock' || psp === 'mock') {
      return null;
    }
    if (psp === 'razorpay') {
      return this.razorpay;
    }
    return null;
  }
}
