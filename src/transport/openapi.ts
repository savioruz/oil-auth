import type { Auth } from '@providers/betterauth/service';
import { Hono } from 'hono';

export function createOpenAPIRouter(auth: Auth): Hono {
  const router = new Hono();

  router.get('/openapi.json', async (c) => {
    // auth.api.generateOpenAPISchema is added by the openApi() plugin at runtime
    const api = auth.api as unknown as {
      generateOpenAPISchema: () => Promise<unknown>;
    };
    const spec = await api.generateOpenAPISchema();
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
