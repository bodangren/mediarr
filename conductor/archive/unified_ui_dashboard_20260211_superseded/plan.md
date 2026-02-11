> **Status:** Superseded on 2026-02-11 by tracks `ui_platform_prereqs_20260211` (7A), `ui_api_surface_contracts_20260211` (7B), `ui_core_operations_20260211` (7C), and `ui_operational_hardening_20260211` (7D).

# Implementation Plan: Track 7 - Unified UI & Dashboard

> **Architecture Decisions (record before implementation):**
> - **Transport:** Next.js API route handlers (`app/api/`) wrapping backend services. Evaluated tRPC but deferred to keep the stack simpler; typed fetch clients with shared DTO types provide equivalent safety for this project's scale.
> - **Component Library:** shadcn/ui (Radix primitives + Tailwind). Provides accessible Table, Dialog, Command, DropdownMenu, Toast (Sonner), Tabs, Form, and Sheet components out of the box. Themed to Modern Dark via CSS variables.
> - **Data Fetching:** TanStack Query v5 with typed query key factory. Polling (`refetchInterval`) for real-time views (queue). SSE/WebSocket deferred to post-launch optimization.
> - **Testing Stack:** Vitest + React Testing Library for component/hook tests. MSW (Mock Service Worker) for API mocking. Playwright for E2E journeys (set up early, written incrementally).
> - **Responsive Strategy:** Mobile-first breakpoints enforced from Phase 1. Mobile nav pattern: collapsible sidebar with bottom action bar on small screens. Every component must pass responsive review before task completion.
> - **Process Model:** The Next.js application must run as a long-lived process (e.g., `next start` in Docker), NOT as serverless functions. This is critical to maintain the singleton state of `TorrentManager` (WebTorrent client) and `MediaSearchService`.
> - **BigInt Safety:** A global patch for `BigInt.prototype.toJSON` will be applied at the application entry point to ensure all JSON responses safely serialize 64-bit integers (file sizes) as strings or numbers.

---

## Phase 1: Backend Operational Glue (Critical Pre-requisites)
Address critical gaps in the backend services identified during review to enable the required UI workflows.

- [ ] Task: Implement global BigInt serialization patch.
  - [ ] Sub-task: Create a utility (e.g., `server/src/utils/bigint-patch.ts`) that overrides `BigInt.prototype.toJSON`.
  - [ ] Sub-task: Ensure this patch is imported/executed at the entry point of the Next.js server (e.g., `instrumentation.ts` or a top-level import in API routes) and the standalone server.
  - [ ] Sub-task: Write a test ensuring `JSON.stringify({ val: BigInt(123) })` returns a valid JSON string without throwing.
- [ ] Task: Refactor `MediaSearchService` to support "Manual Search" (candidates only).
  - [ ] Sub-task: Refactor `MediaSearchService` to expose a public `getSearchCandidates(query: SearchQuery): Promise<ReleaseCandidate[]>` method.
  - [ ] Sub-task: Decouple the "Grab" logic into a separate public `grabRelease(release: ReleaseCandidate): Promise<Torrent>` method.
  - [ ] Sub-task: Update existing `searchEpisode` and `searchMovie` methods to compose these new methods (maintaining backward compatibility).
  - [ ] Sub-task: Add unit tests for `getSearchCandidates` returning results without side effects.
- [ ] Task: Implement `TorrentManager` stats persistence loop.
  - [ ] Sub-task: Modify `TorrentManager` to include a private `syncStats()` method that iterates active WebTorrent torrents and updates their stats (speed, progress, ratio) in the `Torrent` database table.
  - [ ] Sub-task: Implement a `setInterval` loop (e.g., every 2 seconds) in `initialize()` to run `syncStats()`.
  - [ ] Sub-task: Ensure `destroy()` clears this interval.
  - [ ] Sub-task: Write a test verifying that database records are updated after the interval ticks.
