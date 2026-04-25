# UI Stub Closure & Deduplication Specification

**Track:** ui_stub_closure_20260217
**Date:** 2026-02-17
**Status:** New
**Priority:** High
**Origin:** Post-archive audit of `prowlarr_ui_cloning_20260214`, `sonarr_ui_cloning_20260214`, `radarr_ui_cloning_20260214`, `bazarr_ui_cloning_20260214`, and cross-codebase sweep

---

## Overview

Audits of the archived prowlarr, sonarr, radarr, and bazarr UI cloning tracks plus a broader mediarr frontend sweep revealed several categories of incomplete or duplicated work that need to be resolved before the UI can be considered production-ready. This track addresses **stubs, mock data in production code, unwired UI handlers, dangling code, and duplicated patterns**.

This is a cleanup/closure track -- it does not add new features. Every task removes tech debt or replaces fake implementations with real ones.

---

## Functional Requirements

### FR-1: Eliminate Production Mock Data

The following pages import from `app/src/lib/mocks/` and render **hardcoded fake data** instead of calling real API endpoints. Each must be converted to use real API clients, or if no backend endpoint exists yet, the page must show an honest empty/loading state (not fake rows).

| Page File | Mock Import | What It Fakes |
|-----------|------------|---------------|
| `app/src/app/(shell)/wanted/MovieCutoffUnmetTab.tsx` | `wantedMocks.ts` | Entire cutoff-unmet movie list; query object is a literal `{ data: { items: mockCutoffUnmetMovies }, isPending: false }` |
| `app/src/app/(shell)/wanted/MovieMissingTab.tsx` | `wantedMocks.ts` | Entire missing movie list; same stubbed query pattern |
| `app/src/app/(shell)/calendar/page.tsx` | `calendarMocks.ts` | Calendar events via `getMockMoviesInRange()` |
| `app/src/app/(shell)/collections/page.tsx` | `collectionMocks.ts` | All collection data |
| `app/src/app/(shell)/add/discover/page.tsx` | `discoverMocks.ts` | Discover movie suggestions |
| `app/src/app/(shell)/library/movies/[id]/page.tsx` | (inline) | Hardcoded `mockMovieDetail` object (~90 lines) with fake Inception movie data; TODO comment says "Replace with actual API call" *(radarr track origin)* |

Additionally, mock data exists **outside** `lib/mocks/` in component-level mock files:

| Component File | Mock File | What It Fakes |
|---------------|-----------|---------------|
| `app/src/app/(shell)/add/import/page.tsx` | `components/import/mocks.ts` | `mockDetectedSeries` -- fake folder scan results; `scanFolder()` simulates 1.5s delay then returns mocks. `handleImport()` and `handleBulkImport()` also simulate delays with no backend call. |
| `app/src/components/import/ManualMatchModal.tsx` | `components/import/mocks.ts` | `mockSearchResults` -- fake series search results for manual matching |
| `app/src/components/search/InteractiveSearchModal.tsx` | `components/search/mocks.ts` | `MOCK_RELEASES` -- 4 fake release results; `searchReleases()` simulates 800ms delay, `handleGrab()` simulates 1000ms delay. Comments say "In production, this would call the actual API." |
| `app/src/components/primitives/FileBrowser.tsx` | (inline) | `MOCK_FILE_SYSTEM` constant with hardcoded folder structure (lines ~26-57) |
| `app/src/components/discover/DiscoverFilters.tsx` | `lib/mocks/discoverMocks.ts` | `mockGenres`, `mockCertifications`, `mockLanguages` -- hardcoded filter option lists *(radarr track origin)* |

**Acceptance criteria:**
- Zero imports from `app/src/lib/mocks/` in any file under `app/src/app/`.
- Zero imports from component-level `mocks.ts` files in production (non-test) code.
- Each page uses a real `useQuery` / API client call, OR displays an empty state / "No data available" message if the backend API is not ready.
- After all pages are converted, **delete the entire `app/src/lib/mocks/` directory** and the component-level mock files (`components/import/mocks.ts`, `components/search/mocks.ts`).
- The `MOCK_FILE_SYSTEM` in `FileBrowser.tsx` must be replaced with a real filesystem API call or the component must accept data via props.

### FR-2: Wire Empty Action Handlers

Several UI buttons have `onClick={() => {}}` or `onClick` handlers containing only `// TODO` comments. Each must either be wired to a real action, or the button must be removed/disabled with a clear rationale.

