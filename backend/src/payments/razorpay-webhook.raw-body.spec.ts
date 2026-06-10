import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PaymentWebhookService } from './payment-webhook.service';
import { mapRazorpayWebhook } from './razorpay-webhook.mapper';

describe('Razorpay webhook raw body signature', () => {
  it('rejects when signature does not match exact raw bytes', () => {
    const secret = 'whsec_test';
    const rawBody =
      '{"event":"payment.captured", "id":"evt_raw_1","payload":{"payment":{"entity":{"id":"pay_1","order_id":"order_1","status":"captured"}}}}';
    const validSig = createHmac('sha256', secret).update(rawBody).digest('hex');

    const reStringified = JSON.stringify(JSON.parse(rawBody));
    expect(reStringified).not.toBe(rawBody);

    const invalidFromReparse = createHmac('sha256', secret)
      .update(reStringified)
      .digest('hex');
    expect(invalidFromReparse).not.toBe(validSig);

    const mapped = mapRazorpayWebhook(JSON.parse(rawBody));
    expect(mapped.intentId).toBe('order_1');
    expect(mapped.status).toBe('confirmed');
  });

  it('accepts signature computed on untouched raw body', () => {
    const config = {
      get: (key: string) => {
        if (key === 'PAYMENT_MODE') return 'live';
        if (key === 'RAZORPAY_WEBHOOK_SECRET') return 'whsec_test';
        return '';
      },
    } as never;
    const service = new PaymentWebhookService({} as never, config);
    const rawBody = '{"event":"payment.captured","id":"evt_1"}';
    const sig = createHmac('sha256', 'whsec_test').update(rawBody).digest('hex');
    expect(() => service.verifyRazorpaySignature(rawBody, sig)).not.toThrow();
    expect(() => service.verifyRazorpaySignature(rawBody, 'bad')).toThrow(
      BadRequestException,
    );
  });
});
