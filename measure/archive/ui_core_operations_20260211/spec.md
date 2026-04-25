# Specification: Track 7C - UI Foundation & Core Operations

## Overview
This track builds Mediarr's operational frontend foundation and core day-to-day workflows: design system, app shell/navigation, data-fetching architecture, indexer management, add-media flows, library browsing, wanted views, and release selection/queue handoff.

## Functional Requirements

### FR-1: Design Token Specification
Before implementing components, define a concrete design token reference:
- **Color ramps:** Surface (background layers 0-3), text (primary, secondary, muted, inverse), accent (primary, success, warning, danger, info), semantic states (monitored, wanted, downloading, seeding, completed, error).
- **Spacing scale:** 4px base grid (4, 8, 12, 16, 24, 32, 48, 64).
- **Typography hierarchy:** Display, heading (h1-h4), body, caption, mono. Font families: Geist Sans (body), Geist Mono (data/code). Size scale from 12px to 32px.
- **Border radius:** None (0), sm (4px), md (8px), lg (12px), full (9999px).
- **Elevation/shadow:** 3 levels for cards, dialogs, and popovers.
- All tokens defined as CSS custom properties on `:root` for the Modern Dark theme.

### FR-2: Data-Fetching and Cache Architecture
Establish TanStack Query conventions used by all pages:
- **Query key conventions:** Structured as `[domain, ...params]` (e.g., `['series', 'list', { page, filters }]`, `['series', 'detail', id]`).
- **Stale time defaults:** 30s for lists, 60s for details, 5s for queue data.
- **Cache invalidation rules:** `grabRelease` invalidates `['torrents']` and `['media', 'wanted']`. Import events invalidate `['series', 'detail']` or `['movies', 'detail']`. Settings mutations invalidate `['settings']`.
- **Optimistic update pattern:** Standard pattern for mutations (monitored toggle, indexer enable/priority, queue pause/resume) — update cache immediately, rollback on error, show toast on failure.
- **SSE integration:** `eventsApi` SSE stream updates TanStack Query cache directly — `torrent:stats` events update `['torrents']` cache, `activity:new` events invalidate `['activity']`, `health:update` events invalidate `['health']`.
- **Standard query wrapper:** A `useApiQuery` hook that combines TanStack Query with the typed SDK, providing consistent loading/error/empty state handling.

### FR-3: URL Routing Structure
Define the URL hierarchy used by navigation, breadcrumbs, and deep links:
- `/` — Dashboard (Track 7E)
- `/library/series` — Series list
- `/library/series/:id` — Series detail (seasons/episodes)
- `/library/movies` — Movie list
- `/library/movies/:id` — Movie detail
- `/wanted` — Unified wanted view
- `/queue` — Torrent queue (Track 7D)
- `/activity` — Activity timeline (Track 7E)
- `/indexers` — Indexer management
- `/subtitles` — Subtitle console (Track 7D)
- `/settings` — Settings (Track 7E)
- `/add` — Add media search

### FR-4: App Shell, Navigation, and Global UX Primitives
- Implement persistent shell with sidebar navigation (desktop) and bottom bar (mobile) using the route hierarchy from FR-3.
- Include breadcrumb system derived from route segments.
- Global command palette (Cmd/Ctrl+K) for quick navigation and search.
- Standardized loading (skeleton), empty (illustration + message), and error (message + retry action) state components.
- Route-level error boundaries with recovery actions.
- Global toast notification system for mutation feedback.

### FR-5: App Shell, Navigation, and Global UX Primitives Design System and Theme Tokens
- Implement Modern Dark theme tokens from FR-1 as CSS custom properties.
- Provide reusable primitives:
  - Status badges (monitored, wanted, downloading, seeding, completed, error)
  - Progress bars (determinate and indeterminate)
  - Metric cards (value, label, trend indicator, deep-link)
  - Data tables (sortable columns, pagination controls, row actions, responsive overflow)
  - Empty/error panels
  - Skeleton loaders matching each component shape
- Ensure responsive behavior from mobile-first breakpoints (375px, 640px, 1024px, 1280px).

### FR-6: Indexer Management Console
- List, create, edit, delete indexers.
- Inline state controls for enabled/priority with optimistic updates.
- Test indexer action with diagnostic output and remediation hints.
- Health snapshot status indicator per indexer (from 7A health data).

### FR-7: Add Media Workflows
- Unified movie/series add flow with metadata preview.
- Configure quality profile and monitoring defaults.
- Optional immediate search trigger (search-on-add).
- Duplicate/conflict handling with explicit resolution options ("Go to existing" / "Add anyway").
- Already-added indicators in search results.

### FR-8: Library List and Detail Views
- Movie and series list views using shared data table patterns with pagination, sorting, and filtering.
- Series detail with seasons/episodes grid, monitored toggles per season/episode, file status indicators.
- Movie detail with file/metadata status and action panel.
- Deep-linked entity routes per FR-3.

### FR-9: Wanted and Release Selection
- Centralized wanted view for missing TV episodes and movies with unified pagination.
- Manual search launch from wanted rows.
- Candidate result table with ranking cues (indexer, size, seeders, age) and quality-fit badges.
- Grab action with queue handoff feedback (success toast + navigate to queue, or error toast with retry).

### FR-10: Data Seeding and Development Fixtures
- Create MSW (Mock Service Worker) handler definitions matching every 7B API endpoint for frontend development.
- Define mock data factories for: series (with seasons/episodes), movies, torrents (various lifecycle states), indexers (with health snapshots), activity events, and settings.
- MSW handlers use the same envelope shapes and pagination conventions defined in 7B.
- Factories produce deterministic data for tests and randomized data for visual development.

## Non-Functional Requirements
- **Responsiveness:** Core workflows remain usable at 375px viewport width.
- **Accessibility:** Keyboard navigation for primary actions, semantic HTML structure, focus management for dialogs and command palette.
- **Consistency:** Shared components are reused between TV and movie surfaces. No ad-hoc loading/error patterns — every page uses the standard wrapper.
- **Performance:** Initial page load under 3s on simulated 4G. List views with 100+ items maintain 60fps scroll.

## Acceptance Criteria
- [ ] Design tokens are defined as CSS custom properties with documented color/spacing/type/radius/shadow scales.
- [ ] TanStack Query conventions, cache invalidation rules, and SSE integration are established and documented.
- [ ] URL routing structure is implemented with working navigation and breadcrumbs.
- [ ] App shell and responsive navigation are in place.
- [ ] Indexer CRUD/test workflows are fully operable from UI.
- [ ] Users can add movie/series entries with profile and monitor defaults, with duplicate detection.
- [ ] Library list/detail views are operational for both movies and series with pagination/sort/filter.
- [ ] Wanted page launches manual search and supports release selection and grab with queue handoff feedback.
- [ ] Error/loading/empty states are standardized across all implemented pages.
- [ ] MSW mock handlers and data factories exist for all 7B endpoints.

## Out of Scope
- Queue lifecycle console and subtitle console (Track 7D).
- Dashboard, activity center, and settings UI (Track 7E).
- E2E hardening and Playwright journeys (Track 7F).
