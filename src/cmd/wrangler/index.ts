import { config } from '@config/config';
import { IdentityService } from '@domains/identity/service';
import { PostgresJwksRepository } from '@domains/token/jwks.postgres';
import { TokenService } from '@domains/token/token.service';
import { createLogger } from '@infras/logger/logger';
import { createOtel } from '@infras/otel/otel';
import { createPostgresClient } from '@infras/postgres/client';
import { createRedisClient } from '@infras/redis/client';
import { BetterAuthProviderAdapter } from '@providers/betterauth/provider';
import { BetterAuthService } from '@providers/betterauth/service';
import { HttpServer } from '@transport/http/server';

const logger = createLogger(config);
const otel = createOtel(config, logger);
const postgresClient = createPostgresClient(config, logger);
const redisClient = createRedisClient(config, logger);

const betterAuthService = new BetterAuthService(config, postgresClient, redisClient);
const betterAuth = betterAuthService.getAuth();
const betterAuthProvider = new BetterAuthProviderAdapter(betterAuth);

const identityService = new IdentityService({ provider: betterAuthProvider }, otel);

const jwksRepository = new PostgresJwksRepository(postgresClient.getPool());
const tokenService = new TokenService(betterAuth, config, jwksRepository);

const httpServer = new HttpServer(
  config,
  otel,
  identityService,
  betterAuth,
  postgresClient,
  logger,
  tokenService
);

const app = httpServer.getApp();

export default {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request);
  },
};
