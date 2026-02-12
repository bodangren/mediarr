# Implementation Plan: Track 9 Remediation - Clone Parity Gap Recovery

## Phase 1: Critical Core Wiring (P0 Blockers)
Unblock the primary "Search -> Grab" loop at the API level by fixing backend wiring.
**Focus:** Backend Logic, Integration Tests, API Contracts.

- [x] Task: Write Tests: Add non-mocked integration tests for Indexer Definition Loading.
    - [x] Sub-task: Create `tests/integration/indexer-definition-loading.test.ts`.
    - [x] Sub-task: Test that `DefinitionLoader` correctly parses real YAML files from a fixtures dir.
    - [x] Sub-task: Test that `IndexerFactory` initialized with these definitions can create a Cardigann indexer.
- [x] Task: Implement Indexer Definition Wiring (RMD-001).
    - [x] Sub-task: Update `server/src/main.ts` to instantiate `DefinitionLoader`.
    - [x] Sub-task: Load definitions from `server/definitions` (or configured path) at boot.
    - [x] Sub-task: Pass loaded definitions to `IndexerFactory` constructor.
    - [x] Sub-task: Verify `main.ts` logs loaded definition count.
- [x] Task: Write Tests: Add non-mocked integration tests for Indexer Search.
    - [x] Sub-task: Create `tests/integration/indexer-search.test.ts`.
    - [x] Sub-task: Define `search()` contract in `BaseIndexer`.
    - [x] Sub-task: Test `TorznabIndexer.search()` constructs valid URL and parses mock-server response.
    - [x] Sub-task: Test `ScrapingIndexer.search()` parses HTML response using `ScrapingParser`.
- [x] Task: Implement Indexer Search Method (RMD-002).
    - [x] Sub-task: Add abstract `search()` method to `BaseIndexer`.
    - [x] Sub-task: Implement `search()` in `TorznabIndexer`.
    - [x] Sub-task: Implement `search()` in `ScrapingIndexer` (Cardigann).
    - [x] Sub-task: Update `MediaSearchService` to handle search errors gracefully (but not silently swallow them).
- [x] Task: Write Tests: Add non-mocked integration tests for Metadata Key Management.
    - [x] Sub-task: Create `tests/integration/metadata-provider.test.ts`.
    - [x] Sub-task: Test `MetadataProvider` throws specific error when key is missing.
    - [x] Sub-task: Test `MetadataProvider` uses injected key when provided.
- [x] Task: Implement Metadata API Key Hardening (RMD-003).
    - [x] Sub-task: Update `AppSettings` schema to include `tmdbApiKey`.
    - [x] Sub-task: Update `MetadataProvider` to accept key in constructor/method.
    - [x] Sub-task: Remove `'demo'` fallback in `MetadataProvider` and throw error if key missing.
    - [x] Sub-task: Inject settings-based key into `MetadataProvider` in `main.ts`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Critical Core Wiring (P0 Blockers)' (Protocol in workflow.md)

## Phase 2: Operational Scaffolding (High-Impact P1)
Enable user configuration and control via the Frontend.
**Focus:** Frontend UI, Form State, Mobile Responsiveness.

- [ ] Task: Write Tests: Add component tests for Settings Editor.
    - [ ] Sub-task: Create `app/src/app/(shell)/settings/settings-form.test.tsx`.
    - [ ] Sub-task: Test form rendering with initial data.
    - [ ] Sub-task: Test validation logic for API keys (required fields).
    - [ ] Sub-task: Test submission payload structure.
- [ ] Task: Implement Settings Editor UI (RMD-007).
    - [ ] Sub-task: Create comprehensive Zod schema for all settings (General, Indexers, Clients, Keys).
    - [ ] Sub-task: Build `/settings` page with react-hook-form.
    - [ ] Sub-task: Wire form to `PATCH /api/settings`.
    - [ ] Sub-task: Verify mobile layout (stacking, input sizes).
- [ ] Task: Write Tests: Add component tests for Queue Controls.
    - [ ] Sub-task: Create `app/src/app/(shell)/queue/queue-actions.test.tsx`.
    - [ ] Sub-task: Test Pause/Resume/Remove button interactions.
    - [ ] Sub-task: Test optimistic UI updates (row state change immediately).
- [ ] Task: Implement Queue Controls (RMD-005).
    - [ ] Sub-task: Add action column to Queue DataTable.
    - [ ] Sub-task: Implement Pause/Resume/Remove handlers calling `torrentApi`.
    - [ ] Sub-task: Verify touch targets on mobile view.
- [ ] Task: Implement Background Scheduler Ignition (RMD-004).
    - [ ] Sub-task: Update `main.ts` to initialize `Scheduler`.
    - [ ] Sub-task: Register `RssSyncService` and `TorrentManager` loop tasks.
    - [ ] Sub-task: Add log output confirming scheduler start.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Operational Scaffolding (High-Impact P1)' (Protocol in workflow.md)

## Phase 3: Feature Parity (P1 Gaps)
Deliver the missing "Clone" capabilities (Subtitles, Dynamic Indexers).
**Focus:** Complex UI Logic, Dynamic Forms, Provider Integration.

- [ ] Task: Write Tests: Add tests for Dynamic Indexer Form.
    - [ ] Sub-task: Test form generation from JSON schema (configContract).
    - [ ] Sub-task: Test conditional field rendering.
- [ ] Task: Implement Dynamic Indexer Configuration (RMD-004).
    - [ ] Sub-task: Create `DynamicForm` component.
    - [ ] Sub-task: Update `/indexers` add/edit modal to use `DynamicForm` based on `implementation` type.
    - [ ] Sub-task: Ensure Cardigann definitions render their specific fields.
- [ ] Task: Write Tests: Add integration tests for Subtitle Provider.
    - [ ] Sub-task: Create `tests/integration/subtitle-provider.test.ts`.
    - [ ] Sub-task: Test provider instantiation and search contract.
- [ ] Task: Implement Subtitle Provider & UI (RMD-006).
    - [ ] Sub-task: Implement `OpenSubtitlesProvider` (or generic scraping provider).
    - [ ] Sub-task: Wire provider to `SubtitleService`.
    - [ ] Sub-task: Implement `/subtitles` page with Inventory table.
    - [ ] Sub-task: Implement Manual Search modal and Download action.
- [ ] Task: Implement Episode Monitoring Persistence (RMD-008).
    - [ ] Sub-task: Add `PATCH /api/episodes/:id` endpoint.
    - [ ] Sub-task: Wire frontend toggle to API.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Feature Parity (P1 Gaps)' (Protocol in workflow.md)

## Phase 4: Reliability & Polish (P2/P3)
Improve robustness and observability.
**Focus:** Dashboard, Error Handling, UX Polish.

- [ ] Task: Implement Dashboard Completeness (RMD-010).
    - [ ] Sub-task: Add "Calendar" widget (upcoming releases).
    - [ ] Sub-task: Add "Disk Space" widget (system info).
    - [ ] Sub-task: Add "Activity Feed" widget (recent events).
- [ ] Task: Implement Activity Filtering (RMD-011).
    - [ ] Sub-task: Add filter controls to `/activity` (Type, Date, Status).
    - [ ] Sub-task: Update API query to support filters.
- [ ] Task: Implement Resilience Improvements.
    - [ ] Sub-task: Add retry logic to `MetadataProvider` (SkyHook).
    - [ ] Sub-task: Ensure WebTorrent fallback is properly logged/surfaced in Health.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Reliability & Polish (P2/P3)' (Protocol in workflow.md)
