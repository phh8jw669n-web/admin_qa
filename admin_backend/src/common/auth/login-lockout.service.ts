import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { apiError } from '../utils/api-response.util';

type MemoryEntry = {
  count: number;
  windowExpiresAt: number;
  lockedUntil?: number;
};

@Injectable()
export class LoginLockoutService {
  private readonly memoryStore = new Map<string, MemoryEntry>();

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async assertNotLocked(scope: string, email: string): Promise<void> {
    if (await this.isLocked(scope, email)) {
      throw new HttpException(
        apiError('Too many failed login attempts. Please try again later.'),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async recordFailure(scope: string, email: string): Promise<void> {
    const maxFailedAttempts = this.configService.get<number>(
      'auth.loginLockout.maxFailedAttempts',
    )!;
    const windowSeconds = this.configService.get<number>(
      'auth.loginLockout.windowSeconds',
    )!;
    const lockoutSeconds = this.configService.get<number>(
      'auth.loginLockout.lockoutSeconds',
    )!;

    if (this.redisService.isEnabled()) {
      const client = this.redisService.getClient()!;
      const failureKey = this.failureKey(scope, email);
      const lockKey = this.lockKey(scope, email);
      const count = await client.incr(failureKey);

      if (count === 1) {
        await client.expire(failureKey, windowSeconds);
      }

      if (count >= maxFailedAttempts) {
        await client.set(lockKey, '1', 'EX', lockoutSeconds);
      }

      return;
    }

    const key = this.failureKey(scope, email);
    const now = Date.now();
    const entry = this.memoryStore.get(key);

    if (!entry || entry.windowExpiresAt <= now) {
      this.memoryStore.set(key, {
        count: 1,
        windowExpiresAt: now + windowSeconds * 1000,
      });
      return;
    }

    entry.count += 1;

    if (entry.count >= maxFailedAttempts) {
      entry.lockedUntil = now + lockoutSeconds * 1000;
    }
  }

  async clearFailures(scope: string, email: string): Promise<void> {
    if (this.redisService.isEnabled()) {
      const client = this.redisService.getClient()!;
      await client.del(
        this.failureKey(scope, email),
        this.lockKey(scope, email),
      );
      return;
    }

    this.memoryStore.delete(this.failureKey(scope, email));
  }

  private async isLocked(scope: string, email: string): Promise<boolean> {
    if (this.redisService.isEnabled()) {
      const client = this.redisService.getClient()!;
      const locked = await client.exists(this.lockKey(scope, email));
      return locked === 1;
    }

    const entry = this.memoryStore.get(this.failureKey(scope, email));
    if (!entry?.lockedUntil) {
      return false;
    }

    if (entry.lockedUntil <= Date.now()) {
      this.memoryStore.delete(this.failureKey(scope, email));
      return false;
    }

    return true;
  }

  private failureKey(scope: string, email: string): string {
    return `auth:login-failures:${scope}:${email.trim().toLowerCase()}`;
  }

  private lockKey(scope: string, email: string): string {
    return `auth:login-lock:${scope}:${email.trim().toLowerCase()}`;
  }
}
