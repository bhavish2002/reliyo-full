/**
 * Sprint 4 lifecycle regression: create → accept → comment → mark done → accept work.
 * Usage: node scripts/validate-lifecycle.mjs <requestor-otp> [acceptor-otp]
 * If acceptor OTP omitted, uses same code (run after clear-otp or separate verify).
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
  await req('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone, dialCode: '+91', purpose: 'login' }),
  });
  const auth = await req('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, dialCode: '+91', code }),
  });
  if (auth.status >= 400) throw new Error(`Auth failed for ${phone}: ${JSON.stringify(auth.body)}`);
  return auth.body?.data?.accessToken;
}

async function main() {
  const requestorCode = process.argv[2];
  const acceptorCode = process.argv[3] || requestorCode;
  if (!requestorCode) {
    console.error('Usage: node scripts/validate-lifecycle.mjs <requestor-otp> [acceptor-otp]');
    process.exit(1);
  }

  const requestorToken = await login('9000000001', requestorCode);
  const acceptorToken = await login('9000000002', acceptorCode);
  const rHeaders = { Authorization: `Bearer ${requestorToken}` };
  const aHeaders = { Authorization: `Bearer ${acceptorToken}` };

  const rewardHold = await req('/payments/fund-holds', {
    method: 'POST',
    headers: rHeaders,
    body: JSON.stringify({
      purpose: 'task_reward',
      amount: 1000,
      currency: 'INR',
      paymentMethod: 'upi',
    }),
  });
  const fundHoldId = rewardHold.body?.data?.id;
  if (!fundHoldId) throw new Error('Reward fund hold failed');

  const created = await req('/tasks', {
    method: 'POST',
    headers: rHeaders,
    body: JSON.stringify({
      title: 'Lifecycle regression task',
      description: 'Automated lifecycle validation',
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
      fundHoldId,
    }),
  });
  const taskId = created.body?.data?.id;
  if (!taskId) throw new Error('Task create failed: ' + JSON.stringify(created.body));
  console.log('Created task:', taskId, created.body?.data?.status);

  const trustHold = await req('/payments/fund-holds', {
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
  const trustFundHoldId = trustHold.body?.data?.id;
  if (!trustFundHoldId) throw new Error('Trust hold failed');

  const accepted = await req(`/tasks/${taskId}/accept`, {
    method: 'POST',
    headers: aHeaders,
    body: JSON.stringify({ fundHoldId: trustFundHoldId }),
  });
  console.log('Accepted:', accepted.body?.data?.task?.status);
  if (accepted.body?.data?.task?.status !== 'committed') throw new Error('Expected committed');

  const comment = await req(`/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: aHeaders,
    body: JSON.stringify({ message: 'Starting work now.' }),
  });
  console.log('After comment:', comment.body?.data?.task?.status);
  if (comment.body?.data?.task?.status !== 'in_progress') throw new Error('Expected in_progress');

  const done = await req(`/tasks/${taskId}/mark-done`, {
    method: 'POST',
    headers: aHeaders,
    body: JSON.stringify({}),
  });
  console.log('Mark done:', done.body?.data?.task?.status);
  if (done.body?.data?.task?.status !== 'done') throw new Error('Expected done');

  const closed = await req(`/tasks/${taskId}/accept-work`, {
    method: 'POST',
    headers: rHeaders,
    body: JSON.stringify({ rating: 5, feedback: 'Great work' }),
  });
  console.log('Accept work:', closed.body?.data?.task?.status);
  if (closed.body?.data?.task?.status !== 'closed') throw new Error('Expected closed');

  const mine = await req('/tasks?scope=mine&pageSize=100', { headers: rHeaders });
  const found = mine.body?.data?.items?.some((t) => t.id === taskId && t.status === 'closed');
  console.log('In requestor mine list:', found);
  if (!found) throw new Error('Task not in mine list as closed');

  console.log('Lifecycle regression OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
