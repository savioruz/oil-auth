import { describe, expect, mock, test } from 'bun:test';
import type { Logger } from '@infras/logger/logger';
import { logResolvedCallbackUrl } from './hooks';

function makeMockLogger(): Logger & {
  warn: ReturnType<typeof mock>;
  debug: ReturnType<typeof mock>;
  info: ReturnType<typeof mock>;
} {
  return {
    warn: mock(),
    debug: mock(),
    info: mock(),
  } as unknown as Logger & {
    warn: ReturnType<typeof mock>;
    debug: ReturnType<typeof mock>;
    info: ReturnType<typeof mock>;
  };
}

describe('logResolvedCallbackUrl', () => {
  test('does nothing when callbackURL is undefined', () => {
    const logger = makeMockLogger();
    logResolvedCallbackUrl(logger, '/verify-email', undefined);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  test('does nothing when callbackURL is empty string', () => {
    const logger = makeMockLogger();
    logResolvedCallbackUrl(logger, '/verify-email', '');
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  test('warns when callbackURL is a relative path', () => {
    const logger = makeMockLogger();
    logResolvedCallbackUrl(logger, '/verify-email', '/');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.debug).not.toHaveBeenCalled();
  });

  test('warns when callbackURL is a relative nested path', () => {
    const logger = makeMockLogger();
    logResolvedCallbackUrl(logger, '/verify-email', '/dashboard?foo=bar');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.debug).not.toHaveBeenCalled();
  });

  test('logs at debug when callbackURL is absolute http', () => {
    const logger = makeMockLogger();
    logResolvedCallbackUrl(logger, '/verify-email', 'http://localhost:3000/welcome');
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledTimes(1);
  });

  test('logs at debug when callbackURL is absolute https', () => {
    const logger = makeMockLogger();
    logResolvedCallbackUrl(logger, '/verify-email', 'https://app.dev.erza.ai/welcome');
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledTimes(1);
  });

  test('includes path and callbackURL in the warn payload', () => {
    const logger = makeMockLogger();
    logResolvedCallbackUrl(logger, '/verify-email', '/');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/verify-email', callbackURL: '/' }),
      expect.any(String)
    );
  });
});
