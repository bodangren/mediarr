# Mediarr

Mediarr is a unified, all-in-one media management powerhouse designed to replace the fragmented "arr" stack (Sonarr, Radarr, Bazarr, Prowlarr) with a single, modern interface and a high-performance integrated backend.

## Vision

Built for home lab enthusiasts, Mediarr eliminates the complexity of wiring together separate services. It provides a "Modern Dark" dashboard for managing Movies, TV Shows, Subtitles, and Indexers, all powered by a built-in torrent engine and local DLNA streaming.

## Tech Stack

- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS
- **Backend:** Node.js + Fastify (API) + tsx (runtime)
- **Database:** SQLite + Prisma ORM
- **Testing:** Vitest
- **State Management:** TanStack React Query
- **Routing:** React Router v7
- **Clients:** Android TV (Kotlin + Jetpack Compose)
- **Deployment:** Docker & Docker Compose (migration from Next.js to Vite in progress)

## Development

### Prerequisites

- Node.js 20+
- npm (workspaces)

### Running locally

```bash
npm install
npm run dev
```

This starts both the Vite dev server (frontend on `:5173`) and the Fastify API server (backend on `:3001`).

### Testing

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

## Development Workflow

This project follows the **Conductor Workflow**. All major features and fixes are organized into **Tracks**.

- **Project Context:** [conductor/index.md](./conductor/index.md)
- **Tracks Registry:** [conductor/tracks.md](./conductor/tracks.md)

To contribute or implement features, please refer to the active track plans in `conductor/tracks/`.

## Library Statistics & Analytics

A dedicated analytics page at `/system/stats` aggregates library health data in real time:

- **Library counts** — Total and monitored movies, TV shows, and episodes
- **Storage breakdown** — Total size with a visual Movies vs TV split bar
- **Quality distribution** — CSS bar charts showing 4K / 1080p / 720p / SD / Unknown counts for movies and episodes separately (`GET /api/system/stats`)
- **Missing media** — Count of monitored items without files (movies and aired episodes), with links to the library
- **Recent activity** — Downloads and searches over the last 7 and 30 days, plus subtitle downloads

Backend implementation: `server/src/api/routes/statsRoutes.ts` — pure Prisma aggregations, no external dependencies.

---

## API Utilities

Shared backend utilities live in `server/src/api/utils/`:

- **playbackHelpers** — Playback state serialization and latest-progress mapping.
- **episodeStatusHelpers** — Unified episode/movie status determination (downloaded, missing, airing, unaired).
- **queryHelpers** — Library filter parsing (monitored, status, search) used across movie and series endpoints.
- **safePath** — Path-traversal protection for file operations, ensuring resolved paths stay within allowed root directories.

## Shared Libraries

### Subtitle Utilities (`server/src/services/providers/providerUtils.ts`)

Canonical subtitle provider helpers shared across all subtitle providers (OpenSubtitles, Assrt, Subdl):

- **`deriveReleaseName`** — Extracts release name from a media file path.
- **`extractExtension`** — Normalises subtitle file extensions.
- **`readNumericProviderData`** — Safely reads a numeric field from provider-specific metadata.
- **`ALLOWED_SUBTITLE_EXTENSIONS`** — Single authoritative set of accepted subtitle file extensions.

### Frontend Subtitle Coverage (`app/src/lib/subtitles/coverage.ts`)

Shared frontend helpers for displaying subtitle availability:

- **`summarizeSubtitleCoverage`** — Computes complete/partial/missing status from available and missing language lists.
- **`subtitleStatusLabel`** / **`subtitleStatusBadgeClass`** — Consistent UI labels and CSS classes across all subtitle views.

## System Health Monitoring

### SystemHealthService (`server/src/services/SystemHealthService.ts`)

The `/api/system/status` endpoint now returns **real, live** system data instead of hardcoded stubs:

- **`getDiskSpace(paths)`** — Uses `fs.statfs()` to report actual free/total bytes for each configured path. Falls back to zeros on inaccessible paths.
- **`getProcessInfo()`** — Returns actual `process.uptime()`, `process.version`, `process.platform`, and a real server start timestamp.
- **`checkDatabase()`** — Pings the database with `SELECT 1`, fetches the SQLite version via `sqlite_version()`, and reads the latest migration name from `_prisma_migrations`. Returns `'error'` status on failure.
- **`checkRootFolders(paths)`** — Checks each path with `fs.access(R_OK)`, reporting `'ok'` or `'error'` per path.
- **`detectFFmpeg()`** — Runs `ffmpeg -version` and parses the version string; returns `status: 'unknown'` if FFmpeg is not installed.

Overall health status (`ok` / `warning` / `error`) is computed from the per-check results. The service is injected via `ApiDependencies.systemHealthService` so routes fall back gracefully in test environments.

