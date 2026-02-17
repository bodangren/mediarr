# UI Stub Closure & Deduplication - Implementation Plan

**Track:** ui_stub_closure_20260217
**Status:** New
**Created:** 2026-02-17

---

## Overview

This plan addresses stubs, mock data in production code, unwired UI handlers, orphaned code, and duplicated patterns found during the post-archive audit of the prowlarr, sonarr, radarr, and bazarr UI cloning tracks plus a broader codebase sweep. Every task is a cleanup -- no new features.

---

## Phase 1: Extract Shared Utilities (Deduplication Foundation)

**Objective:** Create shared modules that later phases will use. This phase must come first because Phase 2 and 3 tasks will import from these new shared files.

### Tasks

- [x] **Task 1.1: Extract `healthStatus()` to shared utility**
    - [ ] Create file `app/src/lib/health.ts`
    - [ ] Move the `healthStatus()` function from `app/src/app/(shell)/indexers/page.tsx` (lines ~78-89) into it. The function signature should be:
      ```typescript
      export function healthStatus(row: { health?: { failureCount?: number } }): 'completed' | 'warning' | 'error'
      ```
      Logic: if `failureCount >= 3` return `'error'`; if `failureCount > 0` return `'warning'`; else return `'completed'`.
    - [ ] Write tests in `app/src/lib/health.test.ts` covering: failureCount=0 (completed), failureCount=1 (warning), failureCount=3 (error), failureCount=undefined (completed), health=undefined (completed).
    - [ ] Update `app/src/app/(shell)/indexers/page.tsx`: delete the local `healthStatus` function, add `import { healthStatus } from '@/lib/health'`.
    - [ ] Update `app/src/app/(shell)/settings/downloadclients/page.tsx`: delete the local `healthStatus` function, add the same import.
    - [ ] Run existing tests for both pages to confirm no regressions:
      ```bash
      CI=true npm run test --workspace=app -- src/app/\(shell\)/indexers/page.test.tsx src/app/\(shell\)/settings/downloadclients/page.test.tsx src/lib/health.test.ts
      ```

- [x] **Task 1.2: Extract `testResultSchema` to shared schemas**
    - [ ] Create file `app/src/lib/api/shared-schemas.ts`
    - [ ] Move the duplicated `testResultSchema` zod object into it. The schema is:
      ```typescript
      import { z } from 'zod';
      export const testResultSchema = z.object({
        success: z.boolean(),
        message: z.string(),
        diagnostics: z.object({
          remediationHints: z.array(z.string()),
        }).optional(),
        healthSnapshot: z.unknown().nullable().optional(),
      });
      export type TestResult = z.infer<typeof testResultSchema>;
      ```
    - [ ] Write tests in `app/src/lib/api/shared-schemas.test.ts` validating: a valid success payload, a valid failure payload with diagnostics, a payload missing optional fields, and an invalid payload (missing `success`).
    - [ ] Update `app/src/lib/api/indexerApi.ts`: remove the local `testResultSchema` definition and add `import { testResultSchema } from './shared-schemas'`.
    - [ ] Update `app/src/lib/api/downloadClientsApi.ts`: same change.
    - [ ] Update `app/src/lib/api/applicationsApi.ts`: same change.
    - [ ] Run existing API tests to confirm no regressions:
      ```bash
      CI=true npm run test --workspace=app -- src/lib/api/indexerApi.test.ts src/lib/api/downloadClientsApi.test.ts src/lib/api/applicationsApi.test.ts src/lib/api/shared-schemas.test.ts
      ```

- [ ] Task: Conductor - User Manual Verification 'Phase 1'

---

## Phase 2: Replace Mock Data with Real API Calls

**Objective:** Eliminate all imports from `app/src/lib/mocks/` and component-level `mocks.ts` files in production (non-test) code. Each page must use a real `useQuery` hook with its API client, or render an empty state if the backend endpoint is not available.

### Tasks

