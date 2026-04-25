# Plan: App.tsx Decomposition

## Phase 1 — Audit and Extract Settings Pages

- [x] Read all of `App.tsx` and catalogue every top-level `function`/`export function` defined in it (name, line range, destination file)
- [x] Create `app/src/pages/settings/` directory
- [x] Extract `SettingsMediaPage` → `app/src/pages/settings/SettingsMediaPage.tsx`
- [x] Extract `SettingsDownloadClientsPage` → `app/src/pages/settings/SettingsDownloadClientsPage.tsx`
- [x] Extract `SettingsQualityPage` → `app/src/pages/settings/SettingsProfilesPage.tsx`
- [x] Extract `SettingsIndexersPage` → `app/src/pages/settings/SettingsIndexersPage.tsx`
- [x] Extract `SettingsNotificationsPage` → `app/src/pages/settings/SettingsNotificationsPage.tsx`
- [x] Extract `SettingsSubtitlesPage` → `app/src/pages/settings/SettingsSubtitlesPage.tsx`
- [x] Extract `SettingsGeneralPage` → `app/src/pages/settings/SettingsGeneralPage.tsx`
- [x] Extract `SettingsStreamingPage` → `app/src/pages/settings/SettingsStreamingPage.tsx`
- [x] **Test Remediation:** Identify all tests in `tests/` and `app/src/` related to settings (e.g. `api-settings-general.test.ts`, `settings-routes.test.tsx`); update their imports and ensure they pass after extraction.
- [x] Extract any remaining settings route components (audit App.tsx for any missed)
- [x] Update App.tsx `<Route>` elements to import from the new files
- [x] Run `cd app && npm run build` — confirm clean after each extraction batch
- [x] Run `CI=true npm test` — confirm `settings-routes.test.tsx` and other settings tests pass

## Phase 2 — Extract Inline Modals and Shared Components

- [x] Identify all inline modal components defined in `App.tsx` (those not already in a feature directory)
- [x] Move each to its feature directory (e.g. inline indexer edit modal → `components/indexers/`)
- [x] **Test Remediation:** For each extracted modal, find its associated tests (e.g. in `app_src_backup/components/`); update imports and restore to passing status.
- [x] Extract `StaticPage` helper (if still present) to `app/src/components/primitives/StaticPage.tsx`
- [x] Extract any inline type definitions from `App.tsx` to their respective type files
- [x] Update all imports in `App.tsx` for the moved components
- [x] Run `cd app && npm run build` and `CI=true npm test` — confirm clean

## Phase 3 — Final Thinning and Verification

- [x] Verify `App.tsx` is ≤200 lines; if not, identify remaining extractable blocks and extract them
- [x] Remove any unused imports from `App.tsx` (run lint to catch them)
- [x] Confirm no `export function` in `App.tsx` except `App` itself
- [x] Run `cd app && npm run build` — clean build, zero TS errors
- [x] Run `CI=true npm test` — all tests pass
- [x] Run `npm run lint` in `app/` — zero new lint errors introduced (pre-existing errors unchanged)
