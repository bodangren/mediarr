# Mediarr

Mediarr is a unified, all-in-one media management powerhouse designed to replace the fragmented "arr" stack (Sonarr, Radarr, Bazarr, Prowlarr) with a single, modern interface and a high-performance integrated backend.

## Vision

Built for home lab enthusiasts, Mediarr eliminates the complexity of wiring together separate services. It provides a "Modern Dark" dashboard for managing Movies, TV Shows, Subtitles, and Indexers, all powered by a built-in torrent engine and local DLNA streaming.

## Tech Stack

- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS
- **Backend:** Node.js + Fastify (API) + tsx (runtime)
- **Database:** SQLite + Drizzle ORM
- **Testing:** Vitest
- **State Management:** TanStack React Query
- **Routing:** React Router v7
- **Clients:** Flutter (Android TV + Linux + macOS) at `clients/mediarr-client/`
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

This starts both the Vite dev server (frontend on `:5173`) and the Fastify API server (backend on `:5174`).

### AI Provider Routing

`server/src/services/ReleaseParser.ts` supports two environment-driven AI routes:

- Local OpenAI-compatible gateway first:
  - `AI_GATEWAY_BASE_URL=http://localhost:3030/api/v1`
  - `AI_GATEWAY_MODEL=openai/gpt-4o-mini`
  - `AI_GATEWAY_API_KEY=...` optional for local dev; if omitted, the server sends a placeholder key
- OpenRouter fallback:
  - `OPENROUTER_API_KEY=...`
  - `OPENROUTER_MODEL=minimax/minimax-m2.7` optional

Routing order is:
1. Use the local gateway when `AI_GATEWAY_BASE_URL` is set and a model is available (`AI_GATEWAY_MODEL` or `OPENROUTER_MODEL`).
2. Otherwise use OpenRouter when `OPENROUTER_API_KEY` is set.
3. Otherwise fall back to regex-only parsing.

Smoke commands:

```bash
AI_GATEWAY_BASE_URL=http://localhost:3030/api/v1 AI_GATEWAY_MODEL=openai/gpt-4o-mini bun server/smoke-releaseparser.ts
OPENROUTER_API_KEY=sk-or-v1-... bun server/smoke-releaseparser.ts
```

### Testing

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

The clean-image acceptance build is opt-in because it shells out to
`docker build --no-cache` and takes 7–13 minutes:

```bash
npm run test:clean-image   # sets CLEAN_IMAGE_BUILD_TESTS=true
```

Run it before publishing an image. If the SPA build fails inside the container,
`scripts/docker-build-spa.sh` automatically re-runs it under `DEBUG=vite:resolve`
and prints the resolver trace — capture that output, it is the evidence needed
for the open intermittent `Rollup failed to resolve import` defect.

## Development Workflow

This project follows the **Measure Workflow**. All major features and fixes are organized into **Tracks**.

- **Project Context:** [measure/index.md](./measure/index.md)
- **Tracks Registry:** [measure/tracks.md](./measure/tracks.md)

To contribute or implement features, please refer to the active track plans in `measure/tracks/`.

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

The `/api/system/status` endpoint returns **real, live** system data with **dynamic path resolution from AppSettings**:

- **Dynamic disk-space paths** — Disk-space check paths are read from `settingsService` at request time: `movieRootFolder`, `tvRootFolder`, `torrentLimits.incompleteDirectory`, and `torrentLimits.completeDirectory`. Duplicate paths are deduplicated automatically. Falls back to an empty array when `settingsService` is not configured.
- **`getDiskSpace(paths)`** — Uses `fs.statfs()` to report actual free/total bytes for each configured path. Falls back to zeros on inaccessible paths.
- **`getProcessInfo()`** — Returns actual `process.uptime()`, `process.version`, `process.platform`, and a real server start timestamp.
- **`checkDatabase()`** — Pings the database with `SELECT 1`, fetches the SQLite version via `sqlite_version()`, and reads the latest migration name from `_prisma_migrations`. Returns `'error'` status on failure.
- **`checkRootFolders(paths)`** — Checks each path with `fs.access(R_OK)`, reporting `'ok'` or `'error'` per path.
- **`detectFFmpeg()`** — Runs `ffmpeg -version` and parses the version string; returns `status: 'unknown'` if FFmpeg is not installed.

