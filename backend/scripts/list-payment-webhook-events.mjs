/**
 * List recent payment webhook events ingested by the API (server-side only — no Reliyo UI).
 *
 * Usage:
 *   npm run payments:webhook-log
 *   npm run payments:webhook-log -- 30
 */
import { PrismaClient } from '@prisma/client';
import { loadEnvFiles } from './load-env-files.mjs';

loadEnvFiles();

const limit = Number(process.argv[2] ?? 20);
const prisma = new PrismaClient();

async function main() {
  const events = await prisma.paymentWebhookEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: Number.isFinite(limit) ? limit : 20,
  });

  console.log('Payment webhook events (newest first)');
  console.log('Endpoint: POST {PUBLIC_URL}/api/v1/payments/webhooks/razorpay');
  console.log('Razorpay dashboard: Settings → Webhooks → delivery logs\n');

  if (!events.length) {
    console.log('No webhook events in database yet.');
    console.log('Register your tunnel URL in Razorpay, or run: npm run validate:staging-webhook -- <order_id>');
    return;
  }

  for (const e of events) {
    console.log('—'.repeat(60));
    console.log(`id:       ${e.id}`);
    console.log(`provider: ${e.provider}`);
    console.log(`event:    ${e.externalEventId}`);
    console.log(`order:    ${e.externalIntentId ?? '(n/a)'}`);
    console.log(`status:   ${e.status}${e.lastError ? ` (${e.lastError})` : ''}`);
    console.log(`attempts: ${e.attempts}`);
    console.log(`at:       ${e.createdAt.toISOString()}`);
    if (e.processedAt) console.log(`processed: ${e.processedAt.toISOString()}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
