# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2026-03-07

### Changed

- Renamed `identity/` → `domains/identity/` to make the domain layer explicit
- Restructured `transport/` → `transport/http/` with a dedicated `handler/` subdirectory; HTTP handlers are now thin adapters separate from the Hono server wiring
- Replaced `@identity/*` tsconfig path alias with `@domains/*`
- Extracted route-to-handler bindings from `HttpServer` into `transport/http/routes.ts`; `server.ts` now only registers middleware
- Token endpoint changed from `POST` to `GET` for `/api/auth/token/:product`
- Renamed `CACHE_REDIS_*` env vars to `REDIS_*` in `docker-compose.yml` and `deployments/app.yml` to match config expectations
- `docker-compose.yml` service hostnames now use `${VAR:-default}` substitution instead of hardcoded values

### Added

- `domains/token/` bounded context: `JwksRepository` interface, `PostgresJwksRepository` (raw SQL isolated from transport), `TokenService` (JWT signing with typed errors)
- `transport/http/handler/token.handler.ts` — thin HTTP adapter for `GET /api/auth/token/:product`; maps typed domain errors to HTTP status codes
- `transport/http/routes.ts` — `registerRoutes(app, deps)` function separating route registration from middleware setup
- `AUTH_BASE_URL`, `AUTH_SECRET_KEY`, `AUTH_REQUIRE_EMAIL_VERIFICATION`, `AUTH_TRUSTED_ORIGINS`, `AUTH_ALLOWED_AUDIENCES` env vars added to `docker-compose.yml` and `deployments/app.yml`
- `test/e2e/server/e2e-server-start.ts` — runs migrations and starts the server before e2e tests
- `test/e2e/server/e2e-server-stop.ts` — stops the server after e2e tests via PID file
- `pretest:e2e` / `posttest:e2e` lifecycle scripts so `bun run test:e2e` is fully self-contained
- Expanded unit test coverage: `token.service.test.ts`, `jwks.postgres.test.ts`, `token.handler.test.ts`, `identity.test.ts`, `tracing.test.ts`, `openapi.test.ts`

### Removed

- `/health` endpoint and `health.handler.ts`
- `DB_POSTGRES_TIMEZONE` env var (unused by config)

### Fixed

- `test/e2e/helpers.ts` DB name mismatch (`oil_auth` → `oil_auth_test`) and missing `AUTH_ALLOWED_AUDIENCES` env var
- Tracing middleware error detection now uses response status (`>= 500`) instead of `try/catch`, correctly handling Hono v4's error interception behaviour

---

## [Unreleased] - 2026-03-01

### Added

- Initial release of **oil-auth** — a self-hosted authentication microservice
- Email & password authentication: sign-up, sign-in, sign-out, session retrieval
- `BetterAuthService` wrapping [better-auth](https://better-auth.com) with custom snake_case DB schema
- Custom schema mapping system (`schema.ts`, `default.schema.ts`) with per-table field overrides
- PostgreSQL 16 support via `pg` pool (`PostgresClient`)
- Optional Redis 7 session cookie cache via `ioredis` (`RedisClient`)
- Connection logging for PostgreSQL (on first acquired connection) and Redis (on `ready` event)
- `HttpServer` using [Hono](https://hono.dev) with CORS, pino request logging, tracing, and identity middleware
- Auth route handlers split into `router.ts` (`/sign-up`, `/sign-in`, `/session`, `/sign-out`)
- `/health` endpoint with live PostgreSQL ping
- OpenTelemetry distributed tracing (gRPC and HTTP exporter support)
- Structured JSON logging with [pino](https://getpino.io); pretty output in development
- Typed config system via [zod](https://zod.dev) with environment variable loading
- Session TTL, update age, and cookie cache TTL configurable via environment variables
- Multi-stage Dockerfile using `oven/bun:1-alpine` with non-root user
- Docker Compose for local development (app + PostgreSQL + Redis)
- App-only Compose service in `deployments/app.yml`
- `migrate:generate` and `migrate:up` npm scripts via `@better-auth/cli`
- Biome for linting and formatting
- Unit, integration, and e2e test scaffolding
- `README.md`, `LICENSE` (MIT), `CODE_OF_CONDUCT.md`, `.env.example`

