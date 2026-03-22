import type { Otel } from '@infras/otel/otel';
import { ROOT_CONTEXT } from '@opentelemetry/api';
import type { IdentityProvider } from './provider';
import type { UserIdentity } from './types';

export interface IdentityServiceConfig {
  provider: IdentityProvider;
}

export class IdentityService {
  private provider: IdentityProvider;
  private otel: Otel;

  constructor(config: IdentityServiceConfig, otel: Otel) {
    this.provider = config.provider;
    this.otel = otel;
  }

  async verify(token: string): Promise<UserIdentity | null> {
    const [_ctx, scope] = this.otel.newScope(ROOT_CONTEXT, 'identity', 'verify-token');
    scope.addEvent('verifying token');

    try {
      const identity = await this.provider.verify(token);
      scope.setAttribute('identity.found', !!identity);
      scope.end();
      return identity;
    } catch (error) {
      scope.traceIfError(error as Error);
      scope.end();
      throw error;
    }
  }

  async signOut(token: string): Promise<void> {
    const [_ctx, scope] = this.otel.newScope(ROOT_CONTEXT, 'identity', 'sign-out');
    scope.addEvent('signing out');

    try {
      if (this.provider.signOut) {
        await this.provider.signOut(token);
      }
      scope.end();
    } catch (error) {
      scope.traceIfError(error as Error);
      scope.end();
      throw error;
    }
  }
}
