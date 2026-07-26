# Plan: Fix App Dynamic Form Drift Test Failures

## Phase 1: Reproduce
- [x] Run each file and record exact failures. — resolved upstream before reconciliation; verified green 2026-07-26: all 6 named files pass in full today (see Phase 4 evidence). No currently-reproducible failures exist to record.
- [x] Inspect form components for markup/control changes. — resolved upstream before reconciliation; verified green 2026-07-26: current markup/controls match test expectations; no drift found today.
- [x] Update plan with mismatch list. — resolved upstream before reconciliation; verified green 2026-07-26: no mismatch exists today; see Reconciliation section below.
- [x] Commit: `docs(measure): diagnose app dynamic form drift` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 2: Fix Subtitle/Language Forms
- [x] Fix `ProfileEditorModal` and `LanguageSelector` tests. — resolved upstream before reconciliation; verified green 2026-07-26: `ProfileEditorModal.test.tsx` 13/13 passing (incl. `allows adding a language`), `LanguageSelector.test.tsx` 11/11 passing (incl. `filters languages by exclude prop`).
- [x] Fix `App.subtitle-phase4` save payload expectation. — resolved upstream before reconciliation; verified green 2026-07-26: `App.subtitle-phase4.test.tsx` 4/4 passing, incl. `saves subtitle settings with wantedLanguages and all provider credentials`.
- [x] Commit: `test(app): align subtitle and language form tests` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 3: Fix Collection/Indexer Dynamic Fields
- [x] Fix `EditCollectionModal` typing test. — resolved upstream before reconciliation; verified green 2026-07-26: `EditCollectionModal.test.tsx` 14/14 passing, incl. `updates form fields when user types`.
- [x] Fix `EditIndexerModal` protocol-switch test. — resolved upstream before reconciliation; verified green 2026-07-26: `EditIndexerModal.test.tsx` 13/13 passing, incl. `switches dynamic fields when protocol changes for fallback contracts`.
- [x] Fix `IndexerCatalogPanel` add/catalog tests. — resolved upstream before reconciliation; verified green 2026-07-26: `IndexerCatalogPanel.test.tsx` 12/12 passing, incl. `calls addFromCatalog with API key for private indexers`.
- [x] Commit: `test(app): align collection and indexer form tests` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 4: Regression
- [x] Run all affected files together. — resolved upstream before reconciliation; verified green 2026-07-26: `App.subtitle-phase4.test.tsx` (4/4), `ProfileEditorModal.test.tsx` (13/13), `EditCollectionModal.test.tsx` (14/14), `EditIndexerModal.test.tsx` (13/13), `IndexerCatalogPanel.test.tsx` (12/12), `LanguageSelector.test.tsx` (11/11) run together — 0 failures.
- [x] Run root `CI=true npm test`. — resolved upstream before reconciliation; verified green 2026-07-26: `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING, 0 failures (orchestrator-verified evidence, 2026-07-26).
- [x] Commit: `test(app): verify dynamic form drift fixes` — not committed by this reconciliation pass (documentation-only, no git writes).

## Phase 5: Closeout
- [x] Update `measure/tech-debt.md`. — out of scope for this reconciliation pass; owned by the orchestrator. **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Archive track. — out of scope for this reconciliation pass; owned by the orchestrator. Track is evidence-ready to archive (see Reconciliation section below). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.
- [x] Commit: `docs(measure): close out dynamic form drift track` — out of scope for this reconciliation pass (documentation-only, no git writes). **[orchestrator 2026-07-26]** done: tech-debt.md rewritten (stale rows corrected, 30 settled rows pruned); tracks.md reconciled; track folder moved to `measure/archive/`; committed.

## Reconciliation (2026-07-26)

This track's failures are resolved. Verified pass counts:

| File | Result |
|---|---|
| `app/src/App.subtitle-phase4.test.tsx` | 4/4 passing |
| `app/src/components/subtitles/ProfileEditorModal.test.tsx` | 13/13 passing |
| `app/src/components/collections/EditCollectionModal.test.tsx` | 14/14 passing |
| `app/src/components/indexers/EditIndexerModal.test.tsx` | 13/13 passing |
| `app/src/components/indexers/IndexerCatalogPanel.test.tsx` | 12/12 passing |
| `app/src/components/subtitles/LanguageSelector.test.tsx` | 11/11 passing |

Broader evidence: `CI=true npm test --workspace=app` → 204 test files, 1960 tests, ALL PASSING (orchestrator-verified 2026-07-26); `npm run build --workspace=app` → exit 0.

No test/source edits were made by this reconciliation pass — the dynamic-form drift described in the spec no longer reproduces. This track is ready to archive.
