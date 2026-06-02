import type { IdentityProvider } from '@domains/identity/provider';
import type { UserIdentity } from '@domains/identity/types';
import type { Logger } from '@infras/logger/logger';
import type { Session, User } from 'better-auth/types';
import type { Auth } from './service';

function mapSessionToUserIdentity(_session: Session, user: User): UserIdentity {
  const u = user as User & { role?: 'admin' | 'user'; phoneNumber?: string };
  return {
    id: u.id,
    email: u.email,
    emailVerified: u.emailVerified,
    name: u.name ?? undefined,
    image: u.image ?? undefined,
    phoneNumber: u.phoneNumber ?? undefined,
    role: u.role ?? 'user',
    createdAt: new Date(u.createdAt),
    updatedAt: new Date(u.updatedAt),
  };
}

export class BetterAuthProviderAdapter implements IdentityProvider {
  constructor(
    private auth: Auth,
    private logger?: Logger
  ) {}

  async verify(token: string): Promise<UserIdentity | null> {
    try {
      const result = await this.auth.api.getSession({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      if (!result || !result.session || !result.user) {
        return null;
      }

      return mapSessionToUserIdentity(result.session, result.user);
    } catch (err) {
      this.logger?.error({ err }, 'BetterAuthProviderAdapter.verify failed');
      return null;
    }
  }

  async signOut(token: string): Promise<void> {
    await this.auth.api.signOut({
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
  }
}