| File | Handler | What's Missing |
|------|---------|----------------|
| `app/src/app/(shell)/library/movies/[id]/page.tsx` | Refresh button (~line 212) | Should call movie refresh API |
| Same file | Interactive Search button (~line 225) | Should open search modal |
| Same file | Preview Rename button (~line 234) | Should open rename preview modal |
| Same file | Manage Files button (~line 243) | Should open file management modal |
| Same file | Edit Movie button (~line 256) | Should open edit movie modal |
| Same file | Edit File button (~line 270) | Should open edit file modal |
| Same file | Delete File button (~line 279) | Should call delete file API |
| `app/src/app/(shell)/wanted/MovieCutoffUnmetTab.tsx` | Toggle Monitored | Empty `() => {}` |
| Same file | Edit button | Empty `() => {}` |
| `app/src/app/(shell)/wanted/MovieMissingTab.tsx` | Toggle Monitored | Empty `() => {}` |
| Same file | Edit button | Empty `() => {}` |
| Same file | Delete button | Empty `() => {}` |

**Acceptance criteria:**
- Zero `// TODO` comments inside onClick handlers in production code.
- Every visible button either performs a real action or is rendered `disabled` with a tooltip explaining why.

### FR-2a: Remove `alert()` Placeholder Actions (Radarr-origin)

Several radarr-origin pages use browser `alert()` calls as placeholder implementations. These are disruptive UX and must be replaced.

| File | Handler | What It Does |
|------|---------|-------------|
| `app/src/app/(shell)/calendar/page.tsx` | iCal Link button (~line 154) | `alert('iCal export feature coming soon!')` |
| Same file | Search for Missing button (~line 159) | `alert('Search for missing coming soon!')` |
| Same file | RSS Sync button (~line 164) | `alert('RSS Sync coming soon!')` |
| `app/src/app/(shell)/collections/page.tsx` | Search collection action (~line 26) | `alert('In a real implementation, this would trigger a search...')` |

**Acceptance criteria:**
- Zero `alert()` calls in production page code.
- Each button either performs a real action, or is rendered `disabled` with a tooltip.

### FR-2b: Wire Sonarr-origin Stub Handlers

Additional unwired handlers discovered in the sonarr track audit:

| File | Handler | What's Missing |
|------|---------|----------------|
| `app/src/app/(shell)/add/import/page.tsx` | `scanFolder()` (~line 15) | Returns `mockDetectedSeries` after a fake 1.5s delay. Should call a real `POST /api/import/scan` endpoint. |
| Same file | `handleImport()` (~line 109) | Mock with 800ms delay, no backend call. Should call import API. |
| Same file | `handleBulkImport()` (~line 126) | Mock with 1200ms delay, no backend call. Should call bulk import API. |
| `app/src/components/search/InteractiveSearchModal.tsx` | `searchReleases()` (~line 104) | Uses `MOCK_RELEASES` with 800ms delay. Should call `api.releaseApi.searchCandidates()`. |
| Same file | `handleGrab()` (~line 130) | Simulates 1000ms delay. Should call `api.releaseApi.grabRelease()`. |
| `app/src/app/(shell)/add/discover/page.tsx` | `onRetry` callback (~line 140) | Empty `() => {}` no-op. Should retry the discover API call. |
| `app/src/app/(shell)/collections/page.tsx` | `onRetry` callback | Empty `() => {}` no-op. Should retry the collections API call. |
| `app/src/app/(shell)/system/updates/page.tsx` | `onPrev` / `onNext` pagination | Both are `() => {}` no-ops. Should paginate or be removed if not applicable. |

**Acceptance criteria:**
- Same as FR-2: zero TODO comments in onClick handlers; every button performs a real action or is disabled with a tooltip.

### FR-2c: Close Bazarr-origin Action Stubs and Wrong Wiring

Additional Bazarr-origin gaps discovered after archive include handlers that still show "coming soon" toasts, wrong parameter wiring, and wrong endpoint mapping.

