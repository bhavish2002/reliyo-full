import { createHmac } from 'node:crypto';
import { loadEnvFiles } from './load-env-files.mjs';

loadEnvFiles();

export const API = process.env.API_BASE ?? 'http://localhost:4000/api/v1';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';

export async function req(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function getPaymentConfig() {
  const res = await req('/payments/config');
  return res.body?.data;
}

async function postRazorpayWebhook(orderId, eventId) {
  const payload = {
    event: 'payment.captured',
    id: eventId,
    payload: {
      payment: {
        entity: {
          id: `pay_ok_${Date.now()}`,
          order_id: orderId,
          status: 'captured',
        },
      },
    },
  };
  const rawBody = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    'X-Razorpay-Signature': createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex'),
  };
  return req('/payments/webhooks/razorpay', {
    method: 'POST',
    headers,
    body: rawBody,
  });
}

export async function ensureHoldConfirmed(hold, headers = {}) {
  if (hold.status === 'confirmed') return hold;

  const cfg = await getPaymentConfig();
  if (cfg?.mode === 'mock') {
    throw new Error(`Hold ${hold.id} not confirmed in mock mode (status=${hold.status})`);
  }

  const orderId = hold.providerIntentId;
  if (!orderId) {
    throw new Error(`Hold ${hold.id} missing providerIntentId for live confirmation`);
  }
  if (!WEBHOOK_SECRET) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET required for live-mode validation');
  }

  const wh = await postRazorpayWebhook(orderId, `evt_${hold.id}_${Date.now()}`);
  if (wh.status >= 400) {
    throw new Error(`Webhook confirm failed for ${hold.id}: ${JSON.stringify(wh.body)}`);
  }

  const refreshed = await req(`/payments/fund-holds/${hold.id}`, { headers });
  const confirmed = refreshed.body?.data;
  if (confirmed?.status !== 'confirmed') {
    throw new Error(`Hold ${hold.id} still not confirmed after webhook`);
  }
  return confirmed;
}

export async function createRewardHold(headers, amount) {
  const res = await req('/payments/fund-holds', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      purpose: 'task_reward',
      amount,
      currency: 'INR',
      paymentMethod: 'upi',
    }),
  });
  if (res.status >= 400) throw new Error(`Reward hold failed: ${JSON.stringify(res.body)}`);
  return ensureHoldConfirmed(res.body.data, headers);
}

export async function createTrustHold(headers, taskId, amount) {
  const res = await req('/payments/fund-holds', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      purpose: 'trust_deposit',
      amount,
      currency: 'INR',
      paymentMethod: 'upi',
      taskId,
    }),
  });
  if (res.status >= 400) throw new Error(`Trust hold failed: ${JSON.stringify(res.body)}`);
  return ensureHoldConfirmed(res.body.data, headers);
}
