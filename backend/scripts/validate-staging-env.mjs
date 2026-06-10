/**
 * Validates B5 staging env template has required payment keys documented.
 * Usage: node scripts/validate-staging-env.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const template = readFileSync(resolve(root, '.env.staging.example'), 'utf8');

const required = [
  'NODE_ENV=staging',
  'PAYMENT_MODE=live',
  'PAYMENT_PSP=razorpay',
  'RAZORPAY_KEY_ID=',
  'RAZORPAY_KEY_SECRET=',
  'RAZORPAY_WEBHOOK_SECRET=',
  'PUBLIC_API_URL=',
];

const missing = required.filter((key) => !template.includes(key));
if (missing.length) {
  console.error('Staging template missing keys:', missing.join(', '));
  process.exit(1);
}

console.log('B5 staging env template OK');
