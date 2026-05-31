import type { Otel } from '@infras/otel/otel';
import { type Context, ROOT_CONTEXT } from '@opentelemetry/api';
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

  async verify(token: string, ctx?: Context): Promise<UserIdentity | null> {
    const [_ctx, scope] = this.otel.newScope(ctx ?? ROOT_CONTEXT, 'identity', 'verify-token');
    scope.addEvent('verifying token');

    try {
      const identity = await this.provider.verify(token);
      scope.setAttribute('identity.found', !!identity);
      return identity;
    } catch (error) {
      scope.traceIfError(error as Error);
      throw error;
    } finally {
      scope.end();
    }
  }

  async signOut(token: string, ctx?: Context): Promise<void> {
    const [_ctx, scope] = this.otel.newScope(ctx ?? ROOT_CONTEXT, 'identity', 'sign-out');
    scope.addEvent('signing out');

    try {
      if (this.provider.signOut) {
        await this.provider.signOut(token);
      }
      scope.setAttribute('identity.signout.success', true);
    } catch (error) {
      scope.setAttribute('identity.signout.success', false);
      scope.traceIfError(error as Error);
      throw error;
    } finally {
      scope.end();
    }
  }
}
