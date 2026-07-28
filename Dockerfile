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
# Keep the install and the SPA build in separate RUN layers.
#
# This repo has an open, intermittent clean-image defect in the Vite/Rollup family
# `Rollup failed to resolve import "<dep>" from "/app/app/..."`, naming a different
# module each occurrence. The split below is good practice and is asserted by
# tests/clean-workspace-invariant.test.js, but do NOT read it as the fix.
#
# What is proven (2026-07-27): the dependency is NOT missing. A probe run inside
# the failing build layer resolved all 47 app deps from /app/app immediately
# before rollup failed and again afterwards, with all 37 @radix-ui packages
# complete; `tsc -b` also resolves the same specifier seconds earlier in this very
# command. An earlier comment here claimed the cause was overlay write-visibility
# between RUN layers — that explanation is disproven, as are missing/unhoisted
# deps, the npm ci flags, Node version, npm version, disk, and memory.
#
# MECHANISM (2026-07-28): file-descriptor exhaustion, which this comment
# previously listed as excluded. That exclusion was measured under `podman run`
# (limit 1048576) — not the namespace the build runs in. A buildah `RUN` layer
# gets a soft limit of **1024**, while rollup defaults `maxParallelFileOps` to
# **1000**. The build therefore queues file operations 24 descriptors under the
# ceiling and loses the race whenever node's own fds push it over; the file
# exists but cannot be opened, and rollup reports that as a resolve failure.
# Fixed by capping the queue in app/vite.config.ts (guarded by
# tests/spa-build-file-parallelism.test.js). Measure a limit in the namespace
# that actually runs the code: `podman run`, `docker exec`, and a host shell are
# three different namespaces, none of them this one.
#
# See measure/tracks/chore_home_network_deployment_hardening_20260712/plan.md
# (Phase 6, "Instrumented investigation") before changing anything here. In
# particular: do not adopt one of the four test-strategy.md §3 remediation
# patterns — all four assume an install-layout defect that is disproven.
#
# The SPA build runs through scripts/docker-build-spa.sh rather than npm
# directly: because the defect is not reproducible on demand, the wrapper makes
# the *next* spontaneous occurrence self-diagnosing by re-running the build
# under DEBUG=vite:resolve and printing the resolver trace. On success it is
# equivalent to `npm run build --workspace=app`; on failure it still exits with
# the original status.
RUN npm ci --workspaces --include-workspace-root
RUN sh scripts/docker-build-spa.sh

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
