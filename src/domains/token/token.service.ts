import type { Config } from '@config/config';
import type { Auth } from '@providers/betterauth/service';
import { importJWK, SignJWT } from 'jose';
import type { JwksRepository } from './jwks.repository';

export class InvalidAudienceError extends Error {
  constructor(product: string) {
    super(`Unknown product: ${product}`);
    this.name = 'InvalidAudienceError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Invalid or expired session') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NoSigningKeyError extends Error {
  constructor() {
    super('No signing key available');
    this.name = 'NoSigningKeyError';
  }
}

export class SigningKeyImportError extends Error {
  constructor() {
    super('Failed to load signing key');
    this.name = 'SigningKeyImportError';
  }
}

export class TokenService {
  constructor(
    private readonly auth: Auth,
    private readonly config: Config,
    private readonly jwksRepository: JwksRepository
  ) {}

  async issueToken(product: string, headers: Record<string, string>): Promise<string> {
    if (!this.config.auth.allowedAudiences.includes(product)) {
      throw new InvalidAudienceError(product);
    }

    let sessionResult: Awaited<ReturnType<typeof this.auth.api.getSession>>;
    try {
      sessionResult = await this.auth.api.getSession({ headers });
    } catch {
      throw new UnauthorizedError();
    }

    if (!sessionResult?.session || !sessionResult?.user) {
      throw new UnauthorizedError();
    }

    const { session, user } = sessionResult;
    const u = user as typeof user & { role?: 'admin' | 'user' };

    const key = await this.jwksRepository.findActiveKey();
    if (!key) {
      throw new NoSigningKeyError();
    }

    let privateKey: CryptoKey;
    try {
      const jwk = JSON.parse(key.privateKeyJson) as Record<string, unknown>;
      privateKey = (await importJWK(jwk, 'EdDSA')) as CryptoKey;
    } catch {
      throw new SigningKeyImportError();
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3 * 60 * 60; // 3 hours

    const jwt = await new SignJWT({
      email: u.email,
      role: u.role ?? 'user',
      sid: session.id,
    })
      .setProtectedHeader({ alg: 'EdDSA', kid: key.kid })
      .setIssuer(this.config.auth.baseUrl)
      .setSubject(u.id)
      .setAudience(product)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(privateKey);

    return jwt;
  }
}
