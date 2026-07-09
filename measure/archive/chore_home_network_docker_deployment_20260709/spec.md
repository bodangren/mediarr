# Home Network Docker Deployment Readiness

## Context

The target deployment is a trusted household LAN install on an Ubuntu 24.04 all-in-one host with local storage, later migratable to an external drive. Mediarr should run in Docker using only the built-in WebTorrent engine and be discoverable by the Flutter Android TV client over the local network.

## Requirements

- FR-1: Provide a working Docker deployment path for the current Vite SPA + Fastify/Bun/Node monolith; do not rely on legacy Next.js `.next` output.
- FR-2: Use Drizzle-era startup/migration behavior; do not run Prisma commands from Docker Compose.
- FR-3: Expose `/config` and `/data` through host bind mounts controlled by environment variables at container start.
- FR-4: Allow the container to run as UID/GID 1000 by default, overrideable by environment variables.
- FR-5: Configure Docker networking for LAN mDNS discovery and built-in WebTorrent viability on a home network.
- FR-6: Document the exact Ubuntu home-network deployment flow and smoke-test checks.

## Acceptance Criteria

- AC-1: `docker-compose.yml` renders with env-configurable `CONFIG_DIR`, `MEDIA_DIR`, `PUID`, and `PGID` defaults.
- AC-2: Docker startup no longer references `app/.next`, `npm run start --workspace=app`, or `npx prisma migrate deploy`.
- AC-3: Compose uses a single deployable service or otherwise avoids the broken legacy frontend service.
- AC-4: mDNS discovery guidance is encoded in compose and docs, preferring host networking for the LAN-only home setup.
- AC-5: `.env.example` includes Docker deployment variables suitable for the user's Ubuntu host.
- AC-6: Verification includes config rendering, app typecheck/build where feasible, and documentation review.
