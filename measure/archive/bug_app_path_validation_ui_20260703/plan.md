# Plan: Fix App Path Validation UI Test Failures

## Phase 1: Reproduce
- [x] Run each failing file and capture exact missing elements/assertions.
- [x] Inspect the current Validate button implementation and status labels.
- [x] Update plan with findings.
- [x] Commit: `docs(measure): diagnose app path validation UI failures` — not committed by this reconciliation pass (documentation-only, no git writes); findings below already stand as the record.

### Findings (2026-07-13)

- `src/download-client-settings.test.tsx`: the seed-ratio assertion is already
  green (the loaded `1.5` value is rendered); the previous broad spinbutton
  selector is unnecessarily coupled to unrelated numeric controls. All three
  validation tests correctly fail because the visually identical `Validate`
  buttons have no field-specific accessible name. The runtime already renders
  the expected `Writable`, `Read-only`, and `Not found` status text.
- `src/components/primitives/FilesystemBrowser.test.tsx`: all 17 assertions
  pass when isolated. In the required combined run, its initial modal test
  timed out under fork-pool contention while its asynchronous directory load
  emitted React `act` warnings. This is test-environment flakiness, not a
  filesystem-browser UX regression; retain the component behavior and make
  the test wait for the load transition.

## Phase 2: Unify Validate Button Accessibility
- [x] Add aria-label or text pattern so tests can target the correct Validate button per field. — resolved upstream before reconciliation; verified green 2026-07-26: each Validate button now has a field-specific accessible name (confirmed indirectly — all field-targeted validate tests pass without ambiguous-selector errors).
- [x] Ensure status text (Writable / Read-only / Not found) is rendered and discoverable. — resolved upstream before reconciliation; verified green 2026-07-26: `download-client-settings.test.tsx` passes `Validate button for incomplete directory shows Writable when path is writable`, `...shows Read-only when path is read-only`, and `...shows Not found when API throws`.
- [x] Run affected tests. — resolved upstream before reconciliation; verified green 2026-07-26: see per-file counts below.
- [x] Commit: `fix(app): make path validate buttons accessible per field` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 3: Update Tests
- [x] Update selectors in `download-client-settings.test.tsx`, `SettingsClientsPage.test.tsx`, `SettingsMediaPage.test.tsx`. — resolved upstream before reconciliation; verified green 2026-07-26: no selector work needed by this pass, all three files pass as-is today.
- [x] Verify all affected files green. — resolved upstream before reconciliation; verified green 2026-07-26: `download-client-settings.test.tsx` 15/15 (includes the 3 validate tests named in the spec), `SettingsClientsPage.test.tsx` 8/8, `SettingsMediaPage.test.tsx` 5/5.
- [x] Commit: `test(app): update path validation tests for current UI` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 4: Regression
- [x] Run all three files together. — resolved upstream before reconciliation; verified green 2026-07-26: `download-client-settings.test.tsx` (15/15), `SettingsClientsPage.test.tsx` (8/8), `SettingsMediaPage.test.tsx` (5/5), and the related `FilesystemBrowser.test.tsx` (17/17) all run together with 0 failures.
- [x] Run root `CI=true npm test`. — resolved upstream before reconciliation; verified green 2026-07-26: `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING, 0 failures (orchestrator-verified evidence, 2026-07-26).
- [x] Commit: `test(app): verify path validation UI fixes` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 5: Closeout
- [x] Update `measure/tech-debt.md`. — out of scope for this reconciliation pass; owned by the orchestrator. **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Archive track. — out of scope for this reconciliation pass; owned by the orchestrator. Track is evidence-ready to archive (see Reconciliation section below). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Commit: `docs(measure): close out path validation UI track` — out of scope for this reconciliation pass (documentation-only, no git writes). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.

## Reconciliation (2026-07-26)

This track's failures are resolved. Verified pass counts:

| File | Result |
|---|---|
| `app/src/download-client-settings.test.tsx` | 15/15 passing (incl. the 3 originally-failing validate tests: Writable/Read-only/Not found) |
| `app/src/components/settings/SettingsClientsPage.test.tsx` | 8/8 passing |
| `app/src/components/settings/SettingsMediaPage.test.tsx` | 5/5 passing |
| `app/src/components/primitives/FilesystemBrowser.test.tsx` | 17/17 passing (related component named in Phase 1 findings) |

Broader evidence: `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING (orchestrator-verified 2026-07-26); `npm run build --workspace=app` → exit 0.

No test/source edits were made by this reconciliation pass — the Phase 1 findings (2026-07-13) already indicated the runtime behavior was correct and only the accessible-name/selector work remained; that work is now done and verified. This track is ready to archive.
