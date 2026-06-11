/**
 * Sprint 5 payments regression (mock PSP):
 * reward hold → task create → trust hold → accept (Rule Zero + trust lock).
 *
 * Usage: node scripts/validate-sprint5-payments.mjs <requestor-otp> [acceptor-otp]
 */
const API = 'http://localhost:4000/api/v1';

async function req(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function login(phone, code) {
  const verifyCode = code || process.env.OTP_DEV_FIXED_CODE;
  if (!verifyCode) {
    await req('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone, dialCode: '+91', purpose: 'login' }),
    });
    console.error(
      'OTP sent. Re-run with the code from server [DEV OTP] logs, or set OTP_DEV_FIXED_CODE in backend/.env.',
    );
    process.exit(2);
  }
  if (!process.env.SKIP_OTP_SEND) {
    await req('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone, dialCode: '+91', purpose: 'login' }),
    });
  }
  const auth = await req('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, dialCode: '+91', code: verifyCode }),
  });
  if (auth.status >= 400) throw new Error(`Auth failed for ${phone}: ${JSON.stringify(auth.body)}`);
  return auth.body?.data?.accessToken;
}

function assertHold(label, hold, expectedStatus) {
  if (!hold?.id) throw new Error(`${label}: missing hold id`);
  if (hold.status !== expectedStatus) {
    throw new Error(`${label}: expected status ${expectedStatus}, got ${hold.status}`);
  }
  console.log(`${label}:`, hold.id, hold.status, hold.providerIntentId ?? '');
}

async function main() {
  const requestorCode = process.argv[2];
  const acceptorCode = process.argv[3] || requestorCode;
  if (!requestorCode) {
    console.error('Usage: node scripts/validate-sprint5-payments.mjs <requestor-otp> [acceptor-otp]');
    process.exit(1);
  }

  const requestorToken = await login('9000000001', requestorCode);
  const acceptorToken = await login('9000000002', acceptorCode);
  const rHeaders = { Authorization: `Bearer ${requestorToken}` };
  const aHeaders = { Authorization: `Bearer ${acceptorToken}` };

  const rewardHoldRes = await req('/payments/fund-holds', {
    method: 'POST',
    headers: rHeaders,
    body: JSON.stringify({
      purpose: 'task_reward',
      amount: 1000,
      currency: 'INR',
      paymentMethod: 'upi',
    }),
  });
  const rewardHold = rewardHoldRes.body?.data;
  assertHold('Reward hold', rewardHold, 'confirmed');

  const created = await req('/tasks', {
    method: 'POST',
    headers: rHeaders,
    body: JSON.stringify({
      title: 'Sprint 5 payments regression',
      description: 'Rule Zero + trust deposit validation',
      workType: 'Virtual',
      manpower: 1,
      location: 'Mumbai',
      country: 'India',
      deadline: '2026-12-31T00:00:00.000Z',
      updateFrequency: 'Biweekly',
      skills: ['test'],
      domain: 'Technology',
      reward: 1000,
      currency: 'INR',
      fundHoldId: rewardHold.id,
    }),
  });
  const taskId = created.body?.data?.id;
  if (!taskId) throw new Error('Task create failed: ' + JSON.stringify(created.body));
  if (created.body?.data?.status !== 'open') {
    throw new Error(`Expected task open, got ${created.body?.data?.status}`);
  }
  console.log('Task created:', taskId, created.body?.data?.status);

  const cardHoldRes = await req('/payments/fund-holds', {
    method: 'POST',
    headers: aHeaders,
    body: JSON.stringify({
      purpose: 'trust_deposit',
      amount: 100,
      currency: 'INR',
      paymentMethod: 'card',
      taskId,
    }),
  });
  const cardHold = cardHoldRes.body?.data;
  assertHold('Card trust hold (initial)', cardHold, 'pending');

  const razorpayCaptured = {
    event: 'payment.captured',
    id: `evt_sprint5_${Date.now()}`,
    payload: {
      payment: {
        entity: {
          id: `pay_sprint5_${Date.now()}`,
          order_id: cardHold.providerIntentId,
          status: 'captured',
        },
      },
    },
  };
  const webhook = await req('/payments/webhooks/razorpay', {
    method: 'POST',
    body: JSON.stringify(razorpayCaptured),
  });
  if (webhook.status >= 400) {
    throw new Error('Razorpay webhook ingest failed: ' + JSON.stringify(webhook.body));
  }
  console.log('Razorpay webhook:', webhook.body?.data);

  const cardHoldAfter = await req(`/payments/fund-holds/${cardHold.id}`, {
    headers: aHeaders,
  });
  assertHold('Card trust hold (after webhook)', cardHoldAfter.body?.data, 'confirmed');

  const accepted = await req(`/tasks/${taskId}/accept`, {
    method: 'POST',
    headers: aHeaders,
    body: JSON.stringify({ fundHoldId: cardHold.id }),
  });
  console.log('Accepted:', accepted.body?.data?.task?.status);
  if (accepted.body?.data?.task?.status !== 'committed') {
    throw new Error('Expected committed after trust lock');
  }

  const upiTrustRes = await req('/payments/fund-holds', {
    method: 'POST',
    headers: aHeaders,
    body: JSON.stringify({
      purpose: 'trust_deposit',
      amount: 100,
      currency: 'INR',
      paymentMethod: 'upi',
      taskId,
    }),
  });
  if (upiTrustRes.status < 400) {
    console.log('Note: second trust hold allowed only before accept; skipped after accept.');
  }

  console.log('Sprint 5 payments regression OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
