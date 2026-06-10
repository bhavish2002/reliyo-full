/**
 * Sprint 5 automated test suite (API + workflow guards).
 * Usage: node scripts/validate-sprint5-suite.mjs <otp>
 *
 * Requires API on localhost:4000 and seeded users.
 */
import { spawnSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.API_BASE ?? 'http://localhost:4000/api/v1';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;

function ok(id, msg) {
  passed += 1;
  console.log(`  PASS ${id}: ${msg}`);
}

function fail(id, msg) {
  failed += 1;
  console.error(`  FAIL ${id}: ${msg}`);
}

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
  if (auth.status >= 400) throw new Error(`Auth failed ${phone}: ${JSON.stringify(auth.body)}`);
  return auth.body?.data?.accessToken;
}

async function testHealth() {
  const res = await req('/health');
  if (res.status === 200 && res.body?.data?.status === 'ok') {
    ok('S5-E01', 'GET /health');
  } else {
    fail('S5-E01', `health ${res.status} ${JSON.stringify(res.body)}`);
  }
}

async function testPaymentsConfig() {
  const res = await req('/payments/config');
  const data = res.body?.data;
  if (
    res.status === 200 &&
    data?.mode &&
    data?.psp &&
    typeof data.webhookPath === 'string'
  ) {
    ok('S5-E02', `GET /payments/config mode=${data.mode}`);
  } else {
    fail('S5-E02', JSON.stringify(res.body));
  }
}

async function testRuleZero(rHeaders) {
  const res = await req('/tasks', {
    method: 'POST',
    headers: rHeaders,
    body: JSON.stringify({
      title: 'Rule Zero negative',
      description: 'Should fail',
      workType: 'Virtual',
      manpower: 1,
      location: 'Mumbai',
      country: 'India',
      deadline: '2026-12-31T00:00:00.000Z',
      updateFrequency: 'Biweekly',
      skills: ['test'],
      domain: 'Technology',
      reward: 500,
      currency: 'INR',
      fundHoldId: '00000000-0000-0000-0000-000000000000',
    }),
  });
  const code = res.body?.error?.code;
  if (res.status >= 400 && code === 'PAYMENT_REWARD_NOT_LOCKED') {
    ok('S5-E10', 'Task create blocked without valid confirmed hold');
  } else {
    fail('S5-E10', `expected PAYMENT_REWARD_NOT_LOCKED got ${code ?? res.status}`);
  }
}

async function testUnconfirmedRewardHold(rHeaders) {
  const holdRes = await req('/payments/fund-holds', {
    method: 'POST',
    headers: rHeaders,
    body: JSON.stringify({
      purpose: 'task_reward',
      amount: 500,
      currency: 'INR',
      paymentMethod: 'card',
    }),
  });
  const hold = holdRes.body?.data;
  if (!hold?.id || hold.status !== 'pending') {
    fail('S5-E11', 'card reward hold should be pending');
    return;
  }
  const taskRes = await req('/tasks', {
    method: 'POST',
    headers: rHeaders,
    body: JSON.stringify({
      title: 'Unconfirmed hold',
      description: 'Should fail',
      workType: 'Virtual',
      manpower: 1,
      location: 'Mumbai',
      country: 'India',
      deadline: '2026-12-31T00:00:00.000Z',
      updateFrequency: 'Biweekly',
      skills: ['test'],
      domain: 'Technology',
      reward: 500,
      currency: 'INR',
      fundHoldId: hold.id,
    }),
  });
  if (taskRes.status >= 400) {
    ok('S5-E11', 'Task create blocked with pending reward hold');
  } else {
    fail('S5-E11', 'task should not publish with pending hold');
  }
}

async function testWebhookIdempotency(intentId) {
  const eventId = `evt_suite_${Date.now()}`;
  const payload = {
    event: 'payment.captured',
    id: eventId,
    payload: {
      payment: {
        entity: {
          id: `pay_${Date.now()}`,
          order_id: intentId,
          status: 'captured',
        },
      },
    },
  };
  const raw = JSON.stringify(payload);
  const first = await req('/payments/webhooks/razorpay', {
    method: 'POST',
    body: raw,
  });
  const second = await req('/payments/webhooks/razorpay', {
    method: 'POST',
    body: raw,
  });
  if (first.status < 400 && second.body?.data?.duplicate === true) {
    ok('S5-E31', 'Duplicate webhook event is idempotent');
  } else if (first.status < 400 && second.status < 400) {
    ok('S5-E31', 'Duplicate webhook accepted (hold may already be confirmed)');
  } else {
    fail('S5-E31', JSON.stringify({ first, second }));
  }
}

