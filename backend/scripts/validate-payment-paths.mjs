/**
 * Payment path regression — mock + live (webhook-simulated) fund holds and Rule Zero tasks.
 *
 * Mock (start:dev): UPI/card/netbanking outcomes via paymentMethod field.
 * Live (start:dev:staging): creates real Razorpay orders; simulates webhooks (same as Razorpay dashboard).
 *
 * Usage:
 *   npm run validate:payment-paths -- 111111
 */
import { createHmac } from 'node:crypto';
import { loadEnvFiles } from './load-env-files.mjs';

const API = process.env.API_BASE ?? 'http://localhost:4000/api/v1';
loadEnvFiles();

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
const METHODS = ['upi', 'card', 'netbanking'];

async function req(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function login(phone, code) {
  await req('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone, dialCode: '+91', purpose: 'login' }),
  });
  const auth = await req('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, dialCode: '+91', code }),
  });
  if (auth.status >= 400) throw new Error(`Auth failed: ${JSON.stringify(auth.body)}`);
  return auth.body?.data?.accessToken;
}

async function postRazorpayWebhook(orderId, eventType, eventId) {
  const isFailed = eventType === 'payment.failed';
  const payload = isFailed
    ? {
        event: 'payment.failed',
        id: eventId,
        payload: {
          payment: {
            entity: {
              id: `pay_fail_${Date.now()}`,
              order_id: orderId,
              status: 'failed',
            },
          },
        },
      }
    : {
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

async function createHold(headers, paymentMethod, amount = 100) {
  const res = await req('/payments/fund-holds', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      purpose: 'task_reward',
      amount,
      currency: 'INR',
      paymentMethod,
    }),
  });
  if (res.status >= 400) {
    throw new Error(`Fund hold failed (${paymentMethod}): ${JSON.stringify(res.body)}`);
  }
  return res.body?.data;
}

async function createTask(headers, fundHoldId, title, reward = 100) {
  const res = await req('/tasks', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title,
      description: 'Payment path automation',
      workType: 'Virtual',
      manpower: 1,
      location: 'Mumbai',
      country: 'India',
      deadline: '2026-12-31T00:00:00.000Z',
      updateFrequency: 'Biweekly',
      skills: ['test'],
      domain: 'Technology',
      reward,
      currency: 'INR',
      fundHoldId,
    }),
  });
  if (res.status >= 400 || res.body?.data?.status !== 'open') {
    throw new Error(`Task create failed: ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
}

function ok(id, msg) {
  console.log(`  OK ${id}: ${msg}`);
}

function skip(id, msg) {
  console.log(`  SKIP ${id}: ${msg}`);
}

async function runMockPaths(headers) {
  console.log('\n--- Mock mode paths ---');
  const cfg = (await req('/payments/config')).body?.data;
  if (cfg?.mode !== 'mock') {
    skip('M-ALL', 'API not in mock mode (use npm run start:dev)');
    return;
  }

  const upi = await createHold(headers, 'upi');
  if (upi.status !== 'confirmed') throw new Error('Mock UPI should auto-confirm');
  await createTask(headers, upi.id, 'Mock UPI task');
  ok('M-UPI', 'confirmed → task published');

  const card = await createHold(headers, 'card');
  if (card.status !== 'pending') throw new Error('Mock card should stay pending');
  ok('M-CARD', 'pending without webhook (Razorpay handles real card in live mode)');

  const nb = await createHold(headers, 'netbanking');
  if (nb.status !== 'failed') throw new Error('Mock netbanking should fail');
  ok('M-NB', 'failed as designed in mock dev');
}

async function runLivePaths(headers) {
  console.log('\n--- Live mode paths (Razorpay order + signed webhook) ---');
  const cfg = (await req('/payments/config')).body?.data;
  if (cfg?.mode !== 'live') {
    skip('L-ALL', 'API not in live mode (use npm run start:dev:staging)');
    return;
  }
  if (!WEBHOOK_SECRET) {
    skip('L-ALL', 'RAZORPAY_WEBHOOK_SECRET missing');
    return;
  }

  for (const method of METHODS) {
    const hold = await createHold(headers, method);
    if (!hold.checkout?.orderId) {
      throw new Error(`Live ${method}: missing checkout on hold`);
    }
    const wh = await postRazorpayWebhook(
      hold.providerIntentId,
      'payment.captured',
      `evt_path_${method}_${Date.now()}`,
    );
    if (wh.status >= 400) throw new Error(`Webhook failed for ${method}: ${JSON.stringify(wh.body)}`);

    const after = await req(`/payments/fund-holds/${hold.id}`, { headers });
    if (after.body?.data?.status !== 'confirmed') {
      throw new Error(`Hold not confirmed for ${method}`);
    }
    await createTask(headers, hold.id, `Live ${method} task`);
    ok(`L-${method.toUpperCase()}`, `order ${hold.providerIntentId} → webhook → task`);
  }

  // Multi-attempt: failed webhook then success on same order (user retried in Razorpay modal)
  const retryHold = await createHold(headers, 'card', 150);
  await postRazorpayWebhook(
    retryHold.providerIntentId,
    'payment.failed',
    `evt_retry_fail_${Date.now()}`,
  );
  let mid = await req(`/payments/fund-holds/${retryHold.id}`, { headers });
  if (mid.body?.data?.status !== 'failed') {
    throw new Error('Expected failed after payment.failed webhook');
  }
  await postRazorpayWebhook(
    retryHold.providerIntentId,
    'payment.captured',
    `evt_retry_ok_${Date.now()}`,
  );
  mid = await req(`/payments/fund-holds/${retryHold.id}`, { headers });
  if (mid.body?.data?.status !== 'confirmed') {
    throw new Error('Expected confirmed after retry success webhook');
  }
  await createTask(headers, retryHold.id, 'Live retry-after-fail task', 150);
  ok('L-RETRY', 'failed webhook then captured → task published');

  // Two holds (user clicked Retry Payment): only the paid order should publish
  const abandoned = await createHold(headers, 'upi', 200);
  const paid = await createHold(headers, 'upi', 200);
  await postRazorpayWebhook(
    paid.providerIntentId,
    'payment.captured',
    `evt_paid_${Date.now()}`,
  );
  await createTask(headers, paid.id, 'Live second-attempt task', 200);
  ok('L-MULTI-HOLD', 'second hold paid after first abandoned');
}

async function main() {
  const otp = process.argv[2] || process.env.OTP_DEV_FIXED_CODE;
  if (!otp) {
    console.error('Usage: npm run validate:payment-paths -- <otp>');
    process.exit(1);
  }

  console.log('Payment path regression');
  console.log('API:', API);

  const health = await req('/health');
  if (health.status !== 200) throw new Error('API not reachable');

  const token = await login('9000000001', otp);
  const headers = { Authorization: `Bearer ${token}` };

  await runMockPaths(headers);
  await runLivePaths(headers);

  console.log('\nPayment path regression OK');
  console.log('Webhooks: Razorpay → POST /api/v1/payments/webhooks/razorpay (see npm run payments:webhook-log)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
