# Spec: System Events Log UI

## Problem

The backend exposes a fully-featured System Events API (`GET /api/system/events`,
`DELETE /api/system/events/clear`, `GET /api/system/events/export`) and the frontend
API client already implements `getEvents()`, `clearEvents()`, and `exportEvents()`.
However, there is **no frontend page** that surfaces these events to the user. The
`/system/events` route does not exist in App.tsx and there is no nav link.

## Goal

Create a `SystemEventsPage` React component and wire it into the application so
operators can browse, filter, clear, and export system event logs from the UI.

## Acceptance Criteria

1. A new route `/system/events` renders `SystemEventsPage`.
2. A nav item "Events" appears under the System section in the sidebar.
3. The page renders a paginated table of system events (newest first).
4. Users can filter by **level** (info / warning / error / fatal) via a `<select>`.
5. Users can filter by **type** (system / indexer / network / download / import /
   health / update / backup / other) via a `<select>`.
6. Each event row shows: timestamp, level badge (colour-coded), type, message, source.
7. A **Clear All** button calls `clearEvents()` and refreshes the list.
8. An **Export CSV** button calls `exportEvents({ format: 'csv' })` and triggers a
   browser download.
9. The page uses `RouteScaffold` with `title="Events"` and a descriptive subtitle.
10. An error state is displayed when the API call fails.
11. An empty state is displayed when no events match the filters.
12. Component tests achieve ≥80% coverage of the component's logic.

## Out of Scope

- Date-range picker (text-input date filters are not required for this track).
- Individual event detail modal.
- Real-time SSE streaming into this page (future track).
