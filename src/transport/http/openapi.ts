import type { Auth } from '@providers/betterauth/service';
import { Hono } from 'hono';
import { config } from '@/config/config';

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

    // Add phoneNumber to sign-up request body
    for (const path of Object.keys(openApiSpec.paths)) {
      if (path.includes('sign-up/email')) {
        const endpoint = (openApiSpec.paths[path] as Record<string, unknown>)?.post as Record<
          string,
          unknown
        >;
        const props = (endpoint?.requestBody as Record<string, unknown>)?.content as Record<
          string,
          unknown
        >;
        const schema = (props?.['application/json'] as Record<string, unknown>)?.schema as Record<
          string,
          unknown
        >;
        if (schema?.properties) {
          (schema.properties as Record<string, unknown>).phoneNumber = {
            type: 'string',
            description: 'Optional phone number for the user',
          };
        }
      }
    }

    delete openApiSpec.paths['/token'];
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
  <title>${config.app.name} - API Reference</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="https://scalar.com/favicon.svg">
  <link rel="icon alternate" href="https://scalar.com/favicon.png">
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
