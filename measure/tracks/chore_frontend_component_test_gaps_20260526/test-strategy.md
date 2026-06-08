# Test Strategy: Frontend Component Test Coverage Gaps

## 1. Testing pyramid per phase

All 15 targets are **component-unit tests** (React-Testing-Library + jsdom). No integration/E2E in this track.

| Phase | Tier | Why |
|-------|------|-----|
| S1 movie modals | Component-integration (real `ToastProvider` + `QueryClientProvider`, mocked `@/lib/api/client`) | Modals own form state, async submit, and toast feedback — mocking the providers hides regressions in their wiring. |
| S2 table primitives | Pure component-unit (no providers) | `DataTable`, `TablePager`, `TableOptionsModal` are headless; existing kebab-case tests prove the pattern. |
| S3 search cells | Pure render unit | `memo()` presentational components — assert text/attrs against real output. |
| S4 providers | Behavioural unit (real `ToastProvider`, mock children for `AppProviders`) | Contract = "context is provided and toasts mount". |
| S5 misc | Pure component-unit | `FilterDropdown` (native `<select>`) + `MetricCard` (static markup). |

## 2. Shared fixtures / mocks (do NOT introduce new helpers in this track)

- **API mock**: inline `vi.mock('@/lib/api/client', () => ({ getApiClients: () => ({ movieApi: { … }, discoverApi: { … }, qualityProfileApi: { … } }) }))` — copy the existing pattern from `MovieInteractiveSearchModal.test.tsx:14` and `ImportWizard.test.tsx:9`. Keep mocks **per-file**; do not create a shared factory (out of scope, would expand the change set).
- **Providers for S1**: wrap renders in a fresh `QueryClientProvider` (retries off) + real `ToastProvider`. Mirror the rig in `app/src/components/subtitles/SubtitleUpload.test.tsx` (the existing `renderWithProviders` lives there — copy, do not extract).
- **jsdom polyfills**: already provided by `app/src/test/setup.ts:1` (Pointer/Resize). No additions needed; dnd-kit in `TableOptionsModal` relies on these.
- **Movie fixtures**: hand-rolled minimal `Movie` literals satisfying `app/src/lib/api/movieApi.ts` — *do not* import server types.

## 3. Cross-phase edge cases & dependencies

- **Naming collision (S2)**: `TablePager.test.tsx` and `TableOptionsModal.test.tsx` proposed by the plan **collide** with existing `table-pager.test.tsx` / `table-options-modal.test.tsx`. Vitest's case-sensitive glob will load BOTH. Decision: extend the existing kebab-case files with the missing cases (sort/paginate/select for `DataTable`; "Page 1 of 3" copy + disable states for `TablePager`; column-checkbox/density for `TableOptionsModal`) instead of duplicating files. Strategy: rename plan tasks to *augment* not *create* for `TablePager`/`TableOptionsModal`; only `DataTable.test.tsx` is genuinely new.
- **Spec/implementation drift (S3)**: Spec AC reads "AgeCell with ageHours=2 → shows '2h'"; actual output is `"2 hours"` (`AgeCell.tsx:14`). Assert against the **implementation**, not the spec — escalate the spec text gap as a doc-only fix at S6.
- **`OrganizePreviewModal`** auto-fires `fetchPreviews` via `useMemo` on open — async resolution must be awaited (`waitFor`) before clicking Confirm; `applyMutation` requires `QueryClientProvider`.
- **`ToastProvider` import in S4**: `AppProviders` mounts MSW conditionally on `import.meta.env.DEV && VITE_USE_MSW==='true'`; in vitest both are undefined, so MSW is never imported — no extra mock needed.

## 4. Architecture guardrails

- **No production code edits**. If a component proves untestable (e.g., missing `aria-label`), file a tech-debt note and use a stable test selector (`getByText`/`getByRole` first; `getByTestId` only as last resort).
- **No new files in `app/src/test/`** — keeps the "no shared rig" decision auditable.
- **No `vi.mock` of `react-hook-form`, `@tanstack/react-query`, `react-router-dom`, or `lucide-react`** — those are framework boundaries; mocking them invalidates the test.
- **`userEvent` over `fireEvent`** for any interaction that triggers form/select validation (zodResolver, dnd-kit).
- **Determinism**: never assert on `Date.now()`/`Math.random()` output (`ToastProvider` uses both for ids) — assert on the *rendered toast*, not its id.
- **Async hygiene**: wrap any state-changing user event in `await act` via `userEvent`; use `findBy*` over `getBy*`+`waitFor` for first appearance.

## 5. Per-phase test approach notes

