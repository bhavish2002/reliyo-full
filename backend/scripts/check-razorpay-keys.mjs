/**
 * Reports whether Razorpay TEST keys are configured for live smoke (S5-M01).
 * Exit 0 = ready, 2 = missing keys.
 */
import { loadEnvFiles } from './load-env-files.mjs';

function isPlaceholder(value) {
  if (!value) return true;
  return value.includes('REPLACE') || value.endsWith('_XXXX') || value === 'XXXX';
}

loadEnvFiles();

const keys = {
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
};

const missing = Object.entries(keys)
  .filter(([, v]) => isPlaceholder(v))
  .map(([k]) => k);

if (missing.length) {
  console.log('Razorpay keys: NOT READY');
  console.log('Missing or placeholder:', missing.join(', '));
  console.log('Fix: cp .env.staging.local.example .env.staging.local and add TEST keys from Razorpay dashboard.');
  process.exit(2);
}

console.log('Razorpay keys: READY', keys.RAZORPAY_KEY_ID.slice(0, 12) + '...');
process.exit(0);
