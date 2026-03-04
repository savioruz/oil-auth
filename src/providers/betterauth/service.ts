import type { Config } from '@config/config';
import type { PostgresClient } from '@infras/postgres/client';
import type { RedisClient } from '@infras/redis/client';
import { betterAuth } from 'better-auth';
import { admin, bearer, jwt, openAPI } from 'better-auth/plugins';
import { schema } from './schema/schema';

export type Auth = ReturnType<typeof betterAuth>;

export class BetterAuthService {
  private readonly instance: Auth;

  constructor(config: Config, postgresClient: PostgresClient, redisClient: RedisClient | null) {
    const isProd = config.app.env === 'production';
    const { session: sessionSchema, ...restSchema } = schema;

    this.instance = betterAuth({
      baseURL: config.auth.baseUrl,
      secret: config.auth.secretKey,
      database: postgresClient.getPool(),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: config.auth.requireEmailVerification ?? false,
      },
      trustedOrigins: config.auth.trustedOrigins,
      advanced: {
        useSecureCookies: isProd,
        cookies: {
          session_token: {
            attributes: {
              httpOnly: true,
              secure: isProd,
              sameSite: 'none',
              path: '/',
            },
          },
          session_data: {
            attributes: {
              secure: isProd,
              sameSite: 'none',
              path: '/',
            },
          },
        },
      },
      session: {
        ...sessionSchema,
        expiresIn: config.session.expiresIn,
        updateAge: config.session.updateAge,
        cookieCache: {
          enabled: !!redisClient,
          maxAge: config.session.cookieCacheMaxAge,
        },
      },
      plugins: [
        openAPI(),
        admin(),
        bearer(),
        jwt({
          jwks: {
            disablePrivateKeyEncryption: true,
          },
          jwt: {
            issuer: config.auth.baseUrl,
            expirationTime: '3h',
            definePayload: ({ user }) => {
              const u = user as typeof user & { role?: string };
              return {
                id: u.id,
                email: u.email,
                role: u.role ?? 'user',
              };
            },
          },
        }),
      ],
      ...restSchema,
    });
  }

  getAuth(): Auth {
    return this.instance;
  }
}
