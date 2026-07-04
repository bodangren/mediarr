# Plan: Fix App Dynamic Form Drift Test Failures

## Phase 1: Reproduce
- [ ] Run each file and record exact failures.
- [ ] Inspect form components for markup/control changes.
- [ ] Update plan with mismatch list.
- [ ] Commit: `docs(measure): diagnose app dynamic form drift`

## Phase 2: Fix Subtitle/Language Forms
- [ ] Fix `ProfileEditorModal` and `LanguageSelector` tests.
- [ ] Fix `App.subtitle-phase4` save payload expectation.
- [ ] Commit: `test(app): align subtitle and language form tests`

## Phase 3: Fix Collection/Indexer Dynamic Fields
- [ ] Fix `EditCollectionModal` typing test.
- [ ] Fix `EditIndexerModal` protocol-switch test.
- [ ] Fix `IndexerCatalogPanel` add/catalog tests.
- [ ] Commit: `test(app): align collection and indexer form tests`

## Phase 4: Regression
- [ ] Run all affected files together.
- [ ] Run root `CI=true npm test`.
- [ ] Commit: `test(app): verify dynamic form drift fixes`

## Phase 5: Closeout
- [ ] Update `measure/tech-debt.md`.
- [ ] Archive track.
- [ ] Commit: `docs(measure): close out dynamic form drift track`
