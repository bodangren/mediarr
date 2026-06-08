# Plan: Frontend Component Test Coverage Gaps

## General pattern for component tests

```tsx
// app/src/components/path/ComponentName.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ComponentName } from './ComponentName';

const renderComponent = (props = {}) => {
  const defaults = { /* required props */ };
  return render(
    <MemoryRouter>
      <ComponentName {...defaults} {...props} />
    </MemoryRouter>
  );
};
```

Use `userEvent` for all interactions. Mock API calls via `vi.mock('@/lib/api/client', ...)`.

---

## Phase S1: Movie management modal tests

- [~] Create `app/src/components/movie/EditMovieModal.test.tsx`
  - Write test: `renders with pre-filled movie data`
  - Write test: `calls onUpdate with changed fields on Save`
  - Write test: `calls onClose on Cancel`
  - Write test: `validates required fields before save`
- [~] Create `app/src/components/movie/ManualMatchDialog.test.tsx`
  - Write test: `renders search results`
  - Write test: `selects a match on click`
  - Write test: `calls onConfirm with selected match`
- [~] Create `app/src/components/movie/MovieBulkEditModal.test.tsx`
  - Write test: `renders with selected movie count`
  - Write test: `calls bulkUpdate with changes for all selected`
  - Write test: `validates at least one change is made`
- [~] Create `app/src/components/movie/OrganizePreviewModal.test.tsx`
  - Write test: `renders file move preview list`
  - Write test: `calls organize endpoint on Confirm`
  - Write test: `calls onClose on Cancel`
- [~] Run: `npx vitest run app/src/components/movie/EditMovieModal.test.tsx app/src/components/movie/ManualMatchDialog.test.tsx app/src/components/movie/MovieBulkEditModal.test.tsx app/src/components/movie/OrganizePreviewModal.test.tsx`
- [ ] Commit: `test(movie): add movie management modal component tests`

### S1 Targeted-Red run record (MID attempt 3)

**Command** (run from `app/` workspace with the app `vitest.config.ts`):

```
cd app && npx vitest run \
  src/components/movie/EditMovieModal.test.tsx \
  src/components/movie/ManualMatchDialog.test.tsx \
  src/components/movie/MovieBulkEditModal.test.tsx \
  src/components/movie/OrganizePreviewModal.test.tsx \
  --reporter=verbose
```

**Result**: 4 test files, 13 tests passed (0 failed). Coverage-chore rationale: the four modals already exist in production and ship without unit tests; the S1 deliverable is the new test files themselves, not a behaviour change. Per task instructions, the "tests pass at HEAD" outcome is marked as already-satisfied with evidence rather than forcing an artificial Red by mutating production code (forbidden by the test-strategy guardrail "No production code edits"). The previously failing run (ManualMatchDialog timeout + MovieBulkEditModal selectOption on unpopulated options) was tightened to await the React-Query resolution and to drop a redundant clear/retype — both are real-component async behaviour, not stale state.

Files added (all untracked at HEAD, verified via `git log -- <files>`):
- `app/src/components/movie/EditMovieModal.test.tsx` (4 tests)
- `app/src/components/movie/ManualMatchDialog.test.tsx` (3 tests)
- `app/src/components/movie/MovieBulkEditModal.test.tsx` (3 tests)
- `app/src/components/movie/OrganizePreviewModal.test.tsx` (3 tests)

### Worktree classification at S1 start

- `M measure/automation-supervisor.py` — unrelated supervisor scaffolding; preserved unstaged.
- `?? measure/tracks/chore_frontend_component_test_gaps_20260526/test-strategy.md` — strategy-role artifact for this track; folded into the S1 Red commit.


## Phase S2: Table primitive tests

- [ ] Create `app/src/components/primitives/DataTable.test.tsx`
  - Write test: `renders rows from data`
  - Write test: `sorts by column on header click`
  - Write test: `paginates when data exceeds pageSize`
  - Write test: `selects rows on checkbox click`
- [ ] Create `app/src/components/primitives/TablePager.test.tsx`
  - Write test: `renders page info (e.g., "Page 1 of 3")`
  - Write test: `calls onPageChange when Next clicked`
  - Write test: `disables Previous on first page`
  - Write test: `disables Next on last page`
- [ ] Create `app/src/components/primitives/TableOptionsModal.test.tsx`
  - Write test: `renders column checkboxes`
  - Write test: `calls onColumnToggle when checkbox toggled`
  - Write test: `applies density changes`
- [ ] Run: `npx vitest run app/src/components/primitives/DataTable.test.tsx app/src/components/primitives/TablePager.test.tsx app/src/components/primitives/TableOptionsModal.test.tsx`
- [ ] Commit: `test(primitives): add table primitive component tests`

## Phase S3: Search cell component tests

- [ ] Create `app/src/components/search/AgeCell.test.tsx`
  - Write test: `renders hours for age < 24h`
  - Write test: `renders days for age >= 24h`
  - Write test: `renders "Just now" for age < 1h`
- [ ] Create `app/src/components/search/PeersCell.test.tsx`
  - Write test: `renders seeders / leechers`
  - Write test: `renders "N/A" when values are null`
- [ ] Create `app/src/components/search/QualityBadge.test.tsx`
  - Write test: `renders quality name`
  - Write test: `applies correct color class for quality tier`
- [ ] Create `app/src/components/search/ReleaseTitle.test.tsx`
  - Write test: `renders full title when short`
  - Write test: `truncates long title with ellipsis`
  - Write test: `shows full title on hover (tooltip)`
- [ ] Run: `npx vitest run app/src/components/search/AgeCell.test.tsx app/src/components/search/PeersCell.test.tsx app/src/components/search/QualityBadge.test.tsx app/src/components/search/ReleaseTitle.test.tsx`
- [ ] Commit: `test(search): add search cell component tests`

## Phase S4: Provider component tests

- [ ] Create `app/src/components/providers/ToastProvider.test.tsx`
  - Write test: `renders children`
  - Write test: `displays toast when triggered via context`
  - Write test: `auto-dismisses toast after timeout`
- [ ] Create `app/src/components/providers/AppProviders.test.tsx`
  - Write test: `renders children without errors`
  - Write test: `provides QueryClient context`
- [ ] Run: `npx vitest run app/src/components/providers/ToastProvider.test.tsx app/src/components/providers/AppProviders.test.tsx`
- [ ] Commit: `test(providers): add provider component tests`

## Phase S5: Miscellaneous component tests

- [ ] Create `app/src/components/filters/FilterDropdown.test.tsx`
  - Write test: `renders options`
  - Write test: `calls onChange on selection`
- [ ] Create `app/src/components/primitives/MetricCard.test.tsx`
  - Write test: `renders value and label`
  - Write test: `renders trend indicator when provided`
- [ ] Run: `npx vitest run app/src/components/filters/FilterDropdown.test.tsx app/src/components/primitives/MetricCard.test.tsx`
- [ ] Commit: `test(misc): add FilterDropdown and MetricCard tests`

## Phase S6: Verification & Handoff

- [ ] Run `CI=true npm test` — full suite GREEN
- [ ] Run `npm run typecheck` — zero errors
- [ ] Run `npm run build` — SPA build clean
- [ ] Update `tech-debt.md` — mark relevant component test gaps as Resolved
- [ ] Final commit and push
