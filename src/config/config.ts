import { z } from 'zod';
import { env, envArray, envBool, envNum } from './env';

const configSchema = z.object({
  app: z.object({
    name: z.string().default('auth-service'),
    port: z.number().default(3000),
    env: z.enum(['development', 'production', 'test']).default('development'),
  }),
  cors: z.object({
    enabled: z.boolean().default(true),
    allowCredentials: z.boolean().default(true),
    allowedHeaders: z.array(z.string()).default([]),
    allowedMethods: z.array(z.string()).default([]),
    allowedOrigins: z.array(z.string()).default([]),
    maxAge: z.number().default(300),
  }),
  database: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(5432),
    name: z.string().default('oil_auth'),
    user: z.string().default('postgres'),
    password: z.string().default(''),
    sslMode: z.string().default('disable'),
  }),
  redis: z
    .object({
      host: z.string().default('localhost'),
      port: z.number().default(6379),
      password: z.string().optional(),
      db: z.number().default(0),
      tls: z.boolean().default(false),
    })
    .optional(),
  otel: z.object({
    enabled: z.boolean().default(true),
    protocol: z.enum(['grpc', 'http']).default('grpc'),
    endpoint: z.string().default('localhost:4317'),
  }),
  session: z.object({
    expiresIn: z.number().default(60 * 60 * 24 * 7),
    updateAge: z.number().default(60 * 60 * 24),
    cookieCacheMaxAge: z.number().default(60 * 5),
  }),
  log: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const defaultConfig: Config = {
    app: {
      name: env('APP_NAME', 'auth-service'),
      port: envNum('APP_PORT', 3000),
      env:
        (env('APP_ENV', 'development') as 'development' | 'production' | 'test') || 'development',
    },
    cors: {
      enabled: envBool('APP_CORS_ENABLE', true),
      allowCredentials: envBool('APP_CORS_ALLOW_CREDENTIALS', true),
      allowedHeaders: envArray('APP_CORS_ALLOWED_HEADERS'),
      allowedMethods: envArray('APP_CORS_ALLOWED_METHODS'),
      allowedOrigins: envArray('APP_CORS_ALLOWED_ORIGINS'),
      maxAge: envNum('APP_CORS_MAX_AGE_SECONDS', 300),
    },
    database: {
      host: env('DB_POSTGRES_HOST', 'localhost'),
      port: envNum('DB_POSTGRES_PORT', 5432),
      name: env('DB_POSTGRES_NAME', 'oil_auth'),
      user: env('DB_POSTGRES_USER', 'postgres'),
      password: env('DB_POSTGRES_PASSWORD', ''),
      sslMode: env('DB_POSTGRES_SSL_MODE', 'disable'),
    },
    redis: {
      host: env('REDIS_HOST', 'localhost'),
      port: envNum('REDIS_PORT', 6379),
      password: env('REDIS_PASSWORD', ''),
      db: envNum('REDIS_DB', 0),
      tls: envBool('REDIS_TLS', false),
    },
    otel: {
      enabled: envBool('OTEL_ENABLED', true),
      protocol: (env('OTEL_PROTOCOL', 'grpc') as 'grpc' | 'http') || 'grpc',
      endpoint: env('OTEL_ENDPOINT', 'localhost:4317'),
    },
    session: {
      expiresIn: envNum('SESSION_EXPIRES_IN', 60 * 60 * 24 * 7),
      updateAge: envNum('SESSION_UPDATE_AGE', 60 * 60 * 24),
      cookieCacheMaxAge: envNum('SESSION_COOKIE_CACHE_MAX_AGE', 60 * 5),
    },
    log: {
      level: (env('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error') || 'info',
    },
  };

  return configSchema.parse(defaultConfig);
}

export const config = loadConfig();