| File | Handler / Logic | What's Missing |
|------|------------------|----------------|
| `app/src/app/(shell)/subtitles/series/[id]/page.tsx` | Episode Upload button (~line 234) | Still shows "Subtitle upload feature coming soon" toast instead of opening a real upload flow. |
| `app/src/components/subtitles/SubtitleUpload.tsx` | `handleUpload()` (~line 133) | Uses simulated progress with `setTimeout`; no API upload call. |
| `app/src/app/(shell)/subtitles/movies/[id]/page.tsx` | `handleDeleteTrack()` (~line 175) | Still shows "This feature is coming soon"; no delete API call. |
| `app/src/app/(shell)/subtitles/movies/[id]/page.tsx` | `ManualSearchModal` usage (~line 300) | Passes `episodeId={movieId}` with comment "for now"; wrong context for movie manual search. |
| `app/src/lib/api/subtitleApi.ts` | `syncMovie()`, `scanMovieDisk()`, `searchMovieSubtitles()` | Movie methods call `routeMap.subtitleSeries*` endpoints; movie actions are wired to series routes. |
| `app/src/app/(shell)/subtitles/movies/edit/page.tsx` | Bulk apply mutation (~line 53) | Still mock-only ("In a real implementation..."), no real API call. |

**Acceptance criteria:**
- No Bazarr subtitle action path shows "coming soon" when a user clicks a primary workflow action.
- Upload and delete actions call real API clients where endpoints exist; if backend endpoints are missing, controls are explicitly disabled with explanatory tooltip text (no fake success).
- Movie manual search uses movie context (not `episodeId` workaround).
- Movie subtitle actions do not call series endpoints.
- Mass edit applies real updates or is explicitly disabled with clear messaging.

### FR-3: Wire Notifications Toggle to Backend

**File:** `app/src/app/(shell)/settings/connect/page.tsx`, line 76

The `handleToggleEnabled` function currently does an optimistic React Query cache update but **never calls the backend API**. The comment says: `// Optimistic update - should call API in production`.

**Acceptance criteria:**
- `handleToggleEnabled` calls `notificationsApi.update(id, { enabled })` (or equivalent) and handles errors with a rollback.
- The comment is removed.

### FR-4: Replace Settings Stubs with Real Content

| Location | Issue | Required Fix |
|----------|-------|-------------|
| `app/src/app/(shell)/settings/settings-form.tsx:149-153` | "Download client configuration coming soon." rendered in an `opacity-50` section | Either wire to a real download client settings form, or remove the section entirely if download clients are managed elsewhere in Mediarr. |
| `app/src/app/(shell)/settings/indexers/page.tsx:27-33` | Proxy and category data is local-state-only (`useState`), never persists | Wire to backend API endpoints for proxy/category CRUD, OR document that these are intentionally frontend-only with a save/load to localStorage. |

