/**
 * Validates Sprint 8D-P0: PATCH /me, server preferences, admin settings read-only.
 * Usage: node scripts/validate-profile-settings.mjs <otp-code>
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
  if (auth.status >= 400) throw new Error(`Auth failed for ${phone}: ${JSON.stringify(auth.body)}`);
  return auth.body?.data?.accessToken;
}

async function main() {
  const code = process.argv[2];
  if (!code) {
    console.error('Usage: node scripts/validate-profile-settings.mjs <otp-code>');
    process.exit(1);
  }
  const skipSend = process.argv.includes('--skip-send');

  const priyaToken = await login('9000000002', code, skipSend);
  const priyaHeaders = { Authorization: `Bearer ${priyaToken}` };

  const meBefore = await req('/me', { headers: priyaHeaders });
  console.log('GET /me (Priya):', meBefore.status, meBefore.body?.data?.name);
  if (meBefore.status !== 200) process.exit(1);
  if (meBefore.body?.data?.name !== 'Priya Sharma') {
    console.error('Expected Priya Sharma profile, got', meBefore.body?.data?.name);
    process.exit(1);
  }

  const patch = await req('/me', {
    method: 'PATCH',
    headers: priyaHeaders,
    body: JSON.stringify({
      bio: 'Validation bio from 8D-P0',
      location: 'Pune',
      preferences: { darkMode: 'dark', preferredCurrency: 'USD' },
    }),
  });
  console.log('PATCH /me:', patch.status, patch.body?.data?.bio);
  if (patch.status !== 200) {
    console.error(patch.body);
    process.exit(1);
  }
  if (patch.body?.data?.preferences?.darkMode !== 'dark') {
    console.error('Preferences not persisted');
    process.exit(1);
  }

  const meAfter = await req('/me', { headers: priyaHeaders });
  if (meAfter.body?.data?.bio !== 'Validation bio from 8D-P0') {
    console.error('Bio not persisted after refresh');
    process.exit(1);
  }
  console.log('Preferences after re-fetch:', meAfter.body?.data?.preferences);

  const badEmail = await req('/me', {
    method: 'PATCH',
    headers: priyaHeaders,
    body: JSON.stringify({ email: 'not-an-email' }),
  });
  console.log('PATCH /me invalid email:', badEmail.status);
  if (badEmail.status !== 400) {
    console.error('Expected 400 for invalid email');
    process.exit(1);
  }

  const adminToken = await login('9000000003', code, skipSend);
  const settings = await req('/admin/settings', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('GET /admin/settings:', settings.status, settings.body?.data);
  if (settings.status !== 200) process.exit(1);
  const policy = settings.body?.data;
  if (policy?.platformFeePercent !== 5 || policy?.trustDepositPercent !== 10) {
    console.error('Admin policy constants mismatch', policy);
    process.exit(1);
  }
  if (!Array.isArray(policy?.inactivityStrikeHours) || policy.inactivityStrikeHours.join(',') !== '72,144,192') {
    console.error('Expected strike hours 72,144,192');
    process.exit(1);
  }
  if (policy?.editable !== false) {
    console.error('Expected read-only admin settings');
    process.exit(1);
  }

  console.log('validate-profile-settings: OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
