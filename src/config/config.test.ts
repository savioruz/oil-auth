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
});
