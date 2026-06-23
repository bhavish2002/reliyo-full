/**
 * Sprint 7A — DSP4 admin resolution regression.
 *
 * Usage:
 *   npm run start:dev (or start:dev:staging)
 *   npm run validate:dsp4 -- 111111
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

async function createCommittedTask(rToken, aToken, reward, trust) {
  const rH = { Authorization: `Bearer ${rToken}` };
  const aH = { Authorization: `Bearer ${aToken}` };
  const hold = await createRewardHold(rH, reward);
  const created = await req('/tasks', {
    method: 'POST',
    headers: rH,
    body: JSON.stringify({
      title: `DSP4 test ${Date.now()}`,
      description: 'Sprint 7A DSP4 validation task',
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

  const comment = await req(`/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: aH,
    body: JSON.stringify({ message: 'Starting DSP4 test work.' }),
  });
  if (comment.status >= 400) throw new Error(`Comment failed: ${JSON.stringify(comment.body)}`);

  const done = await req(`/tasks/${taskId}/mark-done`, {
    method: 'POST',
    headers: aH,
  });
  if (done.status >= 400) throw new Error(`Mark done failed: ${JSON.stringify(done.body)}`);
  return taskId;
}

async function escalateToDsp4(taskId) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'disputed',
        disputeCount: 4,
        dsp4Status: 'open',
        dsp4ResolvedValid: false,
        dsp4ReworkDeadline: null,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
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
    console.error('Usage: npm run validate:dsp4 -- <otp>');
    process.exit(1);
  }

  console.log('Sprint 7A DSP4 admin regression');
  console.log(`  API: ${API}`);

  const rToken = await login('9000000001', otp);
  const aToken = await login('9000000002', otp);
  const adminToken = await login('9000000003', otp);
  const adminH = { Authorization: `Bearer ${adminToken}` };

  const invalidTaskId = await createCommittedTask(rToken, aToken, 600, 60);
  await escalateToDsp4(invalidTaskId);

  const invalidRes = await req(`/admin/disputes/${invalidTaskId}/dsp4`, {
    method: 'PATCH',
    headers: adminH,
    body: JSON.stringify({
      status: 'resolved_invalid',
      comment: 'Acceptor met requirements (test)',
    }),
  });
  if (invalidRes.status >= 400) {
    throw new Error(`Resolved invalid failed: ${JSON.stringify(invalidRes.body)}`);
  }
  if (invalidRes.body?.data?.task?.status !== 'closed') {
    throw new Error(`Expected closed, got ${invalidRes.body?.data?.task?.status}`);
  }
  await assertJournal('closed', invalidTaskId);
  console.log('  OK resolved_invalid → closed + ledger');

  const closedTaskId = await createCommittedTask(rToken, aToken, 700, 70);
  await escalateToDsp4(closedTaskId);

  const forceRes = await req(`/admin/disputes/${closedTaskId}/dsp4`, {
    method: 'PATCH',
    headers: adminH,
    body: JSON.stringify({
      status: 'admin_closed',
      comment: 'DSP4 admin closed (test)',
    }),
  });
  if (forceRes.status >= 400) {
    throw new Error(`Admin closed failed: ${JSON.stringify(forceRes.body)}`);
  }
  if (forceRes.body?.data?.task?.status !== 'force_closed') {
    throw new Error(`Expected force_closed, got ${forceRes.body?.data?.task?.status}`);
  }
  await assertJournal('force_closed', closedTaskId);
  console.log('  OK admin_closed → force_closed + ledger');

  const validTaskId = await createCommittedTask(rToken, aToken, 800, 80);
  await escalateToDsp4(validTaskId);

  const validRes = await req(`/admin/disputes/${validTaskId}/dsp4`, {
    method: 'PATCH',
    headers: adminH,
    body: JSON.stringify({
      status: 'resolved_valid',
      comment: 'Rework window granted (test)',
    }),
  });
  if (validRes.status >= 400) {
    throw new Error(`Resolved valid failed: ${JSON.stringify(validRes.body)}`);
  }
  const validTask = validRes.body?.data?.task;
  if (validTask?.status !== 'disputed' || !validTask?.dsp4ResolvedValid) {
    throw new Error('Expected disputed with dsp4ResolvedValid');
  }
  if (!validTask?.dsp4ReworkDeadline) {
    throw new Error('Expected dsp4ReworkDeadline on resolved_valid');
  }
  console.log('  OK resolved_valid → disputed + rework deadline');

  console.log('\nSprint 7A DSP4 admin regression OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