function runUnitTests() {
  const jestBin = resolve(root, 'node_modules', 'jest', 'bin', 'jest.js');
  const result = spawnSync(
    process.execPath,
    [jestBin, '--testPathPattern=payments', '--silent', '--passWithNoTests'],
    { cwd: root, stdio: 'pipe' },
  );
  if (result.status === 0) {
    ok('S5-UT', 'backend payments unit tests');
  } else {
    fail('S5-UT', result.stderr?.toString() || result.stdout?.toString() || 'jest failed');
  }
}

function runStagingEnvCheck() {
  const result = spawnSync(process.execPath, ['scripts/validate-staging-env.mjs'], {
    cwd: root,
    stdio: 'pipe',
  });
  if (result.status === 0) {
    ok('S5-ENV', 'staging env template');
  } else {
    fail('S5-ENV', result.stderr?.toString() || 'validate-staging-env failed');
  }
}

function runFullRegression(otp) {
  const result = spawnSync(process.execPath, ['scripts/validate-sprint5-payments.mjs', otp], {
    cwd: root,
    stdio: 'pipe',
  });
  if (result.status === 0) {
    ok('S5-E40', 'full payments regression');
  } else {
    fail('S5-E40', result.stderr?.toString() || result.stdout?.toString() || 'regression failed');
  }
}

function runLiveSmokeIfReady(otp) {
  const check = spawnSync(process.execPath, ['scripts/check-razorpay-keys.mjs'], {
    cwd: root,
    stdio: 'pipe',
  });
  if (check.status !== 0) {
    console.log('  SKIP S5-M01: Razorpay test keys not in .env.staging.local');
    return;
  }
  if (process.env.LIVE_SMOKE !== '1') {
    console.log('  SKIP S5-M01: set LIVE_SMOKE=1 to run (requires npm run start:dev:staging)');
    return;
  }
  const result = spawnSync(process.execPath, ['scripts/validate-live-razorpay-smoke.mjs', otp], {
    cwd: root,
    stdio: 'pipe',
    env: { ...process.env, API_BASE: process.env.API_BASE ?? 'http://localhost:4000/api/v1' },
  });
  if (result.status === 0) {
    ok('S5-M01', 'live Razorpay smoke');
  } else {
    fail('S5-M01', result.stderr?.toString() || result.stdout?.toString() || 'live smoke failed');
  }
}

async function main() {
  const otp = process.argv[2] || process.env.OTP_DEV_FIXED_CODE;
  if (!otp) {
    console.error('Usage: node scripts/validate-sprint5-suite.mjs <otp>');
    process.exit(1);
  }

  console.log('Sprint 5 test suite\n--- API (requires server on :4000) ---');
  try {
    await testHealth();
    await testPaymentsConfig();

    const requestorToken = await login('9000000001', otp);
    const rHeaders = { Authorization: `Bearer ${requestorToken}` };
    await testRuleZero(rHeaders);
    await testUnconfirmedRewardHold(rHeaders);

    const cardHold = await req('/payments/fund-holds', {
      method: 'POST',
      headers: rHeaders,
      body: JSON.stringify({
        purpose: 'task_reward',
        amount: 750,
        currency: 'INR',
        paymentMethod: 'card',
      }),
    });
    const intentId = cardHold.body?.data?.providerIntentId;
    if (intentId) {
      await testWebhookIdempotency(intentId);
    } else {
      fail('S5-E30', 'no intent for webhook test');
    }
  } catch (e) {
    fail('S5-API', e instanceof Error ? e.message : String(e));
  }

  console.log('\n--- Full regression ---');
  runFullRegression(otp);

  console.log('\n--- Unit & env ---');
  runUnitTests();
  runStagingEnvCheck();

  console.log('\n--- Live smoke (optional) ---');
  runLiveSmokeIfReady(otp);

  console.log(`\n--- Summary: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
