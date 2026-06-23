/**
 * Sprint 7C — quit re-accept limit regression.
 *
 * Usage: npm run validate:quit-reaccept -- 111111
 */
import { API, createRewardHold, createTrustHold, req } from './validation-holds.mjs';

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

async function main() {
  const otp = process.argv[2] || process.env.OTP_DEV_FIXED_CODE;
  if (!otp) {
    console.error('Usage: npm run validate:quit-reaccept -- <otp>');
    process.exit(1);
  }

  console.log('Sprint 7C quit re-accept regression');
  const rToken = await login('9000000001', otp);
  const aToken = await login('9000000002', otp);
  const rH = { Authorization: `Bearer ${rToken}` };
  const aH = { Authorization: `Bearer ${aToken}` };

  const hold = await createRewardHold(rH, 400);
  const created = await req('/tasks', {
    method: 'POST',
    headers: rH,
    body: JSON.stringify({
      title: 'Quit re-accept test',
      description: 'Sprint 7C validation task for quit policy',
      workType: 'Virtual',
      manpower: 1,
      location: 'Mumbai',
      country: 'India',
      deadline: '2026-12-31T00:00:00.000Z',
      updateFrequency: 'Biweekly',
      skills: ['test'],
      domain: 'Technology',
      reward: 400,
      currency: 'INR',
      fundHoldId: hold.id,
    }),
  });
  const taskId = created.body?.data?.id;
  if (!taskId) throw new Error(`Create failed: ${JSON.stringify(created.body)}`);

  const th = await createTrustHold(aH, taskId, 40);
  const acc = await req(`/tasks/${taskId}/accept`, {
    method: 'POST',
    headers: aH,
    body: JSON.stringify({ fundHoldId: th.id }),
  });
  if (acc.status >= 400) throw new Error(`Accept failed: ${JSON.stringify(acc.body)}`);

  const quit = await req(`/tasks/${taskId}/quit`, { method: 'POST', headers: aH });
  if (quit.status >= 400) throw new Error(`Quit failed: ${JSON.stringify(quit.body)}`);
  console.log('  OK acceptor quit within grace');

  const th2 = await createTrustHold(aH, taskId, 40);
  const reacc = await req(`/tasks/${taskId}/accept`, {
    method: 'POST',
    headers: aH,
    body: JSON.stringify({ fundHoldId: th2.id }),
  });
  if (reacc.status < 400) {
    throw new Error('Re-accept should be forbidden after quit');
  }
  const code = reacc.body?.error?.code ?? reacc.body?.code;
  if (code !== 'TASK_ACCEPT_FORBIDDEN') {
    throw new Error(`Expected TASK_ACCEPT_FORBIDDEN, got ${JSON.stringify(reacc.body)}`);
  }
  console.log('  OK re-accept blocked for same acceptor');

  const detail = await req(`/tasks/${taskId}`, { headers: aH });
  if (detail.body?.data?.availableActions?.canAccept) {
    throw new Error('canAccept should be false after prior quit');
  }
  console.log('  OK canAccept false in task detail');

  console.log('\nSprint 7C quit re-accept regression OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
