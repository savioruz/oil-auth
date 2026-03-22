import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';
import { tracingMiddleware } from './tracing';

const makeMockOtel = () => {
  const scope = {
    setAttributes: mock(),
    setAttribute: mock(),
    addEvent: mock(),
    end: mock(),
    traceIfError: mock(),
  };
  return {
    otel: { newScope: mock(() => [{}, scope]) },
    scope,
  };
};

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

    await app.request('http://localhost/test');

    expect(mockOtel.newScope).toHaveBeenCalledWith(expect.anything(), 'http.server', 'GET /test');
    expect(scope.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'http.method': 'GET',
        'http.target': '/test',
        'http.scheme': 'http',
      })
    );
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
