# Implementation Plan: Track 7C - UI Foundation & Core Operations

## Phase 1: Frontend Infrastructure, Design Tokens, and Data Architecture
Establish stable frontend testing, design token system, data-fetching conventions, and mock data fixtures.

- [x] Task: Install and configure frontend testing/tooling dependencies.
  - [x] Sub-task: Configure React Testing Library + jsdom environment for the app workspace.
  - [x] Sub-task: Configure MSW browser/node handlers for API mocking.
- [x] Task: Define and implement design token system.
  - [x] Sub-task: Create design token reference document in `conductor/` defining all color ramps (surface 0-3, text primary/secondary/muted, accent, semantic states), spacing scale (4px grid), type scale (12-32px with Geist Sans/Mono), radius (0/4/8/12/9999), and shadow levels (3 tiers).
  - [x] Sub-task: Implement CSS custom properties on `:root` in globals.css matching the token reference.
  - [x] Sub-task: Configure Tailwind CSS v4 to consume the custom property tokens.
- [x] Task: Establish TanStack Query data-fetching architecture.
  - [x] Sub-task: Configure QueryClient with default stale times (30s lists, 60s details, 5s queue).
  - [x] Sub-task: Implement `useApiQuery` wrapper hook providing typed SDK integration with consistent loading/error/empty state handling.
  - [x] Sub-task: Implement SSE-to-cache bridge: `eventsApi` stream listener that updates TanStack Query cache on `torrent:stats`, invalidates on `activity:new` and `health:update`.
  - [x] Sub-task: Implement standard optimistic mutation helper with cache update, rollback on error, and toast notification on failure.
  - [x] Sub-task: Document query key conventions and cache invalidation rules in a `QUERY_CONVENTIONS.md` file in the app workspace.
- [x] Task: Create MSW mock handlers and data factories.
  - [x] Sub-task: Implement mock data factories for series, movies, torrents, indexers, activity events, and settings with deterministic and randomized modes.
  - [x] Sub-task: Create MSW handler definitions for all 7B API endpoints using the defined envelope/pagination shapes.
  - [x] Sub-task: Configure MSW integration for both test environment (node) and development server (browser).
- [x] Task: Write Tests: Add failing tests for core design primitives and responsive behavior.
  - [x] Sub-task: Add failing tests for status badge, progress bar, metric card, skeleton, empty panel, and error panel components.
  - [x] Sub-task: Add failing tests for data table: sortable columns, pagination controls, row actions, responsive overflow at 375px.
- [x] Task: Implement reusable design primitives.
  - [x] Sub-task: Implement status badges, progress bars, metric cards, data tables, empty/error panels, skeleton loaders.
  - [x] Sub-task: Implement global toast notification component.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Frontend Infrastructure, Design Tokens, and Data Architecture' (Protocol in workflow.md)

## Phase 2: App Shell, Navigation, and Global Interactions
Build persistent shell, routing, and navigation behavior used by all subsequent pages.

- [x] Task: Write Tests: Add failing app shell tests for route activation, breadcrumbs, and mobile nav behavior.
  - [x] Sub-task: Add failing tests for sidebar route highlighting and breadcrumb generation from route segments.
  - [x] Sub-task: Add failing tests for mobile bottom bar active state and collapsible sidebar.
  - [x] Sub-task: Add failing tests for command palette open/close (Cmd/Ctrl+K) and navigation.
- [x] Task: Implement shell layout and route containers.
  - [x] Sub-task: Implement root layout with sidebar (desktop) and bottom bar (mobile) per the URL routing structure.
  - [x] Sub-task: Implement breadcrumb system that reads route segments and maps to human-readable labels.
  - [x] Sub-task: Implement global command palette with quick-navigate to all routes and media search.
  - [x] Sub-task: Implement route-level error boundaries with "Retry" and "Go Home" recovery actions.
- [x] Task: Conductor - User Manual Verification 'Phase 2: App Shell, Navigation, and Global Interactions' (Protocol in workflow.md)

## Phase 3: Indexer Management Console
Deliver indexer operator workflows before add/search media workflows.

- [x] Task: Write Tests: Add failing tests for indexer list table, inline state controls, and diagnostics rendering.
  - [x] Sub-task: Add failing tests for enable toggle with optimistic update and rollback on error.
  - [x] Sub-task: Add failing tests for priority edits with optimistic update.
  - [x] Sub-task: Add failing tests for indexer test execution success/failure states with remediation hints.
  - [x] Sub-task: Add failing tests for health snapshot status indicator per indexer row.
- [x] Task: Implement indexer list and controls UI.
  - [x] Sub-task: Implement data table with capability/protocol/status/health indicators.
  - [x] Sub-task: Implement inline enable/priority mutations using the optimistic update pattern.
- [x] Task: Write Tests: Add failing tests for indexer create/edit dialogs with protocol-specific settings.
  - [x] Sub-task: Add failing tests for dynamic form sections based on indexer protocol and validation.
