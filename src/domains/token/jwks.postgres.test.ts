import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { PostgresJwksRepository } from './jwks.postgres';

describe('PostgresJwksRepository', () => {
  let mockPool: any;
  let repository: PostgresJwksRepository;

  beforeEach(() => {
    mockPool = {
      query: mock(() =>
        Promise.resolve({
          rows: [{ id: 'key-abc', privateKey: '{"kty":"OKP","crv":"Ed25519"}' }],
        })
      ),
    };
    repository = new PostgresJwksRepository(mockPool);
  });

  test('returns the active key when a row exists', async () => {
    const key = await repository.findActiveKey();

    expect(key).not.toBeNull();
    expect(key?.kid).toBe('key-abc');
    expect(key?.privateKeyJson).toBe('{"kty":"OKP","crv":"Ed25519"}');
  });

  test('returns null when no active key exists', async () => {
    mockPool.query = mock(() => Promise.resolve({ rows: [] }));

    const key = await repository.findActiveKey();

    expect(key).toBeNull();
  });

  test('queries with correct SQL including expiry check', async () => {
    await repository.findActiveKey();

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('"expiresAt" IS NULL OR "expiresAt" > NOW()')
    );
  });

  test('queries ordered by createdAt DESC with LIMIT 1', async () => {
    await repository.findActiveKey();

    const sql = (mockPool.query as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(sql).toContain('ORDER BY "createdAt" DESC LIMIT 1');
  });

  test('propagates pool query errors', async () => {
    mockPool.query = mock(() => Promise.reject(new Error('DB connection lost')));

    await expect(repository.findActiveKey()).rejects.toThrow('DB connection lost');
  });
});
