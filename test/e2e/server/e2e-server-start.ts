#!/usr/bin/env bun
/**
 * starts the server for e2e tests, writes PID to .e2e-server.pid
 * runs migrations first, then starts the server in the background
 */
import { execSync, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const env = {
  ...process.env,
  APP_ENV: 'test',
  APP_PORT: '3000',
  APP_CORS_ENABLE: 'true',
  APP_CORS_ALLOW_CREDENTIALS: 'true',
  APP_CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
  DB_POSTGRES_HOST: 'localhost',
  DB_POSTGRES_PORT: '5432',
  DB_POSTGRES_NAME: 'oil_auth_test',
  DB_POSTGRES_USER: 'postgres',
  DB_POSTGRES_PASSWORD: 'postgres',
  DB_POSTGRES_SSL_MODE: 'disable',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  OTEL_ENABLED: 'false',
  LOG_LEVEL: 'error',
  AUTH_BASE_URL: 'http://localhost:3000',
  AUTH_SECRET_KEY: 'loremipsumdolorsitametconsecteturadipiscingelit',
  AUTH_REQUIRE_EMAIL_VERIFICATION: 'false',
  AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
  AUTH_ALLOWED_AUDIENCES: 'productA,productB',
};

console.log('Running migrations...');
execSync(
  'bun x @better-auth/cli@latest migrate --yes --config ./src/providers/betterauth/schema/auth.ts',
  { env, stdio: 'inherit' }
);

console.log('Starting e2e server on port 3000...');
const server = spawn('bun', ['run', 'src/cmd/server/main.ts'], {
  env,
  detached: true,
  stdio: 'ignore',
});

server.unref();
writeFileSync('.e2e-server.pid', String(server.pid));

// wait for server to be ready
const maxRetries = 20;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < maxRetries; i++) {
  await delay(500);
  try {
    const res = await fetch('http://localhost:3000/health');
    if (res.ok) {
      console.log('e2e server ready');
      process.exit(0);
    }
  } catch {
    // not ready yet
  }
}

console.error('e2e server failed to start within 10s');
process.exit(1);
