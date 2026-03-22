import { describe, expect, mock, test } from 'bun:test';
import { createOpenAPIRouter } from './openapi';

const makeMockAuth = (schema: unknown = { openapi: '3.0.0', paths: {} }) => ({
  api: {
    generateOpenAPISchema: mock(() => Promise.resolve(schema)),
  },
});

describe('createOpenAPIRouter', () => {
  test('GET /openapi.json returns 200 with the generated schema', async () => {
    const schema = { openapi: '3.0.0', info: { title: 'Oil Auth' }, paths: {} };
    const router = createOpenAPIRouter(makeMockAuth(schema) as any);

    const res = await router.request('/openapi.json');

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.openapi).toBe('3.0.0');
    expect(body.info.title).toBe('Oil Auth');
  });

  test('GET /openapi.json calls generateOpenAPISchema', async () => {
    const mockAuth = makeMockAuth();
    const router = createOpenAPIRouter(mockAuth as any);

    await router.request('/openapi.json');

    expect(mockAuth.api.generateOpenAPISchema).toHaveBeenCalledTimes(1);
  });

  test('GET /docs returns 200 with HTML content', async () => {
    const router = createOpenAPIRouter(makeMockAuth() as any);

    const res = await router.request('/docs');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  test('GET /docs response references /openapi.json', async () => {
    const router = createOpenAPIRouter(makeMockAuth() as any);

    const res = await router.request('/docs');
    const html = await res.text();

    expect(html).toContain('data-url="/openapi.json"');
  });

  test('GET /docs includes Scalar API reference script', async () => {
    const router = createOpenAPIRouter(makeMockAuth() as any);

    const res = await router.request('/docs');
    const html = await res.text();

    expect(html).toContain('@scalar/api-reference');
  });

  test('returns 404 for unknown routes', async () => {
    const router = createOpenAPIRouter(makeMockAuth() as any);

    const res = await router.request('/unknown');

    expect(res.status).toBe(404);
  });
});
