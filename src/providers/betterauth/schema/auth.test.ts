import { describe, expect, test } from 'bun:test';

describe('auth.ts (schema export)', () => {
  test('should export auth singleton', () => {
    const { auth } = require('./auth');
    expect(auth).toBeDefined();
    expect((auth as any).options).toBeDefined();
  });

  test('should have emailAndPassword enabled', () => {
    const { auth } = require('./auth');
    expect((auth as any).options.emailAndPassword?.enabled).toBe(true);
  });

  test('should have emailAndPassword requireEmailVerification set to false', () => {
    const { auth } = require('./auth');
    expect((auth as any).options.emailAndPassword?.requireEmailVerification).toBe(false);
  });

  test('should have plugins configured', () => {
    const { auth } = require('./auth');
    expect((auth as any).options.plugins).toBeDefined();
    expect(Array.isArray((auth as any).options.plugins)).toBe(true);
    expect((auth as any).options.plugins.length).toBeGreaterThan(0);
  });

  test('should have database configured', () => {
    const { auth } = require('./auth');
    expect((auth as any).options.database).toBeDefined();
    expect(typeof (auth as any).options.database).toBe('object');
  });
});
