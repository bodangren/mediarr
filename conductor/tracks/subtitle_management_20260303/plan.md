# Implementation Plan: Subtitle Management

## Phase 1: Provider and Scoring Foundation
> Goal: Deliver production-usable provider integrations and candidate ranking.

- [x] Task: Complete OpenSubtitles provider flow [7e0e38b]
  - [x] Sub-task: Implement real download behavior in `OpenSubtitlesProvider`.
  - [x] Sub-task: Ensure provider outputs normalized language/forced/HI metadata.
- [x] Task: Add additional providers [7e0e38b]
  - [x] Sub-task: Implement ASSRT provider adapter (Chinese).
  - [x] Sub-task: Implement SubDL provider adapter (Thai-capable).
  - [x] Sub-task: Wire providers into `SubtitleProviderFactory` with configurable selection.
- [x] Task: Implement scoring service [7e0e38b]
  - [x] Sub-task: Add `SubtitleScoringService` and apply to manual and automated selection.
- [x] Task: Add backend tests for provider and scoring behavior. [7e0e38b]

## Phase 2: Wanted Languages and Automation Engine
> Goal: Configure target languages and automate missing subtitle fetches.

- [x] Task: Add global wanted languages to settings [6941a19]
  - [x] Sub-task: Add `wantedLanguages` to backend settings model/repository/validation.
  - [x] Sub-task: Add `wantedLanguages` to frontend settings client schema.
- [x] Task: Build automated subtitle orchestration [6941a19]
  - [x] Sub-task: Scan variants for missing subtitles from wanted languages.
  - [x] Sub-task: Sync `VariantMissingSubtitle` and `WantedSubtitle` records.
  - [x] Sub-task: Run fetch loop with state transitions and history recording.
- [x] Task: Integrate triggers [6941a19]
  - [x] Sub-task: Trigger subtitle automation on import events.
  - [x] Sub-task: Add periodic scheduler job for subtitle wanted scan/search.
- [x] Task: Add backend tests for settings + automation + scheduler/import hooks. [6941a19]

## Phase 3: Subtitle API Contract Completion
> Goal: Expose a complete subtitle API surface aligned with current frontend route map.

- [x] Task: Implement providers endpoints [8be73fd]
  - [x] Sub-task: `GET/PUT /api/subtitles/providers/:id`, `GET /api/subtitles/providers`, `POST /test`, `POST /reset`.
- [x] Task: Implement wanted endpoints [8be73fd]
  - [x] Sub-task: Series/movies wanted list endpoints with pagination/filtering.
  - [x] Sub-task: Trigger search endpoints and wanted count endpoint.
- [x] Task: Implement history and blacklist endpoints [8be73fd]
  - [x] Sub-task: History list/stats/clear endpoints.
  - [x] Sub-task: Blacklist list/remove/clear endpoints.
- [x] Task: Implement movie/series sync/scan/search convenience endpoints. [8be73fd]
- [x] Task: Align server `routeMap` and dependency wiring with implemented routes. [8be73fd]
- [x] Task: Add route-level tests for all new subtitle endpoints. [8be73fd]

## Phase 4: Frontend Integration and Badges
> Goal: Wire subtitle APIs into UI and render accurate subtitle status badges.

- [x] Task: Settings integration [0b36d1f2]
  - [x] Sub-task: Add wanted languages controls in subtitle settings page.
  - [x] Sub-task: Keep provider status and credentials working with new endpoints.
- [x] Task: Subtitle status rendering [0b36d1f2]
  - [x] Sub-task: Render language badges on movie/episode list/detail surfaces.
  - [x] Sub-task: Render aggregate series/season partial vs complete subtitle status.
- [x] Task: Manual subtitle UX [0b36d1f2]
  - [x] Sub-task: Connect manual search modal and download actions to live API.
- [x] Task: Add frontend tests for settings, badge logic, and manual subtitle flows. [0b36d1f2]

## Phase 5: Track Hardening and Final Verification
> Goal: Run full validation and finalize conductor tracking in one pass.

- [ ] Task: Run automated verification
  - [ ] Sub-task: Execute relevant test suites for server/app subtitle changes.
  - [ ] Sub-task: Execute coverage checks for modified modules.
- [ ] Task: Perform manual verification at end of track only
  - [ ] Sub-task: Run full manual verification protocol for all phases in one session.
- [ ] Task: Finalize conductor records
  - [ ] Sub-task: Mark all completed tasks/phase checkboxes with commit SHAs.
  - [ ] Sub-task: Prepare track completion summary for archive handoff.
