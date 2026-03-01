import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { IdentityProvider } from './provider';
import { IdentityService } from './service';

describe('IdentityService', () => {
  let mockProvider: IdentityProvider;
  let mockOtel: any;
  let identityService: IdentityService;

  beforeEach(() => {
    mockProvider = {
      verify: mock(() =>
        Promise.resolve({
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      signOut: mock(() => Promise.resolve()),
    };

    mockOtel = {
      newScope: mock(() => {
        const scope = {
          addEvent: mock(),
          setAttribute: mock(),
          end: mock(),
          traceIfError: mock(),
        };
        return [{}, scope];
      }),
    };

    identityService = new IdentityService({ provider: mockProvider }, mockOtel);
  });

  describe('verify()', () => {
    test('should return identity when token is valid', async () => {
      const result = await identityService.verify('valid-token');

      expect(result).toBeDefined();
      expect(result?.id).toBe('user-123');
      expect(result?.email).toBe('test@example.com');
    });

    test('should return null when provider returns null', async () => {
      (mockProvider.verify as any).mockImplementation(() => Promise.resolve(null));

      const result = await identityService.verify('invalid-token');

      expect(result).toBeNull();
    });

    test('should throw error when provider throws', async () => {
      (mockProvider.verify as any).mockImplementation(() =>
        Promise.reject(new Error('Verify failed'))
      );

      await expect(identityService.verify('token')).rejects.toThrow('Verify failed');
    });
  });

  describe('signOut()', () => {
    test('should call provider signOut when available', async () => {
      await identityService.signOut('token');

      expect(mockProvider.signOut).toHaveBeenCalledWith('token');
    });

    test('should not throw when provider signOut is not available', async () => {
      mockProvider.signOut = undefined;

      const result = await identityService.signOut('token');
      expect(result).toBeUndefined();
    });
  });
});
