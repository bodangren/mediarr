# Spec: Fix App Path Validation UI Test Failures

## Problem
Path-validation tests across three settings pages cannot find Validate buttons or the expected status text:

- `download-client-settings.test.tsx` — 3 validate-button tests for incomplete directory
- `SettingsClientsPage.test.tsx` — complete directory validate + status tests
- `SettingsMediaPage.test.tsx` — movie/TV root folder validate + status tests

Likely causes: accessible button label changed, status text changed, or multiple Validate buttons exist.

## Goal
Restore green path-validation UI tests across all three settings pages.

## Acceptance Criteria
- [ ] `download-client-settings.test.tsx` — 3 validate tests pass
- [ ] `SettingsClientsPage.test.tsx` — 8 tests pass (including 3 validate-related)
- [ ] `SettingsMediaPage.test.tsx` — 5 tests pass
- [ ] `cd app && bun run test -- <affected-files>` passes
- [ ] Root `CI=true npm test` shows no new failures

## Scope
Path-validation UI components (`FilesystemBrowser`, validate buttons, status badges) and their tests only.
