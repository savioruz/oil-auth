import type { Config } from '@config/config';
import type { Logger } from '@infras/logger/logger';
import { createAuthMiddleware } from 'better-auth/api';

const EMAIL_CALLBACK_PATHS = new Set([
  '/verify-email',
  '/send-verification-email',
  '/reset-password',
]);

export function logResolvedCallbackUrl(
  logger: Logger,
  path: string,
  callbackURL: string | undefined
): void {
  if (!callbackURL) return;
  if (!/^https?:\/\//.test(callbackURL)) {
    logger.warn(
      { path, callbackURL },
      'email callbackURL is relative; redirect will go to the auth server root, not the app. Set AUTH_VERIFY_EMAIL_CALLBACK_URL or AUTH_RESET_PASSWORD_CALLBACK_URL to fix.'
    );
    return;
  }
  logger.debug({ path, callbackURL }, 'email callbackURL resolved');
}

export function createAuthHandler(auth: { handler: unknown }) {
  return auth.handler;
}

export function createAuthHooks(_config: Config, logger?: Logger) {
  return {
    after: createAuthMiddleware(async (ctx) => {
      const path = ctx.path;
      if (!EMAIL_CALLBACK_PATHS.has(path)) return;
      if (!logger) return;
      const callbackURL = ctx.query?.callbackURL as string | undefined;
      logResolvedCallbackUrl(logger, path, callbackURL);
    }),
  };
}
