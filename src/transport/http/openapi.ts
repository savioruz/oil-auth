import type { Auth } from '@providers/betterauth/service';
import { Hono } from 'hono';

export function createOpenAPIRouter(auth: Auth): Hono {
  const router = new Hono();

  router.get('/openapi.json', async (c) => {
    const api = auth.api as unknown as {
      generateOpenAPISchema: () => Promise<unknown>;
    };
    const spec = await api.generateOpenAPISchema();

    const openApiSpec = spec as {
      paths?: Record<string, unknown>;
    };
    openApiSpec.paths ??= {};
    openApiSpec.paths['/token/{product}'] = {
      get: {
        summary: '/token/{product}',
        operationId: 'issueToken',
        tags: ['Jwt'],
        parameters: [
          {
            name: 'product',
            in: 'path',
            required: true,
            description: 'The product audience for which the JWT is issued',
            schema: { type: 'string' },
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'JWT issued successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string', description: 'Signed JWT' },
                  },
                  required: ['token'],
                },
              },
            },
          },
          '400': {
            description: 'Invalid audience',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'invalid_audience' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized — no valid session provided',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'unauthorized' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'server_error' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    };

    return c.json(spec);
  });

  router.get('/docs', (c) => {
    return c.html(`<!DOCTYPE html>
<html>
<head>
  <title>Oil Auth - API Reference</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script
    id="api-reference"
    data-url="/openapi.json"
    src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`);
  });

  return router;
}
