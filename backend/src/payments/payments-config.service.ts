import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CheckoutConfigDto,
  PaymentsConfigDto,
} from './payments-config.types';

@Injectable()
export class PaymentsConfigService {
  constructor(private readonly config: ConfigService) {}

  getConfig(): PaymentsConfigDto {
    const mode = this.resolveMode();
    const psp = this.config.get<string>('PAYMENT_PSP') ?? 'mock';
    const apiPrefix = this.config.get<string>('API_PREFIX') ?? 'api/v1';
    const razorpayKeyId = this.config.get<string>('RAZORPAY_KEY_ID') || undefined;
    const checkoutEnabled =
      mode === 'live' && psp === 'razorpay' && Boolean(razorpayKeyId);

    return {
      mode,
      psp,
      checkoutEnabled,
      razorpayKeyId: checkoutEnabled ? razorpayKeyId : undefined,
      webhookPath: `/${apiPrefix}/payments/webhooks/razorpay`,
    };
  }

  buildCheckoutForHold(params: {
    provider: string;
    providerIntentId: string | null;
    purpose: 'task_reward' | 'trust_deposit';
    amount: number;
    currency: string;
  }): CheckoutConfigDto | undefined {
    const cfg = this.getConfig();
    if (!cfg.checkoutEnabled || params.provider !== 'razorpay') {
      return undefined;
    }
    if (!params.providerIntentId || !cfg.razorpayKeyId) {
      return undefined;
    }

    const description =
      params.purpose === 'task_reward'
        ? 'Task reward escrow (platform-held funds)'
        : 'Trust deposit — 10% of task reward';

    return {
      provider: 'razorpay',
      keyId: cfg.razorpayKeyId,
      orderId: params.providerIntentId,
      amount: params.amount,
      currency: params.currency,
      name: 'Reliyo',
      description,
    };
  }

  private resolveMode(): 'mock' | 'live' {
    const raw = this.config.get<string>('PAYMENT_MODE') ?? 'mock';
    return raw === 'live' ? 'live' : 'mock';
  }
}
