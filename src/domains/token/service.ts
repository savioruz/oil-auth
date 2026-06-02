import type { Config } from '@config/config';
import type { Otel } from '@infras/otel/otel';
import { type Context, ROOT_CONTEXT } from '@opentelemetry/api';
import type { Auth } from '@providers/betterauth/service';
import { importJWK, SignJWT } from 'jose';
import {
  InvalidAudienceError,
  NoSigningKeyError,
  SigningKeyImportError,
  UnauthorizedError,
} from './errors';
import type { Repository } from './repository';

export class TokenService {
  constructor(
    private readonly auth: Auth,
    private readonly config: Config,
    private readonly tokenRepository: Repository,
    private readonly otel: Otel
  ) {}

  async issueToken(
    product: string,
    headers: Record<string, string>,
    ctx?: Context
  ): Promise<string> {
    const [_ctx, scope] = this.otel.newScope(ctx ?? ROOT_CONTEXT, 'token', 'issue-token');
    scope.setAttribute('token.product', product);

    try {
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
      const u = user as typeof user & { role?: 'admin' | 'user'; phoneNumber?: string };

      const key = await this.tokenRepository.findActiveKey();
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

      const jwt = await new SignJWT({
        email: u.email,
        role: u.role ?? 'user',
        sid: session.id,
        phoneNumber: u.phoneNumber,
      })
        .setProtectedHeader({ alg: 'EdDSA', kid: key.kid })
        .setIssuer(this.config.auth.baseUrl)
        .setSubject(u.id)
        .setAudience(product)
        .setIssuedAt(now)
        .setExpirationTime(`${this.config.auth.jwtExpiresIn}s`)
        .sign(privateKey);

      scope.setAttribute('token.issued', true);
      return jwt;
    } catch (error) {
      scope.setAttribute('token.issued', false);
      scope.traceIfError(error as Error);
      throw error;
    } finally {
      scope.end();
    }
  }
}
