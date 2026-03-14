# Plan: App.tsx Decomposition

## Phase 1 — Audit and Extract Settings Pages

- [ ] Read all of `App.tsx` and catalogue every top-level `function`/`export function` defined in it (name, line range, destination file)
- [ ] Create `app/src/pages/settings/` directory
- [ ] Extract `SettingsMediaPage` → `app/src/pages/settings/SettingsMediaPage.tsx`
- [ ] Extract `SettingsDownloadClientsPage` → `app/src/pages/settings/SettingsDownloadClientsPage.tsx`
- [ ] Extract `SettingsQualityPage` → `app/src/pages/settings/SettingsQualityPage.tsx`
- [ ] Extract `SettingsIndexersPage` → `app/src/pages/settings/SettingsIndexersPage.tsx`
- [ ] Extract `SettingsNotificationsPage` → `app/src/pages/settings/SettingsNotificationsPage.tsx`
- [ ] Extract `SettingsSubtitlesPage` → `app/src/pages/settings/SettingsSubtitlesPage.tsx`
- [ ] Extract `SettingsGeneralPage` → `app/src/pages/settings/SettingsGeneralPage.tsx`
- [ ] Extract `SettingsImportListsPage` → `app/src/pages/settings/SettingsImportListsPage.tsx`
- [ ] **Test Remediation:** Identify all tests in `tests/` and `app/src/` related to settings (e.g. `api-settings-general.test.ts`, `settings-routes.test.tsx`); update their imports and ensure they pass after extraction.
- [ ] Extract any remaining settings route components (audit App.tsx for any missed)
- [ ] Update App.tsx `<Route>` elements to import from the new files
- [ ] Run `cd app && npm run build` — confirm clean after each extraction batch
- [ ] Run `CI=true npm test` — confirm `settings-routes.test.tsx` and other settings tests pass

## Phase 2 — Extract Inline Modals and Shared Components

- [ ] Identify all inline modal components defined in `App.tsx` (those not already in a feature directory)
- [ ] Move each to its feature directory (e.g. inline indexer edit modal → `components/indexers/`)
- [ ] **Test Remediation:** For each extracted modal, find its associated tests (e.g. in `app_src_backup/components/`); update imports and restore to passing status.
- [ ] Extract `StaticPage` helper (if still present) to `app/src/components/primitives/StaticPage.tsx`
- [ ] Extract any inline type definitions from `App.tsx` to their respective type files
- [ ] Update all imports in `App.tsx` for the moved components
- [ ] Run `cd app && npm run build` and `CI=true npm test` — confirm clean

## Phase 3 — Final Thinning and Verification

- [ ] Verify `App.tsx` is ≤200 lines; if not, identify remaining extractable blocks and extract them
- [ ] Remove any unused imports from `App.tsx` (run lint to catch them)
- [ ] Confirm no `export function` in `App.tsx` except `App` itself
- [ ] Run `cd app && npm run build` — clean build, zero TS errors
- [ ] Run `CI=true npm test` — all tests pass
- [ ] Run `npm run lint` in `app/` — zero lint errors
