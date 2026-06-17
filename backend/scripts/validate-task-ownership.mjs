/**
 * Sprint 6.5A — task ownership & visibility regression.
 *
 * User 2 (Priya) creates a task → only in User 2 created list.
 * User 1 (Arjun) sees it in browse, not in created list.
 *
 * Usage:
 *   npm run start:dev  (mock) or npm run start:dev:staging (live + webhook sim)
 *   npm run validate:task-ownership -- 111111
 */
import { API, createRewardHold, req } from './validation-holds.mjs';

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
  return {
    token: auth.body?.data?.accessToken,
    userId: auth.body?.data?.user?.id,
  };
}

async function createOpenTask(token, title, reward) {
  const headers = { Authorization: `Bearer ${token}` };
  const hold = await createRewardHold(headers, reward);

  const created = await req('/tasks', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title,
      description: 'Sprint 6.5A ownership validation',
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
  const task = created.body?.data;
  if (!task?.id) throw new Error(`Task create failed: ${JSON.stringify(created.body)}`);
  return task;
}

async function listCreated(token) {
  const res = await req('/tasks?scope=mine&participation=created&pageSize=100', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status >= 400) throw new Error(`List created failed: ${JSON.stringify(res.body)}`);
  return res.body?.data?.items ?? [];
}

async function listBrowse(token) {
  const res = await req('/tasks?scope=browse&status=open&pageSize=100', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status >= 400) throw new Error(`List browse failed: ${JSON.stringify(res.body)}`);
  return res.body?.data?.items ?? [];
}

async function main() {
  const otp = process.argv[2] || process.env.OTP_DEV_FIXED_CODE;
  if (!otp) {
    console.error('Usage: npm run validate:task-ownership -- <otp>');
    process.exit(1);
  }

  console.log('Sprint 6.5A task ownership regression');
  console.log(`  API: ${API}`);

  const user1 = await login('9000000001', otp);
  const user2 = await login('9000000002', otp);
  if (!user1.userId || !user2.userId) {
    throw new Error('Missing user id from auth response');
  }

  const uniqueTitle = `Ownership test ${Date.now()}`;
  const task = await createOpenTask(user2.token, uniqueTitle, 820);
  console.log(`  Created task ${task.id} as User 2 (requestor)`);

  if (task.createdById !== user2.userId) {
    throw new Error(
      `requestor mismatch: createdById=${task.createdById} expected=${user2.userId}`,
    );
  }
  console.log('  OK createdById matches User 2 JWT');

  const user2Created = await listCreated(user2.token);
  const inUser2Created = user2Created.some((t) => t.id === task.id);
  if (!inUser2Created) throw new Error('Task missing from User 2 created list');
  console.log('  OK User 2 created list contains task');

  const user1Created = await listCreated(user1.token);
  const inUser1Created = user1Created.some((t) => t.id === task.id);
  if (inUser1Created) throw new Error('Task incorrectly in User 1 created list');
  console.log('  OK User 1 created list excludes task');

  const user1Browse = await listBrowse(user1.token);
  const inUser1Browse = user1Browse.some((t) => t.id === task.id);
  if (!inUser1Browse) throw new Error('Task missing from User 1 browse list');
  console.log('  OK User 1 browse list contains task');

  const user2Browse = await listBrowse(user2.token);
  const inUser2Browse = user2Browse.some((t) => t.id === task.id);
  if (inUser2Browse) throw new Error('Task incorrectly in User 2 browse (own task)');
  console.log('  OK User 2 browse excludes own task');

  console.log('\nSprint 6.5A task ownership regression OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
