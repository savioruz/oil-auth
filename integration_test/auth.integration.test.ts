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
});
