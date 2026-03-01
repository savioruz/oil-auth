import type { Auth } from '@providers/betterauth/service';
import { Hono } from 'hono';

export function createAuthRouter(auth: Auth): Hono {
  const router = new Hono();

  router.post('/sign-up', async (c) => {
    const body = await c.req.json();
    const result = await auth.api.signUpEmail({
      body: {
        email: body.email,
        password: body.password,
        name: body.name,
      },
    });

    return c.json(result);
  });

  router.post('/sign-in', async (c) => {
    const body = await c.req.json();
    const result = await auth.api.signInEmail({
      body: {
        email: body.email,
        password: body.password,
      },
    });

    return c.json(result);
  });

  router.get('/session', async (c) => {
    const headers: Record<string, string> = {};

    const authHeader = c.req.header('Authorization');
    if (authHeader) headers.Authorization = authHeader;

    const cookie = c.req.header('Cookie');
    if (cookie) headers.cookie = cookie;

    const result = await auth.api.getSession({ headers });

    return c.json(result);
  });

  router.post('/sign-out', async (c) => {
    const headers: Record<string, string> = {};

    const cookie = c.req.header('Cookie');
    if (cookie) headers.cookie = cookie;

    const result = await auth.api.signOut({ headers });

    return c.json(result);
  });

  return router;
}
