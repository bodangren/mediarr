# Specification: Track 7B - API Surface & Typed Contracts

## Overview
This track delivers a complete, stable HTTP API surface for Mediarr operations, an SSE real-time event transport, and a typed client contract layer used by the Next.js frontend. It converts backend capabilities into consistent endpoints, payloads, error shapes, and live-update streams.

## Functional Requirements

### FR-1: Canonical Route Map
Implement and document one canonical route map with stable naming and semantics. All entity routes use type-specific prefixes (`/series/`, `/movies/`) for read operations. Shared mutation operations that apply to any media type use `/media/`.

- Series:
  - `GET /api/series` — list all series (supports pagination, sorting, filtering)
  - `GET /api/series/:id` — series detail with seasons/episodes
  - `PATCH /api/series/:id/monitored` — toggle series monitoring
  - `DELETE /api/series/:id` — remove series and associated data (cascades to seasons, episodes, file variants; does NOT auto-remove active torrents — returns CONFLICT if active torrents exist)
- Movies:
  - `GET /api/movies` — list all movies (supports pagination, sorting, filtering)
  - `GET /api/movies/:id` — movie detail with file/metadata status
  - `PATCH /api/movies/:id/monitored` — toggle movie monitoring
  - `DELETE /api/movies/:id` — remove movie and associated data (same cascade/conflict rules as series)
- Media (cross-type):
  - `GET /api/media/wanted` — unified wanted list for missing TV episodes and movies (supports pagination, filtering by type)
  - `POST /api/media/search` — metadata search (TMDB/TVDB lookup for add-media flow, no queue side effects)
  - `POST /api/media` — add new media entry (movie or series) with profile and monitoring configuration (optional `searchNow: boolean` to trigger immediate search)
- Releases:
  - `POST /api/releases/search` — search indexers for release candidates (returns candidates, no queue side effects — consumes 7A `getSearchCandidates`)
  - `POST /api/releases/grab` — grab a specific release candidate and hand off to torrent queue (consumes 7A `grabRelease`)
- Torrents:
  - `GET /api/torrents` — list all torrents with current stats (supports pagination)
  - `GET /api/torrents/:infoHash` — torrent detail with peers
  - `POST /api/torrents` — add torrent by magnet/URL
  - `PATCH /api/torrents/:infoHash/pause` — pause torrent
  - `PATCH /api/torrents/:infoHash/resume` — resume torrent
  - `DELETE /api/torrents/:infoHash` — remove torrent (with option to delete data)
  - `PATCH /api/torrents/speed-limits` — update global speed limits
- Indexers:
  - `GET /api/indexers` — list all indexers with health snapshots
  - `POST /api/indexers` — create indexer
  - `PUT /api/indexers/:id` — update indexer configuration
  - `DELETE /api/indexers/:id` — remove indexer
  - `POST /api/indexers/:id/test` — test indexer connectivity and return diagnostic output
- Subtitles:
  - `GET /api/subtitles/movie/:id/variants` — subtitle inventory for movie file variants
  - `GET /api/subtitles/episode/:id/variants` — subtitle inventory for episode file variants
  - `POST /api/subtitles/search` — manual subtitle search (requires explicit variant ID)
  - `POST /api/subtitles/download` — manual subtitle download (requires explicit variant ID and candidate selection)
- Operations:
  - `GET /api/activity` — cross-module activity event timeline (supports pagination, filtering by type/date/status)
  - `GET /api/health` — system health with indexer health snapshots and severity ordering
  - `GET /api/settings` — read current app settings
  - `PATCH /api/settings` — update app settings (partial merge)

### FR-2: Uniform Response and Error Envelope
- Success payload shape:
  - `{ ok: true, data: <payload> }` — single entity or action result
  - `{ ok: true, data: <array>, meta: { page, pageSize, totalCount, totalPages } }` — paginated list
- Error payload shape:
  - `{ ok: false, error: { code: string, message: string, details?: object, retryable: boolean } }`
