import type { Config } from '@config/config';
import type { IdentityService } from '@domains/identity/service';
import type { TokenService } from '@domains/token/token.service';
import type { Logger } from '@infras/logger/logger';
import type { Otel } from '@infras/otel/otel';
import type { PostgresClient } from '@infras/postgres/client';
import { identityMiddleware } from '@middleware/identity';
import { tracingMiddleware } from '@middleware/tracing';
import type { Auth } from '@providers/betterauth/service';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { registerRoutes } from './routes';

export class HttpServer {
  private app: Hono;

  constructor(
    private config: Config,
    private otel: Otel,
    identityService: IdentityService,
    private betterAuth: Auth,
    private postgresClient: PostgresClient,
    private logger: Logger,
    private tokenService: TokenService
  ) {
    this.app = new Hono();
    this.setup(identityService);
  }

  private setup(identityService: IdentityService): void {
    const corsOptions = this.config.cors.enabled
      ? {
          origin: this.config.cors.allowedOrigins,
          credentials: this.config.cors.allowCredentials,
          allowedHeaders: this.config.cors.allowedHeaders,
          methods: this.config.cors.allowedMethods,
          maxAge: this.config.cors.maxAge,
        }
      : { origin: '*' };

    this.app.use('*', cors(corsOptions));
    this.app.use('*', async (c, next) => {
      const start = Date.now();
      await next();
      this.logger.info(
        { method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - start },
        'request'
      );
    });
    this.app.use('*', tracingMiddleware(this.otel));
    this.app.use('*', identityMiddleware(identityService));

    registerRoutes(this.app, {
      config: this.config,
      tokenService: this.tokenService,
      betterAuth: this.betterAuth,
      postgresClient: this.postgresClient,
      logger: this.logger,
    });
  }

  getApp(): Hono {
    return this.app;
  }
}
