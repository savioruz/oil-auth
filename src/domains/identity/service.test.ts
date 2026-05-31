import { beforeEach, describe, expect, test } from 'bun:test';
import { makeMockProvider } from '@domains/identity/provider.mock';
import { makeMockOtel } from '@infras/otel/otel.mock';
import { IdentityService } from './service';

describe('IdentityService', () => {
  let mockProvider: ReturnType<typeof makeMockProvider>;
  let mockOtel: ReturnType<typeof makeMockOtel>['otel'];
  let identityService: IdentityService;

  beforeEach(() => {
    mockProvider = makeMockProvider();
    mockProvider.verify.mockImplementation(() =>
      Promise.resolve({
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        role: 'user' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    ({ otel: mockOtel } = makeMockOtel());

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
      mockProvider.verify.mockImplementation(() => Promise.resolve(null));

      const result = await identityService.verify('invalid-token');

      expect(result).toBeNull();
    });

    test('should throw error when provider throws', async () => {
      mockProvider.verify.mockImplementation(() => Promise.reject(new Error('Verify failed')));

      await expect(identityService.verify('token')).rejects.toThrow('Verify failed');
    });
  });

  describe('signOut()', () => {
    test('should call provider signOut when available', async () => {
      await identityService.signOut('token');

      expect(mockProvider.signOut).toHaveBeenCalledWith('token');
    });

    test('should not throw when provider signOut is not available', async () => {
      (mockProvider as any).signOut = undefined;

      const result = await identityService.signOut('token');
      expect(result).toBeUndefined();
    });

    test('sets identity.signout.success to true on success', async () => {
      const { otel: mockOtel2, scope } = makeMockOtel();
      const service = new IdentityService({ provider: mockProvider }, mockOtel2 as any);

      await service.signOut('token');

      expect(scope.setAttribute).toHaveBeenCalledWith('identity.signout.success', true);
    });

    test('sets identity.signout.success to false on error', async () => {
      const { otel: mockOtel2, scope } = makeMockOtel();
      mockProvider.signOut?.mockImplementation(() => Promise.reject(new Error('sign out failed')));
      const service = new IdentityService({ provider: mockProvider }, mockOtel2 as any);

      await expect(service.signOut('token')).rejects.toThrow('sign out failed');

      expect(scope.setAttribute).toHaveBeenCalledWith('identity.signout.success', false);
    });
  });
});