- [ ] Task: Implement `SubtitleProviderFactory` for dynamic provider injection.
  - [ ] Sub-task: Create `SubtitleProviderFactory` that accepts configuration and returns the appropriate `ManualSubtitleProvider` instance.
  - [ ] Sub-task: Refactor `SubtitleInventoryApiService` to accept `SubtitleProviderFactory` in its constructor instead of requiring the controller to pass a provider.
  - [ ] Sub-task: Update `manualSearch` and `manualDownload` methods to resolve the provider via the factory internally.

## Phase 2: Server API Surface Layer
Expose all backend service capabilities as HTTP endpoints the frontend can consume. No UI work until this layer is callable and tested independently.

- [ ] Task: Write Tests: Add API route handler tests for media endpoints (list all, get by ID, set monitored, delete, search candidates).
  - [ ] Sub-task: Add failing tests for GET /api/media (series list, movie list, series by ID with seasons/episodes).
  - [ ] Sub-task: Add failing tests for PATCH /api/media/:id/monitored and DELETE /api/media/:id with mediaType handling.
- [ ] Task: Implement media API route handlers wrapping MediaService, WantedService, and MetadataProvider.
  - [ ] Sub-task: Implement GET /api/series, GET /api/movies, GET /api/series/:id, GET /api/movies/:id.
  - [ ] Sub-task: Implement PATCH /api/media/:id/monitored, DELETE /api/media/:id, GET /api/media/wanted/missing.
  - [ ] Sub-task: Implement POST /api/media/search (MetadataProvider.searchMedia) and POST /api/media (upsert via MediaRepository).
- [ ] Task: Write Tests: Add API route handler tests for torrent endpoints (list, status, add, pause, resume, remove, speed limits).
  - [ ] Sub-task: Add failing tests for GET /api/torrents, GET /api/torrents/:infoHash, POST /api/torrents.
  - [ ] Sub-task: Add failing tests for PATCH /api/torrents/:infoHash/pause, /resume, DELETE /api/torrents/:infoHash.
- [ ] Task: Implement torrent API route handlers wrapping TorrentManager and TorrentRepository.
  - [ ] Sub-task: Implement CRUD and control endpoints for torrents using the new `TorrentManager` methods.
  - [ ] Sub-task: Implement PATCH /api/torrents/speed-limits for download/upload rate control.
- [ ] Task: Write Tests: Add API route handler tests for indexer endpoints (CRUD, test connectivity, search).
  - [ ] Sub-task: Add failing tests for GET /api/indexers, POST /api/indexers, PUT /api/indexers/:id, DELETE /api/indexers/:id.
  - [ ] Sub-task: Add failing tests for POST /api/indexers/:id/test and POST /api/search (MediaSearchService).
- [ ] Task: Implement indexer API route handlers wrapping IndexerRepository, IndexerFactory, and MediaSearchService.
  - [ ] Sub-task: Implement indexer CRUD routes with settings encryption/decryption passthrough.
  - [ ] Sub-task: Implement POST /api/indexers/:id/test.
  - [ ] Sub-task: Implement POST /api/releases/search using the new `MediaSearchService.getSearchCandidates` method.
  - [ ] Sub-task: Implement POST /api/releases/grab using the new `MediaSearchService.grabRelease` method.
- [ ] Task: Write Tests: Add API route handler tests for subtitle endpoints (variant inventory, manual search, manual download, wanted state).
  - [ ] Sub-task: Add failing tests for GET /api/subtitles/movie/:id/variants and GET /api/subtitles/episode/:id/variants.
  - [ ] Sub-task: Add failing tests for POST /api/subtitles/search and POST /api/subtitles/download.
- [ ] Task: Implement subtitle API route handlers wrapping SubtitleInventoryApiService and VariantWantedService.
  - [ ] Sub-task: Implement variant inventory listing and detail endpoints.
  - [ ] Sub-task: Implement manual search/download endpoints (now relying on the internal Factory for provider resolution).
- [ ] Task: Implement shared API infrastructure: error shape normalization and consistent response envelope.
  - [ ] Sub-task: Implement error handler that maps service exceptions to structured JSON error responses with codes.
  - [ ] Sub-task: Verify global BigInt patch handles all serialization correctly.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Server API Surface Layer' (Protocol in workflow.md)

