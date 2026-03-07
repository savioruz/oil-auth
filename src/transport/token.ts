import type { Config } from '@config/config';
import type { Auth } from '@providers/betterauth/service';
import type { Context } from 'hono';
import { importJWK, SignJWT } from 'jose';
import type { Pool } from 'pg';

interface JwksRow {
  id: string;
  publicKey: string;
  privateKey: string;
  createdAt: Date;
  expiresAt: Date | null;
}

export async function handleTokenRequest(
  c: Context,
  auth: Auth,
  config: Config,
  dbPool: Pool
): Promise<Response> {
  const product = c.req.param('product');

  // Validate product against allowlist
  if (!config.auth.allowedAudiences.includes(product)) {
    return c.json({ error: 'invalid_audience', message: `Unknown product: ${product}` }, 400);
  }

  // Validate session — accept Bearer token or session cookie
  const authHeader = c.req.header('Authorization');
  const cookieHeader = c.req.header('Cookie');

  const sessionHeaders: Record<string, string> = {};
  if (authHeader) {
    sessionHeaders.authorization = authHeader;
  } else if (cookieHeader) {
    sessionHeaders.cookie = cookieHeader;
  } else {
    return c.json({ error: 'unauthorized', message: 'No session provided' }, 401);
  }

  let sessionResult: Awaited<ReturnType<typeof auth.api.getSession>>;
  try {
    sessionResult = await auth.api.getSession({ headers: sessionHeaders });
  } catch {
    return c.json({ error: 'unauthorized', message: 'Invalid or expired session' }, 401);
  }
  if (!sessionResult || !sessionResult.session || !sessionResult.user) {
    return c.json({ error: 'unauthorized', message: 'Invalid or expired session' }, 401);
  }

  const { session, user } = sessionResult;
  const u = user as typeof user & { role?: 'admin' | 'user' };

  // Fetch the most recent active JWKS private key
  const result = await dbPool.query<JwksRow>(
    `SELECT id, "privateKey" FROM jwks WHERE "expiresAt" IS NULL OR "expiresAt" > NOW() ORDER BY "createdAt" DESC LIMIT 1`
  );

  if (result.rows.length === 0) {
    return c.json({ error: 'server_error', message: 'No signing key available' }, 500);
  }

  const { id: kid, privateKey: privateKeyJson } = result.rows[0];

  // Parse the private key — better-auth stores it as JWK JSON
  // The private key may be encrypted; use jose to import it
  let privateKey: CryptoKey;
  try {
    const jwk = JSON.parse(privateKeyJson) as Record<string, unknown>;
    privateKey = (await importJWK(jwk, 'EdDSA')) as CryptoKey;
  } catch {
    return c.json({ error: 'server_error', message: 'Failed to load signing key' }, 500);
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3 * 60 * 60; // 3 hours

  const jwt = await new SignJWT({
    email: u.email,
    role: u.role ?? 'user',
    sid: session.id,
  })
    .setProtectedHeader({ alg: 'EdDSA', kid })
    .setIssuer(config.auth.baseUrl)
    .setSubject(u.id)
    .setAudience(product)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(privateKey);

  return c.json({ token: jwt });
}
