import { describe, expect, test } from 'bun:test';

describe('Logger', () => {
  test('createLogger should be a function', () => {
    const { createLogger } = require('./logger');
    expect(typeof createLogger).toBe('function');
  });

  test('createLogger should return a logger instance', () => {
    const { createLogger } = require('./logger');

    const mockConfig = {
      app: {
        env: 'test',
        name: 'test-app',
        port: 3000,
      },
      log: {
        level: 'info',
      },
    };

    const logger = createLogger(mockConfig as any);
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  test('createLogger should use correct log level from config', () => {
    const { createLogger } = require('./logger');

    const mockConfig = {
      app: {
        env: 'test',
        name: 'test-app',
        port: 3000,
      },
      log: {
        level: 'error',
      },
    };

    const logger = createLogger(mockConfig as any);
    expect(logger.level).toBe('error');
  });

  test('createLogger should use debug level in development', () => {
    const { createLogger } = require('./logger');

    const mockConfig = {
      app: {
        env: 'development',
        name: 'test-app',
        port: 3000,
      },
      log: {
        level: 'debug',
      },
    };

    const logger = createLogger(mockConfig as any);
    expect(logger.level).toBe('debug');
  });

  test('Logger should have child method', () => {
    const { createLogger } = require('./logger');

    const mockConfig = {
      app: {
        env: 'test',
        name: 'test-app',
        port: 3000,
      },
      log: {
        level: 'info',
      },
    };

    const logger = createLogger(mockConfig as any);
    expect(typeof logger.child).toBe('function');
  });
});
