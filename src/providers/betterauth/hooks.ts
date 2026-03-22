import type { Auth } from './service';

export function createAuthHandler(auth: Auth) {
  return auth.handler;
}
