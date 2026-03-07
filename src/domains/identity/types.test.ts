import { describe, expect, test } from 'bun:test';
import type { AuthTokens, UserIdentity } from '@domains/identity/types';

describe('Identity Types', () => {
  test('UserIdentity should have required fields', () => {
    const user: UserIdentity = {
      id: '123',
      email: 'test@example.com',
      emailVerified: true,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(user.id).toBe('123');
    expect(user.email).toBe('test@example.com');
    expect(user.emailVerified).toBe(true);
    expect(user.role).toBe('user');
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  test('UserIdentity should have optional fields', () => {
    const user: UserIdentity = {
      id: '123',
      email: 'test@example.com',
      emailVerified: false,
      name: 'John Doe',
      image: 'https://example.com/avatar.png',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(user.name).toBe('John Doe');
    expect(user.image).toBe('https://example.com/avatar.png');
  });

  test('AuthTokens should have required fields', () => {
    const tokens: AuthTokens = {
      accessToken: 'token123',
      expiresAt: Date.now() + 3600000,
    };

    expect(tokens.accessToken).toBe('token123');
    expect(tokens.expiresAt).toBeGreaterThan(Date.now());
  });

  test('AuthTokens should have optional refreshToken', () => {
    const tokens: AuthTokens = {
      accessToken: 'token123',
      refreshToken: 'refresh123',
      expiresAt: Date.now() + 3600000,
    };

    expect(tokens.refreshToken).toBe('refresh123');
  });
});
