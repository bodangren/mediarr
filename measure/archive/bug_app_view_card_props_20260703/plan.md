# Plan: Fix App View/Card Component Prop Drift Test Failures

## Phase 1: Reproduce
- [x] Run failing files and capture the exact missing elements/behaviors. — resolved upstream before reconciliation; verified green 2026-07-26: all three named files now pass in full (see Phase 5 evidence). No currently-reproducible failures exist to capture.
- [x] Compare component props with test expectations. — resolved upstream before reconciliation; verified green 2026-07-26: current tests pass against current component props with no drift observed.
- [x] Update plan with mismatch list. — resolved upstream before reconciliation; verified green 2026-07-26: no mismatch exists today; see Reconciliation section below.
- [x] Commit: `docs(measure): diagnose app view card prop drift` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 2: Fix MoviePosterView
- [x] Update component or test for monitored toggle, delete, search, rating, runtime, navigation, fallback. — resolved upstream before reconciliation; verified green 2026-07-26: `MoviePosterView.test.tsx` passes 10/10, including `calls onToggleMonitored...`, `calls onDelete...`, navigation, and card-rendering assertions.
- [x] Verify file green. — resolved upstream before reconciliation; verified green 2026-07-26: 10/10 passing.
- [x] Commit: `fix(app): align MoviePosterView tests with current component` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 3: Fix SeriesOverviewView
- [x] Update component or test for monitored toggle, description expansion, episode progress, delete, navigation. — resolved upstream before reconciliation; verified green 2026-07-26: `SeriesOverviewView.test.tsx` passes 9/9, including `calls onToggleMonitored...`, `calls onDelete...`, `does not call onDelete when confirm is cancelled`, and navigation assertions.
- [x] Verify file green. — resolved upstream before reconciliation; verified green 2026-07-26: 9/9 passing.
- [x] Commit: `fix(app): align SeriesOverviewView tests with current component` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 4: Fix IndexerCatalogPanel
- [x] Update public/private catalog card assertions. — resolved upstream before reconciliation; verified green 2026-07-26: `IndexerCatalogPanel.test.tsx` passes 12/12, including `renders public indexer cards with one-click add`, `renders private indexers with API key input`, and add-flow assertions for both card types.
- [x] Verify file green. — resolved upstream before reconciliation; verified green 2026-07-26: 12/12 passing.
- [x] Commit: `fix(app): align IndexerCatalogPanel tests with current cards` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 5: Regression
- [x] Run all three files together. — resolved upstream before reconciliation; verified green 2026-07-26: `MoviePosterView.test.tsx` (10/10), `SeriesOverviewView.test.tsx` (9/9), `IndexerCatalogPanel.test.tsx` (12/12) run together — 0 failures.
- [x] Run root `CI=true npm test`. — resolved upstream before reconciliation; verified green 2026-07-26: `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING, 0 failures (orchestrator-verified evidence, 2026-07-26).
- [x] Commit: `test(app): verify view/card prop drift fixes` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 6: Closeout
- [x] Update `measure/tech-debt.md`. — out of scope for this reconciliation pass; owned by the orchestrator. **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Archive track. — out of scope for this reconciliation pass; owned by the orchestrator. Track is evidence-ready to archive (see Reconciliation section below). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Commit: `docs(measure): close out view card prop drift track` — out of scope for this reconciliation pass (documentation-only, no git writes). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.

## Reconciliation (2026-07-26)

This track's failures are resolved. Verified pass counts:

| File | Result |
|---|---|
| `app/src/components/views/MoviePosterView.test.tsx` | 10/10 passing |
| `app/src/components/views/SeriesOverviewView.test.tsx` | 9/9 passing |
| `app/src/components/indexers/IndexerCatalogPanel.test.tsx` | 12/12 passing |

Note: at the time this spec was written, `MoviePosterView.test.tsx` and `SeriesOverviewView.test.tsx` were referenced under `src/components/movie/` and `src/components/series/`; they now live under `app/src/components/views/`. All three files pass in full today, with 0 failures.

Broader evidence: `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING (orchestrator-verified 2026-07-26); `npm run build --workspace=app` → exit 0.

No test/source edits were made by this reconciliation pass — the prop drift described in the spec no longer reproduces. This track is ready to archive.
