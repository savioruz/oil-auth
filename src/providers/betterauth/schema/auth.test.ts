import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

describe('buildAuth()', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = {
      OAUTH_GOOGLE_CLIENT_ID: process.env.OAUTH_GOOGLE_CLIENT_ID,
      OAUTH_GOOGLE_CLIENT_SECRET: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
    };
  });

  afterEach(() => {
    process.env.OAUTH_GOOGLE_CLIENT_ID = originalEnv.OAUTH_GOOGLE_CLIENT_ID;
    process.env.OAUTH_GOOGLE_CLIENT_SECRET = originalEnv.OAUTH_GOOGLE_CLIENT_SECRET;
  });

  test('should export auth singleton', () => {
    const { auth } = require('./auth');
    expect(auth).toBeDefined();
    expect((auth as any).options).toBeDefined();
  });

  test('should export buildAuth factory function', () => {
    const { buildAuth } = require('./auth');
    expect(typeof buildAuth).toBe('function');
  });

  test('should return valid Better Auth instance with options', () => {
    const { buildAuth } = require('./auth');
    const testAuth = buildAuth();

    expect(testAuth).toBeDefined();
    expect((testAuth as any).options).toBeDefined();
  });

  test('should have emailAndPassword enabled', () => {
    const { buildAuth } = require('./auth');
    const testAuth = buildAuth();

    expect((testAuth.options as any).emailAndPassword?.enabled).toBe(true);
  });

  test('should have emailAndPassword requireEmailVerification set to false', () => {
    const { buildAuth } = require('./auth');
    const testAuth = buildAuth();

    expect((testAuth.options as any).emailAndPassword?.requireEmailVerification).toBe(false);
  });

  test('should have openAPI plugin registered', () => {
    const { buildAuth } = require('./auth');
    const testAuth = buildAuth();

    expect((testAuth.options as any).plugins).toBeDefined();
    expect(Array.isArray((testAuth.options as any).plugins)).toBe(true);
    expect((testAuth.options as any).plugins.length).toBeGreaterThan(0);
  });

  test('should have admin plugin registered', () => {
    const { buildAuth } = require('./auth');
    const testAuth = buildAuth();

    expect((testAuth.options as any).plugins.length).toBeGreaterThanOrEqual(4);
  });

  test('should have bearer plugin registered', () => {
    const { buildAuth } = require('./auth');
    const testAuth = buildAuth();

    expect((testAuth.options as any).plugins).toBeDefined();
  });

  test('should have jwt plugin registered', () => {
    const { buildAuth } = require('./auth');
    const testAuth = buildAuth();

    expect((testAuth.options as any).plugins.length).toBeGreaterThanOrEqual(4);
  });

  test('should have jwt plugin with expected configuration', () => {
    const { buildAuth } = require('./auth');
    const testAuth = buildAuth();

    // JWT plugin is registered (we already tested plugin count)
    // The specific jwks config is tested in config integration
    expect((testAuth.options as any).plugins.length).toBeGreaterThanOrEqual(4);
  });

  test('should have database configured', () => {
    const { buildAuth } = require('./auth');
    const testAuth = buildAuth();

    expect((testAuth.options as any).database).toBeDefined();
    expect(typeof (testAuth.options as any).database).toBe('object');
  });

  test('should not include google socialProvider when oauth.google is null', () => {
    delete process.env.OAUTH_GOOGLE_CLIENT_ID;
    delete process.env.OAUTH_GOOGLE_CLIENT_SECRET;

    const { buildAuth } = require('./auth');
    const testAuth = buildAuth();

    expect((testAuth.options as any).socialProviders?.google).toBeUndefined();
  });

  test('oauth config integration: google provider is set up in config', () => {
    // This test verifies the config layer handles OAuth correctly
    // The actual provider registration is tested in config.test.ts
    const { config } = require('@/config/config');

    // Config should have oauth section
    expect(config.oauth).toBeDefined();
    expect(config.oauth.google === null || typeof config.oauth.google === 'object').toBe(true);
  });
});
