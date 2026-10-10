import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyTokenHash(token: string, tokenHash: string): boolean {
  const computed = Buffer.from(hashToken(token));
  const stored = Buffer.from(tokenHash);

  if (computed.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(computed, stored);
}
