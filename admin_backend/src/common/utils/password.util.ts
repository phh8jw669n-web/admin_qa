import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generatePassword(length = 12): string {
  return Array.from(
    { length },
    () => PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)],
  ).join('');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  passwordHash?: string | null,
): Promise<boolean> {
  if (!passwordHash) {
    await bcrypt.hash(password, SALT_ROUNDS);
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}
