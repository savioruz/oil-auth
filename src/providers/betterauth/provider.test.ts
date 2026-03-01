import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { BetterAuthProviderAdapter } from './provider';

describe('BetterAuthProviderAdapter', () => {
  let mockAuth: any;
  let provider: BetterAuthProviderAdapter;

  beforeEach(() => {
    mockAuth = {
      api: {
        getSession: mock(),
        signOut: mock(),
      },
    };
    provider = new BetterAuthProviderAdapter(mockAuth);
  });

  describe('verify()', () => {
    test('should return identity when session is valid', async () => {
      mockAuth.api.getSession.mockImplementation(() =>
        Promise.resolve({
          session: { token: 'token-123' },
          user: {
            id: 'user-123',
            email: 'test@example.com',
            emailVerified: true,
            name: 'Test User',
            image: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        })
      );

      const result = await provider.verify('valid-token');

      expect(result).toBeDefined();
      expect(result?.id).toBe('user-123');
      expect(result?.email).toBe('test@example.com');
    });

    test('should return null when session is null', async () => {
      mockAuth.api.getSession.mockImplementation(() => Promise.resolve(null));

      const result = await provider.verify('invalid-token');

      expect(result).toBeNull();
    });

    test('should return null when getSession throws', async () => {
      mockAuth.api.getSession.mockImplementation(() => Promise.reject(new Error('Network error')));

      const result = await provider.verify('token');

      expect(result).toBeNull();
    });

    test('should call getSession with correct cookie', async () => {
      mockAuth.api.getSession.mockImplementation(() =>
        Promise.resolve({
          session: { token: 'token-123' },
          user: {
            id: 'user-123',
            email: 'test@example.com',
            emailVerified: false,
            name: null,
            image: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        })
      );

      await provider.verify('my-token');

      expect(mockAuth.api.getSession).toHaveBeenCalledWith({
        headers: {
          cookie: 'better-auth.session_token=my-token',
        },
      });
    });
  });

  describe('signOut()', () => {
    test('should call signOut with correct cookie', async () => {
      mockAuth.api.signOut.mockImplementation(() => Promise.resolve());

      await provider.signOut('token-to-sign-out');

      expect(mockAuth.api.signOut).toHaveBeenCalledWith({
        headers: {
          cookie: 'better-auth.session_token=token-to-sign-out',
        },
      });
    });

    test('should throw when signOut fails', async () => {
      mockAuth.api.signOut.mockImplementation(() => Promise.reject(new Error('Sign out failed')));

      await expect(provider.signOut('token')).rejects.toThrow('Sign out failed');
    });
  });
});
