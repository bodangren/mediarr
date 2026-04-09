# Implementation Plan: Auto-Update System

## Phase 1 — GitHub Release Checking

- [x] Task: Create `server/src/services/updates/UpdateService.ts` with `checkForUpdate()` — fetch from GitHub Releases API, parse semver from tag, compare against `package.json` version, cache result in memory
- [x] Task: Create `UpdateService.getLatestRelease()` — return cached release info (version, changelog, publishedAt, assets, checksum) or null
- [x] Task: Add Docker detection (`isRunningInDocker()`) — check for `/.dockerenv` or `DOCKER_ENV` env var; affects update strategy
- [x] Task: Wire `GET /api/updates/check` and `GET /api/updates/available` to `UpdateService` in `updatesRoutes.ts`; remove `Math.random()` simulation
- [x] Task: Write tests for `UpdateService` — mock GitHub API; newer version available, up-to-date, network error, rate limit (403)
- [x] Task: Conductor - Checkpoint Phase 1

## Phase 2 — Download & Verify

- [x] Task: Implement `UpdateService.downloadUpdate()` — stream release asset to `/config/updates/mediarr-<version>` with progress tracking (bytes downloaded / total); emit progress events via EventEmitter
- [x] Task: Implement checksum verification — parse SHA-256 from release body (regex for hex hash), compare against downloaded file hash via `crypto.createHash`
- [x] Task: Wire `POST /api/updates/download` and `GET /api/updates/progress/:id` to `UpdateService`
- [x] Task: Write tests for `downloadUpdate` — successful download, checksum mismatch, network failure, progress events
- [x] Task: Conductor - Checkpoint Phase 2

## Phase 3 — Install & Restart

- [x] Task: Implement `UpdateService.installUpdate()` — for binary mode: copy staged binary over current binary (`process.execPath`), exit with restart code; for Docker mode: return "restart required" advisory with `docker pull` command
- [x] Task: Wire `POST /api/updates/install` to `UpdateService`
- [x] Task: Write tests for `installUpdate` — binary replace (mock fs), Docker advisory response, missing staged file error
- [x] Task: Conductor - Checkpoint Phase 3

## Phase 4 — SPA Updates Page & Scheduler

- [x] Task: Create `app/src/pages/settings/SettingsUpdatesPage.tsx` — current version display, "Check for Updates" button, available update card (version, changelog, date), "Download" button with progress bar, "Install" button, update history table
- [x] Task: Add route `/settings/updates` to `App.tsx` and sidebar navigation
- [x] Task: Add daily update check cron job to `main.ts` scheduler (when `autoUpdateEnabled` is true) — calls `checkForUpdate()` + `downloadUpdate()` but never `installUpdate()`
- [x] Task: Write tests for `SettingsUpdatesPage` — renders current version, shows update available, progress bar, error states
- [x] Task: Run `cd app && npm run build` — zero TS errors
- [x] Task: Run `CI=true npm test` — all tests pass
- [x] Task: Run `CI=true bun test` — executed; suite contains pre-existing baseline failures outside this track
- [x] Task: Conductor - Checkpoint Phase 4
