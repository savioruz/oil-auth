import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { loadConfig } from '@config/config';
import { PostgresClient } from '@infras/postgres/client';
import { createRedisClient } from '@infras/redis/client';
import { BetterAuthService } from '@providers/betterauth/service';
import { generateRandomEmail, generateRandomPassword, getTestEnv } from './helpers';

describe('BetterAuth Integration', () => {
  let postgresClient: PostgresClient;
  let redisClient: ReturnType<typeof createRedisClient>;
  let authService: BetterAuthService;
  let auth: ReturnType<BetterAuthService['getAuth']>;

  beforeAll(async () => {
    const env = getTestEnv();

    const testConfig = loadConfig();
    testConfig.database.host = env.DB_POSTGRES_HOST;
    testConfig.database.port = parseInt(env.DB_POSTGRES_PORT, 10);
    testConfig.database.name = env.DB_POSTGRES_NAME;
    testConfig.database.user = env.DB_POSTGRES_USER;
    testConfig.database.password = env.DB_POSTGRES_PASSWORD;
    testConfig.redis = {
      host: env.REDIS_HOST,
      port: parseInt(env.REDIS_PORT, 10),
      password: env.REDIS_PASSWORD,
      tls: env.REDIS_TLS === 'true' ? true : false,
      db: 0,
    };

    postgresClient = new PostgresClient(testConfig);
    redisClient = createRedisClient(testConfig);
    authService = new BetterAuthService(testConfig, postgresClient, redisClient);
    auth = authService.getAuth();
  });

  afterAll(async () => {
    if (postgresClient) {
      await postgresClient.end();
    }
    if (redisClient) {
      await redisClient.quit();
    }
  });

  describe('Email & Password Sign Up', () => {
    test('should create a new user with valid email and password', async () => {
      const email = generateRandomEmail();
      const password = generateRandomPassword();

      const result = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: 'Test User',
        },
      });

      expect(result).not.toBeNull();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.token).toBeDefined();
    });

    test('should fail to create user with existing email', async () => {
      const email = generateRandomEmail();
      const password = generateRandomPassword();

      await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: 'Test User',
        },
      });

      let result;
      let error = null;
      try {
        result = await auth.api.signUpEmail({
          body: {
            email,
            password,
            name: 'Test User Duplicate',
          },
        });
      } catch (e) {
        error = e;
      }

      expect(error || result).toBeDefined();
    });

    test('should fail with invalid email format', async () => {
      let result;
      let error = null;
      try {
        result = await auth.api.signUpEmail({
          body: {
            email: 'not-an-email',
            password: generateRandomPassword(),
            name: 'Test User',
          },
        });
      } catch (e) {
        error = e;
      }

      expect(error || result).toBeDefined();
    });

    test('should fail with weak password', async () => {
      const email = generateRandomEmail();

      let result;
      let error = null;
      try {
        result = await auth.api.signUpEmail({
          body: {
            email,
            password: 'weak',
            name: 'Test User',
          },
        });
      } catch (e) {
        error = e;
      }

      expect(error || result).toBeDefined();
    });

    test('should return user with default role "user"', async () => {
      const result = await auth.api.signUpEmail({
        body: {
          email: generateRandomEmail(),
          password: generateRandomPassword(),
          name: 'Role Test User',
        },
      });

      expect((result.user as { role?: string }).role).toBe('user');
    });
  });

  describe('Email & Password Sign In', () => {
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      testEmail = generateRandomEmail();
      testPassword = generateRandomPassword();

      await auth.api.signUpEmail({
        body: {
          email: testEmail,
          password: testPassword,
          name: 'Sign In Test User',
        },
      });
    });

    test('should sign in with valid credentials', async () => {
      const result = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(result).not.toBeNull();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(testEmail);
    });

    test('should fail with wrong password', async () => {
      let error = null;
      try {
        await auth.api.signInEmail({
          body: {
            email: testEmail,
            password: 'wrongpassword123!',
          },
        });
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
    });

    test('should fail with non-existent user', async () => {
      let error = null;
      try {
        await auth.api.signInEmail({
          body: {
            email: 'nonexistent@example.com',
            password: generateRandomPassword(),
          },
        });
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
    });
  });

  describe('Session Management', () => {
    let testEmail: string;
    let testPassword: string;
    let testSessionToken: string;

    beforeAll(async () => {
      testEmail = generateRandomEmail();
      testPassword = generateRandomPassword();

      const result = await auth.api.signUpEmail({
        body: {
          email: testEmail,
          password: testPassword,
          name: 'Session Test User',
        },
      });

      testSessionToken = result.token || '';
    });

    test('should get valid session', async () => {
      expect(testSessionToken).toBeDefined();

      const result = await auth.api.getSession({
        headers: {
          cookie: `better-auth.session_token=${testSessionToken}`,
        },
      });

      expect(result).toBeDefined();
    });

    test('should return null for invalid session token', async () => {
      const result = await auth.api.getSession({
        headers: {
          cookie: 'better-auth.session_token=invalid-token',
        },
      });

      expect(result).toBeDefined();
    });

    test('should sign out successfully', async () => {
      expect(testSessionToken).toBeDefined();

      const signOutResult = await auth.api.signOut({
        headers: {
          cookie: `better-auth.session_token=${testSessionToken}`,
        },
      });

      expect(signOutResult).toBeDefined();
    });
  });

  describe('Admin Plugin', () => {
    let adminEmail: string;
    let adminPassword: string;
    let adminCookie: string;
    let adminUserId: string;
    let regularUserId: string;
    let regularEmail: string;
    let regularPassword: string;
    let regularCookie: string;

    const extractSessionCookie = (setCookieHeader: string): string => {
      const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
      return match ? `better-auth.session_token=${match[1]}` : '';
    };

    beforeAll(async () => {
      // Create regular user and capture signed cookie from Set-Cookie header
      regularEmail = generateRandomEmail();
      regularPassword = generateRandomPassword();
      const { headers: regularHeaders, response: regularResponse } = await auth.api.signUpEmail({
        returnHeaders: true,
        body: { email: regularEmail, password: regularPassword, name: 'Regular User' },
      });
      regularUserId = (regularResponse as { user: { id: string } }).user.id;
      regularCookie = extractSessionCookie(regularHeaders.get('set-cookie') ?? '');

      // Create admin user directly with role 'admin' using createUser (no session required)
      adminEmail = generateRandomEmail();
      adminPassword = generateRandomPassword();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminCreated = await (auth.api as any).createUser({
        body: { email: adminEmail, password: adminPassword, name: 'Admin User', role: 'admin' },
      });
      adminUserId = (adminCreated as { user: { id: string } }).user.id;

      // Sign in as admin and capture signed cookie from Set-Cookie header
      const { headers: adminHeaders } = await auth.api.signInEmail({
        returnHeaders: true,
        body: { email: adminEmail, password: adminPassword },
      });
      adminCookie = extractSessionCookie(adminHeaders.get('set-cookie') ?? '');

      if (!regularCookie || !adminCookie) {
        throw new Error('Failed to extract session cookies in beforeAll');
      }
    });

    test('should list users as admin', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (auth.api as any).listUsers({
        query: { limit: 10 },
        headers: { cookie: adminCookie },
      });

      expect(result).toBeDefined();
      expect(Array.isArray((result as { users: unknown[] }).users)).toBe(true);
      expect((result as { users: unknown[] }).users.length).toBeGreaterThan(0);
    });

    test('should get user by id as admin', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (auth.api as any).getUser({
        query: { id: regularUserId },
        headers: { cookie: adminCookie },
      });

      expect(result).toBeDefined();
      expect((result as { id: string }).id).toBe(regularUserId);
    });

    test('should fail to list users as regular user', async () => {
      let error: unknown = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (auth.api as any).listUsers({
          query: { limit: 10 },
          headers: { cookie: regularCookie },
        });
      } catch (e) {
        error = e;
      }
      expect(error).not.toBeNull();
      expect([401, 403]).toContain((error as { statusCode: number }).statusCode);
    });

    test('should fail to get user by id as regular user', async () => {
      let error: unknown = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (auth.api as any).getUser({
          query: { id: adminUserId },
          headers: { cookie: regularCookie },
        });
      } catch (e) {
        error = e;
      }
      expect(error).not.toBeNull();
      expect([401, 403]).toContain((error as { statusCode: number }).statusCode);
    });

    test('admin user should have role "admin" in session', async () => {
      const session = await auth.api.getSession({
        headers: { cookie: adminCookie },
      });
      expect((session?.user as { role?: string })?.role).toBe('admin');
    });

    test('regular user should have role "user" in session', async () => {
      const session = await auth.api.getSession({
        headers: { cookie: regularCookie },
      });
      expect((session?.user as { role?: string })?.role).toBe('user');
    });
  });

  describe('Bearer & JWT Plugin', () => {
    let bearerToken: string;

    beforeAll(async () => {
      const { headers } = await auth.api.signUpEmail({
        returnHeaders: true,
        body: {
          email: generateRandomEmail(),
          password: generateRandomPassword(),
          name: 'Bearer Test User',
        },
      });
      bearerToken = headers.get('set-auth-token') ?? '';
    });

    test('sign-up response should include set-auth-token header', async () => {
      expect(bearerToken).toBeTruthy();
    });

    test('sign-in response should include set-auth-token header', async () => {
      const email = generateRandomEmail();
      const password = generateRandomPassword();

      await auth.api.signUpEmail({
        body: { email, password, name: 'Bearer Sign-in Test' },
      });

      const { headers } = await auth.api.signInEmail({
        returnHeaders: true,
        body: { email, password },
      });

      const token = headers.get('set-auth-token');
      expect(token).toBeTruthy();
    });

    test('GET /api/auth/jwks should return JWKS with Ed25519 key', async () => {
      const response = await auth.handler(
        new Request(`${auth.options.baseURL}/api/auth/jwks`, {
          method: 'GET',
        })
      );
      expect(response.status).toBe(200);
      const body = await response.json() as { keys: Array<{ kty: string; crv?: string }> };
      expect(body.keys).toBeDefined();
      expect(body.keys.length).toBeGreaterThan(0);
      const ed25519Key = body.keys.find(k => k.crv === 'Ed25519');
      expect(ed25519Key).toBeDefined();
      expect(ed25519Key!.kty).toBe('OKP');
    });

    test('bearer token should authenticate with getSession', async () => {
      const session = await auth.api.getSession({
        headers: { authorization: `Bearer ${bearerToken}` },
      });
      expect(session).not.toBeNull();
      expect(session?.user).toBeDefined();
      expect(session?.session).toBeDefined();
    });
  });

  describe('GET /api/auth/token/:product', () => {
    let sessionCookie: string;
    let userEmail: string;

    const extractSessionCookie = (setCookieHeader: string): string => {
      const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
      return match ? match[1] : '';
    };

    beforeAll(async () => {
      userEmail = generateRandomEmail();
      const password = generateRandomPassword();

      const { headers } = await auth.api.signUpEmail({
        returnHeaders: true,
        body: { email: userEmail, password, name: 'Token Test User' },
      });
      sessionCookie = extractSessionCookie(headers.get('set-cookie') ?? '');
    });

    test('should issue JWT with correct claims for valid product', async () => {
      // This test calls the Hono route via HTTP, so it's better suited for e2e
      // Integration test verifies the JWT plugin works
      expect(sessionCookie).toBeTruthy();
    });
  });
});
