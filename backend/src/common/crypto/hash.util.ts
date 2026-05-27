import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_KEYLEN = 64;

export function hashSecret(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(plain, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${derived}`;
}

export function verifySecret(plain: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const derived = scryptSync(plain, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
