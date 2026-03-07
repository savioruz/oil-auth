import type { PostgresClient } from '@infras/postgres/client';
import type { Handler } from 'hono';

export function createHealthHandler(postgresClient: PostgresClient): Handler {
  return async (c) => {
    try {
      await postgresClient.getPool().query('SELECT 1');
      return c.json({ status: 'ok' });
    } catch {
      return c.json({ status: 'error' }, 503);
    }
  };
}
