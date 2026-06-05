import { describe, expect, test } from 'bun:test';
import { rewriteCallbackUrl } from './callback-url';

describe('rewriteCallbackUrl', () => {
  test('passes through when no default is configured', () => {
    const emailUrl = 'https://auth.dev.erza.ai/api/auth/verify-email?token=tok&callbackURL=%2F';

    const result = rewriteCallbackUrl(emailUrl, undefined);

    expect(result.url).toBe(emailUrl);
    expect(result.rewritten).toBe(false);
    expect(result.reason).toBe('no-default');
  });

  test('rewrites relative callbackURL=%2F to the configured default', () => {
    const emailUrl = 'https://auth.dev.erza.ai/api/auth/verify-email?token=tok&callbackURL=%2F';
    const defaultUrl = 'https://app.dev.erza.ai/';

    const result = rewriteCallbackUrl(emailUrl, defaultUrl);

    const parsed = new URL(result.url);
    expect(parsed.searchParams.get('callbackURL')).toBe(defaultUrl);
    expect(parsed.searchParams.get('token')).toBe('tok');
    expect(result.rewritten).toBe(true);
    expect(result.reason).toBe('relative-replaced');
  });

  test('rewrites relative callbackURL=/dashboard to the configured default', () => {
    const emailUrl =
      'https://auth.dev.erza.ai/api/auth/verify-email?token=tok&callbackURL=%2Fdashboard';
    const defaultUrl = 'https://app.dev.erza.ai/';

    const result = rewriteCallbackUrl(emailUrl, defaultUrl);

    const parsed = new URL(result.url);
    expect(parsed.searchParams.get('callbackURL')).toBe(defaultUrl);
    expect(result.rewritten).toBe(true);
    expect(result.reason).toBe('relative-replaced');
  });

  test('passes through absolute callbackURL provided by the caller', () => {
    const emailUrl =
      'https://auth.dev.erza.ai/api/auth/verify-email?token=tok&callbackURL=https%3A%2F%2Fapp.dev.erza.ai%2Fwelcome';
    const defaultUrl = 'https://app.dev.erza.ai/';

    const result = rewriteCallbackUrl(emailUrl, defaultUrl);

    expect(result.url).toBe(emailUrl);
    expect(result.rewritten).toBe(false);
    expect(result.reason).toBe('caller-provided');
  });

  test('rewrites empty callbackURL to the configured default', () => {
    const emailUrl = 'https://auth.dev.erza.ai/api/auth/reset-password/abc123?callbackURL=';
    const defaultUrl = 'https://app.dev.erza.ai/';

    const result = rewriteCallbackUrl(emailUrl, defaultUrl);

    const parsed = new URL(result.url);
    expect(parsed.searchParams.get('callbackURL')).toBe(defaultUrl);
    expect(result.rewritten).toBe(true);
    expect(result.reason).toBe('relative-replaced');
  });

  test('adds callbackURL when missing entirely and default is configured', () => {
    const emailUrl = 'https://auth.dev.erza.ai/api/auth/verify-email?token=tok';
    const defaultUrl = 'https://app.dev.erza.ai/';

    const result = rewriteCallbackUrl(emailUrl, defaultUrl);

    const parsed = new URL(result.url);
    expect(parsed.searchParams.get('callbackURL')).toBe(defaultUrl);
    expect(parsed.searchParams.get('token')).toBe('tok');
    expect(result.rewritten).toBe(true);
    expect(result.reason).toBe('missing-replaced');
  });

  test('preserves all other query params when rewriting', () => {
    const emailUrl =
      'https://auth.dev.erza.ai/api/auth/verify-email?token=tok&foo=bar&callbackURL=%2F&baz=qux';
    const defaultUrl = 'https://app.dev.erza.ai/';

    const result = rewriteCallbackUrl(emailUrl, defaultUrl);

    const parsed = new URL(result.url);
    expect(parsed.searchParams.get('token')).toBe('tok');
    expect(parsed.searchParams.get('foo')).toBe('bar');
    expect(parsed.searchParams.get('baz')).toBe('qux');
    expect(parsed.searchParams.get('callbackURL')).toBe(defaultUrl);
  });
});
