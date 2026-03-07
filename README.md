# oil-auth

A lightweight, self-hosted authentication microservice built with [Bun](https://bun.sh) and [Hono](https://hono.dev), using [better-auth](https://better-auth.com) for session management backed by [PostgreSQL](https://www.postgresql.org) and optional [Redis](https://redis.io) caching.

---

## Features

- Email & password authentication — sign-up, sign-in, sign-out, session retrieval
- Session cookie cache via Redis (falls back gracefully when Redis is absent)
- Custom snake_case database schema through better-auth's schema mapping
- OpenTelemetry distributed tracing (gRPC or HTTP exporter)
- Structured JSON logging with [pino](https://getpino.io) (pretty in development)
- CORS and identity middleware
- Multi-stage Docker build with non-root user
- Docker Compose for local development and testing

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| HTTP framework | [Hono](https://hono.dev) |
| Auth | [better-auth](https://better-auth.com) |
| Database | PostgreSQL 16 · [`pg`](https://node-postgres.com) |
| Cache | Redis 7 · [ioredis](https://github.com/redis/ioredis) |
| Tracing | [OpenTelemetry Node SDK](https://opentelemetry.io) |
| Logging | [pino](https://getpino.io) |
| Config validation | [zod](https://zod.dev) |
| Linting / formatting | [Biome](https://biomejs.dev) |

---

## Project Structure

```
src/
├── cmd/server/           # Entrypoint — wires all dependencies and starts Bun server
├── config/               # Config schema (zod), env helpers, typed Config export
├── domains/
│   ├── identity/         # IdentityService, IdentityProvider interface, domain types
│   └── token/            # TokenService, JwksRepository interface + PostgreSQL impl
├── infras/
│   ├── logger/           # Pino logger factory
│   ├── otel/             # OpenTelemetry SDK setup
│   ├── postgres/         # PostgresClient — pool wrapper with connection logging
│   └── redis/            # RedisClient — ioredis wrapper with connection logging
├── middleware/
│   ├── identity.ts       # Attaches identity context to request
│   └── tracing.ts        # OpenTelemetry span per request
├── providers/
│   └── betterauth/
│       ├── hooks.ts      # Auth handler utility
│       ├── provider.ts   # BetterAuthProviderAdapter (IdentityProvider impl)
│       ├── schema/       # DB table/column mapping + createSchema() override system
│       └── service.ts    # BetterAuthService class, Auth type
└── transport/
    └── http/
        ├── server.ts     # HttpServer — middleware stack, health check, route mounting
        ├── openapi.ts    # /openapi.json + /docs (Scalar UI, dev only)
        └── handler/
            ├── token.handler.ts   # POST /api/auth/token/:product
            └── health.handler.ts  # GET /health
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- PostgreSQL 16+
- Redis 7+ *(optional — cookie cache is disabled when Redis is unavailable)*

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Minimum required variables:

```dotenv
DB_POSTGRES_HOST=localhost
DB_POSTGRES_PORT=5432
DB_POSTGRES_NAME=oil_auth
DB_POSTGRES_USER=postgres
DB_POSTGRES_PASSWORD=yourpassword
```

See [.env.example](.env.example) for the full reference.

### 3. Apply database migrations

Generate the SQL schema file:

```bash
bun run migrate:generate
```

Apply to the database:

```bash
bun run migrate:up
```

### 4. Start the development server

```bash
bun run dev
```

Server is available at `http://localhost:3000`.

---

## Docker

### Local development (app + postgres + redis)

```bash
bun run docker:up        # start
bun run docker:down      # stop
```

### App-only (external infrastructure)

```bash
docker compose -f deployments/app.yml up
```

---

## API Reference

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `{ status: "ok" }` and pings the database. Returns `503` if the DB is unreachable. |

### Auth — prefix `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/sign-up` | Create a new account |
| `POST` | `/api/auth/sign-in` | Authenticate and receive a session |
| `GET` | `/api/auth/session` | Retrieve the current session |
| `POST` | `/api/auth/sign-out` | Invalidate the current session |
| `POST` | `/api/auth/token/:product` | Issue a product-scoped JWT for a valid session |
| `GET` | `/api/auth/jwks` | JWKS endpoint for offline JWT verification |

#### Sign up

```bash
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"secret","name":"Alice"}'
```

#### Sign in

```bash
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"secret"}'
```

#### Get session

```bash
curl http://localhost:3000/api/auth/session \
  -H 'Cookie: better-auth.session_token=<token>'
```

#### Sign out

```bash
curl -X POST http://localhost:3000/api/auth/sign-out \
  -H 'Cookie: better-auth.session_token=<token>'
```

#### Issue a product-scoped JWT

```bash
curl -X POST http://localhost:3000/api/auth/token/productA \
  -H 'Authorization: Bearer <session-token>'
# or via cookie
curl -X POST http://localhost:3000/api/auth/token/productA \
  -H 'Cookie: better-auth.session_token=<token>'
```

Returns `{ "token": "<jwt>" }`. The JWT carries `email`, `role`, `sid` claims and is signed with EdDSA. Verify offline using the `/api/auth/jwks` endpoint.

Valid products are configured via `AUTH_ALLOWED_AUDIENCES`.

---

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start in development mode |
| `bun run start` | Start in production mode |
| `bun run migrate:generate` | Generate SQL schema from auth config |
| `bun run migrate:up` | Apply migrations to the database |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | Lint with Biome |
| `bun run lint:fix` | Lint and auto-fix |
| `bun run test` | Unit tests |
| `bun run test:integration` | Integration tests |
| `bun run test:e2e` | End-to-end tests |
| `bun run test:all` | All tests |
| `bun run docker:up` | Start full Docker Compose stack |
| `bun run docker:down` | Stop Docker Compose stack |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `APP_PORT` | `3000` | HTTP listen port |
| `APP_ENV` | `development` | `development` \| `production` \| `test` |
| `APP_NAME` | `auth-service` | Service name (used in telemetry) |
| `APP_CORS_ENABLE` | `true` | Enable CORS |
| `APP_CORS_ALLOW_CREDENTIALS` | `true` | Allow credentials |
| `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:3000,...` | Comma-separated origins |
| `APP_CORS_ALLOWED_HEADERS` | `Accept,...` | Comma-separated headers |
| `APP_CORS_ALLOWED_METHODS` | `GET,POST,...` | Comma-separated methods |
| `APP_CORS_MAX_AGE_SECONDS` | `300` | Preflight cache duration |
| `DB_POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `DB_POSTGRES_PORT` | `5432` | PostgreSQL port |
| `DB_POSTGRES_NAME` | `oil_auth` | Database name |
| `DB_POSTGRES_USER` | `postgres` | Database user |
| `DB_POSTGRES_PASSWORD` | `` | Database password |
| `DB_POSTGRES_SSL_MODE` | `disable` | `disable` \| `require` |
| `DB_POSTGRES_TIMEZONE` | `UTC` | Database timezone |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | `` | Redis password |
| `REDIS_DB` | `0` | Redis database index |
| `REDIS_TLS` | `false` | Enable Redis TLS |
| `SESSION_EXPIRES_IN` | `604800` | Session TTL in seconds (7 days) |
| `SESSION_UPDATE_AGE` | `86400` | Session refresh threshold in seconds (1 day) |
| `SESSION_COOKIE_CACHE_MAX_AGE` | `300` | Redis cookie cache TTL in seconds (5 min) |
| `AUTH_BASE_URL` | `` | Public base URL of this service |
| `AUTH_SECRET_KEY` | `` | Secret key for session signing (min 32 chars) |
| `AUTH_ALLOWED_AUDIENCES` | `` | Comma-separated list of valid JWT audience values |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `false` | Require email verification before sign-in |
| `AUTH_TRUSTED_ORIGINS` | `` | Comma-separated trusted origins for CSRF |
| `OTEL_ENABLED` | `false` | Enable OpenTelemetry |
| `OTEL_PROTOCOL` | `grpc` | `grpc` \| `http` |
| `OTEL_ENDPOINT` | `localhost:4317` | OTLP collector endpoint |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

---

## Contributing

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

1. Fork this repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes
4. Open a pull request

---

## License

[MIT](LICENSE)
