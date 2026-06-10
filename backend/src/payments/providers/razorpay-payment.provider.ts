import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
} from './payment-provider.types';
import type { PaymentProvider } from './payment-provider.interface';

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

@Injectable()
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = 'razorpay';

  constructor(private readonly config: ConfigService) {}

  async createPaymentIntent(
    input: CreatePaymentIntentInput,
  ): Promise<CreatePaymentIntentResult> {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new BadRequestException({
        code: 'PAYMENT_PSP_NOT_CONFIGURED',
        message:
          'Razorpay credentials are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      });
    }

    const amountMinor = this.toMinorUnits(input.amount, input.currency);
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    let response: Response;
    try {
      response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountMinor,
          currency: input.currency,
          receipt: input.receipt.slice(0, 40),
          notes: input.notes ?? {},
        }),
      });
    } catch {
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PSP_UNAVAILABLE',
        message: 'Unable to reach Razorpay Orders API.',
      });
    }

    const raw = (await response.json()) as RazorpayOrderResponse & {
      error?: { description?: string };
    };
    if (!response.ok || !raw?.id) {
      throw new BadRequestException({
        code: 'PAYMENT_INTENT_CREATE_FAILED',
        message: raw?.error?.description ?? 'Razorpay order creation failed.',
      });
    }

    return {
      provider: this.name,
      providerIntentId: raw.id,
      amount: input.amount,
      currency: raw.currency ?? input.currency,
      providerStatus: raw.status ?? 'created',
    };
  }

  private toMinorUnits(amount: number, currency: string): number {
    const zeroDecimal = new Set(['JPY']);
    if (zeroDecimal.has(currency.toUpperCase())) {
      return Math.round(amount);
    }
    return Math.round(amount * 100);
  }
}
