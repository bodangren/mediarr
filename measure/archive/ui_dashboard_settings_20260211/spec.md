# Specification: Track 7E - Dashboard, Activity & Settings

## Overview
This track delivers Mediarr's centralized operational awareness surfaces: the dashboard overview with aggregate metrics, the health/events feed, the cross-module activity timeline, and the settings management UI.

## Functional Requirements

### FR-1: Unified Dashboard and Health Feed
- Dashboard at `/` with metric cards for:
  - Monitored media count (series + movies) with deep link to `/library/series` and `/library/movies`.
  - Wanted totals (missing episodes + movies) with deep link to `/wanted`.
  - Active queue summary (downloading count, total progress) with deep link to `/queue`.
  - Subtitle backlog (pending/searching wanted subtitles) with deep link to `/subtitles`.
  - Recent operations summary (last 24h event count by type) with deep link to `/activity`.
- Each metric card shows current value, optional trend indicator (vs previous period), and is clickable.
- Cards receive live updates via SSE events (activity, health, torrent stats) updating their values without full page refresh.
- Health/events feed section below cards:
  - Events ordered by severity: critical > warning > ok.
  - Each event shows source (indexer name, service), timestamp, message, and remediation action (e.g., "Test indexer" button, "Retry search" link).
  - Health data sourced from IndexerHealthSnapshot (7A) and any system-level health checks.

### FR-2: Activity Center
- Activity timeline at `/activity` showing cross-module operation records:
  - MEDIA_ADDED, SEARCH_EXECUTED, RELEASE_GRABBED, IMPORT_COMPLETED, SUBTITLE_DOWNLOADED, INDEXER_TESTED
- Each entry shows: timestamp, event type badge, summary text, source entity link, success/failure indicator.
- Filters: by event type (multi-select), date range (last 24h / 7d / 30d / custom), and status (success / failure).
- Pagination with the standard conventions from 7B.
- Drill-down: clicking an activity entry navigates to the related entity (e.g., click a RELEASE_GRABBED event to navigate to the torrent in `/queue`, click MEDIA_ADDED to navigate to the media detail).
- Live updates: new events appear at the top of the timeline via SSE `activity:new` events without requiring manual refresh.

### FR-3: Settings Surface
- Settings page at `/settings` with sections for:
  - **Torrent Limits:** Max active downloads, max active seeds, global download/upload speed limits (with unit display).
  - **Scheduler Intervals:** RSS sync interval, availability check interval, torrent monitoring interval (displayed in human-readable format, stored in seconds).
  - **Path Visibility:** Download path and media path display preferences.
- Each section shows current persisted values with inline edit capability.
- Save action performs partial merge via `PATCH /api/settings` with validation feedback.
- Success confirmation toast on save. Error details displayed inline on validation failure.
- Stale-state detection: if settings were changed by another session, show a "Settings have changed" banner with a refresh action.

## Non-Functional Requirements
- **Data Freshness:** Dashboard metric cards update within 5s of state changes via SSE. Activity timeline shows new events within 2s of emission.
- **Responsiveness:** Dashboard card grid adapts from 1 column (mobile) to 2 columns (tablet) to 4 columns (desktop). Activity timeline is usable at 375px.
- **Accessibility:** Metric cards have descriptive aria labels. Activity timeline supports keyboard navigation between entries.

## Acceptance Criteria
- [ ] Dashboard cards display current aggregates for media, wanted, queue, subtitles, and recent activity.
- [ ] Dashboard cards update live via SSE events.
- [ ] Dashboard cards deep-link to their respective filtered views.
- [ ] Health feed displays severity-ordered events with actionable remediation controls.
- [ ] Activity center shows cross-module timeline with type/date/status filters and pagination.
- [ ] Activity entries deep-link to source entities.
- [ ] Activity timeline receives live updates via SSE.
- [ ] Settings UI reads/writes persisted operational settings with validation and merge behavior.
- [ ] Stale-state detection warns when settings changed externally.
- [ ] Mobile viewport (375px) remains usable for dashboard, activity, and settings.

## Out of Scope
- Queue console and subtitle console (Track 7D).
- E2E journey automation and final hardening (Track 7F).
