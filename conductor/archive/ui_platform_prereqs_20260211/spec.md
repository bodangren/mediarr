# Specification: Track 7A - Platform Contracts & Backend Prerequisites

## Overview
This track hardens the platform foundation required for UI delivery. It validates the singleton process model, removes unsafe serialization patterns, defines the domain error taxonomy, fills backend service gaps that block UI workflows, and introduces missing domain primitives needed by later API/UI tracks.

Track 7A must complete before any broad API or UI implementation begins.

## Functional Requirements

### FR-1: Process Model Validation Spike
- Validate that the chosen architecture works end-to-end before building on it:
  - Fastify backend runs as a single long-lived Node.js process hosting WebTorrent, scheduler, and all domain services.
  - Next.js frontend is a separate process that fetches from the Fastify API over HTTP.
  - SSE stream from Fastify delivers real-time push events (queue progress, activity, health) to the frontend.
- Deliver a minimal proof-of-concept: Fastify serves one health endpoint, one SSE stream emitting a heartbeat, and the Next.js app connects to both.
- Confirm singleton state (e.g., an in-memory counter incremented by SSE heartbeat) persists across multiple frontend requests.
- Document the validated model and any constraints discovered in `conductor/tech-stack.md`.

### FR-2: Safe Serialization Strategy (No Builtin Mutation)
- Implement boundary serializers for API payloads handling:
  - `bigint` values (emitted as strings in JSON contracts — canonical rule)
  - `Date` values (emitted as ISO 8601 strings)
  - enum normalization (string unions, never numeric enums in API contracts)
- Do not patch `BigInt.prototype` or any global builtin prototypes.
- Serializers live in a shared location consumed by both API handlers (7B) and client SDK.

### FR-3: Domain Error Taxonomy
- Define a canonical set of machine-readable error codes used across all domain services and propagated through the API layer:
  - `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT` (duplicate media, indexer name collision)
  - `PROVIDER_UNAVAILABLE` (indexer down, subtitle provider timeout)
  - `TORRENT_REJECTED` (invalid magnet, queue full, engine error)
  - `IMPORT_FAILED` (file missing, permission denied, organization error)
  - `INTERNAL_ERROR` (unexpected/unclassified failures)
- Each error code maps to a stable HTTP status: `NOT_FOUND` -> 404, `VALIDATION_ERROR` -> 422, `CONFLICT` -> 409, `PROVIDER_UNAVAILABLE` -> 502, `TORRENT_REJECTED` -> 422, `IMPORT_FAILED` -> 500, `INTERNAL_ERROR` -> 500.
- Domain services throw typed error classes carrying these codes. API handlers in 7B map them to HTTP responses without re-inventing codes.
- Define a `retryable` flag per code (e.g., `PROVIDER_UNAVAILABLE` is retryable, `VALIDATION_ERROR` is not).

### FR-4: Manual Search Service Contracts
- Refactor `MediaSearchService` into explicit operations:
  - `getSearchCandidates(query)` returns ranked candidates without side effects.
  - `grabRelease(candidate)` performs queue handoff and returns the created torrent record or a typed error (TORRENT_REJECTED, PROVIDER_UNAVAILABLE).
- Preserve backward-compatible behavior for existing `searchEpisode`/`searchMovie` callers by composing these new methods.
- Define explicit error paths: what happens when a grab fails mid-flight (magnet invalid, engine rejection, queue full).

### FR-5: Torrent Stats Persistence Loop
- Implement periodic torrent stats synchronization to DB (progress, rates, ETA, ratio, peers).
- Sync interval: 5 seconds during active transfers, 30 seconds when idle (no active downloads). Define "active" as any torrent with status `downloading` or `seeding` with ratio < target.
- Implement backpressure: if a sync cycle takes longer than the interval, skip the next cycle and log a warning rather than queuing up.
- Start sync loop in manager initialization and stop it cleanly in teardown.
- Sync failures must not crash the process — log actionable errors and continue.

### FR-6: Subtitle Provider Factory Integration
- Introduce `SubtitleProviderFactory` to resolve provider from configuration at runtime.
- Refactor subtitle manual search/download services to resolve provider internally (controller should not inject provider instance per call).

### FR-7: App Settings Primitives
- Add persisted app settings with typed defaults:
  - Torrent limits (max active downloads, max active seeds, global speed limits)
  - Scheduler intervals (RSS sync, availability check, torrent monitoring)
  - Path visibility settings (download path, media path display preferences)
- Define typed repository/service interfaces for settings CRUD.
- Settings must have sensible defaults that apply on first run without requiring user configuration.

### FR-8: Indexer Health Snapshot
- Add persisted indexer health snapshots with last-sync metadata:
  - Last successful sync timestamp, last failure timestamp, failure count, last error message.
- Health snapshots update automatically during indexer operations (RSS sync, manual test).
- Define typed repository/service interfaces for health snapshot read/write.

### FR-9: Activity Event Records
- Add persisted cross-module activity event records for:
  - `MEDIA_ADDED`, `SEARCH_EXECUTED`, `RELEASE_GRABBED`, `IMPORT_COMPLETED`, `SUBTITLE_DOWNLOADED`, `INDEXER_TESTED`
- Each event records: timestamp, event type, source module, entity reference (media ID, torrent hash, etc.), summary text, success/failure status.
- Define retention policy: events older than 30 days are eligible for cleanup (not auto-deleted — a scheduled task can purge them).
- Define typed repository with query support: filter by event type, date range, entity reference, status.
- Wire event emission into existing services: search, torrent grab, import, subtitle download, indexer test.

### FR-10: Baseline Stability Gate
- Fix known baseline test instability that prevents clean quality-gate execution.
- Track 7A is not complete unless `CI=true npm test` passes before and after 7A changes.

## Non-Functional Requirements
- **Governance Compliance:** Architecture and stack documentation must be internally consistent after every phase.
- **Type Safety:** No new `any` in new/modified public contracts.
- **Observability:** Failures in sync/factory/serialization paths must return actionable error details using the defined error taxonomy.
- **Backward Compatibility:** Existing service call sites continue to work unless explicitly deprecated with migration notes.
- **Migration Safety:** All new Prisma migrations are additive-only. Document any schema changes that affect existing data.

## Acceptance Criteria
- [ ] Process model spike validates singleton persistence, HTTP API, and SSE push end-to-end.
- [ ] JSON serialization for BigInt is safe without prototype mutation.
- [ ] Domain error taxonomy is defined with codes, HTTP mappings, and retryability flags.
- [ ] Manual search returns candidates without queue side effects; grab path returns typed errors on failure.
- [ ] Torrent DB stats update on a 5s/30s active/idle cycle with backpressure protection.
- [ ] Subtitle manual APIs resolve provider through internal factory based on configuration.
- [ ] App settings primitives are persisted with typed defaults.
- [ ] Indexer health snapshots are persisted and updated during indexer operations.
- [ ] Activity events are persisted for add/search/grab/import/subtitle/indexer-test operations with query support.
- [ ] `CI=true npm test` passes at Track 7A completion.

## Out of Scope
- Frontend page implementation.
- Broad API endpoint implementation across all modules (covered by Track 7B).
- Visual design system and app shell (covered by Track 7C).
