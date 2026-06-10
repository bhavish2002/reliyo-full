import { mapRazorpayWebhook } from './razorpay-webhook.mapper';

describe('mapRazorpayWebhook', () => {
  it('maps payment.captured to confirmed', () => {
    const mapped = mapRazorpayWebhook({
      id: 'evt_abc',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_123',
            order_id: 'order_456',
            status: 'captured',
          },
        },
      },
    });
    expect(mapped).toEqual({
      eventId: 'evt_abc',
      intentId: 'order_456',
      paymentId: 'pay_123',
      status: 'confirmed',
      metadata: {
        razorpayEvent: 'payment.captured',
        razorpayPaymentStatus: 'captured',
      },
    });
  });

  it('maps payment.failed to failed', () => {
    const mapped = mapRazorpayWebhook({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_fail',
            order_id: 'order_fail',
            status: 'failed',
          },
        },
      },
    });
    expect(mapped.status).toBe('failed');
    expect(mapped.intentId).toBe('order_fail');
  });

  it('passes through normalized internal payloads', () => {
    const mapped = mapRazorpayWebhook({
      eventId: 'evt_internal',
      intentId: 'mock_pi_1',
      paymentId: 'mock_pay_1',
      status: 'confirmed',
    });
    expect(mapped).toEqual({
      eventId: 'evt_internal',
      intentId: 'mock_pi_1',
      paymentId: 'mock_pay_1',
      status: 'confirmed',
    });
  });

  it('throws when order reference is missing', () => {
    expect(() =>
      mapRazorpayWebhook({ event: 'payment.captured', payload: {} }),
    ).toThrow('Razorpay webhook missing order_id');
  });
});
