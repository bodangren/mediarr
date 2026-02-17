# UI Stub Closure & Deduplication - Implementation Plan

**Track:** ui_stub_closure_20260217
**Status:** New
**Created:** 2026-02-17

---

## Overview

This plan addresses stubs, mock data in production code, unwired UI handlers, orphaned code, and duplicated patterns found during the post-archive audit of the prowlarr, sonarr, and radarr UI cloning tracks plus a broader codebase sweep. Every task is a cleanup -- no new features.

---

## Phase 1: Extract Shared Utilities (Deduplication Foundation)

**Objective:** Create shared modules that later phases will use. This phase must come first because Phase 2 and 3 tasks will import from these new shared files.

### Tasks

- [ ] **Task 1.1: Extract `healthStatus()` to shared utility**
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

- [ ] **Task 1.2: Extract `testResultSchema` to shared schemas**
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

- [ ] **Task 2.3: Wire `calendar/page.tsx` to real API**
    - [ ] Open `app/src/app/(shell)/calendar/page.tsx`.
    - [ ] Remove `import { getMockMoviesInRange } from '@/lib/mocks/calendarMocks'`.
    - [ ] Check if a calendar API client exists in `app/src/lib/api/calendarApi.ts`. If so, use it. If not, create one with a `getEvents(start: string, end: string)` function calling `GET /api/calendar?start=...&end=...`.
    - [ ] Replace the mock call with a real `useQuery` keyed on the date range.
    - [ ] Handle loading, error, and empty states.
    - [ ] Update tests.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/calendar/`

- [ ] **Task 2.4: Wire `collections/page.tsx` to real API**
    - [ ] Open `app/src/app/(shell)/collections/page.tsx`.
    - [ ] Remove `import { mockCollections } from '@/lib/mocks/collectionMocks'`.
    - [ ] Check if a collection API client exists. If not, create `app/src/lib/api/collectionApi.ts` with `list()` calling `GET /api/collections`.
    - [ ] Replace mock data with real `useQuery`.
    - [ ] Handle loading, error, and empty states.
    - [ ] Update tests.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/collections/`

- [ ] **Task 2.5: Wire `add/discover/page.tsx` and `DiscoverFilters.tsx` to real API**
    - [ ] Open `app/src/app/(shell)/add/discover/page.tsx`.
    - [ ] Remove `import { mockDiscoverMovies } from '@/lib/mocks/discoverMocks'`.
    - [ ] Check if a discover API client exists. If not, create `app/src/lib/api/discoverApi.ts` with `listRecommendations()` calling `GET /api/discover/movies`.
    - [ ] Replace mock data with real `useQuery`.
    - [ ] Handle loading, error, and empty states.
    - [ ] Also fix the no-op `onRetry={() => {}}` callback -- wire it to `refetch()` from the query.
    - [ ] Open `app/src/components/discover/DiscoverFilters.tsx`. *(radarr track origin)*
    - [ ] Remove imports of `mockGenres`, `mockCertifications`, `mockLanguages` from `@/lib/mocks/discoverMocks`.
    - [ ] If a genre/certification/language API exists, fetch filter options via `useQuery`. If not, either hardcode a reasonable static list directly in the component (not imported from mocks), or accept options as props from the parent.
    - [ ] Update tests.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/add/ src/components/discover/`

- [ ] **Task 2.6: Wire `add/import/page.tsx` to real API** *(sonarr track origin)*
    - [ ] Open `app/src/app/(shell)/add/import/page.tsx`.
    - [ ] Remove `import { mockDetectedSeries } from '@/components/import/types'`.
    - [ ] **`scanFolder()` function (line ~15):** Currently returns `mockDetectedSeries` after a fake 1.5s delay. Replace with a real API call. Check if an import/scan API exists. If not, create `app/src/lib/api/importApi.ts` with `scanFolder(path: string)` calling `POST /api/import/scan { path }`. If the backend doesn't exist yet, show an empty state with a message "Folder scanning requires backend support" instead of fake data.
    - [ ] **`handleImport()` function (line ~109):** Currently a mock with 800ms delay. Wire to a real `importApi.importSeries(series)` call, or disable the import button with a tooltip if the backend doesn't exist.
    - [ ] **`handleBulkImport()` function (line ~126):** Currently a mock with 1200ms delay. Same approach as `handleImport()`.
    - [ ] Update tests.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/add/import/`

