import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Config } from '@config/config';
import type { JwksRepository } from './jwks.repository';
import {
  InvalidAudienceError,
  NoSigningKeyError,
  SigningKeyImportError,
  TokenService,
  UnauthorizedError,
} from './token.service';

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
  let mockJwksRepository: JwksRepository;
  let tokenService: TokenService;

  beforeEach(() => {
    mockAuth = {
      api: {
        getSession: mock(() => Promise.resolve(mockSession)),
      },
    };

    mockJwksRepository = {
      findActiveKey: mock(() =>
        Promise.resolve({
          kid: 'key-123',
          privateKeyJson: JSON.stringify({ kty: 'OKP', crv: 'Ed25519' }),
        })
      ),
    };

    tokenService = new TokenService(mockAuth, mockConfig, mockJwksRepository);
  });

  describe('issueToken()', () => {
    test('should throw InvalidAudienceError for unknown product', async () => {
      await expect(
        tokenService.issueToken('unknown-product', { authorization: 'Bearer token' })
      ).rejects.toBeInstanceOf(InvalidAudienceError);
    });

    test('should throw UnauthorizedError when session is invalid', async () => {
      mockAuth.api.getSession = mock(() => Promise.resolve(null));

      await expect(
        tokenService.issueToken('productA', { authorization: 'Bearer bad-token' })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    test('should throw UnauthorizedError when getSession throws', async () => {
      mockAuth.api.getSession = mock(() => Promise.reject(new Error('Network error')));

      await expect(
        tokenService.issueToken('productA', { authorization: 'Bearer bad-token' })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    test('should throw NoSigningKeyError when no active JWKS key', async () => {
      mockJwksRepository.findActiveKey = mock(() => Promise.resolve(null));

      await expect(
        tokenService.issueToken('productA', { authorization: 'Bearer token' })
      ).rejects.toBeInstanceOf(NoSigningKeyError);
    });

    test('should throw SigningKeyImportError for invalid key JSON', async () => {
      mockJwksRepository.findActiveKey = mock(() =>
        Promise.resolve({ kid: 'key-123', privateKeyJson: 'not-valid-json' })
      );

      await expect(
        tokenService.issueToken('productA', { authorization: 'Bearer token' })
      ).rejects.toBeInstanceOf(SigningKeyImportError);
    });
  });
});
