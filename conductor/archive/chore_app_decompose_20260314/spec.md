# Spec: App.tsx Decomposition

## Context

`app/src/App.tsx` is over 4,000 lines. It contains the route tree, page-level components,
settings forms, modals, and shared helpers all in one file. Symptoms of this are:

- TS errors caused by type collisions between co-located components (RouteScaffold, ToastInput)
- A change to one settings page risks breaking an unrelated page in the same file
- Components cannot be independently tested without importing the entire App tree
- Contributors cannot find where a page lives by inspection

The target state: `App.tsx` is a pure route tree under 200 lines that imports page components.
Every page-level component has its own file. No `export function` in `App.tsx` except the root
`App` and `SettingsLayout` wrapper (if used there).

## Target File Layout

```
app/src/pages/
  settings/
    SettingsMediaPage.tsx
    SettingsDownloadClientsPage.tsx
    SettingsQualityPage.tsx
    SettingsIndexersPage.tsx
    SettingsNotificationsPage.tsx
    SettingsSubtitlesPage.tsx
    SettingsGeneralPage.tsx
    SettingsImportListsPage.tsx
    SettingsProfilesPage.tsx
    (... one file per settings route)
  dashboard/
    (already exists — verify DashboardPage is not duplicated in App.tsx)
  activity/
    (already exists — verify no duplication)
  (other page groups already have their own dirs — verify no duplication)
```

All modals that are currently inlined inside `App.tsx` move to the component directory
closest to their feature domain (e.g. `AddIndexerModal` stays in `components/indexers/`,
inline indexer-test modals move there too).

## Acceptance Criteria

- `App.tsx` is ≤200 lines and contains only: imports, `<Routes>` tree, and route-wrapping helpers.
- Every settings route component exists in its own file under `app/src/pages/settings/`.
- No `export function Page...` or `export function Settings...` defined directly inside `App.tsx`.
- `cd app && npm run build` succeeds.
- All tests pass (pre-existing 4 server failures only).
- Existing integration tests (`App.test.tsx`, `settings-routes.test.tsx`) still pass without
  modification (they test behaviour, not file structure).