Overall health status (`ok` / `warning` / `error`) is computed from the per-check results. The service is injected via `ApiDependencies.systemHealthService` so routes fall back gracefully in test environments.

---

## Push Notifications (Server → Clients)

### NotificationDispatchService (`server/src/services/NotificationDispatchService.ts`)

Mediarr delivers real-time push notifications directly to connected clients via the existing SSE (Server-Sent Events) event hub — **no external services required**.

- **`notifyGrab(payload)`** — Publishes `notification:grab` when a release is grabbed. Triggered from `MediaSearchService.grabRelease()`.
- **`notifyDownload(payload)`** — Publishes `notification:download` when a movie or episode import completes. Triggered from `ImportManager` at all 4 import paths. Uses `isUpgrade: true` for quality upgrades.
- **`notifySeriesAdd(payload)`** — Publishes `notification:seriesAdd` when a series is added to the library.
- **`notifyEpisodeDelete(payload)`** — Publishes `notification:episodeDelete` when an episode file is deleted.

Events are published to `ApiEventHub` which broadcasts them via SSE to all connected clients. Errors from the hub are swallowed so a broken connection never blocks the main download/import flow.

### Client Notification Support

- SSE push notifications are available via `GET /api/events/stream` for any connected client.
- Status endpoint: `GET /api/notifications/push-status` — returns `enabled: true`, `transport: "sse"`, and the count of currently connected SSE clients.
- The legacy Android TV Kotlin client (`clients/android-tv/`) implemented SSE notifications via OkHttp. The Flutter cross-platform client (`clients/mediarr-client/`) will add SSE notification support in a follow-up track.

---

## Security & Code Quality

### Event System Hardening (`server/src/api/eventHub.ts`)

The SSE event hub is hardened against malformed payloads:

- **Circular-reference safety** — `formatSseFrame()` wraps `JSON.stringify()` in a try/catch; a payload that cannot be serialized emits `{"error":"serialization_failed"}` rather than throwing and crashing the process.
- **Tested** — 5 unit tests in `eventHub.test.ts` cover broadcast, broken-pipe client removal, circular-reference resilience, client count tracking, and clean shutdown.

### Input Validation (`server/src/api/routes/systemRoutes.ts`)

System event filters now validate all query parameters before use:

- **Date safety** — `parseDate()` from `routeUtils.ts` is used everywhere dates arrive from query strings, so invalid date strings return `undefined` rather than silently creating `Invalid Date`.
- **Enum guards** — `isEventLevel()` / `isEventType()` set-membership checks replace unsafe `as EventLevel` casts; unknown values are silently ignored rather than corrupting filter logic.
- **DRY filter parsing** — A single `parseEventFilters(query)` helper is shared between the `GET /api/system/events` and `GET /api/system/events/export` handlers.

### SQL Parameterization (`server/src/main.ts`)

`repairMalformedJsonColumns()` now passes JSON default values as positional parameters to `$executeRawUnsafe()` rather than interpolating them directly into the SQL string, following parameterized-query best practices.

---

## Automated Search

### Release-Date Guard (`server/src/services/WantedSearchService.ts`)

Automated searches now skip content that has not yet been publicly released:

- **Movies** — compares the earliest non-null date among `digitalRelease`, `physicalRelease`, and `inCinemas` against the current time plus a 1-day grace period. If the movie has not been released yet, the search is skipped and logged as a skip event.
- **Episodes** — compares `airDateUtc + 1 day` to the current time; unaired episodes are skipped before firing any indexer query.
- **Series sweeps** (`autoSearchSeries`) — filters out unaired episodes before spawning individual searches, avoiding unnecessary DB lookups.
- **Global sweep** (`autoSearchAll`) — uses a Prisma-level `OR` filter so unreleased movies are excluded from the candidate list before any network calls are made.

## System Events Log (`/system/events`)

A dedicated frontend page exposing the backend System Events API:

- **Paginated event table** — shows timestamp, level badge (colour-coded), type, message, and source for every system event.
- **Filter by level** — info / warning / error / fatal.
- **Filter by type** — system / indexer / network / download / import / health / update / backup / other.
- **Clear All** — removes all in-memory events via `DELETE /api/system/events/clear`.
- **Export CSV** — downloads a filtered snapshot of events via `GET /api/system/events/export?format=csv`.
- Linked from the System section of the sidebar navigation under "Events".