---

## Notification Event Dispatch

### NotificationDispatchService (`server/src/services/NotificationDispatchService.ts`)

Configured notifications (Discord, Slack, Telegram, Gotify, Pushover, Webhook, Email) are now **automatically dispatched on real app events**:

- **`notifyGrab(payload)`** — Fires when a release is successfully grabbed (torrent added). Triggered from `MediaSearchService.grabRelease()`.
- **`notifyDownload(payload)`** — Fires when a movie or episode is successfully imported after download. Triggered from `ImportManager` at all 4 import paths (linked movie, linked episode, parsed movie, parsed episode). Uses `onDownload` or `onUpgrade` flag depending on `isUpgrade`.
- **`notifySeriesAdd(payload)`** — Available for wiring when a new series is added to the library.
- **`notifyEpisodeDelete(payload)`** — Available for wiring when an episode file is deleted.

Each method reads all enabled notifications from the DB, filters by the relevant boolean flag (`onGrab`, `onDownload`, etc.), and sends to all matching integrations concurrently. Errors from individual notification sends are swallowed so a broken integration never blocks the main import/download flow.

The shared `sendSingleNotification(type, config, title, body)` function is exported and used by both the dispatch service and the notification test routes, eliminating code duplication.

---

## Automated Search

### Release-Date Guard (`server/src/services/WantedSearchService.ts`)

Automated searches now skip content that has not yet been publicly released:

- **Movies** — compares the earliest non-null date among `digitalRelease`, `physicalRelease`, and `inCinemas` against the current time plus a 1-day grace period. If the movie has not been released yet, the search is skipped and logged as a skip event.
- **Episodes** — compares `airDateUtc + 1 day` to the current time; unaired episodes are skipped before firing any indexer query.
- **Series sweeps** (`autoSearchSeries`) — filters out unaired episodes before spawning individual searches, avoiding unnecessary DB lookups.
- **Global sweep** (`autoSearchAll`) — uses a Prisma-level `OR` filter so unreleased movies are excluded from the candidate list before any network calls are made.

## System Administration

### Scheduler (`server/src/services/Scheduler.ts`)

Named cron job manager with metadata tracking:
- Exposes `listJobsMeta()` with `lastRunAt`, `lastDurationMs`, and `nextRunAt` for every registered job.
- `runNow(name)` triggers a job immediately and updates its timing metadata.
- Pre-built helpers: `scheduleActivityCleanup`, `scheduleWantedSearch`, `scheduleSubtitleWantedSearch`, `scheduleTargetedSubtitleSearch`, `scheduleLibraryScan`.

### Library Scan Service (`server/src/services/LibraryScanService.ts`)

Filesystem reconciliation service that keeps the database in sync with on-disk media files:
- `scanAll(settings)` — Walks `movieRootFolder` and `tvRootFolder`, marks missing DB records as unlinked, links newly-found video files to existing library entries, and counts adjacent subtitle files.
- Triggered on demand via `POST /api/library/scan` or automatically by the daily `library-scan` cron job (2 AM).

### Targeted Subtitle Automation (`server/src/services/SubtitleAutomationService.ts`)

- `runTargetedAutomationCycle(options)` — Scans only recently-added media (default: last 7 days) and variants with previously-failed download attempts, rather than the entire library. Used by the daily scheduled job to reduce subtitle provider load.
- `runAutomationCycle()` — Full library scan; used for on-demand triggers and post-import flows.

### Log Reader (`server/src/services/LogReaderService.ts`)

In-process ring buffer (2 000 entries max) that intercepts `console.log/warn/error` and exposes them via `GET /api/logs/files`. Supports filtering by level, search text, and date range, with pagination.

### Backup Service (`server/src/services/BackupService.ts`)

SQLite database backup management:
- `create(type)` — Copies the live database file to the configured backup directory with a timestamped name.
- `list()` / `delete(id)` — Enumerate and remove backups; returns entries newest-first.
- `applyRetention(days)` — Removes backups older than the given number of days.
- `getFilePath(name)` — Path-traversal-safe lookup within the backup directory.

## Roadmap

1. **Foundation:** Monorepo scaffolding and reverse engineering reference projects.
2. **Indexer Engine:** Unified indexing and proxying (Prowlarr features).
3. **Torrent Engine:** Integrated downloader and queue management.
4. **TV & Movies:** Full series and movie lifecycle management.
5. **Subtitle & Audio:** Advanced multi-language tracking and fetching.
6. **Unified UI:** The final high-density "Modern Dark" dashboard.
7. **DLNA Server:** Local network streaming with native subtitle support.
8. **Android TV Client:** Native Kotlin client with Jetpack Compose UI.

## License

[MIT](./LICENSE)
