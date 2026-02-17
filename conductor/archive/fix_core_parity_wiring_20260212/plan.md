# Implementation Plan: Track 9 Remediation - Clone Parity Gap Recovery

## Phase 1: Critical Core Wiring (P0 Blockers) [checkpoint: 9891e34]
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

## Phase 2: Operational Scaffolding (High-Impact P1) [checkpoint: 34b07c8]
Enable user configuration and control via the Frontend.
**Focus:** Frontend UI, Form State, Mobile Responsiveness.

- [x] Task: Write Tests: Add component tests for Settings Editor.
    - [x] Sub-task: Create `app/src/app/(shell)/settings/settings-form.test.tsx`.
    - [x] Sub-task: Test form rendering with initial data.
    - [x] Sub-task: Test validation logic for API keys (required fields).
    - [x] Sub-task: Test submission payload structure.
- [x] Task: Implement Settings Editor UI (RMD-007).
    - [x] Sub-task: Create comprehensive Zod schema for all settings (General, Indexers, Clients, Keys).
    - [x] Sub-task: Build `/settings` page with react-hook-form.
    - [x] Sub-task: Wire form to `PATCH /api/settings`.
    - [x] Sub-task: Verify mobile layout (stacking, input sizes).
- [x] Task: Write Tests: Add component tests for Queue Controls.
    - [x] Sub-task: Create `app/src/app/(shell)/queue/queue-actions.test.tsx`.
    - [x] Sub-task: Test Pause/Resume/Remove button interactions.
    - [x] Sub-task: Test optimistic UI updates (row state change immediately).
- [x] Task: Implement Queue Controls (RMD-005).
    - [x] Sub-task: Add action column to Queue DataTable.
    - [x] Sub-task: Implement Pause/Resume/Remove handlers calling `torrentApi`.
    - [x] Sub-task: Verify touch targets on mobile view.
- [x] Task: Implement Background Scheduler Ignition (RMD-004).
    - [x] Sub-task: Update `main.ts` to initialize `Scheduler`.
    - [x] Sub-task: Register `RssSyncService` and `TorrentManager` loop tasks.
    - [x] Sub-task: Add log output confirming scheduler start.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Operational Scaffolding (High-Impact P1)' (Protocol in workflow.md)

## Phase 3: Feature Parity (P1 Gaps)
Deliver the missing "Clone" capabilities (Subtitles, Dynamic Indexers).
**Focus:** Complex UI Logic, Dynamic Forms, Provider Integration.

- [x] Task: Write Tests: Add tests for Dynamic Indexer Form.
    - [x] Sub-task: Test form generation from JSON schema (configContract).
    - [x] Sub-task: Test conditional field rendering.
- [x] Task: Implement Dynamic Indexer Configuration (RMD-004).
    - [x] Sub-task: Create `DynamicForm` component.
    - [x] Sub-task: Update `/indexers` add/edit modal to use `DynamicForm` based on `implementation` type.
    - [x] Sub-task: Ensure Cardigann definitions render their specific fields.
- [x] Task: Write Tests: Add integration tests for Subtitle Provider.
    - [x] Sub-task: Create `tests/integration/subtitle-provider.test.ts`.
    - [x] Sub-task: Test provider instantiation and search contract.
- [x] Task: Implement Subtitle Provider & UI (RMD-006).
    - [x] Sub-task: Implement `OpenSubtitlesProvider` (or generic scraping provider).
    - [x] Sub-task: Wire provider to `SubtitleService`.
    - [x] Sub-task: Implement `/subtitles` page with Inventory table.
    - [x] Sub-task: Implement Manual Search modal and Download action.
- [x] Task: Implement Episode Monitoring Persistence (RMD-008).
    - [x] Sub-task: Add `PATCH /api/episodes/:id` endpoint.
    - [x] Sub-task: Wire frontend toggle to API.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Feature Parity (P1 Gaps)' (Protocol in workflow.md)

## Phase 4: Reliability & Polish (P2/P3)
Improve robustness and observability; fix audit findings from Phase 9.
**Focus:** Indexer Form Parity, Subtitle Download, Conditional Fields, Dashboard, Error Handling, UX Polish.

- [ ] Task: Fix Cardigann Indexer Form Flow (Audit Finding #1 — High).
    - [ ] Sub-task: Write tests: Add test for implementation selector in create flow (Torznab, Cardigann, Newznab); verify `configContract` and `implementation` update together.
    - [ ] Sub-task: Write tests: Add test for edit flow loading Cardigann-specific fields from backend definition schema (not JSON-parsing `configContract` string).
    - [ ] Sub-task: Add implementation type selector to create form (`indexers/page.tsx`); sync `implementation`/`configContract`/`protocol` from selection.
    - [ ] Sub-task: Replace `JSON.parse(editing.configContract)` fallback with definition-lookup: resolve schema from backend definitions by `configContract` name (e.g. `CardigannSettings` → definition's field list).
    - [ ] Sub-task: Add API endpoint or extend existing indexer schema endpoint to return field definitions for a given `configContract`.
- [ ] Task: Implement Real Subtitle Download (Audit Finding #2 — High).
    - [ ] Sub-task: Write tests: Add integration test for `OpenSubtitlesProvider.download()` — assert it fetches the download link via the OpenSubtitles download API and returns file content/path.
    - [ ] Sub-task: Write tests: Add integration test for `SubtitleInventoryApiService.manualDownload()` — assert subtitle file is written to the path returned by `NamingService`.
    - [ ] Sub-task: Implement `OpenSubtitlesProvider.download()`: call OpenSubtitles `/download` endpoint, retrieve file content, return with `content` or `downloadUrl` on candidate.
    - [ ] Sub-task: Update `SubtitleInventoryApiService.manualDownload()` to write subtitle file content to `storedPath` on disk before persisting DB metadata.
    - [ ] Sub-task: Replace `alert()` in `subtitles/page.tsx` `ManualSearchView` with toast notification (success/error).
- [ ] Task: Implement Conditional Field Rendering in DynamicForm (Audit Finding #3 — Medium).
    - [ ] Sub-task: Write tests: Add test for conditional field visibility — field with `condition: { field: 'useSsl', value: true }` renders only when `useSsl` is checked.
    - [ ] Sub-task: Write tests: Add test that conditional field values are excluded from submit payload when hidden.
    - [ ] Sub-task: Extend `FieldDefinition` with optional `condition` property (`{ field: string; value: any }`).
    - [ ] Sub-task: Implement watch-based conditional rendering in `DynamicForm` — use `useWatch` to show/hide fields and strip hidden values on submit.
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