- [ ] **Task 2.1: Wire `wanted/MovieMissingTab.tsx` to real API**
    - [ ] Open `app/src/app/(shell)/wanted/MovieMissingTab.tsx`.
    - [ ] Remove the import: `import { mockMissingMovies } from '@/lib/mocks/wantedMocks'`.
    - [ ] Remove the hardcoded `const cutoffUnmetQuery = { data: { items: mockMissingMovies ... } }` stub.
    - [ ] Check if a wanted/missing API client exists in `app/src/lib/api/`. If it does, use `useQuery(['wanted', 'missing'], () => wantedApi.listMissing(...))`. If it does NOT exist, create a minimal `app/src/lib/api/wantedApi.ts` with a `listMissing(page, pageSize)` function that calls `GET /api/wanted/missing` (match existing API client patterns in the codebase).
    - [ ] Replace the mock query object with the real `useQuery` result.
    - [ ] Handle loading state: show a `<LoadingIndicator />` or skeleton when `isPending`.
    - [ ] Handle error state: show an error alert when `isError`.
    - [ ] Handle empty state: show "No missing movies found" when the list is empty.
    - [ ] Update tests in the corresponding test file: mock the API call instead of relying on the mock data import.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/wanted/`

- [ ] **Task 2.2: Wire `wanted/MovieCutoffUnmetTab.tsx` to real API**
    - [ ] Open `app/src/app/(shell)/wanted/MovieCutoffUnmetTab.tsx`.
    - [ ] Remove the import: `import { mockCutoffUnmetMovies, formatFileSize } from '@/lib/mocks/wantedMocks'`.
    - [ ] If `formatFileSize` is needed, move it to `app/src/lib/format.ts` (check if an equivalent already exists there). Import from the new location.
    - [ ] Remove the hardcoded query stub.
    - [ ] Use `useQuery(['wanted', 'cutoff-unmet'], () => wantedApi.listCutoffUnmet(...))` (add `listCutoffUnmet` to `wantedApi.ts` if created in Task 2.1, otherwise create the file now).
    - [ ] Handle loading, error, and empty states (same pattern as Task 2.1).
    - [ ] Update tests.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/wanted/`

- [x] **Task 2.3: Wire `calendar/page.tsx` to real API**
    - [x] Open `app/src/app/(shell)/calendar/page.tsx`.
    - [x] Remove `import { getMockMoviesInRange } from '@/lib/mocks/calendarMocks'`.
    - [x] Check if a calendar API client exists in `app/src/lib/api/calendarApi.ts`. If so, use it. If not, create one with a `getEvents(start: string, end: string)` function calling `GET /api/calendar?start=...&end=...`.
    - [x] Replace the mock call with a real `useQuery` keyed on the date range.
    - [x] Handle loading, error, and empty states.
    - [x] Update tests.
    - [x] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/calendar/`

- [x] **Task 2.4: Wire `collections/page.tsx` to real API**
    - [x] Open `app/src/app/(shell)/collections/page.tsx`.
    - [x] Remove `import { mockCollections } from '@/lib/mocks/collectionMocks'`.
    - [x] Check if a collection API client exists. If not, create `app/src/lib/api/collectionApi.ts` with `list()` calling `GET /api/collections`.
    - [x] Replace mock data with real `useQuery`.
    - [x] Handle loading, error, and empty states.
    - [x] Update tests.
    - [x] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/collections/`

- [x] **Task 2.5: Wire `add/discover/page.tsx` and `DiscoverFilters.tsx` to real API**
    - [x] Open `app/src/app/(shell)/add/discover/page.tsx`.
    - [x] Remove `import { mockDiscoverMovies } from '@/lib/mocks/discoverMocks'`.
    - [x] Check if a discover API client exists. If not, create `app/src/lib/api/discoverApi.ts` with `listRecommendations()` calling `GET /api/discover/movies`.
    - [x] Replace mock data with real `useQuery`.
    - [x] Handle loading, error, and empty states.
    - [x] Also fix the no-op `onRetry={() => {}}` callback -- wire it to `refetch()` from the query.
    - [x] Open `app/src/components/discover/DiscoverFilters.tsx`. *(radarr track origin)*
    - [x] Remove imports of `mockGenres`, `mockCertifications`, `mockLanguages` from `@/lib/mocks/discoverMocks`.
    - [x] If a genre/certification/language API exists, fetch filter options via `useQuery`. If not, either hardcode a reasonable static list directly in the component (not imported from mocks), or accept options as props from the parent.
    - [x] Update tests.
    - [x] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/add/ src/components/discover/`

- [ ] **Task 2.6: Wire `add/import/page.tsx` to real API** *(sonarr track origin)*
    - [ ] Open `app/src/app/(shell)/add/import/page.tsx`.
    - [ ] Remove `import { mockDetectedSeries } from '@/components/import/types'`.
    - [ ] **`scanFolder()` function (line ~15):** Currently returns `mockDetectedSeries` after a fake 1.5s delay. Replace with a real API call. Check if an import/scan API exists. If not, create `app/src/lib/api/importApi.ts` with `scanFolder(path: string)` calling `POST /api/import/scan { path }`. If the backend doesn't exist yet, show an empty state with a message "Folder scanning requires backend support" instead of fake data.
    - [ ] **`handleImport()` function (line ~109):** Currently a mock with 800ms delay. Wire to a real `importApi.importSeries(series)` call, or disable the import button with a tooltip if the backend doesn't exist.
    - [ ] **`handleBulkImport()` function (line ~126):** Currently a mock with 1200ms delay. Same approach as `handleImport()`.
    - [ ] Update tests.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/add/import/`

