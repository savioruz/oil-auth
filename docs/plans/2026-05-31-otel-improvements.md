# OpenTelemetry Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve OpenTelemetry tracing to be production-ready with correct HTTP attributes, named tracers, child span linking, and request ID propagation.

**Architecture:** Four independent improvements: (A) replace HTTP span attributes with production-standard set matching reference backend, (C) link identity service spans as children of HTTP request span by passing OTel context through middleware, (D) fix named tracers so `otel.scope.name` is set correctly, (E) add `identity.signout.success` attribute. Request ID is generated per-request (UUID) if not present in `X-Request-ID` header, set as span attribute and response header.

**Tech Stack:** Bun, Hono, @opentelemetry/api, TypeScript

---

## Task 1: Fix named tracers in OtelImpl (D)

**Files:**
- Modify: `src/infras/otel/otel.ts`

**Step 1: Read current `newScope` implementation**

Current code at `otel.ts:120`:
```ts
newScope(_ctx: Context | undefined, _scopeName: string, spanName: string): [Context, Scope] {
  const activeCtx = otelContext.active();
  const parentCtx = ...
  const span = this.tracer.startSpan(spanName, undefined, parentCtx);
  ...
}
```

`this.tracer` is always created with `config.app.name` — `_scopeName` is ignored.

**Step 2: Remove the stored `this.tracer` field and use `scopeName` per call**

Remove from constructor:
```ts
this.tracer = trace.getTracer(config.app.name);
```

Remove from class field:
```ts
private tracer: ReturnType<typeof trace.getTracer>;
```

Update `newScope` to create a named tracer per scope:
```ts
newScope(_ctx: Context | undefined, scopeName: string, spanName: string): [Context, Scope] {
  const activeCtx = otelContext.active();
  const parentCtx =
    _ctx && typeof (_ctx as Context & { setValue: unknown }).setValue === 'function'
      ? _ctx
      : activeCtx;
  const tracer = trace.getTracer(scopeName);
  const span = tracer.startSpan(spanName, undefined, parentCtx);
  const newCtx = trace.setSpan(parentCtx, span);
  return [newCtx, new ScopeImpl(span)];
}
```

**Step 3: Run typecheck**
```bash
bun run typecheck
```
Expected: no errors

**Step 4: Run tests**
```bash
bun test ./src/**/*.test.ts
```
Expected: all pass

---

## Task 2: Update HTTP span attributes + request ID (A)

**Files:**
- Modify: `src/middleware/tracing.ts`
- Modify: `src/middleware/tracing.test.ts`

**Step 1: Rewrite `tracing.ts`**

Replace the entire file content with:

```ts
import type { Otel } from '@infras/otel/otel';
import { ROOT_CONTEXT } from '@opentelemetry/api';
import type { MiddlewareHandler } from 'hono';
import { randomUUID } from 'node:crypto';

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
      'http.route': path,
      'http.source': c.req.header('X-Forwarded-For') ?? c.req.header('X-Real-IP') ?? '',
      'http.user_agent': c.req.header('User-Agent') ?? '',
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

    c.header('X-Request-ID', requestId);
    scope.end();
  };
};
```

Note: `c.set('otelContext', ctx)` requires Hono context type augmentation — add to the `declare module 'hono'` block in `identity.ts` or a shared types file:
```ts
declare module 'hono' {
  interface ContextVariableMap {
    otelContext: import('@opentelemetry/api').Context;
  }
}
```

**Step 2: Update `tracing.test.ts`**

Update tests to match new attributes:
- Remove assertions for `http.url`, `http.scheme`, `http.target`
- Add assertions for `http.host`, `http.path`, `http.request_id`, `http.route`, `http.source`, `http.user_agent`
- Add assertion that `X-Request-ID` response header is set
- Add test: when `X-Request-ID` is provided in request, same value is used (not regenerated)
- Scope name passed to `newScope` should be `'http'` (was `'http.server'`)

**Step 3: Run tests**
```bash
bun test ./src/**/*.test.ts
```
Expected: all pass

