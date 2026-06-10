# Plan: Import List UI Test Coverage

## How to write tests for these components

All components use shadcn/ui primitives (Modal, Button, Alert). Follow the project testing conventions:
- Use `@testing-library/react` + `@testing-library/jest-dom`
- Wrap in `<MemoryRouter>` for routing context
- Use `userEvent` for click interactions (not `fireEvent` — see lessons-learned.md)
- Mock API calls with `vi.mock('@/lib/api/client', ...)`
- Test files colocated: `app/src/components/importlists/ExclusionManager.test.tsx`

### Common test utilities

```ts
// Every test file needs this render helper:
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const renderComponent = (props = {}) => {
  const defaults = { /* fill per component */ };
  return render(<ComponentName {...defaults} {...props} />);
};
```

---

## Phase S1: ExclusionManager tests

- [x] Create `app/src/components/importlists/ExclusionManager.test.tsx`
- [x] Write test: `renders table rows for each exclusion`
  - Pass `exclusions: [{ id: 1, title: 'Movie A', tmdbId: 100 }, { id: 2, title: 'Movie B', tmdbId: 200 }]`
  - Assert `screen.getByText('Movie A')` and `screen.getByText('Movie B')` exist
  - Assert table has 2 data rows
- [x] Write test: `renders empty state when exclusions is empty`
  - Pass `exclusions: []`
  - Assert empty-state Alert is visible
- [x] Write test: `renders error state when error prop is set`
  - Pass `error: new Error('Failed to load')`
  - Assert error Alert contains "Failed to load"
- [x] Write test: `renders loading state when isLoading is true`
  - Pass `isLoading: true`
  - Assert loading indicator is visible
- [x] Write test: `calls onRemoveExclusion with correct exclusion when Remove is clicked`
  - Pass 2 exclusions, click Remove on the second
  - Assert `onRemoveExclusion` called with the second exclusion object
- [x] Write test: `calls onAddExclusion when Add Exclusion button is clicked`
  - Click the "Add Exclusion" button
  - Assert `onAddExclusion` called once
- [x] Run: `bunx vitest run src/components/importlists/ExclusionManager.test.tsx` — 7/7 green
- [x] Commit: `test(importlists): add ExclusionManager component tests` (`845dffe`)

## Phase S2: ImportListList tests

- [x] Create `app/src/components/importlists/ImportListList.test.tsx` (`4d0e168`)
- [x] Write test: `renders cards for each import list` (`4d0e168`)
  - Pass 2 lists with different names/providers
  - Assert both names are visible
- [x] Write test: `renders empty state when lists is empty` (`4d0e168`)
  - Assert empty-state Alert
- [x] Write test: `renders error state` (`4d0e168`)
  - Assert error Alert
- [x] Write test: `displays provider display name (e.g., "TMDB Popular" for "tmdb-popular")` (`4d0e168`)
  - Assert the formatted name appears
- [x] Write test: `displays "Never" for lastSyncAt when null` (`4d0e168`)
  - Pass list with `lastSyncAt: null`
  - Assert "Never" text visible
- [x] Write test: `calls onSync when Sync button clicked` (`4d0e168`)
  - Click Sync on first list
  - Assert `onSync` called with first list object
- [x] Write test: `calls onEdit when Edit button clicked` (`4d0e168`)
  - Click Edit
  - Assert `onEdit` called with correct list
- [x] Write test: `calls onDelete when Delete button clicked` (`4d0e168`)
  - Click Delete
  - Assert `onDelete` called with correct list
- [x] Run: `bunx vitest run src/components/importlists/ImportListList.test.tsx` — 10/10 green (8 plan tests; provider mapping parameterized to 3 cases) (`4d0e168`)
- [x] Commit: `test(importlists): add ImportListList component tests` (`4d0e168`)
- [x] Re-verify: `bunx vitest run src/components/importlists/ImportListList.test.tsx` — 10/10 green (verified 2026-06-10). `npm test` has pre-existing failures in unrelated services (TorrentManager BigInt, BulkImportService insert, subtitle variants, api-route-map, Drizzle migration shim) — NOT from import list components. Full suite green gate deferred to S6. (`74877d7`)

## Phase S3: ImportListModal tests

- [x] Create `app/src/components/importlists/ImportListModal.test.tsx` (`3268e0e`)
- [x] Write test: `does not render dialog content when isOpen is false` (smoke — per test-strategy §5) (`3268e0e`)
  - Pass `isOpen: false`, assert `dialog` and form fields are absent
- [x] Write test: `renders empty form when editList is null` (`3268e0e`)
  - Assert name input is empty, "Add Import List" button text
- [x] Write test: `pre-fills form when editList is provided` (`3268e0e`)
  - Pass `editList` with all fields populated
  - Assert inputs have correct values (name, root folder, provider, quality profile, monitor, sync interval, enabled, TMDB Popular config: mediaType + limit)
- [x] Write test: `shows TMDB Popular fields when providerType is tmdb-popular` (`3268e0e`)
  - Assert "Limit" input and "Media Type" select are visible
- [x] Write test: `shows TMDB List fields when providerType is tmdb-list and hides TMDB Popular fields` (`3268e0e`)
  - Select "tmdb-list" from provider dropdown
  - Assert "TMDB List ID" input is visible, Popular fields absent (field swap)
