# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
