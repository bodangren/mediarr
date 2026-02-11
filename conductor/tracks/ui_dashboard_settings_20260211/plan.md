# Implementation Plan: Track 7E - Dashboard, Activity & Settings

## Phase 1: Dashboard Overview and Health Feed
Deliver the centralized dashboard with live-updating metric cards and health feed.

- [ ] Task: Write Tests: Add failing dashboard metric card tests.
  - [ ] Sub-task: Add failing tests for monitored media count card rendering from API data.
  - [ ] Sub-task: Add failing tests for wanted totals, active queue summary, subtitle backlog, and recent operations cards.
  - [ ] Sub-task: Add failing tests for card deep-link navigation to respective filtered views.
  - [ ] Sub-task: Add failing tests for SSE-driven card value updates without full page refresh.
- [ ] Task: Implement dashboard overview.
  - [ ] Sub-task: Implement `/` dashboard page with responsive metric card grid (1 col mobile, 2 col tablet, 4 col desktop).
  - [ ] Sub-task: Implement aggregate data query hooks for each card (using 7B API endpoints with appropriate query keys).
  - [ ] Sub-task: Wire SSE events to update card values via the cache bridge from 7C.
  - [ ] Sub-task: Implement card deep-link behavior (navigate to filtered view on click).
- [ ] Task: Write Tests: Add failing health/event feed tests.
  - [ ] Sub-task: Add failing tests for severity ordering (critical > warning > ok) in the event list.
  - [ ] Sub-task: Add failing tests for remediation action buttons (e.g., "Test indexer" triggers indexer test, "Retry" links to appropriate action).
- [ ] Task: Implement health feed.
  - [ ] Sub-task: Implement health feed section below dashboard cards sourcing from `GET /api/health`.
  - [ ] Sub-task: Implement severity-ordered event rendering with source, timestamp, message, and remediation controls.
  - [ ] Sub-task: Wire SSE `health:update` events to refresh health feed.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Dashboard Overview and Health Feed' (Protocol in workflow.md)

## Phase 2: Activity Center
Deliver the cross-module activity timeline with filtering and drill-down.

- [ ] Task: Write Tests: Add failing activity timeline tests.
  - [ ] Sub-task: Add failing tests for timeline rendering with event type badge, summary, entity link, and success/failure indicator.
  - [ ] Sub-task: Add failing tests for filter controls: event type multi-select, date range presets (24h/7d/30d), status toggle.
  - [ ] Sub-task: Add failing tests for pagination with standard page/pageSize controls.
  - [ ] Sub-task: Add failing tests for drill-down navigation: clicking RELEASE_GRABBED navigates to `/queue`, clicking MEDIA_ADDED navigates to media detail.
  - [ ] Sub-task: Add failing tests for SSE `activity:new` events prepending to timeline.
- [ ] Task: Implement activity center page.
  - [ ] Sub-task: Implement `/activity` page with activity timeline list using `activityApi` from 7B SDK.
  - [ ] Sub-task: Implement filter bar with event type multi-select, date range picker/presets, and success/failure toggle.
  - [ ] Sub-task: Implement pagination controls using standard conventions.
  - [ ] Sub-task: Implement per-entry drill-down navigation resolving entity type to target route.
  - [ ] Sub-task: Wire SSE `activity:new` events to prepend new entries and show "New events" indicator.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Activity Center' (Protocol in workflow.md)

## Phase 3: Settings Surface
Deliver the persisted settings management UI.

- [ ] Task: Write Tests: Add failing settings surface tests.
  - [ ] Sub-task: Add failing tests for settings sections rendering current values from API.
  - [ ] Sub-task: Add failing tests for inline edit of torrent limits (max downloads, max seeds, speed limits with unit display).
  - [ ] Sub-task: Add failing tests for scheduler interval edits with human-readable display (e.g., "15 minutes" not "900").
  - [ ] Sub-task: Add failing tests for save action: success toast, validation error display, partial merge behavior.
  - [ ] Sub-task: Add failing tests for stale-state detection banner with refresh action.
- [ ] Task: Implement settings page.
  - [ ] Sub-task: Implement `/settings` page with sections for torrent limits, scheduler intervals, and path visibility.
  - [ ] Sub-task: Implement inline edit controls with unit formatting and input validation.
  - [ ] Sub-task: Implement save mutation via `PATCH /api/settings` with success toast and inline error display.
  - [ ] Sub-task: Implement stale-state detection: on focus/visibility change, refetch settings and show banner if server values differ from displayed values.
- [ ] Task: Execute quality gates for Track 7E and resolve regressions.
  - [ ] Sub-task: Run app lint/type checks and all tests relevant to dashboard, activity, and settings UI.
  - [ ] Sub-task: Verify mobile behavior (375px viewport) for dashboard cards, activity timeline, and settings form.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Settings Surface' (Protocol in workflow.md)
