# Implementation Plan: Track 7B - API Surface & Typed Contracts

## Phase 1: API Contract Harness, Pagination Conventions, and Route Scaffolding
Set up deterministic API test harness, define cross-cutting conventions, and scaffold all routes.

- [x] Task: Write Tests: Add API envelope contract tests for success, error, and paginated list shapes.
  - [x] Sub-task: Add failing tests validating `{ ok: true, data }` success envelope.
  - [x] Sub-task: Add failing tests validating `{ ok: true, data: [], meta: { page, pageSize, totalCount, totalPages } }` paginated envelope.
  - [x] Sub-task: Add failing tests validating `{ ok: false, error: { code, message, retryable } }` error envelope with domain error code mapping.
- [x] Task: Implement shared API response/error helpers and pagination utilities.
  - [x] Sub-task: Implement `sendSuccess(data)` and `sendPaginatedSuccess(data, meta)` response helpers.
  - [x] Sub-task: Implement `sendError(domainError)` helper using `mapDomainErrorToHttp()` from 7A.
  - [x] Sub-task: Implement `parsePaginationParams(query)` utility that extracts `page` (default 1), `pageSize` (default 25, max 100), `sortBy`, `sortDir` from query string.
  - [x] Sub-task: Implement Fastify error handler plugin that catches unhandled DomainErrors and unknown errors, mapping them to envelopes.
- [x] Task: Write Tests: Add route existence and method contract tests for canonical route map.
  - [x] Sub-task: Add failing tests asserting all required route paths and HTTP methods are registered.
- [x] Task: Implement route scaffolds for all required endpoint groups.
  - [x] Sub-task: Create route handler files organized by domain (series, movies, media, releases, torrents, indexers, subtitles, activity, health, settings).
  - [x] Sub-task: Register all routes with Fastify with typed request/response schemas (handlers return 501 Not Implemented initially).
- [x] Task: Conductor - User Manual Verification 'Phase 1: API Contract Harness, Pagination Conventions, and Route Scaffolding' (Protocol in workflow.md)

## Phase 2: Series, Movie, and Media API Groups
Implement discovery, library, and add-media API surfaces required by core UI operations.

- [x] Task: Write Tests: Add route handler tests for series list/detail/monitored/delete flows.
  - [x] Sub-task: Add failing tests for series listing with pagination, sorting by title/year/status, and filtering.
  - [x] Sub-task: Add failing tests for series detail retrieval including seasons/episodes.
  - [x] Sub-task: Add failing tests for monitored toggle and delete (including CONFLICT when active torrents exist).
- [x] Task: Implement series API handlers.
  - [x] Sub-task: Wire handlers to SeriesService/MediaRepository with pagination/sort/filter support.
  - [x] Sub-task: Normalize outbound payloads with contract serializers from 7A.
- [x] Task: Write Tests: Add route handler tests for movie list/detail/monitored/delete flows.
  - [x] Sub-task: Add failing tests for movie listing with pagination, sorting by title/year/added date, and filtering.
  - [x] Sub-task: Add failing tests for movie detail retrieval with file/metadata status.
  - [x] Sub-task: Add failing tests for monitored toggle and delete with cascade/conflict behavior.
- [x] Task: Implement movie API handlers.
  - [x] Sub-task: Wire handlers to MovieService/MediaRepository with pagination/sort/filter support.
- [x] Task: Write Tests: Add route handler tests for wanted list, metadata search, and media add flows.
  - [x] Sub-task: Add failing tests for unified wanted list with type filtering and pagination.
  - [x] Sub-task: Add failing tests for metadata search (TMDB/TVDB lookup) returning results without side effects.
  - [x] Sub-task: Add failing tests for media add with profile/monitoring configuration and duplicate CONFLICT detection.
- [x] Task: Implement media cross-type API handlers (wanted, search, add).
  - [x] Sub-task: Wire wanted handler to WantedService with unified TV/movie results.
  - [x] Sub-task: Wire metadata search to MetadataProvider.
  - [x] Sub-task: Wire add handler to MediaService with conflict detection and optional `searchNow` trigger.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Series, Movie, and Media API Groups' (Protocol in workflow.md)

## Phase 3: Release, Torrent, and Indexer API Groups
Implement search-to-grab pipeline and indexer management surfaces.

- [x] Task: Write Tests: Add route handler tests for release search and grab endpoints.
  - [x] Sub-task: Add failing tests verifying candidate-only search behavior (no queue side effects).
  - [x] Sub-task: Add failing tests for grab success (returns torrent record) and grab failure (TORRENT_REJECTED, PROVIDER_UNAVAILABLE error codes).
- [x] Task: Implement release API handlers.
  - [x] Sub-task: Wire release search to 7A `getSearchCandidates`.
  - [x] Sub-task: Wire grab endpoint to 7A `grabRelease` with domain error mapping.
- [x] Task: Write Tests: Add route handler tests for torrent list/detail/add/control/speed-limit endpoints.
  - [x] Sub-task: Add failing tests for torrent list with pagination and BigInt fields serialized as strings.
  - [x] Sub-task: Add failing tests for `POST`, pause/resume/remove, and speed limits mutation.
