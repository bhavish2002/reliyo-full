/**
 * Validates Rule Zero: POST /tasks without confirmed fund hold must fail.
 * Usage: node scripts/validate-rule-zero.mjs <otp-code>
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

async function main() {
  const code = process.argv[2];
  if (!code) {
    console.error('Usage: node scripts/validate-rule-zero.mjs <otp-code>');
    process.exit(1);
  }

  if (!process.argv.includes('--skip-send')) {
    await req('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone: '9000000001', dialCode: '+91', purpose: 'login' }),
    });
  }

  const auth = await req('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone: '9000000001', dialCode: '+91', code }),
  });
  if (auth.status >= 400) {
    console.error('Auth failed', auth.body);
    process.exit(1);
  }
  const token = auth.body?.data?.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  const taskPayload = {
    title: 'Rule Zero validation task',
    description: 'Testing that tasks cannot be created without a confirmed reward fund hold.',
    workType: 'Virtual',
    manpower: 1,
    location: 'Mumbai',
    country: 'India',
    deadline: '2026-12-31T00:00:00.000Z',
    updateFrequency: 'Daily',
    skills: ['test'],
    domain: 'Technology',
    reward: 500,
    currency: 'INR',
    fundHoldId: 'invalid-hold-id',
  };

  const blocked = await req('/tasks', {
    method: 'POST',
    headers,
    body: JSON.stringify(taskPayload),
  });
  console.log('Create without valid hold:', blocked.status, blocked.body?.error?.code);
  if (blocked.status !== 400) {
    console.error('Expected 400 PAYMENT_REWARD_NOT_LOCKED');
    process.exit(1);
  }

  const hold = await req('/payments/fund-holds', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      purpose: 'task_reward',
      amount: 500,
      currency: 'INR',
      paymentMethod: 'upi',
    }),
  });
  console.log('Fund hold (UPI):', hold.status, hold.body?.data?.status);
  if (hold.body?.data?.status !== 'confirmed') {
    console.error('Expected confirmed hold for UPI');
    process.exit(1);
  }

  const created = await req('/tasks', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...taskPayload, fundHoldId: hold.body.data.id }),
  });
  console.log('Create with confirmed hold:', created.status, created.body?.data?.id);
  if (created.status >= 400) {
    console.error(created.body);
    process.exit(1);
  }

  const failedHold = await req('/payments/fund-holds', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      purpose: 'task_reward',
      amount: 500,
      currency: 'INR',
      paymentMethod: 'netbanking',
    }),
  });
  console.log('Fund hold (netbanking):', failedHold.status, failedHold.body?.data?.status);
  if (failedHold.body?.data?.status !== 'failed') {
    console.error('Expected failed hold for netbanking');
    process.exit(1);
  }

  const blocked2 = await req('/tasks', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...taskPayload, fundHoldId: failedHold.body.data.id }),
  });
  console.log('Create with failed hold:', blocked2.status, blocked2.body?.error?.code);
  if (blocked2.status !== 400) {
    console.error('Expected 400 for failed hold');
    process.exit(1);
  }

  console.log('Rule Zero validation passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
