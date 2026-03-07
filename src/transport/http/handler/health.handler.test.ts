import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';
import { createHealthHandler } from './health.handler';

describe('createHealthHandler', () => {
  let mockPostgresClient: any;

  beforeEach(() => {
    mockPostgresClient = {
      getPool: mock(() => ({
        query: mock(() => Promise.resolve({ rows: [{ '?column?': 1 }] })),
      })),
    };
  });

  test('returns 200 with status ok when DB is reachable', async () => {
    const app = new Hono();
    app.get('/health', createHealthHandler(mockPostgresClient));

    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.status).toBe('ok');
  });

  test('returns 503 with status error when DB query throws', async () => {
    mockPostgresClient.getPool = mock(() => ({
      query: mock(() => Promise.reject(new Error('Connection refused'))),
    }));

    const app = new Hono();
    app.get('/health', createHealthHandler(mockPostgresClient));

    const res = await app.request('/health');
    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, any>;
    expect(body.status).toBe('error');
  });

  test('calls getPool().query with SELECT 1', async () => {
    const queryMock = mock(() => Promise.resolve({ rows: [] }));
    mockPostgresClient.getPool = mock(() => ({ query: queryMock }));

    const app = new Hono();
    app.get('/health', createHealthHandler(mockPostgresClient));

    await app.request('/health');

    expect(queryMock).toHaveBeenCalledWith('SELECT 1');
  });
});