- [x] **Task 2.7: Wire `InteractiveSearchModal.tsx` to real API** *(sonarr track origin)*
    - [x] Open `app/src/components/search/InteractiveSearchModal.tsx`.
    - [x] Remove `import { MOCK_RELEASES } from './mocks'`.
    - [x] **`searchReleases()` function (line ~104):** Currently uses `MOCK_RELEASES` with 800ms delay. The comments say "In production, this would call the actual API: `api.releaseApi.searchCandidates({ seriesId, episodeId })`". Wire this to the real `releaseApi.searchCandidates()` call. The `releaseApi` already exists -- check `app/src/lib/api/releaseApi.ts`.
    - [x] **`handleGrab()` function (line ~130):** Currently simulates 1000ms delay. Wire to `releaseApi.grabRelease(release)`. Handle errors with a toast.
    - [x] Remove all comments that say "In development, use mock data" or "In production, this would call...".
    - [x] Handle loading state during search (already has `isLoading` state, just needs real timing).
    - [x] Handle error state if the API fails.
    - [x] Update tests.
    - [x] Run tests: `CI=true npm run test --workspace=app -- src/components/search/`

- [x] **Task 2.8: Wire `FileBrowser.tsx` to real filesystem API** *(sonarr track origin)*
    - [x] Open `app/src/components/primitives/FileBrowser.tsx`.
    - [x] Find `MOCK_FILE_SYSTEM` constant (lines ~26-57) -- a hardcoded folder tree.
    - [x] Check if a filesystem browsing API exists (`GET /api/filesystem?path=...` or similar). Look in `server/src/api/routes/` and `app/src/lib/api/`.
    - [x] **If the API does NOT exist:** Refactor the component to accept `entries` as a prop instead of using the hardcoded constant. This way parent components can provide data (real or empty). Remove the `MOCK_FILE_SYSTEM` constant. Update `PathInput` or any parent that renders `FileBrowser` to pass an empty array or fetch from an API when one becomes available.
    - [x] Update tests.
    - [x] Run tests: `CI=true npm run test --workspace=app -- src/components/primitives/FileBrowser`

- [ ] **Task 2.9: Delete component-level mock files and `lib/mocks/` directory**
    - [ ] Verify no production file imports from any mock file:
      ```bash
      grep -r "from.*mocks" app/src/app/ app/src/components/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v "__test__" | grep -v ".spec."
      ```
      If any matches remain, fix them first.
    - [ ] Remove the re-export line from `app/src/components/import/types.ts` (line ~46): `export { mockDetectedSeries, mockSearchResults } from './mocks'`. Also remove the associated TODO comment.
    - [ ] Check if test files import from `app/src/components/import/mocks.ts` or `app/src/components/search/mocks.ts`. If so, move the mock data inline into the test files or into `__fixtures__` directories next to each test.
    - [ ] Delete: `app/src/lib/mocks/` (entire directory, 5 files: `wantedMocks.ts`, `calendarMocks.ts`, `collectionMocks.ts`, `discoverMocks.ts`, `activityMocks.ts`).
    - [ ] Delete: `app/src/components/import/mocks.ts` (if no tests depend on it, or after moving data to test fixtures).
    - [ ] Delete: `app/src/components/search/mocks.ts` (same).
    - [ ] Run full test suite:
      ```bash
      CI=true npm run test --workspace=app
      ```

