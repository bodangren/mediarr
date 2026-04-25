# Plan: Form Standardization

## Phase 1 — Settings Page Forms

- [x] Audit every settings page in `app/src/pages/settings/` — list all that use manual useState form state
- [x] Add `@hookform/resolvers` zod resolver (already installed; verify import path)
- [x] Migrate `SettingsMediaPage` to react-hook-form + zod schema
- [x] Migrate `SettingsDownloadClientsPage` to react-hook-form + zod schema
- [x] Migrate `SettingsProfilesPage` (covers Quality) to react-hook-form + zod schema
- [x] Migrate `SettingsIndexersPage` add/edit forms to react-hook-form + zod schema (page is list/CRUD — modal forms deferred to Phase 2)
- [x] Migrate `SettingsNotificationsPage` to react-hook-form + zod schema (read-only list, no form to migrate)
- [x] Migrate `SettingsSubtitlesPage` to react-hook-form + zod schema
- [x] Migrate `SettingsGeneralPage` to react-hook-form + zod schema
- [x] Migrate `SettingsStreamingPage` to react-hook-form + zod schema
- [x] **Test Remediation:** Existing tests (`settings-routes.test.tsx`, `download-client-settings.test.tsx`) already validate migrated forms — passing
- [x] `EnhancedSelectInput` and `TagInput` already accept `value`/`onChange` as Controller-compatible props

## Phase 2 — Modal Forms, Deprecation Cleanup, and Validation Smoke Tests

- [x] Audit all modals in `app/src/components/` — list those with form inputs
  - `AddIndexerModal.tsx` — uses CheckInput, FormGroup, TextInput from form-compat
  - `EditIndexerModal.tsx` — uses CheckInput, Form, FormGroup, SelectInput, TextInput
  - `AddProfileModal.tsx` — uses manual useState (name, items, cutoff)
  - `AddDownloadClientModal.tsx` — uses CheckInput, FormGroup, TextInput
  - `ProviderSettingsModal.tsx` — uses Form, FormGroup, TextInput, PasswordInput
  - `ConfigurableItemModal.tsx` — uses Form
  - `ImportWizard.tsx` — to be audited
- [ ] Migrate `AddIndexerModal` form to react-hook-form + zod
- [ ] Migrate `EditIndexerModal` form to react-hook-form + zod
- [ ] Migrate `AddProfileModal` form to react-hook-form + zod
- [ ] Migrate `ImportWizard` form steps to react-hook-form + zod
- [ ] Migrate `AddDownloadClientModal` form to react-hook-form + zod
- [ ] Migrate `ProviderSettingsModal` form to react-hook-form + zod
- [ ] Migrate `ConfigurableItemModal` form to react-hook-form + zod
- [ ] **Test Remediation:** For each migrated modal form, find its associated tests; update them to reflect the new form structure and validation logic, restoring them to passing status.
- [ ] Delete the deprecated `form-compat.tsx` shim; update all remaining imports
- [ ] Write form validation tests for at least 2 settings forms (valid submit, invalid submit shows error messages)
- [ ] Run `cd app && npm run build` — zero TS errors
- [ ] Run `CI=true npm test` — all tests pass
