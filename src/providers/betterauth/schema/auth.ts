import { betterAuth } from 'better-auth';
import { admin, bearer, jwt, openAPI } from 'better-auth/plugins';
import { Pool as PgPool } from 'pg';
import { config } from '@/config/config';
import { schema } from './schema';

function buildConnectionString(): string {
  const cfg = config.database;

  return `postgresql://${cfg.user}:${cfg.password}@${cfg.host}:${cfg.port}/${cfg.name}?sslmode=${cfg.sslMode}`;
}

export const auth = betterAuth({
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
  ...schema,
});
