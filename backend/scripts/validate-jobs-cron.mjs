/**
 * Sprint 8A — verify scheduled jobs are registered and admin status endpoint works.
 *
 * Usage (API must be running):
 *   npm run validate:jobs-cron -- 111111
 */
import { API, req } from './validation-holds.mjs';

async function loginAdmin(code) {
  await req('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone: '9000000003', dialCode: '+91', purpose: 'login' }),
  });
  const auth = await req('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone: '9000000003', dialCode: '+91', code }),
  });
  if (auth.status >= 400) {
    throw new Error(`Admin auth failed: ${JSON.stringify(auth.body)}`);
  }
  return auth.body?.data?.accessToken;
}

async function main() {
  const code = process.argv[2] || '111111';
  console.log(`[validate:jobs-cron] API=${API}`);

  const adminToken = await loginAdmin(code);
  const adminH = { Authorization: `Bearer ${adminToken}` };

  const statusRes = await req('/admin/jobs/status', { headers: adminH });
  if (statusRes.status >= 400) {
    throw new Error(`GET /admin/jobs/status failed: ${JSON.stringify(statusRes.body)}`);
  }

  const status = statusRes.body?.data;
  if (!status?.schedules?.inactivity) {
    throw new Error(`Missing inactivity schedule in status: ${JSON.stringify(status)}`);
  }
  if (!status?.schedules?.webhookRetry) {
    throw new Error(`Missing webhookRetry schedule in status: ${JSON.stringify(status)}`);
  }
  if (typeof status.inactivityJobEnabled !== 'boolean') {
    throw new Error(`inactivityJobEnabled must be boolean`);
  }
  if (typeof status.webhookRetryJobEnabled !== 'boolean') {
    throw new Error(`webhookRetryJobEnabled must be boolean`);
  }

  console.log('[validate:jobs-cron] status', {
    inactivityJobEnabled: status.inactivityJobEnabled,
    webhookRetryJobEnabled: status.webhookRetryJobEnabled,
    schedules: status.schedules,
  });

  const manual = await req('/admin/jobs/inactivity/process-due', {
    method: 'POST',
    headers: adminH,
  });
  if (manual.status >= 400) {
    throw new Error(`Manual process-due failed: ${JSON.stringify(manual.body)}`);
  }

  console.log('[validate:jobs-cron] manual process-due', manual.body?.data);
  console.log('[validate:jobs-cron] PASS');
}

main().catch((err) => {
  console.error('[validate:jobs-cron] FAIL', err);
  process.exit(1);
});
