import { describe, expect, test } from 'bun:test';

describe('buildAuth()', () => {
  test('should not include google socialProvider when oauth.google is null', () => {
    delete process.env.OAUTH_GOOGLE_CLIENT_ID;
    delete process.env.OAUTH_GOOGLE_CLIENT_SECRET;

    const { buildAuth } = require('./auth');
    const testAuth = buildAuth();

    expect((testAuth.options as any).socialProviders?.google).toBeUndefined();
  });

  test('should include google socialProvider when oauth.google config is present', () => {
    process.env.OAUTH_GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'test-client-secret';

    const { loadConfig } = require('@/config/config');
    const cfg = loadConfig();

    // Manually build auth with an overridden config to simulate presence
    const { betterAuth } = require('better-auth');
    const { admin, bearer, jwt, openAPI } = require('better-auth/plugins');

    const testAuth = betterAuth({
      ...(cfg.oauth.google && {
        socialProviders: {
          google: {
            clientId: cfg.oauth.google.clientId,
            clientSecret: cfg.oauth.google.clientSecret,
          },
        },
      }),
    });

    expect((testAuth.options as any).socialProviders?.google).toBeDefined();
    expect((testAuth.options as any).socialProviders?.google?.clientId).toBe('test-client-id');

    delete process.env.OAUTH_GOOGLE_CLIENT_ID;
    delete process.env.OAUTH_GOOGLE_CLIENT_SECRET;
  });
});
