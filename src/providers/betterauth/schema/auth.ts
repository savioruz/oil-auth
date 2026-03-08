import { betterAuth } from 'better-auth';
import { admin, bearer, jwt, openAPI } from 'better-auth/plugins';
import { Pool as PgPool } from 'pg';
import { config } from '@/config/config';
import { schema } from './schema';

function buildConnectionString(): string {
  const cfg = config.database;

  return `postgresql://${cfg.user}:${cfg.password}@${cfg.host}:${cfg.port}/${cfg.name}?sslmode=${cfg.sslMode}`;
}

export function buildAuth() {
  return betterAuth({
    database: new PgPool({
      connectionString: buildConnectionString(),
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      openAPI(),
      admin(),
      bearer(),
      jwt({
        jwks: {
          disablePrivateKeyEncryption: true,
        },
      }),
    ],
    ...(config.oauth.google && {
      socialProviders: {
        google: {
          clientId: config.oauth.google.clientId,
          clientSecret: config.oauth.google.clientSecret,
        },
      },
    }),
    ...schema,
  });
}

export const auth = buildAuth();
