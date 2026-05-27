import { PrismaClient } from '@prisma/client';

const SEED_PHONES_E164 = [
  '+919000000001',
  '+919000000002',
  '+919000000003',
];

/** Match backend toPhoneE164 for common India dev logins. */
function normalizePhoneArg(raw) {
  if (!raw || raw === '--all') return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
}

const prisma = new PrismaClient();

const clearAll = process.argv.includes('--all');
const phoneArg = process.argv.slice(2).find((a) => !a.startsWith('-'));

let where;
if (clearAll) {
  where = { phoneE164: { in: SEED_PHONES_E164 } };
} else {
  const phoneE164 = normalizePhoneArg(phoneArg) ?? '+919000000001';
  where = { phoneE164 };
}

const result = await prisma.otpChallenge.deleteMany({ where });
const target = clearAll ? 'all seed users' : where.phoneE164;
console.log(`Deleted ${result.count} OTP challenge(s) for ${target}.`);
await prisma.$disconnect();
