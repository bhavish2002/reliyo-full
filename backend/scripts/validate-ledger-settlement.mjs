/**
 * Sprint 6 — ledger settlement regression (all four terminal/refund paths).
 *
 * Usage:
 *   npm run start:dev
 *   npm run validate:ledger-settlement -- 111111
 */
const API = process.env.API_BASE ?? 'http://localhost:4000/api/v1';

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

async function rewardHold(headers, amount) {
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
  return res.body.data;
}

async function trustHold(headers, taskId, amount) {
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
  return res.body.data;
}

async function createTask(headers, fundHoldId, reward) {
  const res = await req('/tasks', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: `Ledger test ${Date.now()}`,
      description: 'Sprint 6 settlement validation',
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
  if (res.status >= 400) throw new Error(`Task create failed: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

async function assertJournal(scenario, taskId) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { idempotencyKey: `${scenario}:${taskId}` },
      include: { lines: true },
    });
    if (!entry) throw new Error(`Missing journal for ${scenario}:${taskId}`);
    const debit = entry.lines
      .filter((l) => l.side === 'debit')
      .reduce((s, l) => s + Number(l.amount), 0);
    const credit = entry.lines
      .filter((l) => l.side === 'credit')
      .reduce((s, l) => s + Number(l.amount), 0);
    if (Math.round(debit * 100) !== Math.round(credit * 100)) {
      throw new Error(`Unbalanced journal ${scenario}: debit=${debit} credit=${credit}`);
    }
    console.log(`  OK ${scenario}: ${entry.lines.length} lines, balanced ${debit}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const otp = process.argv[2] || process.env.OTP_DEV_FIXED_CODE;
  if (!otp) {
    console.error('Usage: npm run validate:ledger-settlement -- <otp>');
    process.exit(1);
  }

  console.log('Sprint 6 ledger settlement regression');
  const rToken = await login('9000000001', otp);
  const aToken = await login('9000000002', otp);
  const adminToken = await login('9000000003', otp);
  const rH = { Authorization: `Bearer ${rToken}` };
  const aH = { Authorization: `Bearer ${aToken}` };
  const adminH = { Authorization: `Bearer ${adminToken}` };

  // 1) Cancel open
  const cancelReward = await rewardHold(rH, 500);
  const cancelTask = await createTask(rH, cancelReward.id, 500);
  const del = await req(`/tasks/${cancelTask.id}`, { method: 'DELETE', headers: rH });
  if (del.status >= 400) throw new Error(`Cancel failed: ${JSON.stringify(del.body)}`);
  await assertJournal('cancel_open', cancelTask.id);

  // 2) Quit trust refund
  const quitReward = await rewardHold(rH, 1000);
  const quitTask = await createTask(rH, quitReward.id, 1000);
  const trust = await trustHold(aH, quitTask.id, 100);
  await req(`/tasks/${quitTask.id}/accept`, {
    method: 'POST',
    headers: aH,
    body: JSON.stringify({ fundHoldId: trust.id }),
  });
  const quit = await req(`/tasks/${quitTask.id}/quit`, { method: 'POST', headers: aH });
  if (quit.status >= 400) throw new Error(`Quit failed: ${JSON.stringify(quit.body)}`);
  await assertJournal('quit_trust_refund', quitTask.id);

  // 3) Standard close
  const closeReward = await rewardHold(rH, 1000);
  const closeTask = await createTask(rH, closeReward.id, 1000);
  const closeTrust = await trustHold(aH, closeTask.id, 100);
  await req(`/tasks/${closeTask.id}/accept`, { method: 'POST', headers: aH, body: JSON.stringify({ fundHoldId: closeTrust.id }) });
  await req(`/tasks/${closeTask.id}/comments`, {
    method: 'POST',
    headers: aH,
    body: JSON.stringify({ message: 'Starting work' }),
  });
  await req(`/tasks/${closeTask.id}/mark-done`, { method: 'POST', headers: aH });
  const aw = await req(`/tasks/${closeTask.id}/accept-work`, {
    method: 'POST',
    headers: rH,
    body: JSON.stringify({ rating: 5, feedback: 'Great' }),
  });
  if (aw.status >= 400) throw new Error(`Accept work failed: ${JSON.stringify(aw.body)}`);
  await assertJournal('closed', closeTask.id);

  // 4) Force close (admin)
  const fcReward = await rewardHold(rH, 800);
  const fcTask = await createTask(rH, fcReward.id, 800);
  const fcTrust = await trustHold(aH, fcTask.id, 80);
  await req(`/tasks/${fcTask.id}/accept`, { method: 'POST', headers: aH, body: JSON.stringify({ fundHoldId: fcTrust.id }) });
  const fc = await req(`/admin/close-requests/${fcTask.id}`, {
    method: 'PATCH',
    headers: adminH,
    body: JSON.stringify({ resolution: 'approved', comment: 'Ledger test force close' }),
  });
  if (fc.status >= 400) throw new Error(`Force close failed: ${JSON.stringify(fc.body)}`);
  await assertJournal('force_closed', fcTask.id);

  console.log('\nSprint 6 ledger settlement regression OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
