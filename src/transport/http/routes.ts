import type { Config } from '@config/config';
import type { TokenService } from '@domains/token/service';
import type { Logger } from '@infras/logger/logger';
import type { Otel } from '@infras/otel/otel';
import type { PostgresClient } from '@infras/postgres/client';
import type { Auth } from '@providers/betterauth/service';
import type { Hono } from 'hono';
import { createTokenHandler } from './handler/token.handler';
import { createOpenAPIRouter } from './openapi';

export interface RouteDeps {
  config: Config;
  tokenService: TokenService;
  betterAuth: Auth;
  postgresClient: PostgresClient;
  logger: Logger;
  otel: Otel;
}

export function registerRoutes(app: Hono, deps: RouteDeps): void {
  const { config, tokenService, betterAuth, logger, otel } = deps;

  app.get('/api/auth/token', (c) => c.notFound());
  app.get('/api/auth/token/:product', createTokenHandler(tokenService));

  app.on(['POST', 'GET'], '/api/auth/*', async (c) => {
    const otelCtx = c.get('otelContext');
    const [_ctx, scope] = otel.newScope(otelCtx, 'betterauth', 'handler');
    try {
      const res = await betterAuth.handler(c.req.raw);
      scope.setAttribute('http.status_code', res.status);
      if (res.status >= 400) {
        scope.traceIfError(new Error(`BetterAuth returned ${res.status}`));
      }
      return res;
    } catch (err) {
      scope.traceError(err as Error);
      throw err;
    } finally {
      scope.end();
    }
  });

  if (config.app.env === 'development') {
    app.route('/', createOpenAPIRouter(betterAuth));
    logger.info(`OpenAPI docs available at http://localhost:${config.app.port}/docs`);
  }
}
