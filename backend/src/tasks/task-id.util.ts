import { randomBytes } from 'crypto';

export function generateTaskPublicId(): string {
  const year = new Date().getFullYear();
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `RLY-TSK-${year}-${suffix}`;
}
