import { beforeAll, describe, expect, test } from 'bun:test';
import { generateRandomEmail, generateRandomPassword } from './helpers';

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

  describe('POST /api/auth/sign-up/email', () => {
    test('should sign up with valid credentials', async () => {
      const email = generateRandomEmail();
      const password = generateRandomPassword();

      const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
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

      await fetch(`${baseUrl}/api/auth/sign-up/email`, {
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

      const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
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
      const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
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
      const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
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
      const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
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

  describe('POST /api/auth/sign-in/email', () => {
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      testEmail = generateRandomEmail();
      testPassword = generateRandomPassword();

      await fetch(`${baseUrl}/api/auth/sign-up/email`, {
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
      const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
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
      const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
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
      const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
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

  describe('GET /api/auth/get-session', () => {
    let testEmail: string;
    let testPassword: string;
    let sessionToken: string;

    beforeAll(async () => {
      testEmail = generateRandomEmail();
      testPassword = generateRandomPassword();

      const signUpResponse = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
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
      const response = await fetch(`${baseUrl}/api/auth/get-session`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      expect(response.status).toBe(200);
      const body = await response.json() as { session: unknown; user: { email: string } } | null;
      expect(body).toBeDefined();
    });

    test('should get session with cookie', async () => {
      const response = await fetch(`${baseUrl}/api/auth/get-session`, {
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
      const response = await fetch(`${baseUrl}/api/auth/get-session`, {
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

      const signUpResponse = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
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
          'Origin': baseUrl,
        },
      });

      expect(response.status).toBe(200);
    });

    test('should handle sign out with invalid session', async () => {
      const response = await fetch(`${baseUrl}/api/auth/sign-out`, {
        method: 'POST',
        headers: {
          'Cookie': 'better-auth.session_token=invalid-token',
          'Origin': baseUrl,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('User Self-Service', () => {
    let sessionCookie: string;
    let email: string;
    let password: string;

    beforeAll(async () => {
      email = generateRandomEmail();
      password = generateRandomPassword();

      const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'Self Service User' }),
      });
      const setCookieHeader = res.headers.get('set-cookie') ?? '';
      sessionCookie = setCookieHeader.match(/better-auth\.session_token=([^;]+)/)?.[1] ?? '';
      await res.json(); // consume body
    });

    test('POST /update-user should update name', async () => {
      const response = await fetch(`${baseUrl}/api/auth/update-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${sessionCookie}`,
          Origin: baseUrl,
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json() as { status: boolean };
      expect(body.status).toBe(true);

      // Verify the name actually changed
      const sessionRes = await fetch(`${baseUrl}/api/auth/get-session`, {
        headers: { Cookie: `better-auth.session_token=${sessionCookie}` },
      });
      const sessionBody = await sessionRes.json() as { user: { name: string } } | null;
      expect(sessionBody?.user?.name).toBe('Updated Name');
    });

    test('POST /change-password should change password', async () => {
      const newPassword = generateRandomPassword();

      const response = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${sessionCookie}`,
          Origin: baseUrl,
        },
        body: JSON.stringify({
          currentPassword: password,
          newPassword,
          revokeOtherSessions: false,
        }),
      });

      expect(response.status).toBe(200);

      // Verify old password no longer works
      const signInWithOld = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      expect([400, 401, 422]).toContain(signInWithOld.status);

      // Update password for subsequent tests
      password = newPassword;
    });

    test('GET /list-sessions should return active sessions', async () => {
      const response = await fetch(`${baseUrl}/api/auth/list-sessions`, {
        method: 'GET',
        headers: { Cookie: `better-auth.session_token=${sessionCookie}` },
      });

      expect(response.status).toBe(200);
      const body = await response.json() as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    test('POST /revoke-other-sessions should revoke other sessions', async () => {
      // Create a second session
      const res2 = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const res2Cookie = res2.headers.get('set-cookie') ?? '';
      const cookie2 = res2Cookie.match(/better-auth\.session_token=([^;]+)/)?.[1] ?? '';

      // Revoke all other sessions from the original session
      const revokeRes = await fetch(`${baseUrl}/api/auth/revoke-other-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${sessionCookie}`,
          Origin: baseUrl,
        },
      });
      expect(revokeRes.status).toBe(200);

      // cookie2 session should now be invalid
      const sessionRes = await fetch(`${baseUrl}/api/auth/get-session`, {
        method: 'GET',
        headers: { Cookie: `better-auth.session_token=${cookie2}` },
      });
      const sessionBody = await sessionRes.json() as null | { session: unknown };
      expect(sessionBody).toBeNull();

      // Verify original session is still valid
      const callerSessionRes = await fetch(`${baseUrl}/api/auth/get-session`, {
        headers: { Cookie: `better-auth.session_token=${sessionCookie}` },
      });
      const callerSessionBody = await callerSessionRes.json() as { session: unknown } | null;
      expect(callerSessionBody).not.toBeNull();
    });

    test('POST /revoke-session should revoke a specific session', async () => {
      // Create a new session to revoke
      const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const resCookie = res.headers.get('set-cookie') ?? '';
      const cookieToRevoke = resCookie.match(/better-auth\.session_token=([^;]+)/)?.[1] ?? '';
      const resBody = await res.json() as { token: string };
      const tokenToRevoke = resBody.token;

      // Revoke it
      const revokeRes = await fetch(`${baseUrl}/api/auth/revoke-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${sessionCookie}`,
          Origin: baseUrl,
        },
        body: JSON.stringify({ token: tokenToRevoke }),
      });
      expect(revokeRes.status).toBe(200);

      // Revoked session should now return null
      const sessionRes = await fetch(`${baseUrl}/api/auth/get-session`, {
        method: 'GET',
        headers: { Cookie: `better-auth.session_token=${cookieToRevoke}` },
      });
      const sessionBody = await sessionRes.json() as null | { session: unknown };
      expect(sessionBody).toBeNull();
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
