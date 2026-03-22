import type { Config } from '@config/config';
import type { Logger } from '@infras/logger/logger';
import Redis from 'ioredis';

export class RedisClient {
  private client: Redis | null = null;

  constructor(
    private config: Config,
    private logger?: Logger
  ) {
    this.connect();
  }

  private connect(): void {
    const redisConfig = this.config.redis;
    if (!redisConfig) {
      return;
    }

    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      tls: redisConfig.tls ? { rejectUnauthorized: false } : undefined,
      lazyConnect: true,
    });

    this.client.on('ready', () => {
      this.logger?.info(
        `Redis connected host=${redisConfig.host} port=${redisConfig.port} db=${redisConfig.db ?? 0}`
      );
    });
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    if (!this.client) return 'OK';
    if (ttl) {
      return await this.client.set(key, value, 'EX', ttl);
    }
    return await this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    if (!this.client) return 0;
    return await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    if (!this.client) return 0;
    return await this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.client) return 0;
    return await this.client.expire(key, seconds);
  }

  async quit(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

export function createRedisClient(config: Config, logger?: Logger): RedisClient | null {
  if (!config.redis) {
    return null;
  }
  return new RedisClient(config, logger);
}
