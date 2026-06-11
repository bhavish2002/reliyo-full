/**
 * Sends a signed Razorpay webhook using raw body bytes (production path).
 * Usage: node scripts/validate-staging-webhook.mjs <order_id> [event_id]
 *
 * Requires API running with PAYMENT_MODE=mock (signature skipped) or live with matching secret.
 */
import { createHmac } from 'node:crypto';

const API = process.env.API_BASE ?? 'http://localhost:4000/api/v1';
const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? 'mock-webhook-secret';
const MODE = process.env.PAYMENT_MODE ?? 'mock';

async function postWebhook(rawBody) {
  const headers = { 'Content-Type': 'application/json' };
  if (MODE === 'live') {
    headers['X-Razorpay-Signature'] = createHmac('sha256', SECRET)
      .update(rawBody)
      .digest('hex');
  }
  const res = await fetch(`${API}/payments/webhooks/razorpay`, {
    method: 'POST',
    headers,
    body: rawBody,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const orderId = process.argv[2];
  const eventId = process.argv[3] ?? `evt_validate_${Date.now()}`;
  if (!orderId) {
    console.error('Usage: node scripts/validate-staging-webhook.mjs <order_id> [event_id]');
    process.exit(1);
  }

  const payload = {
    event: 'payment.captured',
    id: eventId,
    payload: {
      payment: {
        entity: {
          id: `pay_${Date.now()}`,
          order_id: orderId,
          status: 'captured',
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const result = await postWebhook(rawBody);
  if (result.status >= 400) {
    console.error('Webhook failed:', JSON.stringify(result.body));
    process.exit(1);
  }
  console.log('Signed webhook OK:', result.body?.data ?? result.body);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
