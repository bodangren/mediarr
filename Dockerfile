# Syntax=docker/dockerfile:1
# Base image
FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Build stage — build the Vite SPA (app/dist)
FROM base AS builder
RUN apt-get update -y && apt-get install -y build-essential python3 cmake && rm -rf /var/lib/apt/lists/*
# Keep the complete workspace graph, postinstall entrypoint, and source in the
# same filesystem snapshot consumed by npm.
COPY package.json package-lock.json ./
COPY app/package.json ./app/package.json
COPY server/package.json ./server/package.json
COPY scripts/apply-patches.js ./scripts/apply-patches.js
COPY . .
# The install and the SPA build MUST stay in separate RUN layers.
#
# Running them in one layer intermittently fails with the Vite/Rollup family
# `Rollup failed to resolve import "<dep>" from "/app/app/..."` even though the
# dependency is installed correctly at /app/node_modules. Verified 2026-07-27:
# with a combined layer the build aborted after 158 modules on
# `@radix-ui/react-select`; running the identical build from the committed
# install layer transformed 3028 modules and produced dist/. The install is not
# at fault — an in-layer probe confirmed node_modules/@radix-ui/react-select was
# complete and app/node_modules held only @types and globals. Committing the
# install layer forces the overlay filesystem to publish every written entry
# before Vite's resolver walks node_modules.
RUN npm ci --workspaces --include-workspace-root
RUN npm run build --workspace=app

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV DATABASE_URL=file:/config/mediarr.db
ENV API_PORT=5174
ENV CONFIG_DIR=/config
ENV MEDIA_DIR=/data

# Bind mounts replace these directories at runtime. Docker Compose runs the
# process as the caller-selected PUID:PGID; host directory ownership must match.
RUN mkdir -p \
        /config \
        /data/downloads/incomplete \
        /data/downloads/complete \
        /data/media/tv \
        /data/media/movies && \
    chown -R 1000:1000 /config /data

# Copy production code
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/app/dist ./app/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/server/definitions ./server/definitions

VOLUME ["/config", "/data"]

EXPOSE 5174
CMD ["sh", "-ec", "./node_modules/.bin/tsx server/src/config/preflight.ts && ./node_modules/.bin/tsx scripts/reconcile-migration-compatibility.ts && ./node_modules/.bin/tsx scripts/run-migrations.ts && exec ./node_modules/.bin/tsx server/src/main.ts"]
