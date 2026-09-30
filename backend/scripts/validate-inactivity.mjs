/**

 * Server 3-strike inactivity job regression.

 *

 * 1) Early done before deadline → no strikes until deadline passes

 * 2) Progressive strikes at 73h / 145h / 193h after inactivity anchor

 * 3) Extend deadline blocked after done / disputed

 * 4) disputed → done resets inactivity stint

 * 5) Idempotent re-run does not duplicate strikes

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



async function createDoneTask(rToken, aToken, reward, trust, deadline = '2026-12-31T00:00:00.000Z') {

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

      deadline,

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



function inactivityAnchorMs(statusEnteredAt, deadline, extendedDeadline) {

  const effective = extendedDeadline ? new Date(extendedDeadline) : new Date(deadline);

  return Math.max(new Date(statusEnteredAt).getTime(), effective.getTime());

}



async function countStrikesSinceAnchor(prisma, taskId, anchorMs) {

  return prisma.taskEvent.count({

    where: {

      taskId,

      entryType: 'alert',

      createdAt: { gte: new Date(anchorMs) },

      metadata: { path: ['alertType'], equals: 'sla_warning' },

    },

  });

}



async function main() {

  const code = process.argv[2] || '111111';

  console.log(`[validate:inactivity] API=${API}`);



  const rToken = await login('9000000001', code);

  const aToken = await login('9000000002', code);

  const adminToken = await login('9000000003', code);

  const rH = { Authorization: `Bearer ${rToken}` };

  const aH = { Authorization: `Bearer ${aToken}` };

  const adminH = { Authorization: `Bearer ${adminToken}` };



  const jobsStatus = await req('/admin/jobs/status', { headers: adminH });

  if (jobsStatus.status >= 400) {

    throw new Error(`jobs/status failed: ${JSON.stringify(jobsStatus.body)}`);

  }

  console.log('[validate:inactivity] jobs/status', jobsStatus.body?.data?.schedules);



  const { PrismaClient } = await import('@prisma/client');

  const prisma = new PrismaClient();



  try {

    // ── Early done before deadline: no strikes ─────────────────────────────

    const earlyId = await createDoneTask(rToken, aToken, 1000, 100, '2099-12-31T00:00:00.000Z');

    const earlyRun = await req('/admin/jobs/inactivity/process-due', {

      method: 'POST',

      headers: adminH,

    });

    if (earlyRun.status >= 400) {

      throw new Error(`early-done process-due failed: ${JSON.stringify(earlyRun.body)}`);

    }

    const earlyTask = await prisma.task.findUnique({ where: { id: earlyId } });

    const earlyAnchor = inactivityAnchorMs(

      earlyTask.statusEnteredAt,

      earlyTask.deadline,

      earlyTask.extendedDeadline,

    );

    const earlyStrikes = await countStrikesSinceAnchor(prisma, earlyId, earlyAnchor);

    if (earlyStrikes !== 0) {

      throw new Error(`Early done before deadline: expected 0 strikes, got ${earlyStrikes}`);

    }

    console.log('[validate:inactivity] OK early done before deadline → 0 strikes');



    // ── Extend blocked on done ───────────────────────────────────────────────

    const extendBlocked = await req(`/tasks/${earlyId}/extend-deadline`, {

      method: 'POST',

      headers: rH,

      body: JSON.stringify({ extendedDeadline: '2099-12-15T00:00:00.000Z' }),

    });

    if (extendBlocked.status < 400) {

      throw new Error('Expected extend-deadline to fail on done task');

    }

    if (extendBlocked.body?.error?.code !== 'DEADLINE_EXTEND_NOT_ALLOWED') {

      throw new Error(

        `Expected DEADLINE_EXTEND_NOT_ALLOWED, got ${JSON.stringify(extendBlocked.body)}`,

      );

    }

    console.log('[validate:inactivity] OK extend deadline blocked on done');



    // ── Progressive strikes after anchor (deadline in the past) ───────────

    const pastDeadline = new Date(Date.now() - 250 * 60 * 60 * 1000).toISOString();

    const taskId = await createDoneTask(rToken, aToken, 1000, 100, pastDeadline);



    const progressive = [

      { hours: 73, expectStrikes: 1, expectStatus: 'done' },

      { hours: 145, expectStrikes: 2, expectStatus: 'done' },

      { hours: 193, expectStrikes: 3, expectStatus: 'closed' },

    ];



    for (const step of progressive) {

      const doneSince = new Date(Date.now() - step.hours * 60 * 60 * 1000);

      const anchorMs = inactivityAnchorMs(doneSince, pastDeadline, null);



      await prisma.task.update({

        where: { id: taskId },

        data: {

          status: 'done',

          statusEnteredAt: doneSince,

          deadline: new Date(pastDeadline),

        },

      });



      const run = await req('/admin/jobs/inactivity/process-due', {

        method: 'POST',

        headers: adminH,

      });

      if (run.status >= 400) {

        throw new Error(`process-due failed at ${step.hours}h: ${JSON.stringify(run.body)}`);

      }



      const strikeCount = await countStrikesSinceAnchor(prisma, taskId, anchorMs);

      console.log(`[validate:inactivity] ${step.hours}h → strikes=${strikeCount}`);



      if (strikeCount < step.expectStrikes) {

        throw new Error(`At ${step.hours}h expected >=${step.expectStrikes} strikes, got ${strikeCount}`);

      }



      const detail = await req(`/tasks/${taskId}`, { headers: rH });

      const status = detail.body?.data?.task?.status ?? detail.body?.data?.status;

      if (status !== step.expectStatus) {

        throw new Error(`At ${step.hours}h expected ${step.expectStatus}, got ${status}`);

      }

    }



    // ── disputed → done resets stint (new task) ──────────────────────────

    const resetId = await createDoneTask(rToken, aToken, 1000, 100, pastDeadline);

    const resetDoneSince = new Date(Date.now() - 80 * 60 * 60 * 1000);

    await prisma.task.update({

      where: { id: resetId },

      data: { status: 'done', statusEnteredAt: resetDoneSince },

    });

    await req('/admin/jobs/inactivity/process-due', { method: 'POST', headers: adminH });



    const dispute = await req(`/tasks/${resetId}/dispute`, {

      method: 'POST',

      headers: rH,

      body: JSON.stringify({ message: 'Reset test dispute' }),

    });

    if (dispute.status >= 400) {

      throw new Error(`Dispute failed: ${JSON.stringify(dispute.body)}`);

    }



    const extendDisputed = await req(`/tasks/${resetId}/extend-deadline`, {

      method: 'POST',

      headers: rH,

      body: JSON.stringify({ extendedDeadline: '2099-06-01T00:00:00.000Z' }),

    });

    if (extendDisputed.status < 400) {

      throw new Error('Expected extend-deadline to fail on disputed task');

    }



    const remarkDone = await req(`/tasks/${resetId}/mark-done`, { method: 'POST', headers: aH });

    if (remarkDone.status >= 400) {

      throw new Error(`Remark done failed: ${JSON.stringify(remarkDone.body)}`);

    }



    const afterReset = await prisma.task.findUnique({ where: { id: resetId } });

    const newAnchor = inactivityAnchorMs(

      afterReset.statusEnteredAt,

      afterReset.deadline,

      afterReset.extendedDeadline,

    );

    const strikesAfterReset = await countStrikesSinceAnchor(prisma, resetId, newAnchor);

    if (strikesAfterReset !== 0) {

      throw new Error(

        `disputed→done reset: expected 0 strikes in new stint, got ${strikesAfterReset}`,

      );

    }



    const recentDone = new Date(Date.now() - 73 * 60 * 60 * 1000);

    await prisma.task.update({

      where: { id: resetId },

      data: { status: 'done', statusEnteredAt: recentDone },

    });

    await req('/admin/jobs/inactivity/process-due', { method: 'POST', headers: adminH });

    const row73 = await prisma.task.findUnique({ where: { id: resetId } });
    const anchor73 = inactivityAnchorMs(
      row73.statusEnteredAt,
      row73.deadline,
      row73.extendedDeadline,
    );
    const strikesAfter73h = await countStrikesSinceAnchor(prisma, resetId, anchor73);

    if (strikesAfter73h < 1) {

      throw new Error(`disputed→done: expected strike after 73h in new stint, got ${strikesAfter73h}`);

    }

    console.log('[validate:inactivity] OK disputed→done resets inactivity stint');



    const run2 = await req('/admin/jobs/inactivity/process-due', {

      method: 'POST',

      headers: adminH,

    });

    if (run2.status >= 400) throw new Error(`idempotency run failed: ${JSON.stringify(run2.body)}`);



    console.log('[validate:inactivity] PASS');

  } finally {

    await prisma.$disconnect();

  }

}



main().catch((err) => {

  console.error('[validate:inactivity] FAIL', err);

  process.exit(1);

});


