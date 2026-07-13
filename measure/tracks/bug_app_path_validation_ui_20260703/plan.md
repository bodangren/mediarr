# Plan: Fix App Path Validation UI Test Failures

## Phase 1: Reproduce
- [x] Run each failing file and capture exact missing elements/assertions.
- [x] Inspect the current Validate button implementation and status labels.
- [x] Update plan with findings.
- [ ] Commit: `docs(measure): diagnose app path validation UI failures`

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
