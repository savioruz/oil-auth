import { describe, expect, test } from 'bun:test';

describe('Config', () => {
  test('should have valid app config', () => {
    const { config } = require('./config');

    expect(config.app.name).toBeDefined();
    expect(config.app.port).toBeDefined();
    expect(config.app.env).toBeDefined();
  });

  test('should have valid cors config', () => {
    const { config } = require('./config');

    expect(config.cors.enabled).toBeDefined();
    expect(config.cors.allowCredentials).toBeDefined();
    expect(config.cors.allowedOrigins).toBeDefined();
    expect(Array.isArray(config.cors.allowedOrigins)).toBe(true);
  });

  test('should have valid database config', () => {
    const { config } = require('./config');

    expect(config.database.host).toBeDefined();
    expect(config.database.port).toBeDefined();
    expect(config.database.name).toBeDefined();
  });

  test('should have valid otel config', () => {
    const { config } = require('./config');

    expect(config.otel.enabled).toBeDefined();
    expect(config.otel.protocol).toBeDefined();
    expect(config.otel.endpoint).toBeDefined();
  });

  test('oauth.google should be null when env vars are absent', () => {
    const originalClientId = process.env.OAUTH_GOOGLE_CLIENT_ID;
    const originalClientSecret = process.env.OAUTH_GOOGLE_CLIENT_SECRET;
    delete process.env.OAUTH_GOOGLE_CLIENT_ID;
    delete process.env.OAUTH_GOOGLE_CLIENT_SECRET;

    const { loadConfig } = require('./config');
    const cfg = loadConfig();

    expect(cfg.oauth.google).toBeNull();

    if (originalClientId !== undefined) process.env.OAUTH_GOOGLE_CLIENT_ID = originalClientId;
    if (originalClientSecret !== undefined) process.env.OAUTH_GOOGLE_CLIENT_SECRET = originalClientSecret;
  });

  test('oauth.google should be non-null when env vars are present', () => {
    process.env.OAUTH_GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'test-client-secret';

    const { loadConfig } = require('./config');
    const cfg = loadConfig();

    expect(cfg.oauth.google).not.toBeNull();
    expect(cfg.oauth.google?.clientId).toBe('test-client-id');
    expect(cfg.oauth.google?.clientSecret).toBe('test-client-secret');

    delete process.env.OAUTH_GOOGLE_CLIENT_ID;
    delete process.env.OAUTH_GOOGLE_CLIENT_SECRET;
  });
});
