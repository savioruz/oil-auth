import type { Config } from '@config/config';
import type { TokenService } from '@domains/token/token.service';
import type { Logger } from '@infras/logger/logger';
import type { PostgresClient } from '@infras/postgres/client';
import type { Auth } from '@providers/betterauth/service';
import type { Hono } from 'hono';
import { createHealthHandler } from './handler/health.handler';
import { createTokenHandler } from './handler/token.handler';
import { createOpenAPIRouter } from './openapi';

export interface RouteDeps {
  config: Config;
  tokenService: TokenService;
  betterAuth: Auth;
  postgresClient: PostgresClient;
  logger: Logger;
}

export function registerRoutes(app: Hono, deps: RouteDeps): void {
  const { config, tokenService, betterAuth, postgresClient, logger } = deps;

  app.post('/api/auth/token/:product', createTokenHandler(tokenService));

  app.on(['POST', 'GET'], '/api/auth/*', (c) => betterAuth.handler(c.req.raw));

  app.get('/health', createHealthHandler(postgresClient));

  if (config.app.env === 'development') {
    app.route('/', createOpenAPIRouter(betterAuth));
    logger.info(`OpenAPI docs available at http://localhost:${config.app.port}/docs`);
  }
}
