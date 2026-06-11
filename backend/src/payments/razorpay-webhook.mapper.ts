import type { PaymentWebhookPayload } from './payment-webhook.service';

export interface RazorpayWebhookBody {
  event?: string;
  id?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    order?: { entity?: { id?: string; status?: string } };
  };
  /** Internal normalized payload passthrough for tests/simulators. */
  eventId?: string;
  intentId?: string;
  paymentId?: string;
  status?: PaymentWebhookPayload['status'];
}

interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
  status?: string;
}

function isNormalizedPayload(body: RazorpayWebhookBody): body is PaymentWebhookPayload {
  return (
    typeof body.eventId === 'string' &&
    typeof body.intentId === 'string' &&
    (body.status === 'confirmed' ||
      body.status === 'failed' ||
      body.status === 'pending')
  );
}

function mapPaymentStatus(
  razorpayStatus?: string,
  eventType?: string,
): PaymentWebhookPayload['status'] {
  const status = (razorpayStatus ?? '').toLowerCase();
  const event = (eventType ?? '').toLowerCase();

  if (
    status === 'captured' ||
    status === 'paid' ||
    event === 'payment.captured' ||
    event === 'order.paid'
  ) {
    return 'confirmed';
  }

  if (
    status === 'failed' ||
    event === 'payment.failed' ||
    event === 'order.payment_failed'
  ) {
    return 'failed';
  }

  return 'pending';
}

/**
 * Maps Razorpay webhook payloads (or normalized internal payloads) to fund-hold updates.
 */
export function mapRazorpayWebhook(
  body: RazorpayWebhookBody,
): PaymentWebhookPayload {
  if (isNormalizedPayload(body)) {
    return {
      eventId: body.eventId!,
      intentId: body.intentId!,
      paymentId: body.paymentId,
      status: body.status!,
    };
  }

  const eventType = body.event;
  const payment = body.payload?.payment?.entity;
  const order = body.payload?.order?.entity;

  const intentId = payment?.order_id ?? order?.id;
  if (!intentId) {
    throw new Error('Razorpay webhook missing order_id / intent reference.');
  }

  const status = mapPaymentStatus(payment?.status ?? order?.status, eventType);
  const eventId =
    (typeof body.id === 'string' && body.id) ||
    `${eventType ?? 'razorpay'}_${payment?.id ?? order?.id ?? Date.now()}`;

  return {
    eventId,
    intentId,
    paymentId: payment?.id,
    status,
    metadata: {
      razorpayEvent: eventType,
      razorpayPaymentStatus: payment?.status,
    },
  };
}
