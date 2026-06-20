# Changelog

## v1.0.0 — 2026-06-20

First stable release of Mediarr, a unified monolith that merges Sonarr, Radarr, Prowlarr, and Bazarr into a single self-hosted media automation platform with a React SPA, a Flutter cross-platform client, and a Bun/Node daemon.

The canonical v1.0 scope statement is ratified at [`measure/v1.0-scope.md`](measure/v1.0-scope.md). 107 archived tracks shipped across four domains.

### Server Monolith (Backend)

- **Torrent Engine** — WebTorrent lifecycle management, seeding protector, queue operations, activity SSE streaming
- **Unified Indexer Management** — Torznab, Newznab, and Cardigann runtime parity; catalog auto-discovery with one-click add; LAN Prowlarr/Jackett detection
- **TV Shows Management** — series library, episode tracking, monitoring, automated wanted search with seasonal-pack detection, file organization with rename tokens
- **Movies Management** — movie library, interactive search/grab with scoring breakdown, wanted list, import pipeline with year-mismatch fallback
- **Subtitle Management** — inventory indexing, subtitle search/download/delete, variant subtitle services (Backfill, InventoryIndexer, MissingSubtitle, SubtitleFetch, Wanted)
- **Automation Pipeline** — RSS sync, wanted search, and library scan schedulers with configurable intervals
- **Custom Format Scoring Engine** — custom format conditions, negation, unified scoring, release evaluation via `FormatLiveTester`
- **Notification Transport Layer** — webhook, Discord, Telegram, Gotify, and email dispatchers with registry + dispatch wiring
- **Real Auto-Update System** — release check, download, install flow shipped with daily scheduler
- **Setup Wizard & Smart Defaults** — first-run detection, 5-step wizard, zero-config mode, idempotent defaults (naming patterns, scheduler intervals, wanted languages)
- **Streaming Server & Discovery** — 4K/HDR playback, mDNS discovery, SSE real-time updates
- **Library Statistics & Analytics** — dashboard composition charts, download metrics, system health monitoring
- **Local LLM Gateway Routing** — ReleaseParser prefers `AI_GATEWAY_BASE_URL` + model envs, falls back to OpenRouter, then regex-only parsing

### React SPA (Frontend)

- **Dashboard & Library Browsing** — movies/TV tabs, sort controls, poster grid with Near-Zero Tesla visual theme
- **Media Detail Pages** — movie detail, series detail with episodes, cast cards, streaming badges
- **Interactive Search & Grab** — manual search, release selection, grab with `ScoreBreakdownPanel`
- **Activity & Queue Monitoring** — torrent progress, mass actions, SSE live updates, sort/filter/search/priority controls
- **Settings Panels** — indexers, download clients, quality profiles, subtitle configuration, general settings with DB-backed persistence
- **Wanted List Dashboard** — missing movies/episodes tabs, search, monitored toggle, pagination
- **Custom Format Editor & Live Tester** — create/edit/clone/test custom format conditions with dedicated settings page
- **System Events Log** — filterable event history
- **Statistics & Analytics Dashboard** — library composition, download metrics, health indicators
- **Import Lists Management** — import list configuration and management

### Flutter Client (Cross-Platform)

- **Home Screen** — Continue Watching, Recently Added, Upcoming sections
- **Library Browsing** — Movies/TV tabs, sort controls, getLibrary integration
- **Search & Add Media** — poster grid, `SearchResultDetailSheet` with releases/grab/add-to-library
- **Activity & Queue** — torrent management with SSE real-time updates
- **Calendar** — monthly grid, dot indicators, day detail sheet
- **Subtitle Management** — search, download, quality upgrade
- **Media Playback** — 4K/HDR playback, resume sync, auto-discovery via mDNS

### Infrastructure & Quality

- **Drizzle ORM Migration** — Prisma fully replaced with Drizzle-backed runtime; no Prisma runtime residue
- **TypeScript Strictness** — `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` re-enabled with zero tsc errors
- **Shared Type Contracts** — server↔app type sharing extracted and post-review remediated
- **Test Suite** — 2357 tests passing across 305 test files under unified `CI=true npm test`
- **Testing Infrastructure** — MSW handler coverage (265/265), `pool: 'forks'` runner stabilization, domain-organized handlers
- **Corner-Case Testing Directive** — 7 bugs fixed across all priority subsystems (MediaSearchService, WantedSearchService, ImportManager, SeriesOrganizeService, CustomFormatScoringEngine, and more)
- **Flutter** — 289 widget/unit tests passing; `flutter analyze` clean (0 errors after connectivity_test exclusion)
- **E2E Connectivity Harness** — podman-compose test suite with 6/6 assertions (connect, discover, library, stream, SSE)

### Deferred to Post-v1.0

- Indexer Health Monitoring & Auto-Disable
- Scheduler & Automation Dashboard (in-flight: `feature_scheduler_automation_dashboard`)
- Flutter Media Detail Page (in-flight: `feature_flutter_media_detail`)
- Import List UI Test Coverage
- Frontend Component Test Coverage Gaps
- Server Service Test Coverage (remainder: 6 of 10 services)

See [`measure/tracks.md`](measure/tracks.md) §Post-v1.0 / Deferred for the full deferred backlog with one-line rationales.
