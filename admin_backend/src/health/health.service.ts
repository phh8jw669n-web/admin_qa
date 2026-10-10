import { Injectable } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorFunction,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redisService: RedisService,
  ) {}

  check() {
    const checks: HealthIndicatorFunction[] = [
      () => this.db.pingCheck('database'),
    ];

    if (this.redisService.isEnabled()) {
      checks.push(async () => {
        await this.redisService.ping();
        return { redis: { status: 'up' as const } };
      });
    }

    return this.health.check(checks);
  }
}
