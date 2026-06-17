/**
 * Sprint 6.5B — force-close admin queue regression.
 *
 * 1) Reject: request stays out of pending after admin reject.
 * 2) Approve: task force_closed + ledger journal.
 *
 * Usage:
 *   npm run start:dev  (mock) or npm run start:dev:staging (live + webhook sim)
 *   npm run validate:force-close -- 111111
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

async function createAndAccept(rToken, aToken, reward, trust) {
  const rH = { Authorization: `Bearer ${rToken}` };
  const aH = { Authorization: `Bearer ${aToken}` };
  const hold = await createRewardHold(rH, reward);
  const created = await req('/tasks', {
    method: 'POST',
    headers: rH,
    body: JSON.stringify({
      title: `Force close test ${Date.now()}`,
      description: 'Sprint 6.5B',
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
      fundHoldId: hold.id,
    }),
  });
  const taskId = created.body?.data?.id;
  if (!taskId) throw new Error(`Create failed: ${JSON.stringify(created.body)}`);

  const th = await createTrustHold(aH, taskId, trust);
  const acc = await req(`/tasks/${taskId}/accept`, {
    method: 'POST',
    headers: aH,
    body: JSON.stringify({ fundHoldId: th.id }),
  });
  if (acc.status >= 400) throw new Error(`Accept failed: ${JSON.stringify(acc.body)}`);
  return taskId;
}

async function requestForceClose(token, taskId) {
  const res = await req(`/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      message: 'Requesting force close for testing.',
      entryType: 'alert',
      alertType: 'force_close_request',
    }),
  });
  if (res.status >= 400) throw new Error(`Force close request failed: ${JSON.stringify(res.body)}`);
}

async function listCloseRequests(adminToken) {
  const res = await req('/admin/close-requests', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (res.status >= 400) throw new Error(`List close requests failed: ${JSON.stringify(res.body)}`);
  return res.body?.data ?? res.body ?? [];
}

async function assertJournal(scenario, taskId) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { idempotencyKey: `${scenario}:${taskId}` },
    });
    if (!entry) throw new Error(`Missing journal ${scenario}:${taskId}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const otp = process.argv[2] || process.env.OTP_DEV_FIXED_CODE;
  if (!otp) {
    console.error('Usage: npm run validate:force-close -- <otp>');
    process.exit(1);
  }

  console.log('Sprint 6.5B force-close regression');
  console.log(`  API: ${API}`);

  const rToken = await login('9000000001', otp);
  const aToken = await login('9000000002', otp);
  const adminToken = await login('9000000003', otp);
  const rH = { Authorization: `Bearer ${rToken}` };
  const adminH = { Authorization: `Bearer ${adminToken}` };

  const rejectTaskId = await createAndAccept(rToken, aToken, 500, 50);
  await requestForceClose(rToken, rejectTaskId);

  let rows = await listCloseRequests(adminToken);
  let pending = rows.find((r) => r.taskId === rejectTaskId && r.status === 'pending');
  if (!pending) throw new Error('Expected pending close request after submit');
  console.log('  OK reject path: request pending');

  const rej = await req(`/admin/close-requests/${rejectTaskId}`, {
    method: 'PATCH',
    headers: adminH,
    body: JSON.stringify({ resolution: 'rejected', comment: 'Not enough evidence (test)' }),
  });
  if (rej.status >= 400) throw new Error(`Reject failed: ${JSON.stringify(rej.body)}`);

  rows = await listCloseRequests(adminToken);
  const stillPending = rows.find((r) => r.taskId === rejectTaskId && r.status === 'pending');
  if (stillPending) throw new Error('Rejected request still in pending');
  const rejected = rows.find((r) => r.taskId === rejectTaskId && r.status === 'rejected');
  if (!rejected) throw new Error('Rejected request not in resolved list');
  console.log('  OK reject path: moved to rejected');

  const approveTaskId = await createAndAccept(rToken, aToken, 800, 80);
  await requestForceClose(rToken, approveTaskId);

  const appr = await req(`/admin/close-requests/${approveTaskId}`, {
    method: 'PATCH',
    headers: adminH,
    body: JSON.stringify({ resolution: 'approved', comment: 'Approved for test' }),
  });
  if (appr.status >= 400) throw new Error(`Approve failed: ${JSON.stringify(appr.body)}`);

  const task = await req(`/tasks/${approveTaskId}`, { headers: rH });
  if (task.body?.data?.task?.status !== 'force_closed') {
    throw new Error(`Expected force_closed, got ${task.body?.data?.task?.status}`);
  }
  await assertJournal('force_closed', approveTaskId);
  console.log('  OK approve path: force_closed + ledger');

  rows = await listCloseRequests(adminToken);
  const approved = rows.find((r) => r.taskId === approveTaskId && r.status === 'approved');
  if (!approved) throw new Error('Approved request not marked approved in list');
  console.log('  OK approve path: listed as approved');

  console.log('\nSprint 6.5B force-close regression OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
