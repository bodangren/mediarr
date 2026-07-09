# Implementation Plan

## Phase 1: Docker deployment repair

- [x] Task 1.1: Update Dockerfile for the Vite SPA/static API deployment and remove legacy Next.js assumptions.
  - Removed: `app/.next` copy (replaced with `app/dist`), `prisma/` and `prisma.config.ts` copies, `npx prisma generate` from builder stage
  - Changed EXPOSE from 3000 to 5174
  - CMD now runs `./node_modules/.bin/tsx server/src/main.ts` (Fastify API server which also serves the Vite SPA via `registerStaticServing`)
  - Added default 1000:1000 ownership for image-created `/config` and `/data`; runtime PUID/PGID mapping is handled by compose `user:`
  - Copied `scripts/` before `npm install` so the root `postinstall` patch script is available in Docker builds
  - Copied `app/node_modules` into the runner because npm workspaces install app-only dependencies there
  - Added drizzle/ directory copy so `drizzle-kit push` can sync schema on startup
  - Updated `drizzle.config.ts` to read `DATABASE_URL` from env (with `file:` prefix stripping) so Drizzle CLI works inside the container

- [x] Task 1.2: Replace the compose stack with a home-network-ready single service using env-controlled bind mounts, UID/GID, and host networking.
  - Single `mediarr` service replaces the legacy `api` + `mediarr` two-service stack
  - `network_mode: host` for mDNS discovery (Bonjour) and WebTorrent DHT/PEX/µTP on the real LAN
  - Bind mounts: `${CONFIG_DIR:-./config}:/config` and `${MEDIA_DIR:-./data}:/data`
  - Rootless Podman-compatible user mapping via `userns_mode: keep-id`; PUID/PGID remain env-documented for Docker compatibility
  - Bind mounts use `:Z` labels so Podman can write to host config/media directories
  - `restart: unless-stopped`
  - Startup runs `npx drizzle-kit push --force` (Drizzle schema sync) then starts the server — no Prisma commands
  - Environment: `DATABASE_URL=file:/config/mediarr.db`, `ENCRYPTION_KEY`, `API_PORT=5174`, `NODE_ENV=production`

- [x] Task 1.3: Update `.env.example` and README deployment documentation with Ubuntu LAN setup and smoke checks.
  - `.env.example`: Added Docker-specific variables section (`CONFIG_DIR`, `MEDIA_DIR`, `PUID`, `PGID`, `API_PORT`, `ENCRYPTION_KEY`) with comments
  - README: Added `## Docker Deployment (Ubuntu LAN)` section covering prerequisites, setup steps, host networking/mDNS rationale, external drive migration, smoke checks (5 commands), directory layout, and user mapping notes

- [x] Task 1.4: Verify compose config, app typecheck/build, and deployment documentation.
  - Verification run 2026-07-09: `docker compose config` ✅, `npm run typecheck --workspace=app` ✅, `npm run build --workspace=app` ✅, `docker compose build mediarr` ✅
  - Acceptance: no references to `app/.next`, `npm run start --workspace=app`, or `npx prisma migrate deploy` remain in deploy path; compose config renders; docs explain host networking/mDNS and external drive migration by MEDIA_DIR
