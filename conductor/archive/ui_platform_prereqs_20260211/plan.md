# Implementation Plan: Track 7A - Platform Contracts & Backend Prerequisites

## Phase 1: Baseline Stabilization and Process Model Spike
Stabilize test baseline, validate the singleton process model, and lock architecture decisions before broad refactors.

- [x] Task: Write Tests: Add regression test coverage for current baseline failure in variant backfill cleanup sequence.
  - [x] Sub-task: Add a failing test that reproduces cleanup-order FK violation currently seen in `variant-backfill-service` suite.
  - [x] Sub-task: Confirm failure occurs before implementation fix.
- [x] Task: Implement deterministic test/data cleanup ordering to restore green baseline.
  - [x] Sub-task: Fix teardown ordering and/or relation cleanup strategy in affected tests/services.
  - [x] Sub-task: Re-run targeted and full suite to confirm deterministic pass.
- [x] Task: Implement process model validation spike.
  - [x] Sub-task: Set up minimal Fastify server entry point with a `GET /api/health` endpoint returning `{ ok: true, uptime }`.
  - [x] Sub-task: Add SSE endpoint `GET /api/events/stream` that emits a heartbeat event every 2 seconds with a monotonically increasing counter (proving singleton state persists).
  - [x] Sub-task: Wire a minimal Next.js page that fetches `/api/health` from the Fastify backend and connects to the SSE stream, displaying counter updates.
  - [x] Sub-task: Write a test that starts the Fastify server, makes multiple HTTP requests, and asserts the counter increments (not reset) across requests.
  - [x] Sub-task: Document validated architecture, constraints, and port configuration in `conductor/tech-stack.md`.
- [x] Task: Define contract conventions to be consumed by Track 7B.
  - [x] Sub-task: Create canonical envelope/serialization conventions document for API implementation (success shape, error shape, pagination shape).
  - [x] Sub-task: Enumerate route naming conventions, ID parameter standards, and query parameter conventions for filtering/sorting/pagination.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Baseline Stabilization and Process Model Spike' (Protocol in workflow.md)

## Phase 2: Serialization, Error Taxonomy, and Search Refactor
Replace unsafe global serialization patterns, define domain error codes, and separate search from grab side effects.

- [x] Task: Write Tests: Add serialization boundary tests for BigInt/Date/enum normalization without builtin mutation.
  - [x] Sub-task: Add failing tests proving JSON-safe BigInt conversion at API boundary (bigint -> string in output, string -> bigint on input).
  - [x] Sub-task: Add failing tests ensuring no `BigInt.prototype` patch is required.
  - [x] Sub-task: Add failing tests for Date -> ISO 8601 string serialization and enum -> string union normalization.
- [x] Task: Implement boundary serializer/deserializer utilities and shared mappers.
  - [x] Sub-task: Implement response serializer utilities for BigInt/Date/enum normalization in a shared `server/src/utils/serialization.ts` location.
  - [x] Sub-task: Integrate serializer usage into existing API-adjacent response mappers.
- [x] Task: Write Tests: Add domain error taxonomy tests.
  - [x] Sub-task: Add failing tests for each error class (DomainError base, NotFoundError, ValidationError, ConflictError, ProviderUnavailableError, TorrentRejectedError, ImportFailedError).
  - [x] Sub-task: Add failing tests asserting each error carries the correct code, HTTP status mapping, and retryable flag.
- [x] Task: Implement domain error classes and HTTP mapping utility.
  - [x] Sub-task: Create base `DomainError` class with `code`, `message`, `details`, `httpStatus`, and `retryable` properties.
  - [x] Sub-task: Create concrete error subclasses for each taxonomy entry: NOT_FOUND (404), VALIDATION_ERROR (422), CONFLICT (409), PROVIDER_UNAVAILABLE (502, retryable), TORRENT_REJECTED (422), IMPORT_FAILED (500), INTERNAL_ERROR (500).
  - [x] Sub-task: Create `mapDomainErrorToHttp()` utility that converts a DomainError to the API error envelope shape.
- [x] Task: Write Tests: Add `MediaSearchService` tests for explicit candidate retrieval and explicit grab behavior.
  - [x] Sub-task: Add failing tests for `getSearchCandidates` returning ranked candidates with no queue side effects.
  - [x] Sub-task: Add failing tests for `grabRelease` handing off to torrent manager and returning the created torrent record.
  - [x] Sub-task: Add failing tests for `grabRelease` error paths: invalid magnet (TORRENT_REJECTED), engine failure (TORRENT_REJECTED), queue-full (TORRENT_REJECTED).
  - [x] Sub-task: Add failing compatibility tests for `searchEpisode`/`searchMovie` composition behavior.
- [x] Task: Implement `MediaSearchService` contract split.
  - [x] Sub-task: Introduce typed candidate interfaces (`SearchCandidate` with indexer, title, size, seeders, quality, age) and `getSearchCandidates`.
  - [x] Sub-task: Extract `grabRelease` returning typed result or throwing domain errors. Update legacy methods to compose new methods.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Serialization, Error Taxonomy, and Search Refactor' (Protocol in workflow.md)

## Phase 3: Torrent Stats Persistence and Subtitle Provider Factory
Implement backend prerequisites required for queue and subtitle UI features.