## Phase 3: Frontend Foundation — Test Infrastructure, Design System, and App Shell
Set up the frontend toolchain, component library, design tokens, and application skeleton. All primitives must be responsive from the start.

- [ ] Task: Install and configure frontend dependencies: shadcn/ui (with Radix), TanStack Query v5, MSW, and Playwright.
  - [ ] Sub-task: Run shadcn/ui init, configure Tailwind CSS theme tokens for Modern Dark (deep blacks, neon accent palette, typography scale).
  - [ ] Sub-task: Install and configure TanStack Query provider, MSW browser/node handlers, and Playwright config with a smoke test.
- [ ] Task: Write Tests: Add design-system primitive tests for core shadcn/ui-wrapped components and custom primitives.
  - [ ] Sub-task: Add failing tests for StatusBadge, ProgressBar, MetricCard, and SkeletonLoader rendering and variant props.
  - [ ] Sub-task: Add failing tests for responsive behavior: mobile nav collapse, table horizontal scroll, card stacking.
- [ ] Task: Implement Modern Dark theme tokens and custom UI primitives layered on shadcn/ui.
  - [ ] Sub-task: Configure CSS variables for background, surface, border, muted, accent (neon cyan/purple/green), destructive, and text scales.
  - [ ] Sub-task: Implement StatusBadge, ProgressBar, MetricCard, SkeletonLoader, EmptyState, and ErrorPanel components.
  - [ ] Sub-task: Implement global Sonner toast provider and toast utility functions (success, error, info, action).
- [ ] Task: Write Tests: Add app shell tests for navigation rendering, active route detection, breadcrumb generation, and mobile collapse.
  - [ ] Sub-task: Add failing tests for sidebar nav items matching route segments and active state highlighting.
  - [ ] Sub-task: Add failing tests for mobile bottom bar rendering at small breakpoints and sidebar hide.
- [ ] Task: Implement Next.js app shell with persistent sidebar, mobile-responsive navigation, and route structure.
  - [ ] Sub-task: Implement root layout with sidebar (Dashboard, Library, Wanted, Activity, Indexers, Subtitles, Settings) and mobile bottom action bar.
  - [ ] Sub-task: Implement breadcrumb system, global Command palette (shadcn/ui Command), and section page containers.
  - [ ] Sub-task: Implement root and per-route React error boundaries with recovery actions and technical detail toggle.
- [ ] Task: Write Tests: Add typed API client tests with MSW mocking for request/response contracts across all endpoint groups.
  - [ ] Sub-task: Add failing tests for media client methods with BigInt-to-string normalization and error shape handling.
  - [ ] Sub-task: Add failing tests for torrent, indexer, and subtitle client methods with correct HTTP methods and payloads.
- [ ] Task: Implement typed API client modules and TanStack Query hook layer.
  - [ ] Sub-task: Implement fetch-based client modules (mediaApi, torrentApi, indexerApi, subtitleApi) with typed request/response.
  - [ ] Sub-task: Implement query key factory, shared query hooks with staleTime/gcTime defaults, and mutation hooks with cache invalidation.
  - [ ] Sub-task: Implement global query error handler that routes API errors to toast notifications.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Foundation — Test Infrastructure, Design System, and App Shell' (Protocol in workflow.md)

## Phase 4: Indexer Management Console (Prowlarr-Inspired)
Indexers must be configured before any search or discovery workflow can function. This is the first operational page users need.

- [ ] Task: Write Tests: Add indexer list page tests for enabled/disabled state, protocol badges, capability indicators, priority display, and responsive table layout.
  - [ ] Sub-task: Add failing tests for indexer table rendering with filter controls and empty state.
  - [ ] Sub-task: Add failing tests for inline enabled toggle mutation and optimistic update.
