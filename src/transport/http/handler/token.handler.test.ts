import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  InvalidAudienceError,
  NoSigningKeyError,
  SigningKeyImportError,
  UnauthorizedError,
} from '@domains/token/token.service';
import { Hono } from 'hono';
import { createTokenHandler } from './token.handler';

const makeApp = (tokenService: any) => {
  const app = new Hono();
  app.get('/api/auth/token/:product', createTokenHandler(tokenService));
  return app;
};

describe('createTokenHandler', () => {
  let mockTokenService: any;

  beforeEach(() => {
    mockTokenService = {
      issueToken: mock(() => Promise.resolve('signed.jwt.token')),
    };
  });

  test('returns 200 with token on success via Bearer header', async () => {
    const app = makeApp(mockTokenService);

    const res = await app.request('/api/auth/token/productA', {
      method: 'GET',
      headers: { Authorization: 'Bearer my-session-token' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.token).toBe('signed.jwt.token');
    expect(mockTokenService.issueToken).toHaveBeenCalledWith('productA', {
      authorization: 'Bearer my-session-token',
    });
  });

  test('returns 200 with token on success via Cookie header', async () => {
    const app = makeApp(mockTokenService);

    const res = await app.request('/api/auth/token/productB', {
      method: 'GET',
      headers: { Cookie: 'better-auth.session_token=cookie-token' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.token).toBe('signed.jwt.token');
    expect(mockTokenService.issueToken).toHaveBeenCalledWith('productB', {
      cookie: 'better-auth.session_token=cookie-token',
    });
  });

  test('returns 401 when no auth header or cookie provided', async () => {
    const app = makeApp(mockTokenService);

    const res = await app.request('/api/auth/token/productA', { method: 'GET' });

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBe('unauthorized');
    expect(mockTokenService.issueToken).not.toHaveBeenCalled();
  });

  test('returns 400 for InvalidAudienceError', async () => {
    mockTokenService.issueToken = mock(() =>
      Promise.reject(new InvalidAudienceError('unknown-product'))
    );
    const app = makeApp(mockTokenService);

    const res = await app.request('/api/auth/token/unknown-product', {
      method: 'GET',
      headers: { Authorization: 'Bearer token' },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBe('invalid_audience');
  });

  test('returns 401 for UnauthorizedError', async () => {
    mockTokenService.issueToken = mock(() => Promise.reject(new UnauthorizedError()));
    const app = makeApp(mockTokenService);

    const res = await app.request('/api/auth/token/productA', {
      method: 'GET',
      headers: { Authorization: 'Bearer bad-token' },
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBe('unauthorized');
  });

  test('returns 500 for NoSigningKeyError', async () => {
    mockTokenService.issueToken = mock(() => Promise.reject(new NoSigningKeyError()));
    const app = makeApp(mockTokenService);

    const res = await app.request('/api/auth/token/productA', {
      method: 'GET',
      headers: { Authorization: 'Bearer token' },
    });

    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBe('server_error');
  });

  test('returns 500 for SigningKeyImportError', async () => {
    mockTokenService.issueToken = mock(() => Promise.reject(new SigningKeyImportError()));
    const app = makeApp(mockTokenService);

    const res = await app.request('/api/auth/token/productA', {
      method: 'GET',
      headers: { Authorization: 'Bearer token' },
    });

    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBe('server_error');
  });

  test('returns 500 for unexpected errors', async () => {
    mockTokenService.issueToken = mock(() => Promise.reject(new Error('Something unexpected')));
    const app = makeApp(mockTokenService);

    const res = await app.request('/api/auth/token/productA', {
      method: 'GET',
      headers: { Authorization: 'Bearer token' },
    });

    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error).toBe('server_error');
    expect(body.message).toBe('Unexpected error');
  });

  test('prefers Authorization header over Cookie', async () => {
    const app = makeApp(mockTokenService);

    await app.request('/api/auth/token/productA', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer bearer-token',
        Cookie: 'better-auth.session_token=cookie-token',
      },
    });

    expect(mockTokenService.issueToken).toHaveBeenCalledWith('productA', {
      authorization: 'Bearer bearer-token',
    });
  });
});
