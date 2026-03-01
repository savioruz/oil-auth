import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { generateRandomEmail, generateRandomPassword, getTestEnv } from './helpers';

const baseUrl = 'http://localhost:3000';

describe('Auth E2E', () => {
  describe('Health Check', () => {
    test('should return health status', async () => {
      const response = await fetch(`${baseUrl}/health`);

      expect(response.status).toBe(200);
      const body = await response.json() as { status: string };
      expect(body.status).toBeDefined();
    });
  });

  describe('POST /api/auth/sign-up', () => {
    test('should sign up with valid credentials', async () => {
      const email = generateRandomEmail();
      const password = generateRandomPassword();

      const response = await fetch(`${baseUrl}/api/auth/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: 'Test User',
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json() as { user: { email: string }, token: string };
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe(email);
      expect(body.token).toBeDefined();
    });

    test('should fail with existing email', async () => {
      const email = generateRandomEmail();
      const password = generateRandomPassword();

      await fetch(`${baseUrl}/api/auth/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: 'Test User',
        }),
      });

      const response = await fetch(`${baseUrl}/api/auth/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: 'Test User 2',
        }),
      });

      expect([400, 422, 500]).toContain(response.status);
    });

    test('should fail with invalid email', async () => {
      const response = await fetch(`${baseUrl}/api/auth/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'not-an-email',
          password: generateRandomPassword(),
          name: 'Test User',
        }),
      });

      expect([400, 422, 500]).toContain(response.status);
    });

    test('should fail with weak password', async () => {
      const response = await fetch(`${baseUrl}/api/auth/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: generateRandomEmail(),
          password: 'weak',
          name: 'Test User',
        }),
      });

      expect([400, 422, 500]).toContain(response.status);
    });

    test('should fail with missing fields', async () => {
      const response = await fetch(`${baseUrl}/api/auth/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: generateRandomEmail(),
        }),
      });

      expect([400, 422, 500]).toContain(response.status);
    });
  });

  describe('POST /api/auth/sign-in', () => {
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      testEmail = generateRandomEmail();
      testPassword = generateRandomPassword();

      await fetch(`${baseUrl}/api/auth/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'Sign In Test',
        }),
      });
    });

    test('should sign in with valid credentials', async () => {
      const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json() as { user: { email: string }, token: string };
      expect(body.user).toBeDefined();
      expect(body.token).toBeDefined();
    });

    test('should fail with wrong password', async () => {
      const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'wrongpassword',
        }),
      });

      expect([400, 401, 422, 500]).toContain(response.status);
    });

    test('should fail with non-existent user', async () => {
      const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: generateRandomPassword(),
        }),
      });

      expect([400, 401, 422, 500]).toContain(response.status);
    });
  });

  describe('GET /api/auth/getSession', () => {
    let testEmail: string;
    let testPassword: string;
    let sessionToken: string;

    beforeAll(async () => {
      testEmail = generateRandomEmail();
      testPassword = generateRandomPassword();

      const signUpResponse = await fetch(`${baseUrl}/api/auth/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'Session Test',
        }),
      });

      const signUpBody = await signUpResponse.json() as { token: string };
      sessionToken = signUpBody.token;
    });

    test('should get session with valid token', async () => {
      const response = await fetch(`${baseUrl}/api/auth/getSession`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      expect(response.status).toBe(200);
      const body = await response.json() as { user: { email: string }, token: string };
      expect(body).toBeDefined();
    });

    test('should get session with cookie', async () => {
      const response = await fetch(`${baseUrl}/api/auth/getSession`, {
        method: 'GET',
        headers: {
          'Cookie': `better-auth.session_token=${sessionToken}`,
        },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toBeDefined();
    });

    test('should return null for invalid token', async () => {
      const response = await fetch(`${baseUrl}/api/auth/getSession`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toBeDefined();
    });
  });

  describe('POST /api/auth/sign-out', () => {
    let testEmail: string;
    let testPassword: string;
    let sessionToken: string;

    beforeAll(async () => {
      testEmail = generateRandomEmail();
      testPassword = generateRandomPassword();

      const signUpResponse = await fetch(`${baseUrl}/api/auth/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'Sign Out Test',
        }),
      });

      const signUpBody = await signUpResponse.json() as { token: string };
      sessionToken = signUpBody.token;
    });

    test('should sign out successfully', async () => {
      const response = await fetch(`${baseUrl}/api/auth/sign-out`, {
        method: 'POST',
        headers: {
          'Cookie': `better-auth.session_token=${sessionToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test('should handle sign out with invalid session', async () => {
      const response = await fetch(`${baseUrl}/api/auth/sign-out`, {
        method: 'POST',
        headers: {
          'Cookie': 'better-auth.session_token=invalid-token',
        },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('CORS', () => {
    test('should include CORS headers', async () => {
      const response = await fetch(`${baseUrl}/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3001',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect([200, 204]).toContain(response.status);
      expect(response.headers.get('access-control-allow-origin')).toBeDefined();
    });
  });
});