- [ ] Task: Implement indexer list page with status indicators, capability badges, and inline controls.
  - [ ] Sub-task: Implement data table with columns: name, protocol, capabilities (RSS/Search), priority, enabled, actions.
  - [ ] Sub-task: Implement inline toggle for enabled state and priority adjustment with optimistic mutation.
- [ ] Task: Write Tests: Add indexer create/edit form tests for protocol-specific settings, validation, and serialization.
  - [ ] Sub-task: Add failing tests for form field rendering per implementation type (Torznab, scraping) and required field validation.
  - [ ] Sub-task: Add failing tests for settings serialization and successful create/update mutation payloads.
- [ ] Task: Implement indexer create/edit flows using shadcn/ui Dialog and Form with protocol-specific settings sections.
  - [ ] Sub-task: Implement shared indexer form with dynamic settings fields based on configContract/implementation.
  - [ ] Sub-task: Implement create and edit mutations with validation feedback and form error display.
- [ ] Task: Write Tests: Add indexer test-connectivity tests for loading, success, and failure states with diagnostic output.
  - [ ] Sub-task: Add failing tests for test button loading state, success banner, and failure detail panel.
  - [ ] Sub-task: Add failing tests for remediation hints rendered from specific error types.
- [ ] Task: Implement indexer test execution UX with structured diagnostic output and retry workflow.
  - [ ] Sub-task: Implement test mutation trigger with inline result rendering (success checkmark or error detail panel).
  - [ ] Sub-task: Implement error troubleshooting hints based on error category and re-test action.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Indexer Management Console (Prowlarr-Inspired)' (Protocol in workflow.md)

## Phase 5: Media Discovery and Add Workflows
Enable complete add flows for series and movies with metadata preview, quality profile selection, and optional immediate search trigger.

- [ ] Task: Write Tests: Add media search tests for query input, debounced search, result rendering, and movie/series mode switching.
  - [ ] Sub-task: Add failing tests for search input debounce, loading skeleton, and result card rendering with poster/year/overview.
  - [ ] Sub-task: Add failing tests for empty results state and error handling on search failure.
- [ ] Task: Implement add-media search UI with shared movie/series search dialog and result previews.
  - [ ] Sub-task: Implement Command-palette-style search dialog (shadcn/ui Command or dedicated page) with media type tabs.
  - [ ] Sub-task: Implement result cards with poster thumbnail, title, year, overview, and "already in library" indicator.
- [ ] Task: Write Tests: Add add-media configuration tests for quality profile selection, monitoring defaults, and search-on-add toggle.
  - [ ] Sub-task: Add failing tests for add form rendering with profile dropdown and monitoring checkbox.
  - [ ] Sub-task: Add failing tests for add mutation payload construction and success/error feedback.
- [ ] Task: Implement add confirmation flow with quality profile, monitoring defaults, and search-on-add option.
  - [ ] Sub-task: Implement add-media sheet/dialog with metadata preview, quality profile select, monitoring toggle, and search-on-add checkbox.
  - [ ] Sub-task: Implement add mutation with toast feedback and redirect to library detail on success.
- [ ] Task: Write Tests: Add duplicate/conflict tests for already-added media detection and resolution actions.
  - [ ] Sub-task: Add failing tests for conflict banner rendering when media already exists in library.
  - [ ] Sub-task: Add failing tests for "Go to existing" and "Add anyway" resolution paths.
- [ ] Task: Implement conflict-resolution UX for duplicate media and partial metadata scenarios.
  - [ ] Sub-task: Implement duplicate detection check during add flow with conflict banner and resolution actions.
  - [ ] Sub-task: Implement graceful handling of partial/missing metadata with fallback display.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Media Discovery and Add Workflows' (Protocol in workflow.md)

## Phase 6: Library Views and Wanted Management
Implement high-density library browsing and a centralized wanted screen for missing media across TV and movies.

- [ ] Task: Write Tests: Add library list page tests for series and movies with monitoring badges, file presence indicators, and filter/sort controls.
  - [ ] Sub-task: Add failing tests for table/grid rendering with poster, title, status, quality, monitored state, and episode/file counts.
  - [ ] Sub-task: Add failing tests for filter (monitored/unmonitored/all) and sort (title/date added/status) controls.
