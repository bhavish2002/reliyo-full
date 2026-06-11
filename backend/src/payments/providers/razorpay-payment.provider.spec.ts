import { BadRequestException } from '@nestjs/common';
import { RazorpayPaymentProvider } from './razorpay-payment.provider';

describe('RazorpayPaymentProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('throws when credentials are missing', async () => {
    const provider = new RazorpayPaymentProvider({
      get: () => undefined,
    } as never);

    await expect(
      provider.createPaymentIntent({
        amount: 1000,
        currency: 'INR',
        receipt: 'rcpt_1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates an order via Razorpay API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'order_test_1',
        amount: 100000,
        currency: 'INR',
        status: 'created',
      }),
    }) as never;

    const provider = new RazorpayPaymentProvider({
      get: (key: string) => {
        if (key === 'RAZORPAY_KEY_ID') return 'rzp_test';
        if (key === 'RAZORPAY_KEY_SECRET') return 'secret';
        return undefined;
      },
    } as never);

    const result = await provider.createPaymentIntent({
      amount: 1000,
      currency: 'INR',
      receipt: 'rcpt_1',
      notes: { purpose: 'task_reward' },
    });

    expect(result).toEqual({
      provider: 'razorpay',
      providerIntentId: 'order_test_1',
      amount: 1000,
      currency: 'INR',
      providerStatus: 'created',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/orders',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
