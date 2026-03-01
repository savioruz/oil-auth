import { describe, expect, mock, test } from 'bun:test';

describe('identityMiddleware', () => {
  test('should export identityMiddleware function', () => {
    const { identityMiddleware } = require('./identity');
    expect(identityMiddleware).toBeDefined();
    expect(typeof identityMiddleware).toBe('function');
  });

  test('identityMiddleware should be callable', () => {
    const { identityMiddleware } = require('./identity');
    const mockService = { verify: mock(), signOut: mock() };

    const middleware = identityMiddleware(mockService as any);
    expect(middleware).toBeDefined();
    expect(typeof middleware).toBe('function');
  });
});
