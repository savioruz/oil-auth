import type { Otel } from '@infras/otel/otel';
import { ROOT_CONTEXT } from '@opentelemetry/api';
import type { MiddlewareHandler } from 'hono';

export const tracingMiddleware = (otel: Otel): MiddlewareHandler => {
  return async (c, next) => {
    const method = c.req.method;
    const path = c.req.path;
    const url = new URL(c.req.url);

    const [_ctx, scope] = otel.newScope(ROOT_CONTEXT, 'http.server', `${method} ${path}`);

    scope.setAttributes({
      'http.method': method,
      'http.url': url.href,
      'http.target': path,
      'http.scheme': url.protocol.replace(':', ''),
    });

    try {
      await next();
    } catch (error) {
      scope.traceIfError(error as Error);
      scope.end();
      throw error;
    }

    const status = c.res.status;
    scope.setAttribute('http.status_code', status);

    if (status >= 500) {
      scope.traceIfError(new Error(`HTTP ${status}`));
    }

    scope.end();
  };
};
