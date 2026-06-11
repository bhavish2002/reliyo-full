/**
 * S5-M01 — Live Razorpay smoke (real Orders API + signed webhook in PAYMENT_MODE=live).
 *
 * Prerequisites:
 *   - API running with PAYMENT_MODE=live and Razorpay TEST keys
 *   - Postgres + seed users
 *   - OTP_DEV_FIXED_CODE or pass OTP as argv
 *
 * Usage:
 *   npm run start:dev:staging          # terminal 1
 *   npm run validate:live-razorpay-smoke -- 111111
 *
 * Remote staging:
 *   API_BASE=https://reliyo-api-staging.onrender.com/api/v1 npm run validate:live-razorpay-smoke -- 111111
 */
import { createHmac } from 'node:crypto';
import { loadEnvFiles } from './load-env-files.mjs';

const API = process.env.API_BASE ?? 'http://localhost:4000/api/v1';

loadEnvFiles();

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
const KEY_ID = process.env.RAZORPAY_KEY_ID ?? '';

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

function assertKeys() {
  const missing = [];
  if (!KEY_ID || KEY_ID.includes('REPLACE') || KEY_ID.endsWith('_XXXX')) {
    missing.push('RAZORPAY_KEY_ID');
  }
  if (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET.includes('REPLACE')) {
    missing.push('RAZORPAY_KEY_SECRET');
  }
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET.includes('REPLACE')) {
    missing.push('RAZORPAY_WEBHOOK_SECRET');
  }
  if (missing.length) {
    console.error('Missing Razorpay TEST credentials:', missing.join(', '));
    console.error('Copy backend/.env.staging.local.example → .env.staging.local and add test keys.');
    process.exit(2);
  }
}

async function postSignedWebhook(orderId, eventId) {
  const payload = {
    event: 'payment.captured',
    id: eventId,
    payload: {
      payment: {
        entity: {
          id: `pay_smoke_${Date.now()}`,
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
  const res = await fetch(`${API}/payments/webhooks/razorpay`, {
    method: 'POST',
    headers,
    body: rawBody,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const otp = process.argv[2] || process.env.OTP_DEV_FIXED_CODE;
  if (!otp) {
    console.error('Usage: npm run validate:live-razorpay-smoke -- <otp>');
    process.exit(1);
  }

  assertKeys();

  console.log('S5-M01 Live Razorpay smoke');
  console.log('API:', API);

  const health = await req('/health');
  if (health.status !== 200) {
    throw new Error(`API not reachable at ${API} (is start:dev:staging running?)`);
  }
  console.log('Health OK');

  const config = await req('/payments/config');
  const cfg = config.body?.data;
  if (cfg?.mode !== 'live' || !cfg?.checkoutEnabled) {
    throw new Error(
      `Expected PAYMENT_MODE=live with checkout enabled; got ${JSON.stringify(cfg)}. Use npm run start:dev:staging`,
    );
  }
  console.log('Payments config OK:', cfg.mode, cfg.razorpayKeyId?.slice(0, 12) + '...');

  const token = await login('9000000001', otp);
  const headers = { Authorization: `Bearer ${token}` };

  const holdRes = await req('/payments/fund-holds', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      purpose: 'task_reward',
      amount: 100,
      currency: 'INR',
      paymentMethod: 'card',
    }),
  });

  if (holdRes.status >= 400) {
    throw new Error(`Fund hold failed: ${JSON.stringify(holdRes.body)}`);
  }

  const hold = holdRes.body?.data;
  if (!hold?.id || hold.status !== 'pending') {
    throw new Error(`Expected pending hold, got ${JSON.stringify(hold)}`);
  }
  if (!hold.providerIntentId?.startsWith('order_')) {
    throw new Error(`Expected Razorpay order id, got ${hold.providerIntentId}`);
  }
  if (!hold.checkout?.orderId) {
    throw new Error('Missing checkout config on fund hold');
  }
  console.log('Razorpay order created:', hold.providerIntentId);

  const eventId = `evt_live_smoke_${Date.now()}`;
  const webhook = await postSignedWebhook(hold.providerIntentId, eventId);
  if (webhook.status >= 400) {
    throw new Error(`Signed webhook rejected: ${JSON.stringify(webhook.body)}`);
  }
  console.log('Signed webhook ingested:', webhook.body?.data);

  const after = await req(`/payments/fund-holds/${hold.id}`, { headers });
  if (after.body?.data?.status !== 'confirmed') {
    throw new Error(`Hold not confirmed after webhook: ${JSON.stringify(after.body)}`);
  }
  console.log('Fund hold confirmed:', hold.id);

  const taskRes = await req('/tasks', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Live Razorpay smoke task',
      description: 'S5-M01 validation',
      workType: 'Virtual',
      manpower: 1,
      location: 'Mumbai',
      country: 'India',
      deadline: '2026-12-31T00:00:00.000Z',
      updateFrequency: 'Biweekly',
      skills: ['test'],
      domain: 'Technology',
      reward: 100,
      currency: 'INR',
      fundHoldId: hold.id,
    }),
  });
  if (taskRes.status >= 400 || taskRes.body?.data?.status !== 'open') {
    throw new Error(`Rule Zero task create failed: ${JSON.stringify(taskRes.body)}`);
  }
  console.log('Rule Zero task published:', taskRes.body?.data?.id);

  console.log('\nS5-M01 Live Razorpay smoke OK');
  console.log('Next: register PUBLIC_API_URL in Razorpay dashboard for real checkout callbacks.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