- **S1 EditMovieModal**: build `movie` fixture, render in QueryClient+Toast, assert pre-fill via `screen.getByDisplayValue`; type new title with `userEvent`, click Save, assert `api.movieApi.update` called with diffed fields and `onSave` invoked.
- **S1 ManualMatchDialog**: mock `discoverApi.searchMovies` → resolved results; type query, click Search, await result list, click first result, assert `onSelect` called with full `MovieSearchResult`.
- **S1 MovieBulkEditModal**: mock `qualityProfileApi.list` + `movieApi.getRootFolders` + bulk update; assert selected count rendered; change one field, click Apply, assert bulk-update mutation fired exactly once.
- **S1 OrganizePreviewModal**: mock `previewOrganize` returning 2 changed + 1 unchanged → assert table rows + "1 file(s) already follow"; click Rename, await `applyOrganize`, assert success toast variant.
- **S2**: augment existing kebab-case test files; add a *new* `DataTable.test.tsx` exercising sort callback, pagination prop, mobile card branch.
- **S3**: 4 tiny files, each <40 lines, no providers.
- **S4 ToastProvider**: render a child that calls `useToast().pushToast({...})` via a button; assert toast appears; advance timers (`vi.useFakeTimers`) and assert auto-dismiss.
- **S4 AppProviders**: render `<AppProviders><Probe/></AppProviders>` where `Probe` calls `useQueryClient()`+`useToast()` and renders a sentinel — proves all required contexts present.
- **S5 FilterDropdown**: `fireEvent.change` the `<select>` for each branch (`all`/numeric/`custom`); assert callback values.
- **S5 MetricCard**: render with/without `trend` and `onAction`; assert text + action button.

## 6. build-graph findings that shaped the strategy

- `build-graph stats ./graph.db` (graph mtime 2026-06-07, ~19h old → fresh): 6 994 nodes, 836 files, single `mediarr` package; safe to query.
- `inspect EditMovieModal` → unresolved `renders → Modal/Button` + `uses_hook → useToast/useForm/useEffect`: confirms heavy provider surface — **must** wrap in real `ToastProvider`.
- `inspect AppProviders` → renders `QueryClientProvider/ThemeProvider/ToastProvider/TooltipProvider/EventsBridgeMount`; `useEventsCacheBridge` hook fires on mount → either render with valid QueryClient or shallow-mock the bridge module.
- `inspect ToastProvider` → ambiguous (file + function nodes); confirms `useToast` is co-exported (`ToastProvider.tsx:1`) — import path is `@/components/providers/ToastProvider`.
- `inspect DataTable` → `unresolved`/no exports recorded: the component is `memo`-wrapped, so the graph misses its callers; rely on file-grep, not the graph, for impact analysis.
- `inspect TablePager / TableOptionsModal` → exported with 8/5 param-flows → matches existing kebab-case tests exactly; confirms collision risk.
- `inspect AgeCell/PeersCell/QualityBadge/ReleaseTitle` → each only rendered by 3 InteractiveSearchModal variants → cell-level regressions cannot cascade beyond search; pure-unit scope is correct.
- `callers useToast` ambiguous → multiple usages confirm S1/S4 cannot mock `useToast` without coupling test setup to internal context shape — real provider is cheaper.

## 7. Live-proof plan (Red → Green per phase)

Distinguish **contract tests** (assert against artifact text/exports) from **live-behaviour tests** (mount component, fire events, assert DOM/callbacks). Every test in this track is a **live-behaviour test** — no documentation or schema-snapshot tests are produced. No fake harnesses are introduced; the existing `src/test/setup.ts` is real jsdom polyfilling, not a fake runner.

| Phase | Red command (must FAIL before impl, PASS after) | Green/closeout gate |
|-------|---|---|
| S1 | `npx vitest run app/src/components/movie/EditMovieModal.test.tsx app/src/components/movie/ManualMatchDialog.test.tsx app/src/components/movie/MovieBulkEditModal.test.tsx app/src/components/movie/OrganizePreviewModal.test.tsx --reporter=verbose` (bounded to 4 files; cannot fall through to full suite) | Same command GREEN; smoke: `npx vitest run app/src/components/movie --reporter=verbose` to confirm no neighbour regressions. |
| S2 | `npx vitest run app/src/components/primitives/DataTable.test.tsx app/src/components/primitives/table-pager.test.tsx app/src/components/primitives/table-options-modal.test.tsx --reporter=verbose` | Same GREEN; smoke: `npx vitest run app/src/components/primitives --reporter=verbose`. |
| S3 | `npx vitest run app/src/components/search/AgeCell.test.tsx app/src/components/search/PeersCell.test.tsx app/src/components/search/QualityBadge.test.tsx app/src/components/search/ReleaseTitle.test.tsx --reporter=verbose` | Same GREEN; smoke: `npx vitest run app/src/components/search --reporter=verbose`. |
| S4 | `npx vitest run app/src/components/providers/ToastProvider.test.tsx app/src/components/providers/AppProviders.test.tsx --reporter=verbose` | Same GREEN; smoke: `npx vitest run app/src/components/providers --reporter=verbose`. |
| S5 | `npx vitest run app/src/components/filters/FilterDropdown.test.tsx app/src/components/primitives/MetricCard.test.tsx --reporter=verbose` | Same GREEN; smoke: same scoped command. |
| S6 | Closeout only — no Red phase | `npm test --workspace=app` (app suite GREEN), then root `CI=true npm test` (server + app GREEN), `npm run typecheck --workspace=app` clean, `npm run build --workspace=app` clean. |

**Bounded-scope guarantee**: every per-phase command names explicit file paths. No `vitest run` without paths is used until S6, so a failing/intentionally-red test cannot silently activate the whole suite.

**Intentionally-red files**: none. There are no `.skip` / `.todo` / `.fixme` markers in this plan, and no aggregate-suite stubs are introduced. Each new test file is owned by a single `[~]→[x]` task and either passes or is reverted within its phase commit. If a test is staged failing at end-of-phase, mark the parent task `[~]` and exclude its file from the next phase's Red command until owned.
