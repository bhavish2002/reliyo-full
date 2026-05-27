/**
 * Verifies tasks appear in mine / browse / admin list APIs.
 * Usage: node scripts/validate-task-visibility.mjs <requestor-otp> [--skip-send]
 *        node scripts/validate-task-visibility.mjs <acceptor-otp> --acceptor-only --skip-send
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

async function login(phone, code, skipSend) {
  if (!skipSend) {
    await req('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone, dialCode: '+91', purpose: 'login' }),
    });
  }
  const auth = await req('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, dialCode: '+91', code }),
  });
  if (auth.status >= 400) throw new Error(`Auth failed: ${JSON.stringify(auth.body)}`);
  return auth.body.data.accessToken;
}

async function main() {
  const args = process.argv.slice(2);
  const skipSend = args.includes('--skip-send');
  const codes = args.filter((a) => /^\d{6}$/.test(a));
  if (codes.length < 3) {
    console.error(
      'Usage: node scripts/validate-task-visibility.mjs <requestor-otp> <acceptor-otp> <admin-otp> [--skip-send]',
    );
    process.exit(1);
  }

  const [rCode, aCode, adminCode] = codes;
  const requestorToken = await login('9000000001', rCode, skipSend);
  const acceptorToken = await login('9000000002', aCode, skipSend);
  const adminToken = await login('9000000003', adminCode, skipSend);

  const hold = await req('/payments/fund-holds', {
    method: 'POST',
    headers: { Authorization: `Bearer ${requestorToken}` },
    body: JSON.stringify({
      purpose: 'task_reward',
      amount: 750,
      currency: 'INR',
      paymentMethod: 'upi',
    }),
  });
  const holdId = hold.body?.data?.id;

  const created = await req('/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${requestorToken}` },
    body: JSON.stringify({
      title: 'Visibility test task',
      description: 'Ensures created tasks surface in mine browse and admin list endpoints.',
      workType: 'Virtual',
      manpower: 1,
      location: 'Delhi',
      country: 'India',
      deadline: '2026-12-31T00:00:00.000Z',
      updateFrequency: 'Daily',
      skills: ['test'],
      domain: 'Technology',
      reward: 750,
      currency: 'INR',
      fundHoldId: holdId,
    }),
  });
  const taskId = created.body?.data?.id;
  if (!taskId) {
    console.error('Create failed', created.body);
    process.exit(1);
  }
  console.log('Created task', taskId);

  const mine = await req('/tasks?scope=mine&pageSize=100', {
    headers: { Authorization: `Bearer ${requestorToken}` },
  });
  const inMine = mine.body?.data?.items?.some((t) => t.id === taskId);
  console.log('Mine list:', inMine ? 'OK' : 'MISSING', `(${mine.body?.data?.items?.length} items)`);

  const browse = await req('/tasks?scope=browse&status=open&pageSize=100', {
    headers: { Authorization: `Bearer ${acceptorToken}` },
  });
  const inBrowse = browse.body?.data?.items?.some((t) => t.id === taskId);
  console.log('Browse list (acceptor):', inBrowse ? 'OK' : 'MISSING');

  const admin = await req('/tasks?scope=admin&pageSize=100', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const inAdmin = admin.body?.data?.items?.some((t) => t.id === taskId);
  console.log('Admin list:', inAdmin ? 'OK' : 'MISSING');

  if (!inMine || !inBrowse || !inAdmin) process.exit(1);
  console.log('Task visibility validation passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
