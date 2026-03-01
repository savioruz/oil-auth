import { UserIdentity } from './types';

export interface IdentityProvider {
  verify(token: string): Promise<UserIdentity | null>;
  refresh?(token: string): Promise<{ token: string; expiresAt: number } | null>;
  signOut?(token: string): Promise<void>;
}
