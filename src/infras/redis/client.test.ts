import { beforeEach, describe, expect, mock, test } from 'bun:test';

describe('RedisClient', () => {
  let _mockRedis: any;

  beforeEach(() => {
    _mockRedis = {
      get: mock(),
      set: mock(),
      del: mock(),
      incr: mock(),
      expire: mock(),
      quit: mock(),
    };
  });

  test('createRedisClient should return null when redis config is undefined', () => {
    const { createRedisClient } = require('./client');
    const config = { redis: undefined };

    const client = createRedisClient(config as any);
    expect(client).toBeNull();
  });

  test('createRedisClient should return null when redis config is not provided', () => {
    const { createRedisClient } = require('./client');
    const config = {};

    const client = createRedisClient(config as any);
    expect(client).toBeNull();
  });

  test('RedisClient should have get method', () => {
    const { RedisClient } = require('./client');

    const mockConfig = {
      redis: { host: 'localhost', port: 6379, db: 0 },
    };

    const client = new RedisClient(mockConfig as any);
    expect(typeof client.get).toBe('function');
  });

  test('RedisClient should have set method', () => {
    const { RedisClient } = require('./client');

    const mockConfig = {
      redis: { host: 'localhost', port: 6379, db: 0 },
    };

    const client = new RedisClient(mockConfig as any);
    expect(typeof client.set).toBe('function');
  });

  test('RedisClient should have del method', () => {
    const { RedisClient } = require('./client');

    const mockConfig = {
      redis: { host: 'localhost', port: 6379, db: 0 },
    };

    const client = new RedisClient(mockConfig as any);
    expect(typeof client.del).toBe('function');
  });

  test('RedisClient should have incr method', () => {
    const { RedisClient } = require('./client');

    const mockConfig = {
      redis: { host: 'localhost', port: 6379, db: 0 },
    };

    const client = new RedisClient(mockConfig as any);
    expect(typeof client.incr).toBe('function');
  });

  test('RedisClient should have expire method', () => {
    const { RedisClient } = require('./client');

    const mockConfig = {
      redis: { host: 'localhost', port: 6379, db: 0 },
    };

    const client = new RedisClient(mockConfig as any);
    expect(typeof client.expire).toBe('function');
  });

  test('RedisClient should have quit method', () => {
    const { RedisClient } = require('./client');

    const mockConfig = {
      redis: { host: 'localhost', port: 6379, db: 0 },
    };

    const client = new RedisClient(mockConfig as any);
    expect(typeof client.quit).toBe('function');
  });
});