**Step 4: Run typecheck + lint**
```bash
bun run typecheck && bun run lint
```
Expected: no errors

---

## Task 3: Child span linking — pass OTel context through middleware (C)

**Files:**
- Modify: `src/middleware/identity.ts`
- Modify: `src/middleware/identity.test.ts`
- Modify: `src/domains/identity/service.ts`
- Modify: `src/domains/identity/service.test.ts`

**Step 1: Update `IdentityService.verify()` and `signOut()` to accept optional context**

In `src/domains/identity/service.ts`:

Add import:
```ts
import { type Context, ROOT_CONTEXT } from '@opentelemetry/api';
```

Update `verify` signature:
```ts
async verify(token: string, ctx?: Context): Promise<UserIdentity | null> {
  const [_ctx, scope] = this.otel.newScope(ctx ?? ROOT_CONTEXT, 'identity', 'verify-token');
  ...
}
```

Update `signOut` signature:
```ts
async signOut(token: string, ctx?: Context): Promise<void> {
  const [_ctx, scope] = this.otel.newScope(ctx ?? ROOT_CONTEXT, 'identity', 'sign-out');
  ...
}
```

**Step 2: Add `identity.signout.success` attribute to `signOut` (E)**

In `signOut`, after the provider call succeeds:
```ts
try {
  if (this.provider.signOut) {
    await this.provider.signOut(token);
  }
  scope.setAttribute('identity.signout.success', true);
  scope.end();
} catch (error) {
  scope.setAttribute('identity.signout.success', false);
  scope.traceIfError(error as Error);
  scope.end();
  throw error;
}
```

**Step 3: Update `identity.ts` middleware to pass OTel context**

Add `ContextVariableMap` augmentation (if not already added in Task 2):
```ts
declare module 'hono' {
  interface ContextVariableMap {
    otelContext: import('@opentelemetry/api').Context;
  }
}
```

Update the `verify` and `signOut` calls to pass context:
```ts
const otelCtx = c.get('otelContext');

if (token) {
  try {
    c.identity = await identityService.verify(token, otelCtx);
  } catch {
    c.identity = null;
  }
}
```

For signOut (if used elsewhere), pass `otelCtx` similarly.

**Step 4: Update `service.test.ts` for identity**

- Update `verify` and `signOut` call signatures in tests to pass optional context
- Add test: `verify` called with a context uses it (not ROOT_CONTEXT)
- Add test: `signOut` sets `identity.signout.success: true` on success
- Add test: `signOut` sets `identity.signout.success: false` on error

**Step 5: Update `identity.test.ts` middleware**

- Add test: `otelContext` from `c.get('otelContext')` is passed to `identityService.verify`

**Step 6: Run all tests**
```bash
bun test ./src/**/*.test.ts
```
Expected: all pass

**Step 7: Run typecheck + lint**
```bash
bun run typecheck && bun run lint
```
Expected: no errors

---

## Summary of all files changed

| File | Change |
|---|---|
| `src/infras/otel/otel.ts` | Use `scopeName` for named tracer per call |
| `src/middleware/tracing.ts` | New HTTP attributes, request ID, store otelContext, scope name `'http'` |
| `src/middleware/tracing.test.ts` | Update for new attributes + request ID tests |
| `src/middleware/identity.ts` | Pass otelContext to service, add ContextVariableMap |
| `src/middleware/identity.test.ts` | Update tests for context passing |
| `src/domains/identity/service.ts` | Optional context param, `identity.signout.success` |
| `src/domains/identity/service.test.ts` | Update tests for new param + attribute |
| `src/domains/token/token.service.ts` | Add OTel scope to `issueToken` |
| `src/domains/token/token.service.test.ts` | Update tests for new scope |
| `src/providers/betterauth/provider.ts` | Log infra errors before returning null |

---

## Task 4: Add OTel scope to TokenService.issueToken

**Files:**
- Modify: `src/domains/token/token.service.ts`
- Modify: `src/domains/token/token.service.test.ts`

