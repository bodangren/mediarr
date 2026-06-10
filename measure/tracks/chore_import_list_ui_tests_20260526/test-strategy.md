# Test Strategy: Import List UI Test Coverage

Tech Lead guidance for phases S1–S6. Read alongside `plan.md` and `spec.md`.

## 1. Testing Pyramid Per Phase

| Phase | Component | Test Type | Rationale |
|------|-----------|-----------|-----------|
| S1 | ExclusionManager | Pure unit | Presentational, no state, no API. Props in → DOM/callback out. |
| S2 | ImportListList | Pure unit | Presentational, formatting logic (provider label, lastSyncAt). |
| S3 | ImportListModal | Stateful unit | 9 useState vars, conditional fields, validation; no API call (parent owns submit). |
| S4 | AddExclusionModal | Unit + mocked API | Only component that calls `discoverApi.searchMovies` via `getApiClients()`. Mock the client. |
| S5 | ImportListSettings | Component integration | Compose the four children + 2 ConfirmModals; verify orchestration, not rendering of children internals (rely on S1–S4). |
| S6 | Verification | Suite-wide gates | `CI=true npm test`, `npm run typecheck`, `npm run build`, coverage spot-check. |

Pyramid shape target: ~75% pure unit (S1–S3), ~15% mocked-API unit (S4), ~10% integration (S5). No E2E (out of scope per spec).

## 2. Shared Fixtures & Mocks

Create local fixtures inside each test file — do **not** add a shared helper module (per project convention; see `EditIndexerModal.test.tsx`, `DashboardPage.test.tsx`).

Canonical shapes to reuse (copy/paste, do not extract):

- `mockExclusion = { id, title, tmdbId, imdbId, tvdbId, ... }` — match `ImportListExclusion` from `@/lib/api/importListsApi`.
- `mockImportList = { id, name, providerType: 'tmdb-popular', enabled, qualityProfileId, rootFolderPath, lastSyncAt, providerConfig, ... }` — match `ImportList`.
- `mockQualityProfile = [{ id: 1, name: 'HD-1080p' }, { id: 2, name: 'UHD-2160p' }]`.
- `noop = () => Promise.resolve()` for async callback props.

API mock (S4 + S5 only):
```ts
const mockSearchMovies = vi.fn();
vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({ discoverApi: { searchMovies: mockSearchMovies } })),
}));
```
Reset with `beforeEach(() => mockSearchMovies.mockReset())`. This mirrors `EditMovieModal.test.tsx:12` and 38 other call sites.

No `MemoryRouter` is needed — none of these components use routing hooks. (Plan note about `<MemoryRouter>` is generic; only wrap if a child unexpectedly pulls in `useNavigate`.)

## 3. Cross-Phase Edge Cases & Dependencies

