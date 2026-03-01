import { IdentityService } from '@identity/service';
import { UserIdentity } from '@identity/types';
import type { MiddlewareHandler } from 'hono';

export interface IdentityContext {
  identity: UserIdentity | null;
  identityService: IdentityService;
}

declare module 'hono' {
  interface Context {
    identity: UserIdentity | null;
    identityService: IdentityService;
  }
}

export const identityMiddleware = (identityService: IdentityService): MiddlewareHandler => {
  return async (c, next) => {
    c.identityService = identityService;

    const authHeader = c.req.header('Authorization');
    let token: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      const cookie = c.req.header('Cookie');
      if (cookie) {
        const match = cookie.match(/better-auth\.session_token=([^;]+)/);
        if (match) {
          token = match[1];
        }
      }
    }

    if (token) {
      try {
        c.identity = await identityService.verify(token);
      } catch {
        c.identity = null;
      }
    } else {
      c.identity = null;
    }

    await next();
  };
};
