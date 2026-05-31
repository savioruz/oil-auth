import { describe, expect, test } from 'bun:test';
import { makeMockConfig } from '@config/config.mock';

const mockConfig = makeMockConfig();

describe('PostgresClient', () => {
  test('PostgresClient should be constructable', () => {
    const { PostgresClient } = require('./client');

    const client = new PostgresClient(mockConfig as any);
    expect(client).toBeDefined();
  });

  test('PostgresClient should have getPool method', () => {
    const { PostgresClient } = require('./client');

    const client = new PostgresClient(mockConfig as any);
    expect(typeof client.getPool).toBe('function');
  });

  test('PostgresClient should have end method', () => {
    const { PostgresClient } = require('./client');

    const client = new PostgresClient(mockConfig as any);
    expect(typeof client.end).toBe('function');
  });

  test('PostgresClient should have getConnectionString method', () => {
    const { PostgresClient } = require('./client');

    const client = new PostgresClient(mockConfig as any);
    expect(typeof client.getConnectionString).toBe('function');

    const connString = client.getConnectionString();
    expect(connString).toContain('test_user');
    expect(connString).toContain('test_db');
  });

  test('createPostgresClient should be a function', () => {
    const { createPostgresClient } = require('./client');
    expect(typeof createPostgresClient).toBe('function');
  });

  test('createPostgresClient should return PostgresClient instance', () => {
    const { createPostgresClient } = require('./client');

    const client = createPostgresClient(mockConfig as any);
    expect(client).toBeDefined();
  });
});
