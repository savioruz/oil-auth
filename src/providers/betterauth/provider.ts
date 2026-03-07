import type { IdentityProvider } from '@identity/provider';
import type { UserIdentity } from '@identity/types';
import type { Session, User } from 'better-auth/types';
import type { Auth } from './service';

function mapSessionToUserIdentity(_session: Session, user: User): UserIdentity {
  const u = user as User & { role?: 'admin' | 'user' };
  return {
    id: u.id,
    email: u.email,
    emailVerified: u.emailVerified,
    name: u.name ?? undefined,
    image: u.image ?? undefined,
    role: u.role ?? 'user',
    createdAt: new Date(u.createdAt),
    updatedAt: new Date(u.updatedAt),
  };
}

export class BetterAuthProviderAdapter implements IdentityProvider {
  constructor(private auth: Auth) {}

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
    } catch {
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
