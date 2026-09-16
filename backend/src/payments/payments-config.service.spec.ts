import { PaymentsConfigService } from './payments-config.service';

describe('PaymentsConfigService', () => {
  it('returns mock config by default', () => {
    const service = new PaymentsConfigService({
      get: (key: string) => {
        if (key === 'PAYMENT_MODE') return 'mock';
        if (key === 'PAYMENT_PSP') return 'razorpay';
        if (key === 'API_PREFIX') return 'api/v1';
        return undefined;
      },
    } as never);

    expect(service.getConfig()).toEqual({
      mode: 'mock',
      psp: 'razorpay',
      checkoutEnabled: false,
      razorpayKeyId: undefined,
      webhookPath: '/api/v1/payments/webhooks/razorpay',
      supportedCheckoutCurrencies: [
        'INR',
        'USD',
        'GBP',
        'EUR',
        'CAD',
        'AUD',
        'JPY',
        'BRL',
        'ZAR',
        'AED',
        'SGD',
        'NGN',
      ],
    });
  });

  it('enables checkout in live mode with key id', () => {
    const service = new PaymentsConfigService({
      get: (key: string) => {
        if (key === 'PAYMENT_MODE') return 'live';
        if (key === 'PAYMENT_PSP') return 'razorpay';
        if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_abc';
        if (key === 'API_PREFIX') return 'api/v1';
        return undefined;
      },
    } as never);

    const cfg = service.getConfig();
    expect(cfg.checkoutEnabled).toBe(true);
    expect(cfg.razorpayKeyId).toBe('rzp_test_abc');
    expect(cfg.supportedCheckoutCurrencies).toEqual(['INR']);

    const checkout = service.buildCheckoutForHold({
      provider: 'razorpay',
      providerIntentId: 'order_123',
      purpose: 'task_reward',
      amount: 1000,
      currency: 'INR',
    });
    expect(checkout).toMatchObject({
      provider: 'razorpay',
      keyId: 'rzp_test_abc',
      orderId: 'order_123',
      amount: 1000,
      currency: 'INR',
    });
  });

  it('does not expose checkout for mock provider holds', () => {
    const service = new PaymentsConfigService({
      get: (key: string) => {
        if (key === 'PAYMENT_MODE') return 'live';
        if (key === 'PAYMENT_PSP') return 'razorpay';
        if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_abc';
        return undefined;
      },
    } as never);

    expect(
      service.buildCheckoutForHold({
        provider: 'mock',
        providerIntentId: 'mock_pi_1',
        purpose: 'trust_deposit',
        amount: 100,
        currency: 'INR',
      }),
    ).toBeUndefined();
  });
});
