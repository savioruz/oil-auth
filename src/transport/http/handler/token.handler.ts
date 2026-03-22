import {
  InvalidAudienceError,
  NoSigningKeyError,
  SigningKeyImportError,
  TokenService,
  UnauthorizedError,
} from '@domains/token/token.service';
import type { Handler } from 'hono';

export function createTokenHandler(tokenService: TokenService): Handler {
  return async (c) => {
    const product = c.req.param('product');

    const authHeader = c.req.header('Authorization');
    const cookieHeader = c.req.header('Cookie');

    const headers: Record<string, string> = {};
    if (authHeader) {
      headers.authorization = authHeader;
    } else if (cookieHeader) {
      headers.cookie = cookieHeader;
    } else {
      return c.json({ error: 'unauthorized', message: 'No session provided' }, 401);
    }

    try {
      const token = await tokenService.issueToken(product, headers);
      return c.json({ token });
    } catch (err) {
      if (err instanceof InvalidAudienceError) {
        return c.json({ error: 'invalid_audience', message: err.message }, 400);
      }
      if (err instanceof UnauthorizedError) {
        return c.json({ error: 'unauthorized', message: err.message }, 401);
      }
      if (err instanceof NoSigningKeyError || err instanceof SigningKeyImportError) {
        return c.json({ error: 'server_error', message: err.message }, 500);
      }
      return c.json({ error: 'server_error', message: 'Unexpected error' }, 500);
    }
  };
}
