import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  loginLockout: {
    maxFailedAttempts: Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS),
    windowSeconds: Number(process.env.LOGIN_LOCKOUT_WINDOW_SECONDS),
    lockoutSeconds: Number(process.env.LOGIN_LOCKOUT_SECONDS),
  },
  loginThrottle: {
    limit: Number(process.env.LOGIN_THROTTLE_LIMIT),
    ttlMs: Number(process.env.LOGIN_THROTTLE_TTL_MS),
  },
}));