- [ ] **Task 2.7: Wire `InteractiveSearchModal.tsx` to real API** *(sonarr track origin)*
    - [ ] Open `app/src/components/search/InteractiveSearchModal.tsx`.
    - [ ] Remove `import { MOCK_RELEASES } from './mocks'`.
    - [ ] **`searchReleases()` function (line ~104):** Currently uses `MOCK_RELEASES` with 800ms delay. The comments say "In production, this would call the actual API: `api.releaseApi.searchCandidates({ seriesId, episodeId })`". Wire this to the real `releaseApi.searchCandidates()` call. The `releaseApi` already exists -- check `app/src/lib/api/releaseApi.ts`.
    - [ ] **`handleGrab()` function (line ~130):** Currently simulates 1000ms delay. Wire to `releaseApi.grabRelease(release)`. Handle errors with a toast.
    - [ ] Remove all comments that say "In development, use mock data" or "In production, this would call...".
    - [ ] Handle loading state during search (already has `isLoading` state, just needs real timing).
    - [ ] Handle error state if the API fails.
    - [ ] Update tests.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/components/search/`

- [ ] **Task 2.8: Wire `FileBrowser.tsx` to real filesystem API** *(sonarr track origin)*
    - [ ] Open `app/src/components/primitives/FileBrowser.tsx`.
    - [ ] Find `MOCK_FILE_SYSTEM` constant (lines ~26-57) -- a hardcoded folder tree.
    - [ ] Check if a filesystem browsing API exists (`GET /api/filesystem?path=...` or similar). Look in `server/src/api/routes/` and `app/src/lib/api/`.
    - [ ] **If the API exists:** Replace `MOCK_FILE_SYSTEM` with a `useQuery` call that fetches the directory listing for the current path. Update the browse/navigate logic to call the API when the user clicks a folder.
    - [ ] **If the API does NOT exist:** Refactor the component to accept `entries` as a prop instead of using the hardcoded constant. This way parent components can provide data (real or empty). Remove the `MOCK_FILE_SYSTEM` constant. Update `PathInput` or any parent that renders `FileBrowser` to pass an empty array or fetch from an API when one becomes available.
    - [ ] Update tests.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/components/primitives/FileBrowser`

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

- [ ] Task: Conductor - User Manual Verification 'Phase 2'

---

## Phase 3: Wire Empty Action Handlers

**Objective:** Every visible button must either perform a real action or be explicitly disabled. Zero `// TODO` comments inside onClick handlers.

### Tasks