- [ ] Task: Implement movie and series list pages with shared data table components and filter/sort controls.
  - [ ] Sub-task: Implement library data table with columns: poster, title, status, quality profile, monitored toggle, file presence, year.
  - [ ] Sub-task: Implement filter bar (status, monitored state) and sort controls with URL-synced query params.
- [ ] Task: Write Tests: Add library detail page tests for series (seasons/episodes grid) and movie (file/metadata detail) views.
  - [ ] Sub-task: Add failing tests for series detail rendering: season accordion, episode rows with file/air date/monitored state.
  - [ ] Sub-task: Add failing tests for movie detail rendering: metadata panel, file status, quality info, and action buttons.
- [ ] Task: Implement series and movie detail pages with deep-linked routes and operational action controls.
  - [ ] Sub-task: Implement series detail with season accordion, episode table (number, title, air date, file status, monitored toggle), and bulk actions.
  - [ ] Sub-task: Implement movie detail with metadata hero section, file status card, and action buttons (search, refresh, delete).
- [ ] Task: Write Tests: Add wanted screen tests for merged TV/movie missing items with manual search dispatch.
  - [ ] Sub-task: Add failing tests for wanted table rendering with media type indicator, title, missing context, and search action button.
  - [ ] Sub-task: Add failing tests for manual search action invoking release selection flow.
- [ ] Task: Implement unified Wanted screen combining missing episodes and movies with action controls.
  - [ ] Sub-task: Implement wanted data table with media type tabs or combined view, sortable by date/title/type.
  - [ ] Sub-task: Implement per-row "Search" action that navigates to release selection flow with media context.
- [ ] Task: Conductor - User Manual Verification 'Phase 6: Library Views and Wanted Management' (Protocol in workflow.md)

## Phase 7: Release Selection and Queue Handoff
Bridge search results to actionable release selection and torrent enqueue with feedback.

- [ ] Task: Write Tests: Add release result table tests for ranking cues (quality match, seeders, size) and selection behavior.
  - [ ] Sub-task: Add failing tests for result table columns: title, indexer, quality, size, seeders/leechers, age.
  - [ ] Sub-task: Add failing tests for quality-profile fit indicator (approved/rejected/warning) per result row.
- [ ] Task: Implement release selection UI for interactive search results.
  - [ ] Sub-task: Implement result data table with sortable columns and quality-fit badges (utilizing the new `searchCandidates` API).
  - [ ] Sub-task: Implement release detail panel (shadcn/ui Sheet) with full technical metadata: indexer flags, categories, magnet/download URLs, publish date.
- [ ] Task: Write Tests: Add queue handoff tests for grab action, optimistic state updates, and failure paths.
  - [ ] Sub-task: Add failing tests for grab button mutation invoking torrent add and showing success toast.
  - [ ] Sub-task: Add failing tests for grab failure rendering error detail and retry affordance.
- [ ] Task: Implement release-to-torrent handoff actions with optimistic feedback and queue navigation.
  - [ ] Sub-task: Implement grab action calling POST /api/releases/grab with release payload, showing optimistic "Queued" state.
  - [ ] Sub-task: Implement failure handling with error toast, preserved release context, and retry button.
  - [ ] Sub-task: Implement "View in Queue" link after successful grab.
- [ ] Task: Conductor - User Manual Verification 'Phase 7: Release Selection and Queue Handoff' (Protocol in workflow.md)

## Phase 8: Torrent Queue Operations and Lifecycle Visibility
Deliver torrent-client-grade transfer monitoring with polling-based real-time updates.

- [ ] Task: Write Tests: Add queue page tests for torrent status display (progress, speed, ratio, ETA, peers) and polling refresh behavior.
  - [ ] Sub-task: Add failing tests for queue row rendering with progress bar, download/upload speed, ratio, ETA, and status badge.
  - [ ] Sub-task: Add failing tests for polling-driven data refresh (TanStack Query refetchInterval) and stale-data reconciliation.