- **userEvent over fireEvent for Radix Dialog interactions** (Modal, ConfirmModal). Backdrop/Escape/Tab close requires `userEvent.setup()` — see `lessons-learned.md` 2026-04-24 entry. fireEvent.click on overlay silently fails.
- **act() warnings on stateful modals**: S3/S4/S5 mount components with `useEffect` (form prefill, search). Use `await userEvent.click(...)` / `await waitFor(...)`; never bare `fireEvent` for state transitions. See FilesystemBrowser lessons-learned entry.
- **ID-stable callback assertions**: assert `onRemoveExclusion` is called with `exclusions[1]` *object reference*, not by index. Catches map-key bugs.
- **`lastSyncAt: null` → "Never"** appears in both S2 (unit) and S5 (integration via card). S5 should not re-test the formatting — only that the list renders.
- **Existing-exclusion gating in S4**: the spec says match by `tmdbId`. Test must pass `existingExclusions: [{ tmdbId: 123, ... }]` AND mock search results with `id: 123`. Assert disabled state AND label `"Already excluded"`.
- **Modal reset on close (S4 AC #9)**: requires re-render with `isOpen: false` then `isOpen: true`. Use `rerender()` from RTL; assert the search input is empty and no results visible.
- **ConfirmModal coupling in S5**: there are two ConfirmModals (delete list, delete exclusion). Assert by `getByRole('dialog', { name: /delete/i })` *and* the confirm button label — do not rely on order/index.
- **syncingId race (S5 AC)**: when Sync is clicked, `syncingId` is set during the awaited callback. Use a deferred promise pattern: `let resolve; onSyncList = () => new Promise(r => { resolve = r })`. Assert the syncing affordance, then call `resolve()` and assert it clears.

## 4. Architecture Guardrails

- **Do not import `prisma`, `db`, or any server-side module** in these tests — app workspace only.
- **Do not test `importListsApi.ts`** (out of scope per spec). If a test starts asserting URL/body shape, it has drifted into route-integration territory.
- **Do not assert internal `useState` values** — assert DOM/callbacks only. State-internal tests break on harmless refactors.
- **Do not stub `Modal`, `Button`, `Alert`, or `ConfirmModal`.** They have their own tests (`modal.test.tsx`). Stubbing them creates false greens.
- **Keep each test file self-contained.** No shared fixture module; no global beforeEach across files. Matches the existing 100+ test files.
- **One component per file.** `ImportListSettings.test.tsx` is integration *through* the orchestrator, not a re-test of children.
- **No snapshot tests.** Project convention is explicit assertions only.

## 5. Per-Phase Test Approach Notes

- **S1 (ExclusionManager):** All 6 ACs are pure render/callback. Use `getByRole('table')` + `getAllByRole('row')` for row counts (header row + N). Disabled-while-deleting variant is implicit in S5; cover here with `isDeleting: true` to lock the contract early.
- **S2 (ImportListList):** Provider display name mapping (`tmdb-popular` → "TMDB Popular") lives in the component — verify mapping table is complete by parameterized cases. `lastSyncAt: null` → "Never". Pin button-click → callback identity (whole list object).
- **S3 (ImportListModal):** Validation Alert appears *and* `onSave` is NOT called when required fields empty (asserting both halves). Pre-fill: pass an `editList` with `providerType: 'tmdb-popular'` and a populated `providerConfig`; assert each input's value. Provider switch test must change `providerType` via the Select and assert field swap. Add `isOpen: false → null render` smoke (mirrors `EditIndexerModal.test.tsx:59`).
- **S4 (AddExclusionModal):** Mock `searchMovies` with a fixture returning `results: [{ tmdbId, title, year, overview, posterUrl }]` (note: the component transforms `tmdbId → id`). Error path: `mockSearchMovies.mockRejectedValueOnce(new Error('boom'))`. Reset-on-reopen test uses `rerender` toggling `isOpen`.
- **S5 (ImportListSettings):** Render with full prop set including stub callbacks (`vi.fn().mockResolvedValue(undefined)`). Drive flows through tab clicks and child buttons; assert downstream callbacks (`onCreateList`, `onRefreshLists`, etc.) are invoked. Use `findByRole('dialog')` after Add/Edit/Delete clicks. Do **not** mock the four children — render real subtree (their tests cover internals).
- **S6 (Verification):** Run targeted vitest first (`npx vitest run app/src/components/importlists/`) before full `CI=true npm test`. Per `lessons-learned.md` 2026-06-07, skip full-project `tsc` inside per-task attempts; reserve `npm run typecheck` for phase end. Coverage spot-check via `npx vitest run --coverage app/src/components/importlists/` and read the branch column.

## 6. build-graph Findings That Shaped This Strategy

Graph queried 2026-06-10 against `./graph.db` (852 files, 7141 nodes, fresh).

- **`ImportListSettings` has 0 incoming callers** in the graph (`build-graph callers ImportListSettings` → no results). It is rendered by a settings page that is not yet wired — confirms S5 is the integration boundary; nothing else depends on its shape, so we have freedom to assert behavior, not contract.
- **`ImportListSettings` inspect** shows 7 `renders` edges (AddExclusionModal, Button, ConfirmModal×2, ExclusionManager, ImportListList, ImportListModal) and 9 `useState` hooks — matches spec's "9 state vars" exactly. S5 must therefore exercise: 2 tab states + 2 modal-open states + 2 delete-target states + edit target + isSaving + syncingId. Plan covers all but `isSaving` — recommend an S5 test that asserts the modal disables Save while `onCreateList` is in-flight (deferred promise pattern).
- **`AddExclusionModal` is the only component with `getApiClients`** in this directory (grep + inspect confirm). The other four are dependency-injection clean. → Mock the API client *only* in S4 and S5; S1–S3 must not import `@/lib/api/client`.
- **`importListsApi.ts` is the 4th-largest file in the repo (78 entities)** but has zero `renders` edge to these components — confirms type-only dependency. Tests only need the TypeScript types, not the client.
- **39 existing test files already use `vi.mock('@/lib/api/client', () => ({ getApiClients: ... }))`** — adopt this exact pattern verbatim (no custom helper) for consistency with the existing test corpus and for future global-find/replace if the client API changes.
- **No existing test exercises Radix Tabs in this codebase** under `importlists/`-adjacent components; nearest precedent is `SettingsMediaPage.test.tsx`. S5 should drive tabs by clicking the tab trigger, not by manipulating state directly.

---

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: chore_import_list_ui_tests_20260526
phase: track setup (pre-S1 strategy)
commits: none
tests_run: none (strategy-only; no code changes)
files_changed: measure/tracks/chore_import_list_ui_tests_20260526/test-strategy.md (new)
plan_updates: none — existing plan.md S1–S6 are unchanged; strategy adds (a) shared fixture/mock recipes, (b) Radix/userEvent guardrails, (c) S5 isSaving deferred-promise test recommendation, (d) S6 ordering (targeted vitest before full CI, skip per-task project tsc per lessons-learned 2026-06-07).
known_failures: none
handoff: Implementer should start at S1 (ExclusionManager.test.tsx) using the §2 fixture shapes and §5 S1 approach. Reuse the `vi.mock('@/lib/api/client')` pattern (§2) only for S4 and S5. Honor §4 guardrails — no snapshot tests, no Modal/Button stubs, no server imports. At S5 end, add the recommended isSaving deferred-promise test before committing. Run `npx vitest run app/src/components/importlists/<file>` per phase; full `CI=true npm test` + `npm run typecheck` + `npm run build` only at S6.
END_MEASURE_AGENT_RESULT
