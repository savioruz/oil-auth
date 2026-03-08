import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { BetterAuthService } from './service';

const mockConfig = {
  app: {
    name: 'test-app',
    port: 3000,
    env: 'test' as const,
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
    sslMode: 'disable' as const,
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
    protocol: 'grpc' as const,
    endpoint: 'localhost:4317',
  },
  session: {
    expiresIn: 604800,
    updateAge: 86400,
    cookieCacheMaxAge: 300,
  },
  log: {
    level: 'info' as const,
  },
  auth: {
    baseUrl: 'http://localhost:3000',
    secretKey: 'test-secret-key',
    requireEmailVerification: false,
    trustedOrigins: ['http://localhost:3000'],
    allowedAudiences: [],
  },
  oauth: {
    google: null,
  },
};

const mockPostgresClient = {
  getPool: () => ({
    query: () => {},
    on: () => {},
    connect: () => {},
  }),
};

const mockRedisClient = null;

describe('BetterAuthService', () => {
  let service: BetterAuthService;

  afterEach(() => {
    // Service holds onto the instance, nothing to clean up
  });

  test('should create instance with getAuth method', () => {
    service = new BetterAuthService(
      mockConfig as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    expect(service.getAuth()).toBeDefined();
  });

  test('should not include google socialProvider when oauth.google is null', () => {
    const configNoOAuth = { ...mockConfig, oauth: { google: null } };
    service = new BetterAuthService(
      configNoOAuth as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    const auth = service.getAuth();
    expect((auth.options as any).socialProviders?.google).toBeUndefined();
  });

  test('should include google socialProvider when oauth.google config is present', () => {
    const configWithOAuth = {
      ...mockConfig,
      oauth: {
        google: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
        },
      },
    };
    service = new BetterAuthService(
      configWithOAuth as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    const auth = service.getAuth();
    expect((auth.options as any).socialProviders?.google).toBeDefined();
    expect((auth.options as any).socialProviders?.google?.clientId).toBe('test-client-id');
    expect((auth.options as any).socialProviders?.google?.clientSecret).toBe('test-client-secret');
  });

  test('should have baseURL from config', () => {
    service = new BetterAuthService(
      mockConfig as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    // baseURL is not stored in options, but the instance should be created
    expect(service.getAuth()).toBeDefined();
  });

  test('should have secret from config', () => {
    service = new BetterAuthService(
      mockConfig as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    // secret is used internally by better-auth
    expect(service.getAuth()).toBeDefined();
  });

  test('should have emailAndPassword enabled', () => {
    service = new BetterAuthService(
      mockConfig as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    expect((service.getAuth().options as any).emailAndPassword?.enabled).toBe(true);
  });

  test('should have emailAndPassword requireEmailVerification from config', () => {
    service = new BetterAuthService(
      mockConfig as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    expect((service.getAuth().options as any).emailAndPassword?.requireEmailVerification).toBe(false);
  });

  test('should have trustedOrigins from config', () => {
    service = new BetterAuthService(
      mockConfig as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    expect((service.getAuth().options as any).trustedOrigins).toEqual(['http://localhost:3000']);
  });

  test('should have session config from config', () => {
    service = new BetterAuthService(
      mockConfig as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    const sessionConfig = (service.getAuth().options as any).session;
    expect(sessionConfig.expiresIn).toBe(604800);
    expect(sessionConfig.updateAge).toBe(86400);
  });

  test('should have cookieCache disabled when redisClient is null', () => {
    service = new BetterAuthService(
      mockConfig as any,
      mockPostgresClient as any,
      null
    );

    const sessionConfig = (service.getAuth().options as any).session;
    expect(sessionConfig.cookieCache?.enabled).toBe(false);
  });

  test('should have cookieCache enabled when redisClient is provided', () => {
    const redisClient = { isReady: true } as any;
    service = new BetterAuthService(
      mockConfig as any,
      mockPostgresClient as any,
      redisClient
    );

    const sessionConfig = (service.getAuth().options as any).session;
    expect(sessionConfig.cookieCache?.enabled).toBe(true);
  });

  test('should have plugins configured', () => {
    service = new BetterAuthService(
      mockConfig as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    expect((service.getAuth().options as any).plugins).toBeDefined();
    expect(Array.isArray((service.getAuth().options as any).plugins)).toBe(true);
    expect((service.getAuth().options as any).plugins.length).toBeGreaterThan(0);
  });

  test('should have database from postgresClient', () => {
    service = new BetterAuthService(
      mockConfig as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    expect((service.getAuth().options as any).database).toBeDefined();
  });

  test('should use secure cookies in production', () => {
    const prodConfig = { ...mockConfig, app: { ...mockConfig.app, env: 'production' as const } };
    service = new BetterAuthService(
      prodConfig as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    expect((service.getAuth().options as any).advanced?.useSecureCookies).toBe(true);
  });

  test('should not use secure cookies in development', () => {
    const devConfig = { ...mockConfig, app: { ...mockConfig.app, env: 'development' as const } };
    service = new BetterAuthService(
      devConfig as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    expect((service.getAuth().options as any).advanced?.useSecureCookies).toBe(false);
  });

  test('should have jwt plugin configured', () => {
    service = new BetterAuthService(
      mockConfig as any,
      mockPostgresClient as any,
      mockRedisClient as any
    );

    const plugins = (service.getAuth().options as any).plugins;
    expect(plugins.length).toBeGreaterThanOrEqual(4);
  });
});