---

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

## Docker Engine deployment (trusted Ubuntu LAN)

This Compose file targets **Docker Engine 24+ with Docker Compose v2** on a trusted
household LAN. It is not an Internet-facing or multi-user deployment: Mediarr has no
authentication, and `network_mode: host` exposes its HTTP listener, mDNS, and torrent
network traffic directly on the host network. Restrict access with your router/firewall
and do not publish this host to the Internet.

### Docker Engine versus Podman

`docker-compose.yml` intentionally uses Docker Engine syntax only. It runs the process
as `PUID:PGID` and uses ordinary bind mounts; it does **not** use Podman
`userns_mode: keep-id` or SELinux `:Z` labels. Podman users must maintain a separate,
locally reviewed override for their user namespace and SELinux policy. That runtime is
not covered by these instructions or the deployment checks.

For a **local Podman diagnostic only**, rootless Podman maps container IDs unless it is
given `--userns=keep-id`. Supplying Docker's numeric `--user "$PUID:$PGID"` without that
mapping can make an otherwise user-owned temporary bind mount appear unwritable and the
intentional `/config` preflight will stop before migrations. Do not copy these Podman
flags into `docker-compose.yml`; use a separate local invocation or override instead.

### Initial setup

1. Install Docker Engine and the Compose v2 plugin, then copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` with absolute, persistent host paths and your numeric account IDs:
   ```dotenv
   CONFIG_DIR=/home/youruser/mediarr/config
   MEDIA_DIR=/home/youruser/mediarr/data
   PUID=1000                         # id -u
   PGID=1000                         # id -g
   MEDIARR_API_PORT=5174
   ENCRYPTION_KEY=paste-the-output-of-openssl-rand-hex-32-here
   ```
   Generate and retain the encryption key before first start:
   ```bash
   openssl rand -hex 32
   ```
   A missing, blank, or example encryption key stops startup. Do not rotate an existing
   key without first proving that encrypted settings can be recovered.
3. Create both bind-mount roots with the same ownership as `PUID:PGID` (replace the
   values with the numbers from `.env`):
   ```bash
   sudo install -d -o 1000 -g 1000 -m 0750 /home/youruser/mediarr/config
   sudo install -d -o 1000 -g 1000 -m 0750 /home/youruser/mediarr/data
   ```
4. Render the Docker Engine configuration, then build and start:
   ```bash
   docker compose config
   docker compose up --build -d
   ```
   The container runs a write preflight for `/config`, reconciles only verified legacy
   migration history, applies tracked `drizzle-kit migrate` migrations, and only then
   starts the API. Migration or preflight failure leaves the container stopped; it
   never substitutes an ephemeral database.

`/config` contains `mediarr.db` and is the SQLite persistence boundary. `/data` is the
single bind-mounted tree for downloads and library media, preserving same-filesystem
hard-link/atomic-move behavior:

```text
/config/mediarr.db
/data/downloads/incomplete
/data/downloads/complete
/data/media/movies
/data/media/tv
```

### Smoke checks

From the repository root, load the same values Compose uses before running host commands:

```bash
set -a; . ./.env; set +a
docker compose ps
docker compose logs --tail=50 mediarr
curl -fsS "http://127.0.0.1:${MEDIARR_API_PORT:-5174}/api/health"
curl -fsS -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:${MEDIARR_API_PORT:-5174}/"
test -f "$CONFIG_DIR/mediarr.db"
```

The healthcheck is meaningful only after preflight, migrations, and API startup: it
requires HTTP 200 plus `body.ok === true` and a string at `body.data.status`. The exact
API envelope is `{"ok":true,"data":{"status":"ok","indexers":[...],"scheduler":{...}}}`;
the indexer list and scheduler counts are runtime-dependent. The root URL should return
HTTP `200`. With host networking, browse to `http://<host-LAN-IP>:5174`; no `ports:`
mapping is used.

### SQLite backup and restore rehearsal

Back up `/config` from the host. Install `sqlite3` on the host, keep backups outside
`CONFIG_DIR`, and periodically rehearse the following during a maintenance window:

```bash
set -a; . ./.env; set +a
export BACKUP_DIR=/srv/mediarr-backups
mkdir -p "$BACKUP_DIR"
stamp=$(date +%Y%m%d-%H%M%S)
sqlite3 "$CONFIG_DIR/mediarr.db" ".backup '$BACKUP_DIR/mediarr-$stamp.db'"
sqlite3 "$BACKUP_DIR/mediarr-$stamp.db" 'PRAGMA integrity_check;'
sha256sum "$BACKUP_DIR/mediarr-$stamp.db" > "$BACKUP_DIR/mediarr-$stamp.db.sha256"
```

To rehearse restore, stop Mediarr, retain the current database as a rollback point,
restore one verified backup, remove stale WAL sidecars, fix ownership, and start it:

```bash
docker compose down
cp -a "$CONFIG_DIR/mediarr.db" "$CONFIG_DIR/mediarr.db.before-restore"
cp -a "$BACKUP_DIR/mediarr-$stamp.db" "$CONFIG_DIR/mediarr.db"
rm -f "$CONFIG_DIR/mediarr.db-wal" "$CONFIG_DIR/mediarr.db-shm"
sudo chown "$PUID:$PGID" "$CONFIG_DIR/mediarr.db"
docker compose up -d
curl -fsS "http://127.0.0.1:${MEDIARR_API_PORT:-5174}/api/health"
```

Confirm expected settings and library records before deleting `mediarr.db.before-restore`.
Media files under `/data` need their own host-managed backup policy.

### Upgrade and rollback

Before an upgrade, make and verify a SQLite backup as above and record the current git
tag or commit. Then fetch the intended release and rebuild:

```bash
git fetch --tags
git checkout <release-tag-or-commit>
docker compose up --build -d
docker compose ps
curl -fsS "http://127.0.0.1:${MEDIARR_API_PORT:-5174}/api/health"
```

Migrations are additive and run automatically at startup. If the new release fails its
smoke check, stop it, return to the recorded release, restore the pre-upgrade SQLite
backup (using the rehearsal procedure), and rebuild:

```bash
docker compose down
git checkout <previous-release-tag-or-commit>
# Restore the verified pre-upgrade backup into $CONFIG_DIR/mediarr.db, remove -wal/-shm,
# and restore PUID:PGID ownership as shown above.
docker compose up --build -d
```

#### Legacy migration-history compatibility

Early local installs could be created with `drizzle-kit push` or have their scheduler
columns repaired at runtime before those changes had Drizzle journal rows. The image
handles that one known upgrade path before `drizzle-kit migrate`: it verifies SQLite
integrity, foreign keys, and the normalized table/index definitions of every expected
schema object against the baseline derived from checked-in migrations. Only then does it
record the matching checked-in SQL hashes in
`__drizzle_migrations`; unknown, partial, or mismatched schemas fail closed without
suppressing a migration error or rewriting application data.

For a host-managed migration rehearsal, use the same wrapper as the image rather than
running bare `drizzle-kit migrate` against a legacy database:

```bash
set -a; . ./.env; set +a
DATABASE_URL="file:$CONFIG_DIR/mediarr.db" npm run migrate
sqlite3 "$CONFIG_DIR/mediarr.db" \
  'SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at;'
```

The Drizzle journal is the durable migration audit record. Retain the pre-upgrade backup
and the container logs, which name every verified legacy migration adopted during that
run. The reconciliation script performs no application schema DDL; all new schema changes
continue to come from the versioned files in `drizzle/`.

## Roadmap

1. **Foundation:** Monorepo scaffolding and reverse engineering reference projects.
2. **Indexer Engine:** Unified indexing and proxying (Prowlarr features).
3. **Torrent Engine:** Integrated downloader and queue management.
4. **TV & Movies:** Full series and movie lifecycle management.
5. **Subtitle & Audio:** Advanced multi-language tracking and fetching.
6. **Unified UI:** The final high-density "Modern Dark" dashboard.
7. **DLNA Server:** Local network streaming with native subtitle support.
8. **Cross-Platform Client:** Flutter client for Android TV, Linux, and macOS.

## License

[MIT](./LICENSE)
