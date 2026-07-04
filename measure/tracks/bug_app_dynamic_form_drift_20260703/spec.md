# Spec: Fix App Dynamic Form Drift Test Failures

## Problem
Modal/form tests fail when dynamic fields, language selectors, or provider-specific form behavior changes:

- `App.subtitle-phase4.test.tsx` — subtitle settings save payload
- `ProfileEditorModal.test.tsx` — adding a language
- `EditCollectionModal.test.tsx` — typing updates form fields
- `EditIndexerModal.test.tsx` — switching protocol updates dynamic fields
- `IndexerCatalogPanel.test.tsx` — adding public/private indexers with API key
- `LanguageSelector.test.tsx` — `exclude` prop filtering

## Goal
Align dynamic form tests with current form behavior and markup.

## Acceptance Criteria
- [ ] All listed files green
- [ ] `cd app && bun run test -- <affected-files>` passes
- [ ] Root `CI=true npm test` shows no new failures

## Scope
Dynamic form components and their tests.
