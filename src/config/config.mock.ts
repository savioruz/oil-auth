import type { Config } from './config';

export { mockPostgresClient } from '@infras/postgres/postgres.mock';

export function makeMockConfig(): Config {
  return {
    app: {
      name: 'test-app',
      port: 3000,
      env: 'test',
    },
    cors: {
      enabled: true,
      allowCredentials: true,
      allowedHeaders: ['Accept', 'Authorization'],
      allowedMethods: ['GET', 'POST'],
      allowedOrigins: ['http://localhost:3000'],
      maxAge: 300,
    },
    database: {
      host: 'localhost',
      port: 5432,
      name: 'test_db',
      user: 'test_user',
      password: 'test_password',
      sslMode: 'disable',
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: 'test_password',
      db: 0,
      tls: false,
    },
    otel: {
      enabled: false,
      protocol: 'grpc',
      endpoint: 'localhost:4317',
    },
    session: {
      expiresIn: 604800,
      updateAge: 86400,
      cookieCacheMaxAge: 300,
    },
    log: {
      level: 'info',
    },
    auth: {
      baseUrl: 'http://localhost:3000',
      secretKey: 'test-secret-key',
      trustedOrigins: ['http://localhost:3000'],
      allowedAudiences: [],
      resetPasswordExpiresIn: 3600,
    },
    oauth: {
      google: null,
    },
    twoFactor: {
      enabled: false,
      method: ['totp'],
      emailVerificationOtpEnabled: false,
      otpExpiresIn: 300,
    },
    smtp: undefined,
  };
}
