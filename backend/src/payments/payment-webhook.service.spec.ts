import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PaymentWebhookService } from './payment-webhook.service';

describe('PaymentWebhookService', () => {
  const basePayload = {
    eventId: 'evt_1',
    intentId: 'pi_1',
    paymentId: 'pay_1',
    status: 'confirmed' as const,
  };

  it('verifies signature when mode is live', () => {
    const prisma = {} as never;
    const config = {
      get: (key: string) => {
        if (key === 'PAYMENT_MODE') return 'live';
        if (key === 'PAYMENT_WEBHOOK_SECRET_MOCK') return 'secret';
        return '';
      },
    } as never;
    const service = new PaymentWebhookService(prisma, config);

    const raw = JSON.stringify(basePayload);
    const sig = service.signPayload('mock', raw);
    expect(() => service.verifySignature('mock', raw, sig)).not.toThrow();
    expect(() => service.verifySignature('mock', raw, 'bad')).toThrow(
      BadRequestException,
    );
  });

  it('verifies Razorpay signature when mode is live', () => {
    const prisma = {} as never;
    const config = {
      get: (key: string) => {
        if (key === 'PAYMENT_MODE') return 'live';
        if (key === 'RAZORPAY_WEBHOOK_SECRET') return 'whsec';
        return '';
      },
    } as never;
    const service = new PaymentWebhookService(prisma, config);

    const raw = JSON.stringify({ event: 'payment.captured' });
    const sig = createHmac('sha256', 'whsec').update(raw).digest('hex');
    expect(() => service.verifyRazorpaySignature(raw, sig)).not.toThrow();
    expect(() => service.verifyRazorpaySignature(raw, 'bad')).toThrow(
      BadRequestException,
    );
  });

  it('returns duplicate on already processed event id', async () => {
    const prisma = {
      paymentWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'db_evt',
          status: 'processed',
        }),
      },
    } as never;
    const config = { get: () => 'mock' } as never;
    const service = new PaymentWebhookService(prisma, config);

    const result = await service.ingestEvent('mock', basePayload);
    expect(result).toEqual({ processed: true, duplicate: true });
  });
});

