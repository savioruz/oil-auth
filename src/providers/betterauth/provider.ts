import type { IdentityProvider } from '@identity/provider';
import type { UserIdentity } from '@identity/types';
import type { Session, User } from 'better-auth/types';
import type { Auth } from './service';

function mapSessionToUserIdentity(_session: Session, user: User): UserIdentity {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name ?? undefined,
    image: user.image ?? undefined,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

export class BetterAuthProviderAdapter implements IdentityProvider {
  constructor(private auth: Auth) {}

  async verify(token: string): Promise<UserIdentity | null> {
    try {
      const result = await this.auth.api.getSession({
        headers: {
          cookie: `better-auth.session_token=${token}`,
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
        cookie: `better-auth.session_token=${token}`,
      },
    });
  }
}
