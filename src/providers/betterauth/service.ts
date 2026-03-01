import type { Config } from '@config/config';
import type { PostgresClient } from '@infras/postgres/client';
import type { RedisClient } from '@infras/redis/client';
import { betterAuth } from 'better-auth';
import { schema } from './schema/schema';

export type Auth = ReturnType<typeof betterAuth>;

export class BetterAuthService {
  private readonly instance: Auth;

  constructor(config: Config, postgresClient: PostgresClient, redisClient: RedisClient | null) {
    this.instance = betterAuth({
      baseURL: `http://localhost:${config.app.port}`,
      database: postgresClient.getPool(),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
      },
      ...schema,
      session: {
        ...schema.session,
        expiresIn: config.session.expiresIn,
        updateAge: config.session.updateAge,
        cookieCache: {
          enabled: !!redisClient,
          maxAge: config.session.cookieCacheMaxAge,
        },
      },
    });
  }

  getAuth(): Auth {
    return this.instance;
  }
}