- [x] Task: Implement indexer create/edit flows.
  - [x] Sub-task: Implement create/edit dialogs with protocol-specific form sections and mutation wiring.
  - [x] Sub-task: Surface validation errors and server error details in the dialog.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Indexer Management Console' (Protocol in workflow.md)

## Phase 4: Add Media Discovery and Onboarding Flows
Implement series/movie onboarding with conflict handling.

- [x] Task: Write Tests: Add failing tests for add-media search UX and result cards.
  - [x] Sub-task: Add failing tests for debounced search (300ms), loading/empty/error states, and movie/series tab switching.
  - [x] Sub-task: Add failing tests for already-added indicator on result cards.
- [x] Task: Implement add-media search dialog/page.
  - [x] Sub-task: Implement shared search surface at `/add` with movie/series tabs.
  - [x] Sub-task: Implement metadata result cards with poster, title, year, overview, and already-added badge.
- [x] Task: Write Tests: Add failing tests for add configuration and conflict resolution flows.
  - [x] Sub-task: Add failing tests for quality profile selection, monitoring defaults toggle, and search-on-add payload behavior.
  - [x] Sub-task: Add failing tests for duplicate detection banner with "Go to existing" and "Add anyway" actions.
- [x] Task: Implement add confirmation and conflict resolution UX.
  - [x] Sub-task: Implement add sheet/dialog with profile/monitor/search-on-add controls.
  - [x] Sub-task: Include `searchNow` flag in API payload based on user selection.
  - [x] Sub-task: Implement duplicate detection banner when server returns CONFLICT, with navigation to existing and force-add options.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Add Media Discovery and Onboarding Flows' (Protocol in workflow.md)

## Phase 5: Library List and Detail Views
Deliver library browsing with pagination, sorting, filtering, and deep-linked detail pages.

- [x] Task: Write Tests: Add failing tests for movie and series list pages.
  - [x] Sub-task: Add failing tests for shared data table with pagination controls, sort column headers, and filter dropdowns.
  - [x] Sub-task: Add failing tests for monitored toggle per row with optimistic update.
  - [x] Sub-task: Add failing tests for file status indicators (has file, missing, importing).
- [x] Task: Implement library list views.
  - [x] Sub-task: Implement `/library/series` page using shared data table with sorting by title/year/status and filtering.
  - [x] Sub-task: Implement `/library/movies` page using same shared data table patterns.
  - [x] Sub-task: Implement per-row monitored toggle and delete action with confirmation.
- [x] Task: Write Tests: Add failing tests for series and movie detail pages.
  - [x] Sub-task: Add failing tests for series detail: season accordion, episode grid with monitored toggles, file status per episode.
  - [x] Sub-task: Add failing tests for movie detail: file/metadata status panel, action buttons (search, delete).
- [x] Task: Implement library detail views.
  - [x] Sub-task: Implement `/library/series/:id` with season/episode grid, per-episode monitored toggle, and file status.
  - [x] Sub-task: Implement `/library/movies/:id` with file info panel and action bar.
- [x] Task: Conductor - User Manual Verification 'Phase 5: Library List and Detail Views' (Protocol in workflow.md)

## Phase 6: Wanted View and Release Selection Flow
Deliver the wanted-to-grab workflow that ties library to queue.

- [x] Task: Write Tests: Add failing tests for wanted table and manual search launch.
  - [x] Sub-task: Add failing tests for unified wanted list with movie/episode items, pagination, and type filter.
  - [x] Sub-task: Add failing tests for per-row "Search" button launching release search.
- [x] Task: Implement wanted page.
  - [x] Sub-task: Implement `/wanted` page with unified table of missing movies and episodes.
  - [x] Sub-task: Implement per-row search button that opens the release selection panel.
- [x] Task: Write Tests: Add failing tests for release candidate table and grab flow.
  - [x] Sub-task: Add failing tests for release table with ranking cues (indexer name, size, seeders, age) and quality-fit badges.
  - [x] Sub-task: Add failing tests for grab mutation: success (toast + invalidate wanted + navigate to queue), failure (error toast with retry option).
- [x] Task: Implement release selection and grab UX.
  - [x] Sub-task: Implement release candidate table/panel with sortable columns and quality-fit indicators.
  - [x] Sub-task: Implement grab button with queue handoff: on success, show toast and invalidate wanted/torrent caches; on error, show error toast with domain error code details and retry action.
- [x] Task: Execute quality gates for Track 7C and resolve regressions.
  - [x] Sub-task: Run app lint/type checks and all tests relevant to UI work.
  - [x] Sub-task: Verify mobile behavior (375px viewport) for all implemented pages.
- [x] Task: Conductor - User Manual Verification 'Phase 6: Wanted View and Release Selection Flow' (Protocol in workflow.md)