- [ ] Task: Implement queue UI with status-rich rows and lifecycle state transitions.
  - [ ] Sub-task: Implement queue data table with polling refresh (2s interval for active downloads, 10s for idle).
  - [ ] Sub-task: Implement lifecycle status badges: downloading (blue), seeding (green), paused (yellow), completed (cyan), importing (purple), error (red).
  - [ ] Sub-task: Implement expandable row details showing save path, peer list, and speed limits.
- [ ] Task: Write Tests: Add queue control tests for pause/resume/remove actions with optimistic update and rollback on failure.
  - [ ] Sub-task: Add failing tests for pause/resume toggle mutation and immediate UI state flip.
  - [ ] Sub-task: Add failing tests for remove action with confirmation dialog and rollback on API error.
- [ ] Task: Implement queue control actions with optimistic mutations and error recovery.
  - [ ] Sub-task: Implement inline action buttons: pause/resume toggle, remove (with shadcn/ui AlertDialog confirmation).
  - [ ] Sub-task: Implement optimistic mutation layer: instant UI update on action, rollback + error toast on failure.
- [ ] Task: Conductor - User Manual Verification 'Phase 8: Torrent Queue Operations and Lifecycle Visibility' (Protocol in workflow.md)

## Phase 9: Subtitle Variant Console (Bazarr-Inspired)
Expose per-variant audio/subtitle inventory and manual variant-targeted search/download operations.

- [ ] Task: Write Tests: Add subtitle inventory page tests for variant list, audio track table, subtitle track table, and missing subtitle state.
  - [ ] Sub-task: Add failing tests for variant selector rendering and track table display (language, codec, channels, forced, HI, default flags).
  - [ ] Sub-task: Add failing tests for missing subtitle grouping with language/forced/HI badges.
- [ ] Task: Implement subtitle inventory pages for movie and episode variants with detailed track inspection.
  - [ ] Sub-task: Implement variant selector (dropdown when multiple variants exist) and inventory detail panes.
  - [ ] Sub-task: Implement audio track table and subtitle track table with source indicator (embedded/external).
  - [ ] Sub-task: Implement missing subtitle summary with wanted state badges (pending/searching/downloaded/failed).
- [ ] Task: Write Tests: Add manual subtitle search/download tests enforcing explicit variant selection when multiple variants exist.
  - [ ] Sub-task: Add failing tests for variant-required validation when launching manual search with ambiguous context.
  - [ ] Sub-task: Add failing tests for search result rendering, candidate selection, and download mutation feedback.
- [ ] Task: Implement manual subtitle search and download flows with variant enforcement.
  - [ ] Sub-task: Implement manual search dialog requiring variant selection, showing subtitle candidates with provider, score, and language.
  - [ ] Sub-task: Implement download action mutation with history update and inventory refresh.
  - [ ] Sub-task: Implement subtitle history timeline view per variant.
- [ ] Task: Conductor - User Manual Verification 'Phase 9: Subtitle Variant Console (Bazarr-Inspired)' (Protocol in workflow.md)

## Phase 10: Settings Surface
Expose operational controls already supported by backend modules in a dedicated settings area.

- [ ] Task: Write Tests: Add settings page tests for download path display, torrent speed/ratio controls, and indexer sync interval visibility.
  - [ ] Sub-task: Add failing tests for settings section rendering and current value display.
  - [ ] Sub-task: Add failing tests for speed limit input mutation and validation.
- [ ] Task: Implement settings page with operational controls grouped by domain.
  - [ ] Sub-task: Implement download settings section: path display (/data layout), behavior visibility.
  - [ ] Sub-task: Implement torrent settings section: speed limit controls (download/upload), ratio controls where exposed.
  - [ ] Sub-task: Implement indexer settings section: default sync interval visibility, global priority display.
- [ ] Task: Conductor - User Manual Verification 'Phase 10: Settings Surface' (Protocol in workflow.md)

## Phase 11: Unified Dashboard and Operational Health
Build the command-center dashboard now that all data sources and target pages exist for deep linking.