- Error codes and HTTP status mappings come from the domain error taxonomy defined in Track 7A (FR-3). API handlers catch `DomainError` instances and map them using `mapDomainErrorToHttp()`. Unrecognized errors map to `INTERNAL_ERROR` / 500.

### FR-3: Pagination, Sorting, and Filtering Conventions
Define these as cross-cutting conventions applied consistently to all list endpoints:
- **Pagination:** Query params `page` (1-indexed, default 1) and `pageSize` (default 25, max 100). Response includes `meta` with `page`, `pageSize`, `totalCount`, `totalPages`.
- **Sorting:** Query param `sortBy` (field name) and `sortDir` (`asc` | `desc`). Each endpoint documents its sortable fields and default sort.
- **Filtering:** Query params specific to each endpoint (e.g., `?type=movie` on wanted, `?eventType=RELEASE_GRABBED` on activity). Filters are always optional.

### FR-4: BigInt/Date Contract Normalization
- Serialize all BigInt values as strings in JSON responses (uses 7A serializer utilities — not re-implemented here).
- Normalize inbound numeric-like strings at client boundary where required.
- Keep datetime fields as ISO 8601 strings.

### FR-5: SSE Real-Time Event Transport
- Implement `GET /api/events/stream` SSE endpoint (building on the 7A spike) with the following event types:
  - `torrent:stats` — emitted on each torrent stats sync cycle (5s/30s as configured in 7A) with current progress/speed/eta for all active torrents.
  - `activity:new` — emitted when a new activity event is recorded (media added, grab, import, subtitle, indexer test).
  - `health:update` — emitted when an indexer health snapshot changes.
- Each SSE event carries a JSON payload matching the same DTO shapes used by the corresponding REST endpoints.
- Frontend client connects on app mount and reconnects automatically on disconnect (with exponential backoff up to 30s).
- SSE stream includes a `heartbeat` event every 30s to detect stale connections.

### FR-6: Typed Client SDK
- Implement typed client modules grouped by domain:
  - `mediaApi` (series, movies, wanted, search, add)
  - `releaseApi` (search candidates, grab)
  - `torrentApi` (list, detail, add, control, speed limits)
  - `indexerApi` (CRUD, test)
  - `subtitleApi` (variant inventory, manual search, manual download)
  - `activityApi` (timeline with filters)
  - `settingsApi` (read, update)
  - `healthApi` (system health)
  - `eventsApi` (SSE stream connection with typed event handlers)
- Each method encodes request/response types and returns typed errors.
- SDK uses Zod schemas for runtime response validation — if the server returns an unexpected shape, the SDK throws a clear `CONTRACT_VIOLATION` error rather than silently passing bad data to UI components. Zod schemas are co-located with the SDK module that uses them.

### FR-7: Contract Test Coverage
- API handler tests for success/failure/validation paths per endpoint.
- Contract tests ensuring envelope shape, pagination meta, and type normalization are stable.
- Snapshot or schema assertions for critical payloads used by UI tables (series list, movie list, torrent list, wanted list).
- SSE event shape tests for each event type.

## Non-Functional Requirements
- **Determinism:** Route names, payload contracts, and pagination shapes must not diverge across test and implementation.
- **Type Safety:** No untyped fetch paths for implemented contracts. SDK methods are the only way frontend code calls the API.
- **Compatibility:** Existing backend domain behavior remains intact behind HTTP wrappers.

## Acceptance Criteria
- [ ] Route map is implemented exactly once and used consistently by tests and client SDK.
- [ ] All endpoints return standardized success/error envelopes with domain error codes.
- [ ] Pagination, sorting, and filtering conventions are consistent across all list endpoints.
- [ ] BigInt and date normalization is stable and test-covered (using 7A serializers).
- [ ] SSE stream delivers torrent stats, activity events, and health updates with automatic reconnection.
- [ ] Typed client SDK exists for every endpoint group required by Track 7C/7D/7E.
- [ ] SDK uses Zod runtime validation for response shapes.
- [ ] API contract tests pass with `CI=true npm test`.

## Out of Scope
- Visual UI components and page composition.
- Playwright end-to-end journey validation (Track 7F).
