import { betterAuth } from 'better-auth';
import { admin, bearer, jwt, openAPI, twoFactor } from 'better-auth/plugins';
import { Pool as PgPool } from 'pg';
import { config } from '@/config/config';
import { schema } from './schema';

function buildPool(): PgPool {
  const cfg = config.database;
  return new PgPool({
    connectionString: `postgresql://${cfg.user}:${cfg.password}@${cfg.host}:${cfg.port}/${cfg.name}`,
    ssl: cfg.sslMode === 'disable' ? false : { rejectUnauthorized: false },
  });
}

export const auth = betterAuth({
  database: buildPool(),
  emailAndPassword: {
    enabled: true,
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
    twoFactor(),
  ],
  ...schema,
});
