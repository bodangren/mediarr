# Plan: System Events Log UI

## Phase 1 — Component + Tests

- [x] Create `app/src/components/system/SystemEventsPage.tsx`
  - `EventLevelBadge` — colour-coded badge for info/warning/error/fatal
  - `SystemEventsPage` — page component using `RouteScaffold`
  - Filter state: `levelFilter`, `typeFilter`, `page`
  - Data fetch via `getApiClients().systemApi.getEvents()`
  - Clear handler calling `systemApi.clearEvents()`
  - Export handler calling `systemApi.exportEvents()` + triggering download
  - Pagination controls (Previous / Next / Page N of M)
  - Loading, error, and empty states

- [x] Create `app/src/components/system/SystemEventsPage.test.tsx`
  - Mock `@/lib/api/client` following `SystemTasksPage.test.tsx` pattern
  - Test: renders page title
  - Test: shows event rows after loading
  - Test: level badge renders correct text
  - Test: level filter select triggers re-fetch with correct params
  - Test: type filter select triggers re-fetch with correct params
  - Test: Clear All button calls `clearEvents` and refreshes
  - Test: Export CSV button calls `exportEvents` with format=csv
  - Test: shows empty state when no events
  - Test: shows error state on API failure

## Phase 2 — Routing + Navigation

- [x] Add route in `app/src/App.tsx`:
  ```tsx
  <Route path="system/events" element={<SystemEventsPage />} />
  ```
  (alongside the existing system/* routes)

- [x] Add nav item in `app/src/lib/navigation.ts` (system section):
  ```ts
  { path: '/system/events', label: 'Events', shortLabel: 'Events', icon: 'AlertCircle' }
  ```

- [x] Add breadcrumb label in `SEGMENT_LABELS`:
  ```ts
  events: 'Events',
  ```

- [x] Add `SystemEventsPage` import to `App.tsx` (lazy or direct, matching existing pattern)

- [x] Run `CI=true npm test --workspace=app` and verify all new tests pass
- [x] Run `cd app && npm run build` and verify production build succeeds