**Step 1: Inject Otel into TokenService**

`TokenService` currently has no OTel dependency. Add it:

```ts
import type { Otel } from '@infras/otel/otel';
import { ROOT_CONTEXT } from '@opentelemetry/api';

export class TokenService {
  constructor(
    private readonly auth: Auth,
    private readonly config: Config,
    private readonly jwksRepository: JwksRepository,
    private readonly otel: Otel
  ) {}
```

**Step 2: Wrap `issueToken` in a span**

```ts
async issueToken(product: string, headers: Record<string, string>): Promise<string> {
  const [_ctx, scope] = this.otel.newScope(ROOT_CONTEXT, 'token', 'issue-token');
  scope.setAttribute('token.product', product);

  try {
    // ... existing logic unchanged ...
    scope.setAttribute('token.issued', true);
    scope.end();
    return jwt;
  } catch (error) {
    scope.setAttribute('token.issued', false);
    scope.traceIfError(error as Error);
    scope.end();
    throw error;
  }
}
```

**Step 3: Update `main.ts` to pass otel to TokenService**

In `src/cmd/server/main.ts`, find:
```ts
const tokenService = new TokenService(betterAuth, config, jwksRepository);
```
Change to:
```ts
const tokenService = new TokenService(betterAuth, config, jwksRepository, otel);
```

**Step 4: Update `token.service.test.ts`**

- Add `mockOtel` from `@infras/otel/otel.mock` to the test
- Pass `makeMockOtel().otel` as 4th arg to `TokenService` constructor
- Add test: `newScope` called with `'token'` scope and `'issue-token'` span name
- Add test: `token.product` attribute set
- Add test: `token.issued: true` on success
- Add test: `token.issued: false` + `traceIfError` called on error

**Step 5: Run tests + typecheck + lint**
```bash
bun test ./src/**/*.test.ts && bun run typecheck && bun run lint
```
Expected: all pass

---

## Task 5: Fix BetterAuthProviderAdapter silent error swallowing

**Files:**
- Modify: `src/providers/betterauth/provider.ts`

**Step 1: Read current `verify` implementation**

Current code:
```ts
async verify(token: string): Promise<UserIdentity | null> {
  try {
    const result = await this.auth.api.getSession({ headers: { authorization: `Bearer ${token}` } });
    if (!result || !result.session || !result.user) return null;
    return mapSessionToUserIdentity(result.session, result.user);
  } catch {
    return null;
  }
}
```

Infrastructure errors (network, DB) are silently converted to `null` — indistinguishable from a valid "no session" case.

**Step 2: Inject Logger into BetterAuthProviderAdapter**

```ts
import type { Logger } from '@infras/logger/logger';

export class BetterAuthProviderAdapter implements IdentityProvider {
  constructor(
    private auth: Auth,
    private logger?: Logger
  ) {}

  async verify(token: string): Promise<UserIdentity | null> {
    try {
      const result = await this.auth.api.getSession({
        headers: { authorization: `Bearer ${token}` },
      });
      if (!result || !result.session || !result.user) return null;
      return mapSessionToUserIdentity(result.session, result.user);
    } catch (err) {
      this.logger?.error({ err }, 'BetterAuthProviderAdapter.verify failed');
      return null;
    }
  }
```

**Step 3: Update `main.ts` to pass logger to BetterAuthProviderAdapter**

In `src/cmd/server/main.ts`, find:
```ts
const betterAuthProvider = new BetterAuthProviderAdapter(betterAuth);
```
Change to:
```ts
const betterAuthProvider = new BetterAuthProviderAdapter(betterAuth, logger);
```

**Step 4: Update `provider.test.ts`**

- Pass optional logger mock to constructor
- Add test: when `getSession` throws, `logger.error` is called and `null` is returned

**Step 5: Run tests + typecheck + lint**
```bash
bun test ./src/**/*.test.ts && bun run typecheck && bun run lint
```
Expected: all pass
