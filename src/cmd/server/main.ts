import { config } from '@config/config';
import { IdentityService } from '@domains/identity/service';
import { TokenRepository } from '@domains/token/repository';
import { TokenService } from '@domains/token/service';
import { createLogger } from '@infras/logger/logger';
import { createOtel } from '@infras/otel/otel';
import { createPostgresClient } from '@infras/postgres/client';
import { createRedisClient } from '@infras/redis/client';
import { createSmtpClient } from '@infras/smtp/client';
import { BetterAuthProviderAdapter } from '@providers/betterauth/provider';
import { BetterAuthService } from '@providers/betterauth/service';
import { HttpServer } from '@transport/http/server';
import { serve } from 'bun';

async function main() {
  const logger = createLogger(config);
  const otel = createOtel(config, logger);
  const postgresClient = createPostgresClient(config, logger);
  const redisClient = createRedisClient(config, logger);
  const smtpClient = createSmtpClient(config, otel, logger);

  const betterAuthService = new BetterAuthService(config, postgresClient, redisClient, smtpClient);
  const betterAuth = betterAuthService.getAuth();
  const betterAuthProvider = new BetterAuthProviderAdapter(betterAuth, logger);

  const identityService = new IdentityService({ provider: betterAuthProvider }, otel);

  const tokenRepository = new TokenRepository(postgresClient.getPool());
  const tokenService = new TokenService(betterAuth, config, tokenRepository, otel);

  const httpServer = new HttpServer(
    config,
    otel,
    identityService,
    betterAuth,
    postgresClient,
    logger,
    tokenService
  );

  let server: ReturnType<typeof serve>;
  try {
    server = serve({
      port: config.app.port,
      fetch: httpServer.getApp().fetch,
    });
  } catch (error) {
    logger.error(
      `Failed to start server: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }

  logger.info(`Server running at http://localhost:${server.port}`);

  const shutdown = async () => {
    logger.info('Shutting down...');

    await otel.shutdown();
    await postgresClient.end();

    if (redisClient) {
      await redisClient.quit();
    }

    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(console.error);
