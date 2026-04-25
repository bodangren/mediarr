# Spec: Real System Health & Disk Space Monitoring

## Problem
The `/api/system/status` endpoint in `systemRoutes.ts` returns entirely **hardcoded, static data**:
- Disk space: hardcoded `50_000_000_000` free / `100_000_000_000` total bytes
- Database version: hardcoded `'3.45.0'`
- Migration: hardcoded `'20240101000000'`
- System start time: always `Date.now() - 3600000` (fake 1-hour uptime)
- Dependencies (FFmpeg): hardcoded version string
- Health checks: always `'ok'` regardless of actual system state

Users who look at the System Status page get completely fictional information, which destroys trust and makes the page useless for operational diagnosis.

## Solution
Create a `SystemHealthService` that performs **real, live** system checks:

1. **Disk space** — use Node.js `fs.statfs()` (available in Node ≥18 / Bun) on each configured root folder path + the data directory
2. **Process uptime** — use `process.uptime()` for real server uptime; `Date.now() - startTime` where `startTime` is captured at service construction
3. **Database connectivity** — run a lightweight `prisma.$queryRaw\`SELECT 1\`` and report `'ok'` / `'error'`
4. **Root folder health** — check each root folder exists and is readable/writable via `fs.access()`
5. **FFmpeg detection** — run `which ffmpeg` or `ffmpeg -version` and parse the version string; report `'unknown'` if absent
6. **Bun/Node version** — real `process.version`

Wire the service into `systemRoutes.ts` so the `/api/system/status` endpoint returns live data. Keep the response shape identical (backward-compatible).

## Acceptance Criteria
- [ ] `SystemHealthService` class exists in `server/src/services/`
- [ ] `getDiskSpace(paths: string[])` returns `{ path, label, free, total }[]` using `fs.statfs`
- [ ] `getProcessInfo()` returns real uptime, version, and platform
- [ ] `checkDatabase()` returns `{ status: 'ok' | 'error', message: string }`
- [ ] `checkRootFolders(paths: string[])` returns per-path health check results
- [ ] `detectFFmpeg()` returns version string or `undefined` + status
- [ ] `systemRoutes.ts` uses `SystemHealthService` (or falls back to stubs when service unavailable)
- [ ] `ApiDependencies` includes optional `systemHealthService`
- [ ] Unit tests cover all service methods with mocked fs/child_process
- [ ] All existing tests continue to pass
- [ ] Production build succeeds

## Out of Scope
- Indexer connectivity live checks (requires HTTP calls, covered by IndexerHealthRepository)
- Download client ping (separate concern)
- Frontend UI changes (the existing SystemStatusPage already renders whatever the API returns)
