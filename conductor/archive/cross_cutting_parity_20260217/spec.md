# Spec: Cross-Cutting Parity Features

## Overview

Deliver shared features that span multiple reference apps and don't belong to a single domain. The gap analysis (2026-02-17) identified custom formats, import lists, calendar sync, dashboard widgets, activity filtering, and resilience improvements as gaps affecting the entire platform.

## Functional Requirements

### FR-1: Custom Formats System
- Custom format definitions: name, conditions (release title regex, quality, size, language, indexer flags).
- Scoring system: each format has a score; release total score used for quality ranking.
- Custom format CRUD in settings.
- Apply custom formats to quality profiles (score per format per profile).
- Display custom format scores on release candidates in search results.
- Backend: Prisma model for CustomFormat, `GET/POST/PUT/DELETE /api/custom-formats`, scoring engine in release evaluation.

### FR-2: Import Lists Framework
- Generic import list system supporting multiple sources.
- Initial providers: TMDB Popular, TMDB List, Trakt List, IMDb List.
- Import list configuration: source, root folder, quality profile, monitoring type, auto-add.
- Scheduled sync (configurable interval via node-cron).
- Exclusion management: exclude specific items from auto-add.
- Settings > Import Lists page with CRUD.
- Backend: Prisma model for ImportList/ImportListExclusion, `GET/POST/PUT/DELETE /api/import-lists`, `POST /api/import-lists/:id/sync`, `GET/POST/DELETE /api/import-lists/exclusions`.

### FR-3: Calendar iCal & RSS Sync
- iCal feed endpoint generating .ics file for upcoming releases.
- RSS feed endpoint for calendar events.
- "Search Missing" button on calendar that triggers search for all missing items in date range.
- Frontend: enable currently-disabled iCal/RSS/Search Missing buttons.
- Backend: `GET /api/calendar/ical`, `GET /api/calendar/rss`, `POST /api/calendar/search-missing`.

### FR-4: Dashboard Widgets
- Calendar widget showing upcoming releases (next 7 days).
- Disk space widget showing volume usage.
- Activity feed widget showing recent events.
- Library stats widget (total movies, series, episodes, subtitle coverage).
- Health status widget (system health checks summary).
- Backend: `GET /api/system/disk-space`, extend `GET /api/system/health`.

### FR-5: Activity Filtering & Enrichment
- Filter controls on activity/history pages: by type, date range, status, media type.
- Backend query parameter support for all filter dimensions.
- Enriched event details in expansion modal.

### FR-6: Resilience & Error Handling
- Retry logic for MetadataProvider (SkyHook) with exponential backoff.
- WebTorrent failure surfacing in Health endpoint.
- Graceful degradation when indexers are unreachable.
- User-facing error toasts with actionable messages.

### FR-7: Cardigann Indexer Form Completion
- Carry forward from archived fix_core_parity_wiring Phase 4:
  - Implementation type selector in indexer create flow.
  - Definition-lookup for Cardigann field schemas (not JSON.parse fallback).
  - API endpoint returning field definitions for a given configContract.
- Conditional field rendering in DynamicForm (watch-based show/hide).

### FR-8: Real Subtitle Download Completion
- Carry forward from archived fix_core_parity_wiring Phase 4:
  - OpenSubtitlesProvider.download() — fetch via download API, return file content.
  - SubtitleInventoryApiService.manualDownload() — write file to disk.
  - Replace alert() in subtitle manual search with toast notifications.

## Non-Functional Requirements

- Import list sync must not block the main event loop (use async worker pattern).
- Custom format scoring must complete in <100ms per release.
- iCal feed must be valid per RFC 5545.
- All new endpoints must have >80% test coverage.

## Acceptance Criteria

1. Custom formats can be created with conditions and scores; applied to quality profiles; scores shown on releases.
2. Import lists sync from TMDB/Trakt/IMDb and auto-add media with exclusion support.
3. Calendar provides iCal/RSS feeds; Search Missing works for date ranges.
4. Dashboard shows calendar, disk space, activity, library stats, and health widgets.
5. Activity pages support filtering by type, date, status, and media type.
6. MetadataProvider retries on failure; WebTorrent failures appear in health.
7. Cardigann indexer form uses definition-lookup and supports conditional fields.
8. Subtitle manual download writes files to disk with toast feedback.

## Out of Scope

- DLNA/streaming (separate Track 8).
- Authentication/authorization.
- Multi-user support.
- External API for third-party clients.