- [x] Task: Implement torrent API handlers.
  - [x] Sub-task: Wire handlers to TorrentManager/TorrentRepository.
  - [x] Sub-task: Ensure consistent lifecycle status mapping and error code propagation.
- [x] Task: Write Tests: Add route handler tests for indexer CRUD and connectivity test endpoints.
  - [x] Sub-task: Add failing tests for indexer list (with health snapshot data), create, update, delete.
  - [x] Sub-task: Add failing tests for `POST /api/indexers/:id/test` with diagnostic output and remediation hints.
- [x] Task: Implement indexer API handlers.
  - [x] Sub-task: Wire CRUD handlers to IndexerRepository.
  - [x] Sub-task: Wire connectivity test to IndexerTester with diagnostics response mapping.
  - [x] Sub-task: Include IndexerHealthSnapshot data in list/detail responses.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Release, Torrent, and Indexer API Groups' (Protocol in workflow.md)

## Phase 4: Subtitle, Settings, Activity, and Health API Groups
Implement remaining operational API surfaces.

- [x] Task: Write Tests: Add route handler tests for subtitle inventory/manual search/manual download endpoints.
  - [x] Sub-task: Add failing tests for movie/episode variant inventory routes with track details.
  - [x] Sub-task: Add failing tests for manual search/download requiring explicit variant ID and variant enforcement.
- [x] Task: Implement subtitle API handlers.
  - [x] Sub-task: Wire handlers to subtitle inventory and wanted services via SubtitleProviderFactory.
  - [x] Sub-task: Normalize candidate payloads and history response fields.
- [x] Task: Write Tests: Add route handler tests for settings read/update, activity list, and health endpoint.
  - [x] Sub-task: Add failing tests for settings read (returns merged defaults + stored), update (partial merge validation), and invalid setting rejection.
  - [x] Sub-task: Add failing tests for activity timeline with pagination and filtering by type/date/status.
  - [x] Sub-task: Add failing tests for health endpoint with indexer health snapshots and severity ordering.
- [x] Task: Implement settings/activity/health API handlers.
  - [x] Sub-task: Wire handlers to SettingsService, ActivityEventRepository, and IndexerHealthRepository from 7A.
  - [x] Sub-task: Implement pagination and filter parameter parsing for activity timeline.
  - [x] Sub-task: Implement severity-ordered health aggregation (critical > warning > ok).
- [x] Task: Conductor - User Manual Verification 'Phase 4: Subtitle, Settings, Activity, and Health API Groups' (Protocol in workflow.md)

## Phase 5: SSE Real-Time Transport
Implement the production SSE endpoint building on the 7A spike.

- [x] Task: Write Tests: Add SSE stream tests for event types, payloads, and reconnection behavior.
  - [x] Sub-task: Add failing tests for `torrent:stats` event shape matching torrent list DTO.
  - [x] Sub-task: Add failing tests for `activity:new` event shape matching activity event DTO.
  - [x] Sub-task: Add failing tests for `health:update` event shape matching health snapshot DTO.
  - [x] Sub-task: Add failing tests for heartbeat emission at 30s interval.
- [x] Task: Implement production SSE endpoint.
  - [x] Sub-task: Extend the 7A spike `GET /api/events/stream` to emit `torrent:stats` events on each sync cycle.
  - [x] Sub-task: Wire `activity:new` emission when ActivityEventEmitter records events.
  - [x] Sub-task: Wire `health:update` emission when IndexerHealthRepository snapshots change.
  - [x] Sub-task: Implement connection tracking and cleanup (remove dead connections on client disconnect).
- [x] Task: Conductor - User Manual Verification 'Phase 5: SSE Real-Time Transport' (Protocol in workflow.md)

## Phase 6: Typed Client SDK and Contract Validation
Deliver typed frontend-facing clients with Zod runtime validation and complete contract tests.

- [x] Task: Write Tests: Add SDK contract tests for every endpoint group.
  - [x] Sub-task: Add failing tests for request method/path/payload typing per SDK module.
  - [x] Sub-task: Add failing tests for Zod response validation (pass on correct shape, throw CONTRACT_VIOLATION on unexpected shape).
  - [x] Sub-task: Add failing tests for normalized error handling and retryability hints.
- [x] Task: Implement typed client modules.
  - [x] Sub-task: Create domain client modules (`mediaApi`, `releaseApi`, `torrentApi`, `indexerApi`, `subtitleApi`, `activityApi`, `settingsApi`, `healthApi`).
  - [x] Sub-task: Create `eventsApi` SSE client with typed event handlers, automatic reconnection (exponential backoff up to 30s), and connection state tracking.
  - [x] Sub-task: Define Zod response schemas co-located with each SDK module for runtime validation.
  - [x] Sub-task: Export shared DTOs and error types for UI consumption.
- [x] Task: Write Tests: Add snapshot/schema assertions for critical UI table payloads.
  - [x] Sub-task: Add snapshot tests for series list, movie list, torrent list, and wanted list response shapes.
- [x] Task: Execute quality gates for Track 7B and resolve regressions.
  - [x] Sub-task: Run `CI=true npm test` and `npm run test:coverage`.
  - [x] Sub-task: Run lint/type checks for affected workspaces.
- [x] Task: Conductor - User Manual Verification 'Phase 6: Typed Client SDK and Contract Validation' (Protocol in workflow.md)
