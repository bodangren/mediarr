# Implementation Plan: Track 7D - Queue Console & Subtitle Operations

## Phase 1: Torrent Queue Console and Control Surface
Deliver transfer monitoring and queue controls with SSE-driven live updates.

- [ ] Task: Write Tests: Add failing queue page tests for lifecycle metrics, SSE updates, and polling fallback.
  - [ ] Sub-task: Add failing tests for progress/rates/ratio/eta/peer rendering from mock torrent data.
  - [ ] Sub-task: Add failing tests for lifecycle state badge rendering (downloading, paused, seeding, completed, importing, error).
  - [ ] Sub-task: Add failing tests for SSE `torrent:stats` event updating table rows in place without full refetch.
  - [ ] Sub-task: Add failing tests for polling fallback when SSE connection is unavailable (5s interval).
- [ ] Task: Implement queue monitoring UI.
  - [ ] Sub-task: Implement `/queue` page with data table showing name, progress bar, rates, ratio, ETA, peers, save path, lifecycle badge.
  - [ ] Sub-task: Implement SSE-driven table updates using the `eventsApi` cache bridge from 7C.
  - [ ] Sub-task: Implement polling fallback with connection status indicator (SSE connected / polling).
  - [ ] Sub-task: Implement expandable row detail pane showing peer list, tracker info, and file list.
- [ ] Task: Write Tests: Add failing tests for pause/resume/remove controls with optimistic updates and error rollback.
  - [ ] Sub-task: Add failing tests for pause/resume toggling with immediate UI state change and rollback on API error.
  - [ ] Sub-task: Add failing tests for remove action with confirmation dialog and option to delete data.
- [ ] Task: Implement queue control actions.
  - [ ] Sub-task: Implement pause/resume mutations using the optimistic update pattern from 7C.
  - [ ] Sub-task: Implement remove action with confirmation dialog, delete-data checkbox, and error messaging.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Torrent Queue Console and Control Surface' (Protocol in workflow.md)

## Phase 2: Subtitle Variant Console and Manual Operations
Deliver variant-level subtitle inventory, manual search, and manual download UX.

- [ ] Task: Write Tests: Add failing subtitle inventory tests for variant selection, track tables, and missing state.
  - [ ] Sub-task: Add failing tests for variant selector when media has multiple file variants.
  - [ ] Sub-task: Add failing tests for audio/subtitle track table with language, codec, source, and flag columns.
  - [ ] Sub-task: Add failing tests for missing subtitle indicators and wanted status badges per language.
- [ ] Task: Implement subtitle inventory views.
  - [ ] Sub-task: Implement `/subtitles` page with media browser and variant selector.
  - [ ] Sub-task: Implement audio/subtitle track inspection table per selected variant.
  - [ ] Sub-task: Implement missing-state summary with wanted subtitle language indicators.
- [ ] Task: Write Tests: Add failing manual subtitle operation tests with explicit variant enforcement.
  - [ ] Sub-task: Add failing tests for search requiring variant ID (cannot search without selecting a variant).
  - [ ] Sub-task: Add failing tests for candidate result rendering with provider, language, score, and format.
  - [ ] Sub-task: Add failing tests for download success/error feedback and history timeline refresh.
- [ ] Task: Implement manual subtitle search/download flows.
  - [ ] Sub-task: Implement manual search dialog requiring variant selection, showing search progress and candidate results.
  - [ ] Sub-task: Implement candidate selection and download action with progress feedback.
  - [ ] Sub-task: Implement variant subtitle history timeline showing past attempts with provider, score, status, and timestamp.
- [ ] Task: Execute quality gates for Track 7D and resolve regressions.
  - [ ] Sub-task: Run app lint/type checks and all tests relevant to queue and subtitle UI work.
  - [ ] Sub-task: Verify mobile behavior (375px viewport) for queue table and subtitle workflows.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Subtitle Variant Console and Manual Operations' (Protocol in workflow.md)