- [x] **Task 2.10: Replace Bazarr subtitle upload simulations with real API wiring** *(bazarr track origin)*
    - [x] Open `app/src/components/subtitles/SubtitleUpload.tsx`.
    - [x] Remove the simulated upload implementation (`setTimeout` progress loop and "In production, this would call the actual API" comment).
    - [x] Check for an existing subtitle upload endpoint/client method.
      - [x] **If endpoint exists:** add `subtitleApi.uploadSubtitle(...)` and call it per file upload.
      - [x] **If endpoint does NOT exist:** disable upload submit action and show explicit helper text: "Subtitle upload requires backend support" (no fake success state).
    - [x] Open `app/src/app/(shell)/subtitles/series/[id]/page.tsx`.
    - [x] Replace the episode Upload button "coming soon" toast handler with a real upload flow (modal/dialog using `SubtitleUpload`), or disable button with tooltip if backend upload endpoint is unavailable.
    - [x] Update tests for `SubtitleUpload` and series subtitle detail page.
    - [x] Run tests: `CI=true npm run test --workspace=app -- src/components/subtitles/SubtitleUpload.test.tsx src/app/\(shell\)/subtitles/series/`

- [ ] **Task 2.11: Replace Bazarr movie mass edit mock mutation with real persistence** *(bazarr track origin)*
    - [ ] Open `app/src/app/(shell)/subtitles/movies/edit/page.tsx`.
    - [ ] Remove the mock mutation implementation that returns `{ updatedCount }` with the comment "In a real implementation, this would call an API endpoint".
    - [ ] Wire `Apply Changes` to a real API path:
      - [ ] Prefer existing `movieApi.update(id, {...})` in a batch loop if no bulk endpoint exists.
      - [ ] If bulk endpoint exists, use it.
      - [ ] If no persistence endpoint exists, disable apply action with tooltip and remove fake success toast behavior.
    - [ ] Ensure selected profile value maps to a real profile identifier (avoid UI-only string mapping).
    - [ ] Update tests.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/subtitles/movies/edit/`

- [ ] Task: Conductor - User Manual Verification 'Phase 2'

---

## Phase 3: Wire Empty Action Handlers

**Objective:** Every visible button must either perform a real action or be explicitly disabled. Zero `// TODO` comments inside onClick handlers.

### Tasks

