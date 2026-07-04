# Plan: Fix App Path Validation UI Test Failures

## Phase 1: Reproduce
- [ ] Run each failing file and capture exact missing elements/assertions.
- [ ] Inspect the current Validate button implementation and status labels.
- [ ] Update plan with findings.
- [ ] Commit: `docs(measure): diagnose app path validation UI failures`

## Phase 2: Unify Validate Button Accessibility
- [ ] Add aria-label or text pattern so tests can target the correct Validate button per field.
- [ ] Ensure status text (Writable / Read-only / Not found) is rendered and discoverable.
- [ ] Run affected tests.
- [ ] Commit: `fix(app): make path validate buttons accessible per field`

## Phase 3: Update Tests
- [ ] Update selectors in `download-client-settings.test.tsx`, `SettingsClientsPage.test.tsx`, `SettingsMediaPage.test.tsx`.
- [ ] Verify all affected files green.
- [ ] Commit: `test(app): update path validation tests for current UI`

## Phase 4: Regression
- [ ] Run all three files together.
- [ ] Run root `CI=true npm test`.
- [ ] Commit: `test(app): verify path validation UI fixes`

## Phase 5: Closeout
- [ ] Update `measure/tech-debt.md`.
- [ ] Archive track.
- [ ] Commit: `docs(measure): close out path validation UI track`