- [ ] **Task 3.1: Wire movie detail page action buttons**
    - [ ] Open `app/src/app/(shell)/library/movies/[id]/page.tsx`.
    - [ ] **Replace mock movie data:** The component uses a `mockMovieDetail` object (lines ~28-117). Replace with a real `useQuery(['movie', id], () => movieApi.getById(id))` call. If `movieApi.getById` does not exist, create it in `app/src/lib/api/movieApi.ts` calling `GET /api/movies/{id}`. Handle loading/error states.
    - [ ] **Refresh button (~line 212):** Wire to `movieApi.refresh(id)` calling `POST /api/movies/{id}/refresh`. On success, invalidate the movie query. If this endpoint doesn't exist, add a `refresh(id)` stub to the API client that calls the endpoint (the backend can return 501 -- the UI should show a toast).
    - [ ] **Interactive Search button (~line 225):** Wire to open the `InteractiveSearchModal` (now wired to real API in Task 2.7). Pass the movie ID. Remove the TODO comment.
    - [ ] **Preview Rename button (~line 234):** If a rename preview API exists, wire it. If not, set the button to `disabled` with `title="Rename preview not yet available"`. Remove the TODO comment.
    - [ ] **Manage Files button (~line 243):** Same approach -- wire if API exists, otherwise `disabled` with tooltip. Remove TODO.
    - [ ] **Edit Movie button (~line 256):** Wire to open an edit modal or navigate to an edit route. Check if an `EditMovieModal` exists. If not, create a minimal one that pre-populates a form and calls `movieApi.update(id, data)`. Remove TODO.
    - [ ] **Edit File / Delete File buttons (~lines 270, 279):** Wire to file-level API calls if they exist. Otherwise disable with tooltip. Remove TODOs.
    - [ ] Update tests to cover the wired handlers (mock API calls, verify they're invoked on click).
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/library/movies/`

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

- [ ] **Task 3.4: Fix remaining no-op handlers** *(sonarr track origin)*
    - [ ] Open `app/src/app/(shell)/collections/page.tsx`. Find the `onRetry={() => {}}` no-op. Wire to the `refetch()` function from the collections query (created in Task 2.4). If the page still uses mock data at this point, skip -- but verify it was handled in Phase 2.
    - [ ] Open `app/src/app/(shell)/system/updates/page.tsx`. Find the `onPrev: () => {}` and `onNext: () => {}` no-ops in the pagination. Either:
      - Wire to actual pagination state if the updates page supports pagination.
      - Remove the pagination controls entirely if the updates list is always a single page.
    - [ ] Run tests:
      ```bash
      CI=true npm run test --workspace=app -- src/app/\(shell\)/collections/ src/app/\(shell\)/system/updates/
      ```

- [ ] **Task 3.5: Remove `alert()` placeholder actions** *(radarr track origin)*
    - [ ] Open `app/src/app/(shell)/calendar/page.tsx`.
    - [ ] **iCal Link button (~line 154):** Remove the `alert('iCal export feature coming soon!')` call. If an iCal export API exists, wire to it. Otherwise, set the button to `disabled` with `title="iCal export not yet available"`.
    - [ ] **Search for Missing button (~line 159):** Remove the `alert('Search for missing coming soon!')` call. Wire to a bulk search API call if one exists (check for a command-based search like `POST /api/command { name: 'missingMovieSearch' }`). Otherwise disable with tooltip.
    - [ ] **RSS Sync button (~line 164):** Remove the `alert('RSS Sync coming soon!')` call. Wire to RSS sync command if it exists. Otherwise disable with tooltip.
    - [ ] Open `app/src/app/(shell)/collections/page.tsx`.
    - [ ] **Search collection handler (~line 26):** Remove the `alert('In a real implementation, this would trigger a search...')` call. Wire to a collection search API if one exists. Otherwise disable the search action with tooltip.
    - [ ] Update tests.
    - [ ] Run tests:
      ```bash
      CI=true npm run test --workspace=app -- src/app/\(shell\)/calendar/ src/app/\(shell\)/collections/
      ```

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

- [ ] **Task 4.2: Persist indexer proxy/category data to backend**
    - [ ] Open `app/src/app/(shell)/settings/indexers/page.tsx`.
    - [ ] Find the comment `// Placeholder local UI state for proxies` at line 27.
    - [ ] Check if backend endpoints exist for proxy CRUD: look in `server/src/api/routes/` for anything related to indexer proxies or categories.
    - [ ] **If backend endpoints exist:** Replace the `useState` calls with `useQuery` / `useMutation` that call the real endpoints. Remove the placeholder comment.
    - [ ] **If backend endpoints do NOT exist:** Replace the local state with localStorage persistence using a helper like:
      ```typescript
      const [proxies, setProxies] = useLocalStorage<IndexerProxy[]>('mediarr:indexer-proxies', []);
      ```
      Add a small info banner above the proxy section: "Proxy configuration is stored locally in this browser." Remove the placeholder comment.
    - [ ] Apply the same approach to the categories section (lines ~29-33, the `DEFAULT_CATEGORIES` array).
    - [ ] Update tests.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/settings/indexers/`

- [ ] **Task 4.3: Delete or integrate orphaned `DynamicForm.tsx`**
    - [ ] Open `app/src/app/(shell)/indexers/DynamicForm.tsx`.
    - [ ] Check if any file imports it: `grep -r "DynamicForm" app/src/ --include="*.ts" --include="*.tsx"`.
    - [ ] **If nothing imports it:** Delete `DynamicForm.tsx` and its test file (if one exists).
    - [ ] **If something imports it:** Evaluate whether the importer should use it or should use the inline field rendering already in `AddIndexerModal` / `EditIndexerModal`. Consolidate to one approach and delete the other.
    - [ ] Run tests: `CI=true npm run test --workspace=app -- src/app/\(shell\)/indexers/`

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

- [ ] Task: Conductor - User Manual Verification 'Phase 4'

---

## Phase 5: Consolidate Duplicated Patterns (Stretch)

**Objective:** Reduce long-term maintenance burden by extracting shared abstractions for the most-duplicated patterns. Tasks in this phase are valuable but optional -- the codebase is functional without them.

### Tasks

- [ ] **Task 5.1: Create generic CRUD API factory**
    - [ ] Create `app/src/lib/api/createCrudApi.ts` with this signature:
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
    - [ ] Write tests in `app/src/lib/api/createCrudApi.test.ts` covering: list, create, update, remove, test, testDraft -- using a mock `ApiHttpClient`.
    - [ ] Refactor `app/src/lib/api/indexerApi.ts` to use `createCrudApi` internally, keeping the same exported interface.
    - [ ] Refactor `app/src/lib/api/downloadClientsApi.ts` to use `createCrudApi`.
    - [ ] Run existing tests for both API files to confirm no regressions:
      ```bash
      CI=true npm run test --workspace=app -- src/lib/api/indexerApi.test.ts src/lib/api/downloadClientsApi.test.ts src/lib/api/createCrudApi.test.ts
      ```

- [ ] **Task 5.2: Create generic configurable-item modal**
    - [ ] Create `app/src/components/settings/ConfigurableItemModal.tsx` with slots for:
      - `renderPresetGrid(presets, onSelect)` -- how presets are displayed
      - `renderFields(selectedPreset, fieldValues, onChange)` -- how config fields are rendered
      - `onTestConnection(draft)` -- test connection callback
      - `onSave(draft)` -- save callback
      - Standard props: `isOpen`, `onClose`, `title`, `isSubmitting`
    - [ ] Write tests in `app/src/components/settings/ConfigurableItemModal.test.tsx` covering: preset selection, field value changes, test connection flow, save flow, error display.
    - [ ] Refactor `AddIndexerModal.tsx` to use `ConfigurableItemModal` with indexer-specific preset grid and field renderers.
    - [ ] Refactor `AddDownloadClientModal.tsx` to use `ConfigurableItemModal`.
    - [ ] Run existing modal tests to confirm no regressions:
      ```bash
      CI=true npm run test --workspace=app -- src/app/\(shell\)/indexers/ src/components/settings/
      ```

- [ ] Task: Conductor - User Manual Verification 'Phase 5'

---

## Dependencies Between Phases

```
Phase 1 (Shared Utilities)
    |
    +-----> Phase 2 (Replace Mocks -- now includes sonarr-origin items: import, search, filebrowser)
    |           |
    |           v
    |       Phase 3 (Wire Handlers -- now includes sonarr-origin no-ops)
    |           |
    |           v
    +-----> Phase 4 (Settings Stubs, Orphans, & Debug Logging)
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
