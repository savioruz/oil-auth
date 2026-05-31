import { beforeEach, describe, expect, test } from 'bun:test';
import { makeMockOtel } from '@infras/otel/otel.mock';
import { Hono } from 'hono';
import { tracingMiddleware } from './tracing';

describe('tracingMiddleware', () => {
  let mockOtel: ReturnType<typeof makeMockOtel>['otel'];
  let scope: ReturnType<typeof makeMockOtel>['scope'];

  beforeEach(() => {
    const m = makeMockOtel();
    mockOtel = m.otel;
    scope = m.scope;
  });

  test('creates a span with correct http attributes', async () => {
    const app = new Hono();
    app.use('*', tracingMiddleware(mockOtel as any));
    app.get('/test', (c) => c.json({ ok: true }));

    await app.request('http://localhost/test', {
      headers: { 'User-Agent': 'test-agent', Host: 'localhost' },
    });

    expect(mockOtel.newScope).toHaveBeenCalledWith(expect.anything(), 'http', 'GET /test');
    expect(scope.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'http.host': 'localhost',
        'http.method': 'GET',
        'http.path': '/test',
        'http.source': '',
        'http.user_agent': 'test-agent',
      })
    );
    expect(scope.setAttribute).toHaveBeenCalledWith('http.route', '/test');
  });

  test('sets http.request_id attribute', async () => {
    const app = new Hono();
    app.use('*', tracingMiddleware(mockOtel as any));
    app.get('/test', (c) => c.json({ ok: true }));

    await app.request('http://localhost/test');

    expect(scope.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'http.request_id': expect.any(String),
      })
    );
  });

  test('uses X-Request-ID from request header when provided', async () => {
    const app = new Hono();
    app.use('*', tracingMiddleware(mockOtel as any));
    app.get('/test', (c) => c.json({ ok: true }));

    const fixedId = 'my-fixed-request-id';
    await app.request('http://localhost/test', {
      headers: { 'X-Request-ID': fixedId },
    });

    expect(scope.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'http.request_id': fixedId,
      })
    );
  });

  test('generates a UUID when no X-Request-ID in request', async () => {
    const app = new Hono();
    app.use('*', tracingMiddleware(mockOtel as any));
    app.get('/test', (c) => c.json({ ok: true }));

    await app.request('http://localhost/test');

    const call = (scope.setAttributes as any).mock.calls[0][0];
    expect(call['http.request_id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  test('sets X-Request-ID response header', async () => {
    const app = new Hono();
    app.use('*', tracingMiddleware(mockOtel as any));
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('http://localhost/test');

    expect(res.headers.get('X-Request-ID')).toBeTruthy();
  });

  test('echoes X-Request-ID from request in response header', async () => {
    const app = new Hono();
    app.use('*', tracingMiddleware(mockOtel as any));
    app.get('/test', (c) => c.json({ ok: true }));

    const fixedId = 'echo-this-id';
    const res = await app.request('http://localhost/test', {
      headers: { 'X-Request-ID': fixedId },
    });

    expect(res.headers.get('X-Request-ID')).toBe(fixedId);
  });

  test('sets http.status_code on response', async () => {
    const app = new Hono();
    app.use('*', tracingMiddleware(mockOtel as any));
    app.get('/test', (c) => c.json({ ok: true }, 201));

    await app.request('http://localhost/test');

    expect(scope.setAttribute).toHaveBeenCalledWith('http.status_code', 201);
    expect(scope.end).toHaveBeenCalled();
  });

  test('ends span even on 404', async () => {
    const app = new Hono();
    app.use('*', tracingMiddleware(mockOtel as any));

    await app.request('http://localhost/not-found');

    expect(scope.end).toHaveBeenCalled();
  });

  test('traces error and ends span on 500 response', async () => {
    const app = new Hono();
    app.use('*', tracingMiddleware(mockOtel as any));
    app.get('/boom', (c) => c.json({ error: 'handler error' }, 500));

    const res = await app.request('http://localhost/boom');
    expect(res.status).toBe(500);

    expect(scope.traceIfError).toHaveBeenCalledWith(expect.any(Error));
    expect(scope.end).toHaveBeenCalled();
  });

  test('calls next() and continues request chain', async () => {
    const app = new Hono();
    app.use('*', tracingMiddleware(mockOtel as any));
    app.get('/ping', (c) => c.text('pong'));

    const res = await app.request('http://localhost/ping');
    expect(await res.text()).toBe('pong');
  });
});