**Acceptance criteria:**
- No "coming soon" text in any settings page.
- Proxy/category data either persists to the backend or is explicitly documented as browser-local with appropriate UX (e.g., a warning that data won't sync across devices).

### FR-4c: Replace Bazarr Subtitle Settings and List Placeholders

| Location | Issue | Required Fix |
|----------|-------|-------------|
| `app/src/app/(shell)/settings/subtitles/page.tsx` | Query and mutation are stubbed with inline comments and default values ("when backend is ready", "for now, return default values") | Wire to a real subtitle settings API client if endpoint exists, or persist via localStorage with an explicit browser-local notice. |
| Same file | Default language profile select options are hardcoded (`English`, `Spanish`, `French`) | Populate from `languageProfilesApi.listProfiles()` instead of hardcoded options. |
| `app/src/app/(shell)/subtitles/movies/page.tsx` and `app/src/app/(shell)/subtitles/movies/[id]/page.tsx` | Hardcoded placeholder subtitle metadata (`languageProfile: 'Default'`, fallback audio languages, static language profile badge) | Replace with data from real API payloads, or render explicit "Unavailable" state without fake defaults. |

**Acceptance criteria:**
- No "backend is ready"/"for now" stub comments remain in subtitle settings page logic.
- Settings save flow writes to a real persistence path (backend or explicit local browser storage).
- Subtitle list/detail pages do not present fabricated defaults as real metadata.

### FR-4b: Remove Debug Logging from Production Code

**Files:**
- `app/src/lib/performance/monitor.ts` -- contains `console.log('[Performance]...')` calls
- `app/src/lib/api/optimizer.ts` -- contains 6 `console.log('[Cache]...')` statements for cache debugging

**Acceptance criteria:**
- Zero `console.log` statements in `app/src/lib/`. Replace with either: (a) a proper logger that is silent in production, or (b) remove them entirely.

### FR-5: Remove or Integrate Orphaned Code

| Item | Location | Issue |
|------|----------|-------|
| `DynamicForm.tsx` | `app/src/app/(shell)/indexers/DynamicForm.tsx` | Standalone form component that duplicates logic in `AddIndexerModal` / `EditIndexerModal` but is not imported anywhere. |
| Mock directory | `app/src/lib/mocks/` (5 files) | After FR-1, this directory should be empty and deletable. |
| Import mock re-exports | `app/src/components/import/types.ts` line 46 | Re-exports `mockDetectedSeries` and `mockSearchResults` from `./mocks` with a TODO comment. After FR-1, remove this re-export line. |
| Component-level mock files | `app/src/components/import/mocks.ts`, `app/src/components/search/mocks.ts` | After FR-1 and FR-2b, these files should only be imported by test files, or deleted entirely. |

**Acceptance criteria:**
- `DynamicForm.tsx` is either integrated into the modal flow (replacing inline field rendering) or deleted.
- `app/src/lib/mocks/` directory does not exist.
- No production (non-test) file imports from any `mocks.ts` file.
- The TODO comment in `components/import/types.ts` is removed.

### FR-6: Consolidate Duplicated Patterns

The codebase has four near-identical implementations of the same patterns. Consolidate each into a single shared abstraction.

#### FR-6a: Shared `healthStatus()` Utility

**Duplicated in:**
- `app/src/app/(shell)/indexers/page.tsx` (lines ~78-89)
- `app/src/app/(shell)/settings/downloadclients/page.tsx` (lines ~32-43)

Both are identical functions that map `failureCount` to `'completed' | 'warning' | 'error'`.

**Required:** Extract to `app/src/lib/health.ts` and import in both files.

#### FR-6b: Shared `testResultSchema` Zod Object

**Duplicated in:**
- `app/src/lib/api/indexerApi.ts`
- `app/src/lib/api/downloadClientsApi.ts`
- `app/src/lib/api/applicationsApi.ts`

All three define an identical `testResultSchema` with `z.object({ success, message, diagnostics })`.

**Required:** Extract to `app/src/lib/api/shared-schemas.ts` and import in all three files.

#### FR-6c: Generic CRUD API Factory (Optional / Stretch)

**Duplicated in:** `indexerApi.ts`, `downloadClientsApi.ts`, `applicationsApi.ts`, `notificationsApi.ts` -- all implement `list/create/update/remove/test/testDraft` with the same structure.

**Required:** Create a `createCrudApi<TItem, TCreate, TTestResult>(client, basePath, schemas)` factory in `app/src/lib/api/createCrudApi.ts`. Refactor at least two of the four API clients to use it. The remaining two can be migrated in follow-up work.

#### FR-6d: Generic Configurable-Item Modal (Optional / Stretch)

**Duplicated in:** `AddIndexerModal`, `AddDownloadClientModal`, `AddNotificationModal`, `AddProfileModal` -- all follow the same preset-selection → configure-fields → test-connection → save flow.

**Required:** Extract the shared modal skeleton into `app/src/components/settings/AddConfigurableItemModal.tsx` with slots for preset rendering and field rendering. Refactor at least `AddIndexerModal` and `AddDownloadClientModal` to use it. The remaining modals can be migrated in follow-up work.

#### FR-6e: Shared Subtitle History/Blacklist View Helpers

**Duplicated in:**
- `app/src/app/(shell)/subtitles/history/series/page.tsx`
- `app/src/app/(shell)/subtitles/history/movies/page.tsx`
- `app/src/app/(shell)/subtitles/blacklist/series/page.tsx`
- `app/src/app/(shell)/subtitles/blacklist/movies/page.tsx`

These pages duplicate the same relative-time formatter and very similar pagination state handling.

**Required:** Extract shared helpers (e.g., `formatRelativeTime`, subtitle table pagination state helpers) into `app/src/lib/subtitles/` and use them across these views.

---

## Non-Functional Requirements

- **No new features.** This track only closes gaps and removes duplication.
- **Test coverage:** Every changed file must maintain or improve its existing test coverage. New shared utilities (health.ts, shared-schemas.ts, createCrudApi.ts) must have >80% coverage.
- **No regressions:** All existing tests must continue to pass after each task.

---

## Out of Scope

- Adding new pages or views
- Backend API implementation (if a backend endpoint doesn't exist, the UI should show an empty state -- not a mock)
- Refactoring the movie detail page beyond wiring its existing buttons
- Mobile-specific redesigns
- Performance optimization
