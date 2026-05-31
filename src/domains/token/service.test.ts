import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Config } from '@config/config';
import { makeMockOtel } from '@infras/otel/otel.mock';
import { makeMockAuth } from '@providers/betterauth/auth.mock';
import { decodeJwt, decodeProtectedHeader } from 'jose';
import {
  InvalidAudienceError,
  NoSigningKeyError,
  SigningKeyImportError,
  UnauthorizedError,
} from './errors';
import type { Repository } from './repository';
import { TokenService } from './service';

// Real extractable EdDSA private key for happy-path tests
const TEST_PRIVATE_KEY_JWK = JSON.stringify({
  crv: 'Ed25519',
  d: 'i8jvQTUEjaEAUBIAYacQN7IIfFt_2JUn51S76gkA5bA',
  kty: 'OKP',
  x: 'AMp7prQKSftbP5-eORUL9GSQTZ_F4ZdxRmuD6STs8SQ',
});

const mockConfig = {
  auth: {
    allowedAudiences: ['productA', 'productB'],
    baseUrl: 'https://auth.example.com',
  },
} as unknown as Config;

const mockSession = {
  session: { id: 'session-123' },
  user: { id: 'user-456', email: 'test@example.com', role: 'user' },
};

describe('TokenService', () => {
  let mockAuth: any;
  let mockJwksRepository: Repository;
  let tokenService: TokenService;
  let mockOtel: ReturnType<typeof makeMockOtel>;

  beforeEach(() => {
    mockAuth = makeMockAuth();
    mockAuth.api.getSession.mockImplementation(() => Promise.resolve(mockSession));

    mockJwksRepository = {
      findActiveKey: mock(() =>
        Promise.resolve({ kid: 'key-123', privateKeyJson: TEST_PRIVATE_KEY_JWK })
      ),
    };

    mockOtel = makeMockOtel();
    tokenService = new TokenService(mockAuth, mockConfig, mockJwksRepository, mockOtel.otel);
  });

  describe('issueToken() — success', () => {
    test('returns a signed JWT string', async () => {
      const token = await tokenService.issueToken('productA', {
        authorization: 'Bearer valid-session',
      });

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('JWT header contains correct alg and kid', async () => {
      const token = await tokenService.issueToken('productA', {
        authorization: 'Bearer valid-session',
      });

      const header = decodeProtectedHeader(token);
      expect(header.alg).toBe('EdDSA');
      expect(header.kid).toBe('key-123');
    });

    test('JWT payload contains correct claims', async () => {
      const token = await tokenService.issueToken('productA', {
        authorization: 'Bearer valid-session',
      });

      const payload = decodeJwt(token);
      expect(payload.sub).toBe('user-456');
      expect(payload.email).toBe('test@example.com');
      expect(payload.role).toBe('user');
      expect(payload.sid).toBe('session-123');
      expect(payload.iss).toBe('https://auth.example.com');
      expect(payload.aud).toBe('productA');
    });

    test('JWT expiry is approximately 3 hours from now', async () => {
      const before = Math.floor(Date.now() / 1000);
      const token = await tokenService.issueToken('productA', {
        authorization: 'Bearer valid-session',
      });
      const after = Math.floor(Date.now() / 1000);

      const payload = decodeJwt(token);
      const threeHours = 3 * 60 * 60;
      expect(payload.exp).toBeGreaterThanOrEqual(before + threeHours);
      expect(payload.exp).toBeLessThanOrEqual(after + threeHours);
    });

    test('defaults role to "user" when user has no role set', async () => {
      mockAuth.api.getSession = mock(() =>
        Promise.resolve({
          session: { id: 'session-123' },
          user: { id: 'user-456', email: 'test@example.com' }, // no role
        })
      );

      const token = await tokenService.issueToken('productA', {
        authorization: 'Bearer valid-session',
      });

      const payload = decodeJwt(token);
      expect(payload.role).toBe('user');
    });

    test('preserves admin role in JWT claims', async () => {
      mockAuth.api.getSession = mock(() =>
        Promise.resolve({
          session: { id: 'session-123' },
          user: { id: 'user-456', email: 'admin@example.com', role: 'admin' },
        })
      );

      const token = await tokenService.issueToken('productA', {
        authorization: 'Bearer admin-session',
      });

      const payload = decodeJwt(token);
      expect(payload.role).toBe('admin');
    });

    test('passes provided headers to auth.api.getSession', async () => {
      await tokenService.issueToken('productA', { cookie: 'better-auth.session_token=abc' });

      expect(mockAuth.api.getSession).toHaveBeenCalledWith({
        headers: { cookie: 'better-auth.session_token=abc' },
      });
    });
  });

  describe('issueToken() — errors', () => {
    test('throws InvalidAudienceError for unknown product', async () => {
      await expect(
        tokenService.issueToken('unknown-product', { authorization: 'Bearer token' })
      ).rejects.toBeInstanceOf(InvalidAudienceError);
    });

    test('InvalidAudienceError message includes the product name', async () => {
      await expect(
        tokenService.issueToken('bad-product', { authorization: 'Bearer token' })
      ).rejects.toThrow('bad-product');
    });

    test('throws UnauthorizedError when session result is null', async () => {
      mockAuth.api.getSession = mock(() => Promise.resolve(null));

      await expect(
        tokenService.issueToken('productA', { authorization: 'Bearer bad-token' })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    test('throws UnauthorizedError when session object is missing', async () => {
      mockAuth.api.getSession = mock(() => Promise.resolve({ session: null, user: { id: 'u1' } }));

      await expect(
        tokenService.issueToken('productA', { authorization: 'Bearer token' })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    test('throws UnauthorizedError when user object is missing', async () => {
      mockAuth.api.getSession = mock(() => Promise.resolve({ session: { id: 's1' }, user: null }));

      await expect(
        tokenService.issueToken('productA', { authorization: 'Bearer token' })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    test('throws UnauthorizedError when getSession throws', async () => {
      mockAuth.api.getSession = mock(() => Promise.reject(new Error('Network error')));

      await expect(
        tokenService.issueToken('productA', { authorization: 'Bearer bad-token' })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    test('throws NoSigningKeyError when no active JWKS key', async () => {
      mockJwksRepository.findActiveKey = mock(() => Promise.resolve(null));

      await expect(
        tokenService.issueToken('productA', { authorization: 'Bearer token' })
      ).rejects.toBeInstanceOf(NoSigningKeyError);
    });

    test('throws SigningKeyImportError for invalid key JSON', async () => {
      mockJwksRepository.findActiveKey = mock(() =>
        Promise.resolve({ kid: 'key-123', privateKeyJson: 'not-valid-json' })
      );

      await expect(
        tokenService.issueToken('productA', { authorization: 'Bearer token' })
      ).rejects.toBeInstanceOf(SigningKeyImportError);
    });

    test('throws SigningKeyImportError for valid JSON but invalid JWK', async () => {
      mockJwksRepository.findActiveKey = mock(() =>
        Promise.resolve({ kid: 'key-123', privateKeyJson: '{"kty":"RSA"}' })
      );

      await expect(
        tokenService.issueToken('productA', { authorization: 'Bearer token' })
      ).rejects.toBeInstanceOf(SigningKeyImportError);
    });
  });

  describe('issueToken() — OTel', () => {
    test('calls newScope with correct scope and span name', async () => {
      await tokenService.issueToken('productA', { authorization: 'Bearer token' });

      expect(mockOtel.otel.newScope).toHaveBeenCalledWith(
        expect.anything(),
        'token',
        'issue-token'
      );
    });

    test('sets token.product attribute to the product name', async () => {
      await tokenService.issueToken('productA', { authorization: 'Bearer token' });

      expect(mockOtel.scope.setAttribute).toHaveBeenCalledWith('token.product', 'productA');
    });

    test('sets token.issued: true on success', async () => {
      await tokenService.issueToken('productA', { authorization: 'Bearer token' });

      expect(mockOtel.scope.setAttribute).toHaveBeenCalledWith('token.issued', true);
    });

    test('sets token.issued: false and calls traceIfError on error', async () => {
      await expect(
        tokenService.issueToken('unknown-product', { authorization: 'Bearer token' })
      ).rejects.toBeInstanceOf(InvalidAudienceError);

      expect(mockOtel.scope.setAttribute).toHaveBeenCalledWith('token.issued', false);
      expect(mockOtel.scope.traceIfError).toHaveBeenCalled();
    });

    test('calls scope.end() on success', async () => {
      await tokenService.issueToken('productA', { authorization: 'Bearer token' });

      expect(mockOtel.scope.end).toHaveBeenCalled();
    });

    test('calls scope.end() on error', async () => {
      await expect(
        tokenService.issueToken('unknown-product', { authorization: 'Bearer token' })
      ).rejects.toBeInstanceOf(InvalidAudienceError);

      expect(mockOtel.scope.end).toHaveBeenCalled();
    });
  });
});