- [x] Write test: `pre-fills TMDB List ID when editList is a tmdb-list` (`3268e0e`)
  - Assert listId input pre-populated from `config.listId`
- [x] Write test: `shows validation alert and disables Save when required fields are empty` (`3268e0e`)
  - Assert both halves: Alert visible AND Save button disabled (so onSave cannot be called)
- [x] Write test: `calls onSave with form data when valid` (`3268e0e`)
  - Fill all required fields, click Save
  - Assert `onSave` called with matching input object (providerType, config, rootFolderPath, qualityProfileId, defaults: enabled, syncInterval, monitorType)
- [x] Write test: `calls onSave with tmdb-list config when provider is switched before submit` (`3268e0e`)
  - Switch to tmdb-list, fill listId, submit
  - Assert `onSave.config === { listId: ... }`
- [x] Write test: `calls onClose when Cancel clicked` (`3268e0e`)
  - Click Cancel, assert `onClose` called
- [x] Run: `bunx vitest run src/components/importlists/ImportListModal.test.tsx` — 10/10 green (`3268e0e`)
- [x] Commit: `test(importlists): add ImportListModal component tests` (`3268e0e`)
- [x] Re-verify: `vitest run src/components/importlists/ImportListModal.test.tsx` — 10/10 green (verified 2026-06-10). `npm test` has pre-existing failures in unrelated services (TorrentManager BigInt, BulkImportService insert, subtitle variants, api-route-map, Drizzle migration shim) — NOT from import list components. Full suite green gate deferred to S6.

## Phase S4: AddExclusionModal tests

- [ ] Create `app/src/components/importlists/AddExclusionModal.test.tsx`
- [ ] Write test: `renders search input and search button`
  - Assert input and "Search" button are visible
- [ ] Write test: `displays search results after successful search`
  - Mock `discoverApi.searchMovies` to return `[{ id: 1, title: 'Test Movie', year: 2024 }]`
  - Type query, click Search
  - Assert "Test Movie" appears in results
- [ ] Write test: `shows error alert when search fails`
  - Mock API to throw
  - Assert error Alert visible
- [ ] Write test: `selects a result when clicked`
  - Click a search result row
  - Assert "Add Exclusion" button enables
- [ ] Write test: `disables result that matches existing exclusion`
  - Pass `existingExclusions: [{ tmdbId: 123 }]`
  - Mock search to return result with tmdbId 123
  - Assert that result shows "Already excluded" and is not clickable
- [ ] Write test: `calls onAdd with tmdbId and title when Add Exclusion clicked`
  - Select a result, click "Add Exclusion"
  - Assert `onAdd` called with `{ tmdbId: <id>, title: <title> }`
- [ ] Write test: `calls onClose when Cancel clicked`
  - Click Cancel
  - Assert `onClose` called
- [ ] Write test: `resets state when modal closes and reopens`
  - Search, select, close, reopen
  - Assert search input is empty and no results shown
- [ ] Run: `npx vitest run app/src/components/importlists/AddExclusionModal.test.tsx`
- [ ] Commit: `test(importlists): add AddExclusionModal component tests`

## Phase S5: ImportListSettings integration tests

- [ ] Create `app/src/components/importlists/ImportListSettings.test.tsx`
- [ ] Write test: `renders ImportListList on Lists tab by default`
  - Assert list cards are visible
- [ ] Write test: `switches to Exclusions tab when clicked`
  - Click "Exclusions" tab
  - Assert ExclusionManager is rendered
- [ ] Write test: `opens ImportListModal when Add Import List clicked`
  - Click "Add Import List"
  - Assert modal is visible with "Add Import List" title
- [ ] Write test: `opens ImportListModal with editList when Edit clicked`
  - Click Edit on a list
  - Assert modal opens with pre-filled data
- [ ] Write test: `calls onCreateList and refreshes when modal saves (create mode)`
  - Fill modal form, click Save
  - Assert `onCreateList` called
  - Assert `onRefreshLists` called
- [ ] Write test: `calls onUpdateList and refreshes when modal saves (edit mode)`
  - Open edit modal, modify, save
  - Assert `onUpdateList` called with correct id
- [ ] Write test: `shows delete confirmation when Delete clicked`
  - Click Delete
  - Assert ConfirmModal appears
- [ ] Write test: `calls onDeleteList and refreshes when delete confirmed`
  - Click Delete, confirm
  - Assert `onDeleteList` called with list id
  - Assert `onRefreshLists` called
- [ ] Write test: `calls onSyncList when Sync clicked`
  - Click Sync
  - Assert `onSyncList` called with list id
- [ ] Write test: `calls onDeleteExclusion and refreshes when exclusion delete confirmed`
  - Switch to Exclusions tab, click Remove, confirm
  - Assert `onDeleteExclusion` called
  - Assert `onRefreshExclusions` called
- [ ] Run: `npx vitest run app/src/components/importlists/ImportListSettings.test.tsx`
- [ ] Commit: `test(importlists): add ImportListSettings integration tests`

## Phase S6: Verification & Handoff

- [ ] Run `CI=true npm test` — full suite GREEN
- [ ] Run `npm run typecheck` — zero errors
- [ ] Run `npm run build` — SPA build clean
- [ ] Verify each new test file has >80% branch coverage for its component
- [ ] Update `tech-debt.md` — mark "Import List UI untested" as Resolved
- [ ] Update `lessons-learned.md` with any testing patterns discovered
- [ ] Final commit and push