- [x] **Task 3.1: Wire movie detail page action buttons**
    - [x] Open `app/src/app/(shell)/library/movies/[id]/page.tsx`.
    - [x] **Replace mock movie data:** The component uses a `mockMovieDetail` object (lines ~28-117). Replace with a real `useQuery(['movie', id], () => movieApi.getById(id))` call. If `movieApi.getById` does not exist, create it in `app/src/lib/api/movieApi.ts` calling `GET /api/movies/{id}`. Handle loading/error states.
    - [x] **Refresh button (~line 212):** Wire to `movieApi.refresh(id)` calling `POST /api/movies/{id}/refresh`. On success, invalidate the movie query. If this endpoint doesn't exist, add a `refresh(id)` stub to the API client that calls the endpoint (the backend can return 501 -- the UI should show a toast).
    - [x] **Interactive Search button (~line 225):** Wire to open the `InteractiveSearchModal` (now wired to real API in Task 2.7). Pass the movie ID. Remove the TODO comment.
    - [x] **Preview Rename button (~line 234):** If a rename preview API exists, wire it. If not, set the button to `disabled` with `title="Rename preview not yet available"`. Remove the TODO comment.
    - [x] **Manage Files button (~line 243):** Same approach -- wire if API exists, otherwise `disabled` with tooltip. Remove TODO.
    - [x] **Edit Movie button (~line 256):** Wire to open an edit modal or navigate to an edit route. Check if an `EditMovieModal` exists. If not, create a minimal one that pre-populates a form and calls `movieApi.update(id, data)`. Remove TODO.
    - [x] **Edit File / Delete File buttons (~lines 270, 279):** Wire to file-level API calls if they exist. Otherwise disable with tooltip. Remove TODOs.
    - [x] Update tests to cover the wired handlers (mock API calls, verify they're invoked on click).
    - [x] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/library/movies/`

- [ ] **Task 3.2: Wire wanted tab action handlers**
    - [ ] Open `app/src/app/(shell)/wanted/MovieCutoffUnmetTab.tsx`.
    - [ ] **Toggle Monitored:** Wire to `movieApi.update(id, { monitored: !current })`. On success, invalidate the wanted query. Remove the TODO comment. If `movieApi.update` doesn't exist, add it.
    - [ ] **Edit button:** Wire to open an edit modal or navigate to the movie detail page. Remove the TODO.
    - [ ] Open `app/src/app/(shell)/wanted/MovieMissingTab.tsx`.
    - [ ] **Toggle Monitored:** Same as above.
    - [ ] **Edit button:** Same as above.
    - [ ] **Delete button:** Wire to `movieApi.remove(id)` with a confirmation dialog. Remove the TODO.
    - [ ] Update tests for both tab components.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/wanted/`

- [ ] **Task 3.3: Wire notifications toggle to backend API**
    - [ ] Open `app/src/app/(shell)/settings/connect/page.tsx`.
    - [ ] Find `handleToggleEnabled` (line ~76).
    - [ ] Change it to:
      1. Optimistically update the cache (keep existing logic).
      2. Call `notificationsApi.update(notification.id, { enabled })`.
      3. On error, roll back the cache update and show an error toast.
    - [ ] Remove the comment `// Optimistic update - should call API in production`.
    - [ ] Write a test that verifies `notificationsApi.update` is called when the toggle is clicked, and that a failed API call rolls back the cache.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/settings/connect/`

- [x] **Task 3.4: Fix remaining no-op handlers** *(sonarr track origin)*
    - [x] Open `app/src/app/(shell)/collections/page.tsx`. Find the `onRetry={() => {}}` no-op. Wire to the `refetch()` function from the collections query (created in Task 2.4). If the page still uses mock data at this point, skip -- but verify it was handled in Phase 2.
    - [x] Open `app/src/app/(shell)/system/updates/page.tsx`. Find the `onPrev: () => {}` and `onNext: () => {}` no-ops in the pagination. Either:
      - Wire to actual pagination state if the updates page supports pagination.
      - Remove the pagination controls entirely if the updates list is always a single page.
    - [x] Run tests:
      ```bash
      CI=true npm run test --workspace=app -- src/app/\(shell\)/collections/ src/app/\(shell\)/system/updates/
      ```

- [x] **Task 3.5: Remove `alert()` placeholder actions** *(radarr track origin)*
    - [x] Open `app/src/app/(shell)/calendar/page.tsx`.
    - [x] **iCal Link button (~line 154):** Remove the `alert('iCal export feature coming soon!')` call. If an iCal export API exists, wire to it. Otherwise, set the button to `disabled` with `title="iCal export not yet available"`.
    - [x] **Search for Missing button (~line 159):** Remove the `alert('Search for missing coming soon!')` call. Wire to a bulk search API call if one exists (check for a command-based search like `POST /api/command { name: 'missingMovieSearch' }`). Otherwise disable with tooltip.
    - [x] **RSS Sync button (~line 164):** Remove the `alert('RSS Sync coming soon!')` call. Wire to RSS sync command if it exists. Otherwise disable with tooltip.
    - [x] Open `app/src/app/(shell)/collections/page.tsx`.
    - [x] **Search collection handler (~line 26):** Remove the `alert('In a real implementation, this would trigger a search...')` call. Wire to a collection search API if one exists. Otherwise disable the search action with tooltip.
    - [x] Update tests.
    - [x] Run tests:
      ```bash
      CI=true npm run test --workspace=app -- src/app/\(shell\)/calendar/ src/app/\(shell\)/collections/
      ```

- [ ] **Task 3.6: Close Bazarr subtitle detail action stubs** *(bazarr track origin)*
    - [ ] Open `app/src/app/(shell)/subtitles/movies/[id]/page.tsx`.
    - [ ] Replace `handleDeleteTrack` "This feature is coming soon" behavior with real delete action if endpoint exists.
      - [ ] If delete endpoint does not exist, disable delete action in `SubtitleTrackList` with tooltip (do not show fake success/info toasts).
    - [ ] Fix manual search modal wiring: remove `episodeId={movieId}` workaround and use movie-specific manual search/download wiring.
    - [ ] Ensure any unused local `searchQuery` / `downloadMutation` logic is either integrated or removed.
    - [ ] Update tests for delete and manual-search behavior.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/subtitles/movies/ src/components/subtitles/ManualSearchModal.test.tsx`

- [x] **Task 3.7: Correct Bazarr movie subtitle API route mapping and tests** *(bazarr track origin)*
    - [x] Open `app/src/lib/api/subtitleApi.ts`.
    - [x] Fix `syncMovie`, `scanMovieDisk`, `searchMovieSubtitles` so they do not call `routeMap.subtitleSeries*` routes.
    - [x] Add/adjust explicit movie route entries in `app/src/lib/api/routeMap.ts` (or confirm shared endpoint contract with clear naming).
    - [x] Validate against server routes in `server/src/api/routes/`.
      - [x] If movie-specific endpoints do not exist yet, keep UI actions disabled with tooltip instead of calling known-wrong endpoints.
    - [x] Add/extend tests in `app/src/lib/api/subtitleApi.test.ts` for all three movie methods.
    - [x] Run tests: `CI=true npm run test --workspace=app -- src/lib/api/subtitleApi.test.ts src/app/\(shell\)/subtitles/movies/`

- [ ] Task: Conductor - User Manual Verification 'Phase 3'

---

## Phase 4: Clean Up Settings Stubs & Orphaned Code

**Objective:** Remove "coming soon" placeholders, resolve local-state-only persistence, delete orphaned files, and clean up debug logging.

### Tasks

- [ ] **Task 4.1: Remove "Download client configuration coming soon" stub**
    - [ ] Open `app/src/app/(shell)/settings/settings-form.tsx`.
    - [ ] Find the section at lines ~149-153 with "Download client configuration coming soon." in an `opacity-50` wrapper.
    - [ ] Determine: does Mediarr manage download clients via `/settings/downloadclients` (a separate page)? Check if the route exists and has real content by reading `app/src/app/(shell)/settings/downloadclients/page.tsx`.
    - [ ] **If the separate page exists and is functional:** Remove the stub section entirely from `settings-form.tsx`. The functionality lives on its own page.
    - [ ] **If no separate page or it's also stubbed:** Either build a minimal download client settings form that calls the existing `downloadClientsApi`, or remove the section and add a navigation link saying "Manage download clients in Settings > Download Clients" (if that route exists).
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/settings/`

- [x] **Task 4.2: Persist indexer proxy/category data to backend**
    - [x] Open `app/src/app/(shell)/settings/indexers/page.tsx`.
    - [x] Find the comment `// Placeholder local UI state for proxies` at line 27.
    - [x] Check if backend endpoints exist for proxy CRUD: look in `server/src/api/routes/` for anything related to indexer proxies or categories.
    - [x] **If backend endpoints exist:** Replace the `useState` calls with `useQuery` / `useMutation` that call the real endpoints. Remove the placeholder comment.
    - [x] **If backend endpoints do NOT exist:** Replace the local state with localStorage persistence using a helper like:
      ```typescript
      const [proxies, setProxies] = useLocalStorage<IndexerProxy[]>('mediarr:indexer-proxies', []);
      ```
      Add a small info banner above the proxy section: "Proxy configuration is stored locally in this browser." Remove the placeholder comment.
    - [x] Apply the same approach to the categories section (lines ~29-33, the `DEFAULT_CATEGORIES` array).
    - [x] Update tests.
    - [x] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/settings/indexers/`

- [x] **Task 4.3: Delete or integrate orphaned `DynamicForm.tsx`**
    - [x] Open `app/src/app/(shell)/indexers/DynamicForm.tsx`.
    - [x] Check if any file imports it: `grep -r "DynamicForm" app/src/ --include="*.ts" --include="*.tsx"`.
    - [x] **If nothing imports it:** Delete `DynamicForm.tsx` and its test file (if one exists).
    - [x] **If something imports it:** Evaluate whether the importer should use it or should use the inline field rendering already in `AddIndexerModal` / `EditIndexerModal`. Consolidate to one approach and delete the other.
    - [x] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/indexers/`

- [ ] **Task 4.4: Remove debug `console.log` statements from lib code** *(sonarr track origin)*
    - [ ] Open `app/src/lib/performance/monitor.ts`. Find and remove or wrap all `console.log('[Performance]...')` calls. Options:
      - Replace with a no-op in production: `if (process.env.NODE_ENV === 'development') console.log(...)`.
      - Or delete entirely if the performance monitor isn't actively used.
    - [ ] Open `app/src/lib/api/optimizer.ts`. Find and remove or wrap the 6 `console.log('[Cache]...')` statements (set cache, expired, hit, invalidated, invalidated X entries, cleared). Same approach as above.
    - [ ] Run tests:
      ```bash
      CI=true npm run test --workspace=app -- src/lib/performance/ src/lib/api/optimizer
      ```
    - [ ] Verify no remaining `console.log` in `app/src/lib/`:
      ```bash
      grep -r "console\.log" app/src/lib/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v "node_modules"
      ```

- [ ] **Task 4.5: Replace Bazarr subtitle settings stubs with real persistence** *(bazarr track origin)*
    - [ ] Open `app/src/app/(shell)/settings/subtitles/page.tsx`.
    - [ ] Remove stub comments and fallback logic:
      - [ ] "When backend is ready..."
      - [ ] "For now, return default values"
      - [ ] Simulated save mutation returning `Promise.resolve(values)`.
    - [ ] Wire to real subtitle settings API if available.
      - [ ] If endpoint does not exist, persist settings via localStorage with explicit notice: "Subtitle settings are stored locally in this browser."
    - [ ] Replace hardcoded default profile `<option>` values with real profiles from `languageProfilesApi.listProfiles()`.
    - [ ] Update tests.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/settings/subtitles/`

- [ ] **Task 4.6: Remove Bazarr subtitle metadata placeholders from movie views** *(bazarr track origin)*
    - [ ] Open `app/src/app/(shell)/subtitles/movies/page.tsx` and remove fabricated defaults:
      - [ ] `audioLanguages: ['en']` fallback.
      - [ ] hardcoded `languageProfile: 'Default'` unless real value is present.
    - [ ] Open `app/src/app/(shell)/subtitles/movies/[id]/page.tsx` and replace static language profile placeholder section with real data or an explicit unavailable state.
    - [ ] Ensure UI distinguishes "unknown/unavailable" from real defaults.
    - [ ] Update tests.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/subtitles/movies/`

- [ ] **Task 4.7: Fix Bazarr subtitle history/blacklist pagination and cache invalidation bugs** *(bazarr track origin)*
    - [ ] Open:
      - `app/src/app/(shell)/subtitles/history/series/page.tsx`
      - `app/src/app/(shell)/subtitles/history/movies/page.tsx`
      - `app/src/app/(shell)/subtitles/blacklist/series/page.tsx`
      - `app/src/app/(shell)/subtitles/blacklist/movies/page.tsx`
    - [ ] Replace `queryParams.pageSize = size` mutation pattern with real React state for `pageSize`.
    - [ ] Fix cache invalidation key typo in history pages (`['subtitleHistory', ...]`) to match query key namespace (`queryKeys.subtitleHistory(...)` / `'subtitle-history'`).
    - [ ] Verify clear/remove actions refresh visible tables immediately.
    - [ ] Update tests for page-size change and clear-history refresh behavior.
    - [ ] Run tests:
      ```bash
      CI=true npm run test --workspace=app -- src/app/\(shell\)/subtitles/history/ src/app/\(shell\)/subtitles/blacklist/
      ```

- [ ] Task: Conductor - User Manual Verification 'Phase 4'

---

## Phase 5: Consolidate Duplicated Patterns (Stretch)

**Objective:** Reduce long-term maintenance burden by extracting shared abstractions for the most-duplicated patterns. Tasks in this phase are valuable but optional -- the codebase is functional without them.

### Tasks

- [x] **Task 5.1: Create generic CRUD API factory**
    - [x] Create `app/src/lib/api/createCrudApi.ts` with this signature:
      ```typescript
      interface CrudApiConfig<TItem, TCreate> {
        basePath: string;
        itemSchema: z.ZodType<TItem>;
        listSchema?: z.ZodType<TItem[]>;
      }

      export function createCrudApi<TItem, TCreate>(
        client: ApiHttpClient,
        config: CrudApiConfig<TItem, TCreate>
      ) {
        return {
          list(): Promise<TItem[]>,
          create(input: TCreate): Promise<TItem>,
          update(id: number, input: Partial<TCreate>): Promise<TItem>,
          remove(id: number): Promise<{ id: number }>,
          test(id: number): Promise<TestResult>,
          testDraft(input: TCreate): Promise<TestResult>,
        };
      }
      ```
    - [x] Write tests in `app/src/lib/api/createCrudApi.test.ts` covering: list, create, update, remove, test, testDraft -- using a mock `ApiHttpClient`.
    - [x] Refactor `app/src/lib/api/indexerApi.ts` to use `createCrudApi` internally, keeping the same exported interface.
    - [x] Refactor `app/src/lib/api/downloadClientsApi.ts` to use `createCrudApi`.
    - [x] Run existing tests for both API files to confirm no regressions:
      ```bash
      CI=true npm run test --workspace=app -- src/lib/api/indexerApi.test.ts src/lib/api/downloadClientsApi.test.ts src/lib/api/createCrudApi.test.ts
      ```

- [x] **Task 5.2: Create generic configurable-item modal**
    - [x] Create `app/src/components/settings/ConfigurableItemModal.tsx` with slots for:
      - `renderPresetGrid(presets, onSelect)` -- how presets are displayed
      - `renderFields(selectedPreset, fieldValues, onChange)` -- how config fields are rendered
      - `onTestConnection(draft)` -- test connection callback
      - `onSave(draft)` -- save callback
      - Standard props: `isOpen`, `onClose`, `title`, `isSubmitting`
    - [x] Write tests in `app/src/components/settings/ConfigurableItemModal.test.tsx` covering: preset selection, field value changes, test connection flow, save flow, error display.
    - [x] Refactor `AddIndexerModal.tsx` to use `ConfigurableItemModal` with indexer-specific preset grid and field renderers.
    - [x] Refactor `AddDownloadClientModal.tsx` to use `ConfigurableItemModal`.
    - [x] Run existing modal tests to confirm no regressions:
      ```bash
      CI=true npm run test --workspace=app -- src/app/\(shell\)/indexers/ src/components/settings/
      ```

- [x] **Task 5.3: Extract shared subtitle history/blacklist helpers** *(bazarr track origin, stretch)*
    - [x] Create `app/src/lib/subtitles/time.ts` with a shared `formatRelativeTime(timestamp: string)` helper.
    - [x] Replace duplicated formatter implementations in:
      - `app/src/app/(shell)/subtitles/history/series/page.tsx`
      - `app/src/app/(shell)/subtitles/history/movies/page.tsx`
      - `app/src/app/(shell)/subtitles/blacklist/series/page.tsx`
      - `app/src/app/(shell)/subtitles/blacklist/movies/page.tsx`
    - [x] If practical, extract shared subtitle filter constants (`ACTIONS`, `PROVIDERS`, `LANGUAGES`) to `app/src/lib/subtitles/constants.ts`.
    - [x] Add tests for the extracted helpers.
    - [x] Run tests:
      ```bash
      CI=true npm run test --workspace=app -- src/lib/subtitles/ src/app/\(shell\)/subtitles/history/ src/app/\(shell\)/subtitles/blacklist/
      ```

- [ ] Task: Conductor - User Manual Verification 'Phase 5'

---

## Dependencies Between Phases

```
Phase 1 (Shared Utilities)
    |
    +-----> Phase 2 (Replace Mocks -- now includes sonarr and bazarr-origin API stubs)
    |           |
    |           v
    |       Phase 3 (Wire Handlers -- now includes sonarr/radarr/bazarr action gaps)
    |           |
    |           v
    +-----> Phase 4 (Settings Stubs, Orphans, Debug Logging, and subtitle pagination fixes)
                |
                v
            Phase 5 (Deduplication - Stretch)
```

Phase 1 has no external dependencies and can start immediately.
Phases 2 and 4 can run in parallel after Phase 1.
Phase 3 depends on Phase 2 (wanted tabs and interactive search need real API clients before handlers can be wired).
Phase 5 depends on all prior phases being stable.

---

## Notes

- Each task follows TDD: write tests before or alongside implementation, verify coverage.
- Use commit messages following pattern: `chore(ui): description` for cleanup, `refactor(ui): description` for deduplication.
- Target >80% code coverage for all new/modified code.
- If a backend API endpoint does not exist for a given feature, the UI should show an empty/error state -- NOT mock data. Creating backend endpoints is out of scope for this track.
- Sonarr-origin items are clearly marked with *(sonarr track origin)* so developers can trace findings back to the audit.
- Radarr-origin items are clearly marked with *(radarr track origin)* so developers can trace findings back to the audit.
- Bazarr-origin items are clearly marked with *(bazarr track origin)* so developers can trace findings back to the audit.
