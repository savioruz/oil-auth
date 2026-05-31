import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { MockProvider } from '@domains/identity/provider.mock';
import { makeMockProvider } from '@domains/identity/provider.mock';
import { Hono } from 'hono';
import { identityMiddleware } from './identity';

const makeApp = (mockService: MockProvider) => {
  const app = new Hono();
  app.use('*', identityMiddleware(mockService as any));
  app.get('/test', (c) => c.json({ identity: c.identity }));
  return app;
};

describe('identityMiddleware', () => {
  let mockService: MockProvider;

  beforeEach(() => {
    mockService = makeMockProvider();
    mockService.verify.mockImplementation(() =>
      Promise.resolve({
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
  });

  test('attaches identityService to context', async () => {
    const app = new Hono();
    app.use('*', identityMiddleware(mockService as any));
    app.get('/test', (c) => c.json({ hasService: !!c.identityService }));

    const res = await app.request('/test');
    const body = (await res.json()) as Record<string, any>;
    expect(body.hasService).toBe(true);
  });

  test('sets identity from Authorization Bearer token', async () => {
    const app = makeApp(mockService);

    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer my-token' },
    });

    expect(mockService.verify).toHaveBeenCalled();
    expect((mockService.verify as ReturnType<typeof mock>).mock.calls[0][0]).toBe('my-token');
    const body = (await res.json()) as Record<string, any>;
    expect(body.identity?.id).toBe('user-123');
  });

  test('sets identity from better-auth session cookie', async () => {
    const app = makeApp(mockService);

    const res = await app.request('/test', {
      headers: { Cookie: 'better-auth.session_token=cookie-token; other=value' },
    });

    expect(mockService.verify).toHaveBeenCalled();
    expect((mockService.verify as ReturnType<typeof mock>).mock.calls[0][0]).toBe('cookie-token');
    const body = (await res.json()) as Record<string, any>;
    expect(body.identity?.id).toBe('user-123');
  });

  test('prefers Authorization header over cookie', async () => {
    const app = makeApp(mockService);

    await app.request('/test', {
      headers: {
        Authorization: 'Bearer bearer-token',
        Cookie: 'better-auth.session_token=cookie-token',
      },
    });

    expect(mockService.verify).toHaveBeenCalled();
    expect((mockService.verify as ReturnType<typeof mock>).mock.calls[0][0]).toBe('bearer-token');
  });

  test('sets identity to null when no auth header or cookie', async () => {
    const app = makeApp(mockService);

    const res = await app.request('/test');

    expect(mockService.verify).not.toHaveBeenCalled();
    const body = (await res.json()) as Record<string, any>;
    expect(body.identity).toBeNull();
  });

  test('sets identity to null when cookie has no session token', async () => {
    const app = makeApp(mockService);

    const res = await app.request('/test', {
      headers: { Cookie: 'other=value; another=thing' },
    });

    expect(mockService.verify).not.toHaveBeenCalled();
    const body = (await res.json()) as Record<string, any>;
    expect(body.identity).toBeNull();
  });

  test('sets identity to null when verify returns null', async () => {
    mockService.verify = mock(() => Promise.resolve(null));
    const app = makeApp(mockService);

    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer expired-token' },
    });

    const body = (await res.json()) as Record<string, any>;
    expect(body.identity).toBeNull();
  });

  test('sets identity to null when verify throws', async () => {
    mockService.verify = mock(() => Promise.reject(new Error('Network error')));
    const app = makeApp(mockService);

    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer bad-token' },
    });

    const body = (await res.json()) as Record<string, any>;
    expect(body.identity).toBeNull();
  });

  test('still calls next() even when identity is null', async () => {
    const app = new Hono();
    app.use('*', identityMiddleware(mockService as any));
    app.get('/test', (c) => c.json({ reached: true }));

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.reached).toBe(true);
  });

  test('passes otelContext from c.get to identityService.verify', async () => {
    const fakeOtelCtx = { kind: 'otel-context' } as any;
    const verifyMock = mock(() => Promise.resolve(null));
    const serviceWithVerify = { verify: verifyMock } as any;

    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('otelContext', fakeOtelCtx);
      await next();
    });
    app.use('*', identityMiddleware(serviceWithVerify));
    app.get('/test', (c) => c.json({}));

    await app.request('/test', { headers: { Authorization: 'Bearer some-token' } });

    expect(verifyMock).toHaveBeenCalledWith('some-token', fakeOtelCtx);
  });
});
