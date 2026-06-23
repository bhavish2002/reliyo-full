/**
 * Sprint 7 B6 — server 3-strike inactivity job regression.
 *
 * 1) Backdate a done task to 193h+ idle → process-due adds strikes and auto-closes.
 * 2) Idempotent re-run does not duplicate strikes.
 *
 * Usage:
 *   npm run start:dev
 *   npm run validate:inactivity -- 111111
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

async function createDoneTask(rToken, aToken, reward, trust) {
  const rH = { Authorization: `Bearer ${rToken}` };
  const aH = { Authorization: `Bearer ${aToken}` };
  const hold = await createRewardHold(rH, reward);
  const created = await req('/tasks', {
    method: 'POST',
    headers: rH,
    body: JSON.stringify({
      title: `Inactivity test ${Date.now()}`,
      description: 'Sprint 7 B6',
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

  const trustHold = await createTrustHold(aH, taskId, trust);
  const acc = await req(`/tasks/${taskId}/accept`, {
    method: 'POST',
    headers: aH,
    body: JSON.stringify({ fundHoldId: trustHold.id }),
  });
  if (acc.status >= 400) throw new Error(`Accept failed: ${JSON.stringify(acc.body)}`);

  const comment = await req(`/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: aH,
    body: JSON.stringify({ message: 'Inactivity test work started.' }),
  });
  if (comment.status >= 400) throw new Error(`Comment failed: ${JSON.stringify(comment.body)}`);

  const done = await req(`/tasks/${taskId}/mark-done`, { method: 'POST', headers: aH });
  if (done.status >= 400) throw new Error(`Mark done failed: ${JSON.stringify(done.body)}`);
  return taskId;
}

async function main() {
  const code = process.argv[2] || '111111';
  console.log(`[validate:inactivity] API=${API}`);

  const rToken = await login('9000000001', code);
  const aToken = await login('9000000002', code);
  const adminToken = await login('9000000003', code);
  const adminH = { Authorization: `Bearer ${adminToken}` };

  const taskId = await createDoneTask(rToken, aToken, 1000, 100);

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const backdated = new Date(Date.now() - 193 * 60 * 60 * 1000);
    await prisma.task.update({
      where: { id: taskId },
      data: { statusEnteredAt: backdated },
    });

    const run1 = await req('/admin/jobs/inactivity/process-due', {
      method: 'POST',
      headers: adminH,
    });
    if (run1.status >= 400) {
      throw new Error(`process-due failed: ${JSON.stringify(run1.body)}`);
    }
    const stats1 = run1.body?.data;
    console.log('[validate:inactivity] run1', stats1);

    const detail1 = await req(`/tasks/${taskId}`, { headers: { Authorization: `Bearer ${rToken}` } });
    const status1 = detail1.body?.data?.task?.status ?? detail1.body?.data?.status;
    if (status1 !== 'closed') {
      throw new Error(`Expected closed after 3 strikes, got ${status1}`);
    }

    const events = await prisma.taskEvent.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });
    const strikes = events.filter((e) => {
      const meta = e.metadata;
      return e.entryType === 'alert' && meta && typeof meta === 'object' && meta.alertType === 'sla_warning';
    });
    if (strikes.length < 3) {
      throw new Error(`Expected >=3 sla_warning strikes, got ${strikes.length}`);
    }

    const run2 = await req('/admin/jobs/inactivity/process-due', {
      method: 'POST',
      headers: adminH,
    });
    const strikesAfter = await prisma.taskEvent.count({
      where: {
        taskId,
        entryType: 'alert',
        metadata: { path: ['alertType'], equals: 'sla_warning' },
      },
    });
    if (strikesAfter !== strikes.length) {
      throw new Error(`Idempotency failed: strike count changed ${strikes.length} → ${strikesAfter}`);
    }

    console.log('[validate:inactivity] PASS');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[validate:inactivity] FAIL', err);
  process.exit(1);
});
