import { randomUUID } from 'node:crypto';
import type { Otel } from '@infras/otel/otel';
import { ROOT_CONTEXT } from '@opentelemetry/api';
import type { MiddlewareHandler } from 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    otelContext: import('@opentelemetry/api').Context;
  }
}

export const tracingMiddleware = (otel: Otel): MiddlewareHandler => {
  return async (c, next) => {
    const method = c.req.method;
    const path = c.req.path;

    const requestId = c.req.header('X-Request-ID') ?? randomUUID();
    const [ctx, scope] = otel.newScope(ROOT_CONTEXT, 'http', `${method} ${path}`);

    c.set('otelContext', ctx);

    scope.setAttributes({
      'http.host': c.req.header('Host') ?? '',
      'http.method': method,
      'http.path': path,
      'http.request_id': requestId,
      'http.source': c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP') ?? '',
      'http.user_agent': c.req.header('User-Agent') ?? '',
    });

    try {
      await next();

      const status = c.res.status;
      scope.setAttribute('http.status_code', status);
      scope.setAttribute('http.route', c.req.routePath ?? path);

      if (status >= 500) {
        scope.traceIfError(new Error(`HTTP ${status}`));
      }

      c.header('X-Request-ID', requestId);
    } catch (error) {
      scope.traceIfError(error as Error);
      throw error;
    } finally {
      scope.end();
    }
  };
};