- [x] Task: Write Tests: Add `TorrentManager` sync loop tests for DB persistence, lifecycle cleanup, and backpressure.
  - [x] Sub-task: Add failing tests verifying periodic update of progress/speeds/ratio/eta/peer snapshots to DB.
  - [x] Sub-task: Add failing tests verifying 5s interval during active transfers and 30s interval when idle.
  - [x] Sub-task: Add failing tests verifying interval start on initialize and cleanup on destroy (no leaked timers).
  - [x] Sub-task: Add failing tests verifying backpressure: if sync takes longer than interval, next cycle is skipped with a warning log.
- [x] Task: Implement `TorrentManager` periodic stats synchronization.
  - [x] Sub-task: Add `syncStats()` routine with active/idle interval switching logic.
  - [x] Sub-task: Implement backpressure guard (track in-flight sync, skip if previous not complete).
  - [x] Sub-task: Persist stats via repository update methods with graceful error handling (catch, log, continue).
- [x] Task: Write Tests: Add subtitle provider factory tests for provider resolution and manual workflow integration.
  - [x] Sub-task: Add failing tests for configuration-based provider resolution (given config value, factory returns correct provider instance).
  - [x] Sub-task: Add failing tests verifying subtitle manual search/download no longer require provider parameter injection per call.
- [x] Task: Implement `SubtitleProviderFactory` and service refactor.
  - [x] Sub-task: Create provider factory abstraction and concrete resolution logic.
  - [x] Sub-task: Refactor subtitle inventory API service to resolve provider internally via factory.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Torrent Stats Persistence and Subtitle Provider Factory' (Protocol in workflow.md)

## Phase 4: App Settings and Indexer Health Primitives
Create persistent primitives for settings and indexer health needed by API and UI tracks.

- [x] Task: Write Tests: Add schema/repository tests for app settings.
  - [x] Sub-task: Add failing schema tests for settings model constraints (typed JSON, default values).
  - [x] Sub-task: Add failing repository tests for settings read (returns defaults on first run), update (merges partial updates), and full replacement.
- [x] Task: Implement schema migration and repository for app settings.
  - [x] Sub-task: Add Prisma model for settings (single-row pattern with typed JSON column or key-value pairs).
  - [x] Sub-task: Implement `SettingsRepository` and `SettingsService` with typed interfaces and default value resolution.
- [x] Task: Write Tests: Add schema/repository tests for indexer health snapshots.
  - [x] Sub-task: Add failing schema tests for health snapshot model (relation to Indexer, timestamp fields, failure counter).
  - [x] Sub-task: Add failing repository tests for snapshot creation, update on sync success/failure, and query by indexer ID.
- [x] Task: Implement schema migration and repository for indexer health snapshots.
  - [x] Sub-task: Add Prisma model for IndexerHealthSnapshot with relation to Indexer.
  - [x] Sub-task: Implement `IndexerHealthRepository` with typed read/write interfaces.
  - [x] Sub-task: Wire health snapshot updates into existing indexer sync and test flows.
- [x] Task: Conductor - User Manual Verification 'Phase 4: App Settings and Indexer Health Primitives' (Protocol in workflow.md)

## Phase 5: Activity Event System
Create the cross-module activity event system and wire it into all existing services.

- [x] Task: Write Tests: Add schema/repository tests for activity events.
  - [x] Sub-task: Add failing schema tests for ActivityEvent model (timestamp, eventType enum, sourceModule, entityRef, summary, success flag).
  - [x] Sub-task: Add failing repository tests for event creation, query by type/date-range/entity/status, and count aggregations.
  - [x] Sub-task: Add failing repository tests for retention cleanup (delete events older than N days).
- [x] Task: Implement schema migration and repository for activity events.
  - [x] Sub-task: Add Prisma model for ActivityEvent with appropriate indexes for query patterns.
  - [x] Sub-task: Implement `ActivityEventRepository` with typed create, query (with filter/pagination), and cleanup methods.
- [x] Task: Write Tests: Add service-level event emission tests for key workflows.
  - [x] Sub-task: Add failing tests asserting MEDIA_ADDED event is persisted when media is added via MediaService.
  - [x] Sub-task: Add failing tests asserting SEARCH_EXECUTED event is persisted when search runs.
  - [x] Sub-task: Add failing tests asserting RELEASE_GRABBED event is persisted when grabRelease succeeds or fails.
  - [x] Sub-task: Add failing tests asserting IMPORT_COMPLETED event is persisted when ImportManager completes.
  - [x] Sub-task: Add failing tests asserting SUBTITLE_DOWNLOADED event is persisted when subtitle is fetched.
  - [x] Sub-task: Add failing tests asserting INDEXER_TESTED event is persisted when indexer test runs.
- [x] Task: Implement event persistence adapters in existing services.
  - [x] Sub-task: Create `ActivityEventEmitter` utility that services call to record events (thin wrapper over repository).
  - [x] Sub-task: Integrate event emission into MediaService (add), MediaSearchService (search, grab), ImportManager (import), subtitle services (download), and IndexerTester (test).
- [x] Task: Implement scheduled job for activity event cleanup (purge events > 30 days).
  - [x] Sub-task: Add `cleanupOldEvents()` method to `ActivityEventRepository`.
  - [x] Sub-task: Schedule daily cleanup job in `SchedulerService`.
- [x] Task: Execute quality gates for Track 7A and resolve regressions.
  - [x] Sub-task: Run `CI=true npm test` and `npm run test:coverage`.
  - [x] Sub-task: Run lint/type checks as configured for touched workspaces.
  - [x] Sub-task: Verify all new Prisma migrations are additive-only and document schema changes.
- [x] Task: Conductor - User Manual Verification 'Phase 5: Activity Event System' (Protocol in workflow.md)
