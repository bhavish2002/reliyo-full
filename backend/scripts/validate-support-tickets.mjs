/**
 * Validates Sprint 8F/8G: support tickets + admin mark done.
 * Usage: node scripts/validate-support-tickets.mjs <otp-code>
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

async function login(phone, code, skipSend = false) {
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
  return auth.body?.data?.accessToken;
}

async function main() {
  const code = process.argv[2];
  if (!code) {
    console.error('Usage: node scripts/validate-support-tickets.mjs <otp-code>');
    process.exit(1);
  }
  const skipSend = process.argv.includes('--skip-send');

  const publicTicket = await req('/support/tickets', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Public User',
      email: 'public@example.com',
      phone: '9000000099',
      subject: 'Public test ticket',
      issue: 'This is a public support ticket validation message for 8F.',
    }),
  });
  console.log('POST /support/tickets (public):', publicTicket.status, publicTicket.body?.data?.id);
  if (publicTicket.status !== 201 && publicTicket.status !== 200) process.exit(1);

  const userToken = await login('9000000002', code, skipSend);
  const authedTicket = await req('/support/tickets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      name: 'Priya Sharma',
      email: 'priya@reliyo.com',
      phone: '9000000002',
      subject: 'Auth-linked ticket',
      issue: 'Authenticated support ticket should link to user id when JWT is present.',
    }),
  });
  console.log('POST /support/tickets (auth):', authedTicket.status, authedTicket.body?.data?.id);
  if (authedTicket.status >= 400) process.exit(1);

  const adminToken = await login('9000000003', code, skipSend);
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const list = await req('/admin/support/tickets', { headers: adminHeaders });
  console.log('GET /admin/support/tickets:', list.status, 'count', list.body?.data?.length);
  if (list.status !== 200) process.exit(1);

  const ticket = list.body?.data?.find((t) => t.subject === 'Auth-linked ticket');
  if (!ticket) {
    console.error('Expected auth-linked ticket in admin list');
    process.exit(1);
  }
  if (!ticket.subject) {
    console.error('Expected subject on ticket row');
    process.exit(1);
  }

  const reviewed = await req(`/admin/support/tickets/${ticket.id}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'reviewed' }),
  });
  console.log('PATCH mark reviewed:', reviewed.status, reviewed.body?.data?.status);
  if (reviewed.status !== 200 || reviewed.body?.data?.status !== 'reviewed') process.exit(1);

  const openCount = (list.body?.data ?? []).filter((t) => t.status === 'open').length;
  const badgeTicket = list.body?.data?.find((t) => t.subject === 'Public test ticket');
  if (badgeTicket?.status === 'open' && openCount < 1) {
    console.error('Expected at least one open ticket for badge count');
    process.exit(1);
  }

  const done = await req(`/admin/support/tickets/${ticket.id}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'done' }),
  });
  console.log('PATCH mark done:', done.status, done.body?.data?.status);
  if (done.status !== 200 || done.body?.data?.status !== 'done') process.exit(1);

  const deleted = await req(`/admin/support/tickets/${ticket.id}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'deleted' }),
  });
  console.log('PATCH deleted (should fail):', deleted.status);
  if (deleted.status === 200) {
    console.error('Delete status should no longer be accepted');
    process.exit(1);
  }

  console.log('validate-support-tickets: OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
