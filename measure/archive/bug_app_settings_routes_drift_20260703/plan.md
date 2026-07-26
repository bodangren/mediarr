# Plan: Fix App Settings Routes API Drift Test Failures

## Phase 1: Reproduce
- [x] Run `src/settings-routes.test.tsx` and capture all 5 failure details. — resolved upstream before reconciliation; verified green 2026-07-26: the file passes 32/32 today, including all 5 originally-named tests (`calls indexerApi.create with correct payload on form submit`, `reloads indexers after successful create`, `calls indexerApi.remove when Delete is clicked`, `loads and displays subtitle providers`, `calls settingsApi.update with correct payload on save`). No failures reproduce.
- [x] Inspect current `indexerApi.create`, `indexerApi.remove`, `settingsApi.update`, and subtitle provider list contracts. — resolved upstream before reconciliation; verified green 2026-07-26: current contracts already match test expectations (see passing results above); no drift found today.
- [x] Update plan with mismatch list. — resolved upstream before reconciliation; verified green 2026-07-26: no mismatch exists today; see Reconciliation section below.
- [x] Commit: `docs(measure): diagnose app settings routes drift` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 2: Fix Indexer API Drift
- [x] Update test expectations for create/remove payload/response. — resolved upstream before reconciliation; verified green 2026-07-26: `calls indexerApi.create with correct payload on form submit` and `calls indexerApi.remove when Delete is clicked` pass with current test expectations, no update needed today.
- [x] Verify indexer settings-route tests pass. — resolved upstream before reconciliation; verified green 2026-07-26: indexer-related tests within `settings-routes.test.tsx` (create, reload-after-create, update-toggle, remove) all pass.
- [x] Commit: `test(app): align settings route tests with indexer API` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 3: Fix Subtitle Providers / Settings Save
- [x] Update subtitle provider rendering expectation. — resolved upstream before reconciliation; verified green 2026-07-26: `loads and displays subtitle providers` passes as-is.
- [x] Update settings save payload expectation. — resolved upstream before reconciliation; verified green 2026-07-26: `calls settingsApi.update with correct payload on save` passes as-is.
- [x] Verify remaining tests pass. — resolved upstream before reconciliation; verified green 2026-07-26: all 32 tests in the file pass.
- [x] Commit: `test(app): align subtitle and settings save route tests` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 4: Regression
- [x] Run `src/settings-routes.test.tsx`. — resolved upstream before reconciliation; verified green 2026-07-26: 32/32 passing (confirmed twice, once with `--reporter=verbose` to enumerate every test name individually).
- [x] Run root `CI=true npm test`. — resolved upstream before reconciliation; verified green 2026-07-26: `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING, 0 failures (orchestrator-verified evidence, 2026-07-26).
- [x] Commit: `test(app): verify settings routes drift fixes` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 5: Closeout
- [x] Update `measure/tech-debt.md`. — out of scope for this reconciliation pass; owned by the orchestrator. **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Archive track. — out of scope for this reconciliation pass; owned by the orchestrator. Track is evidence-ready to archive (see Reconciliation section below). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Commit: `docs(measure): close out settings routes drift track` — out of scope for this reconciliation pass (documentation-only, no git writes). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.

## Reconciliation (2026-07-26)

This track's failures are resolved. Verified pass counts:

| File | Result |
|---|---|
| `app/src/settings-routes.test.tsx` | 32/32 passing, including all 5 originally-failing tests named in the spec |

All 5 originally-named failing tests were individually confirmed present and passing via `--reporter=verbose`:
- `calls indexerApi.create with correct payload on form submit`
- `reloads indexers after successful create`
- `calls indexerApi.remove when Delete is clicked`
- `loads and displays subtitle providers`
- `calls settingsApi.update with correct payload on save`

Broader evidence: `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING (orchestrator-verified 2026-07-26); `npm run build --workspace=app` → exit 0.

No test/source edits were made by this reconciliation pass — the API/contract drift described in the spec no longer reproduces. This track is ready to archive.