- [ ] Task: Write Tests: Add dashboard summary card tests for media counts, wanted metrics, queue metrics, subtitle backlog, and recent activity.
  - [ ] Sub-task: Add failing tests for metric card rendering with correct aggregate values from real query hooks.
  - [ ] Sub-task: Add failing tests for card click-through navigation to correct filtered views (e.g., wanted card → /wanted, queue card → /activity).
- [ ] Task: Implement dashboard summary cards with live aggregate queries and deep links to filtered target views.
  - [ ] Sub-task: Implement aggregate query hooks: monitored media count, wanted count, active torrents, subtitle backlog, recent imports.
  - [ ] Sub-task: Implement metric card grid with responsive layout (2-col mobile, 3-col tablet, 4+ col desktop) and route linking.
- [ ] Task: Write Tests: Add health/event feed tests for warning/error prioritization, severity rendering, and action affordances.
  - [ ] Sub-task: Add failing tests for event list ordering by severity and recency.
  - [ ] Sub-task: Add failing tests for actionable error items with retry/navigate actions.
- [ ] Task: Implement health/events feed with actionable remediation and technical detail.
  - [ ] Sub-task: Implement event model adapters aggregating errors from indexer tests, torrent failures, import errors, and subtitle failures.
  - [ ] Sub-task: Implement event feed with severity icons, timestamps, action buttons (retry/navigate/dismiss), and technical detail toggle.
- [ ] Task: Conductor - User Manual Verification 'Phase 11: Unified Dashboard and Operational Health' (Protocol in workflow.md)

## Phase 12: Activity Center, E2E Journeys, and Quality Gates
Consolidate operational history, verify complete user journeys, and pass all quality gates.

- [ ] Task: Write Tests: Add activity timeline tests for cross-module operation history with correlation and drill-down.
  - [ ] Sub-task: Add failing tests for timeline rendering grouped by operation (add/search/download/import/subtitle) with status transitions.
  - [ ] Sub-task: Add failing tests for drill-down navigation from timeline items to source entity detail pages.
- [ ] Task: Implement cross-module activity center with structured operation history views.
  - [ ] Sub-task: Implement event model adapters for all module operations (media add, search execution, torrent lifecycle, import, subtitle download).
  - [ ] Sub-task: Implement activity page with timeline, filters (module type, date range, status), severity highlighting, and deep-link actions.
- [ ] Task: Write Tests: Add Playwright E2E tests for key user journeys across desktop and mobile viewports.
  - [ ] Sub-task: Add E2E test: Add movie → see in library → trigger search → select release → observe queue → confirm import.
  - [ ] Sub-task: Add E2E test: Add series → see in library → wanted episode → manual search → grab → queue progress.
  - [ ] Sub-task: Add E2E test: Configure indexer → test connectivity → verify in indexer list.
  - [ ] Sub-task: Add E2E test: Navigate subtitle inventory → manual search → download → verify history (with variant enforcement).
  - [ ] Sub-task: Add E2E tests for above journeys at mobile viewport (375px width).
- [ ] Task: Execute full quality gate suite and resolve regressions.
  - [ ] Sub-task: Run `CI=true npm test` (Vitest), `npm run test:coverage` (target >80%), `cd app && npm run lint`, and TypeScript type checks.
  - [ ] Sub-task: Run Playwright E2E suite against dev server.
  - [ ] Sub-task: Record coverage, lint, and type-check outcomes in task notes. Resolve all failures.
- [ ] Task: Final UX consistency pass: verify loading/empty/error states, toast messaging, and mobile usability across all pages.
  - [ ] Sub-task: Audit every page for missing loading skeletons, empty state messaging, and error recovery actions.
  - [ ] Sub-task: Audit mobile breakpoint usability for all core workflows (add, library, wanted, queue, indexers, subtitles).
- [ ] Task: Conductor - User Manual Verification 'Phase 12: Activity Center, E2E Journeys, and Quality Gates' (Protocol in workflow.md)
