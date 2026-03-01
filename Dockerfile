FROM oven/bun:1-alpine AS base

WORKDIR /app

RUN apk add --no-cache \
    musl-locales \
    musl-locales-lang \
    tzdata

ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8 \
    TZ=Europe/London

FROM base AS deps

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

FROM base AS runner

ENV NODE_ENV=production

RUN addgroup -g 1001 -S bungroup && \
    adduser -S bunuser -u 1001 -G bungroup

COPY --from=builder /app ./

USER bunuser

EXPOSE 3000

CMD ["bun", "run", "src/cmd/server/main.ts"]
