import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;

  constructor(private readonly configService: ConfigService) {
    const enabled = this.configService.get<boolean>('redis.enabled');

    if (!enabled) {
      this.client = null;
      this.logger.log('Redis is disabled');
      return;
    }

    this.client = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password') || undefined,
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (error) =>
      this.logger.error(`Redis error: ${error.message}`),
    );
  }

  getClient(): Redis | null {
    return this.client;
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  ping(): Promise<string> {
    return this.getClientOrThrow().ping();
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    return this.client.get(key);
  }

  async post(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async patch(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async delete(...keys: string[]): Promise<void> {
    if (!this.client || keys.length === 0) {
      return;
    }

    await this.client.del(...new Set(keys));
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  private getClientOrThrow(): Redis {
    if (!this.client) {
      throw new Error('Redis is disabled');
    }

    return this.client;
  }
}
