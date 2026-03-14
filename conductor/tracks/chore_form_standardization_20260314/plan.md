# Plan: Form Standardization

## Phase 1 — Settings Page Forms

- [ ] Audit every settings page in `app/src/pages/settings/` — list all that use manual useState form state
- [ ] Add `@hookform/resolvers` zod resolver (already installed; verify import path)
- [ ] Migrate `SettingsMediaPage` to react-hook-form + zod schema
- [ ] Migrate `SettingsDownloadClientsPage` to react-hook-form + zod schema
- [ ] Migrate `SettingsQualityPage` to react-hook-form + zod schema
- [ ] Migrate `SettingsIndexersPage` add/edit forms to react-hook-form + zod schema
- [ ] Migrate `SettingsNotificationsPage` to react-hook-form + zod schema
- [ ] Migrate `SettingsSubtitlesPage` to react-hook-form + zod schema
- [ ] Migrate `SettingsGeneralPage` to react-hook-form + zod schema
- [ ] Ensure `EnhancedSelectInput` and `TagInput` accept `value`/`onChange` as Controller-compatible props
- [ ] Run `cd app && npm run build` and `CI=true npm test` — confirm clean

## Phase 2 — Modal Forms, Deprecation Cleanup, and Validation Smoke Tests

- [ ] Audit all modals in `app/src/components/` — list those with form inputs
- [ ] Migrate `AddIndexerModal` form to react-hook-form + zod
- [ ] Migrate `EditIndexerModal` form to react-hook-form + zod
- [ ] Migrate `AddProfileModal` form to react-hook-form + zod
- [ ] Migrate `ImportWizard` form steps to react-hook-form + zod
- [ ] Migrate any remaining modal forms identified in the audit
- [ ] Delete the deprecated `Form.tsx` shim; update all remaining imports
- [ ] Write form validation tests for at least 2 settings forms (valid submit, invalid submit shows error messages)
- [ ] Run `cd app && npm run build` — zero TS errors
- [ ] Run `CI=true npm test` — all tests pass
