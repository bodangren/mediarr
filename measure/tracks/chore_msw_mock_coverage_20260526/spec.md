# Spec: MSW Mock Coverage for Backend Routes

## Overview

The frontend test suite uses MSW (Mock Service Worker) to intercept HTTP requests. Currently, only ~35 of ~120 server routes are mocked in `app/src/lib/msw/handlers.ts`. This means frontend integration tests that call unmocked routes either fail or silently skip API verification.

## Problem Statement

Knowledge graph analysis (2026-05-26) found that these backend route domains have zero MSW handlers:

| Domain | Route Count | Impact |
|--------|-------------|--------|
| Backups | 6 routes | Settings backup/restore untestable from frontend |
| Blocklist | 4 routes | Blocklist UI untestable |
| Calendar | 1 route | Calendar page can't be tested with mock data |
| Collections | 7 routes | Collection CRUD untestable |
| Custom Formats | 7 routes | Format editor untestable from frontend |
| Dashboard | 2 routes | Disk space / upcoming widgets untestable |
| Download Client | 2 routes | Download client settings untestable |
| Import Lists | 9 routes | Entire Import List feature untestable |
| Logs | 6 routes | Log viewer untestable |
| Playback/Streaming | 5 routes | Playback flow untestable |
| Quality Profiles | 6 routes | Profile management untestable |
| Setup | 2 routes | Setup wizard untestable |
| Subtitles | 30+ routes | Subtitle management untestable |
| System/Events/Tasks | 10 routes | System pages untestable |
| Updates | 8 routes | Auto-update flow untestable |

## Stories

### S1: Core domain MSW handlers
As a **developer**, I want MSW handlers for movies, series, and indexer routes so that library and search integration tests work without a real server.

**Acceptance Criteria:**
```gherkin
Given MSW handlers for GET /api/movies, GET /api/movies/:id, POST /api/movies, PUT /api/movies/:id, DELETE /api/movies/:id
When a frontend test calls movieApi.getMovies()
Then MSW intercepts and returns mock movie data

Given MSW handlers for GET /api/series, GET /api/series/:id, POST /api/series, DELETE /api/series/:id
When a frontend test calls seriesApi.getSeries()
Then MSW intercepts and returns mock series data

Given MSW handlers for GET /api/indexers, POST /api/indexers, PUT /api/indexers/:id, DELETE /api/indexers/:id
When a frontend test calls indexerApi.getIndexers()
Then MSW intercepts and returns mock indexer data
```

**Estimate:** M
**Priority:** Must

### S2: Settings & config MSW handlers
As a **developer**, I want MSW handlers for settings, quality profiles, download client, and media settings routes so that settings page integration tests work.

**Acceptance Criteria:**
```gherkin
Given MSW handlers for GET /api/settings, PATCH /api/settings
When a frontend test calls settingsApi.getSettings()
Then MSW intercepts and returns mock settings

Given MSW handlers for GET /api/quality-profiles, POST /api/quality-profiles, PUT /api/quality-profiles/:id, DELETE /api/quality-profiles/:id
When a frontend test calls qualityProfileApi.getProfiles()
Then MSW intercepts and returns mock profiles

Given MSW handlers for GET /api/download-client, PUT /api/download-client
When a frontend test calls downloadClientsApi.getConfig()
Then MSW intercepts and returns mock config
```

**Estimate:** M
**Priority:** Must

### S3: System & operations MSW handlers
As a **developer**, I want MSW handlers for system status, events, tasks, and activity routes so that system page integration tests work.

**Acceptance Criteria:**
```gherkin
Given MSW handlers for GET /api/system/status, GET /api/system/events
When a frontend test calls systemApi.getStatus()
Then MSW intercepts and returns mock status

Given MSW handlers for GET /api/tasks/queued, GET /api/tasks/scheduled, GET /api/tasks/history
When a frontend test calls systemApi.getQueuedTasks()
Then MSW intercepts and returns mock tasks

Given MSW handlers for GET /api/activity, DELETE /api/activity
When a frontend test calls activityApi.getActivity()
Then MSW intercepts and returns mock activity events
```

**Estimate:** M
**Priority:** Should

### S4: Subtitle & playback MSW handlers
As a **developer**, I want MSW handlers for subtitle and playback routes so that subtitle management and playback integration tests work.

**Acceptance Criteria:**
```gherkin
Given MSW handlers for GET /api/subtitles/wanted/movies, GET /api/subtitles/wanted/series, POST /api/subtitles/search, POST /api/subtitles/download
When a frontend test calls subtitleWantedApi.getWantedMovies()
Then MSW intercepts and returns mock wanted subtitles

Given MSW handlers for GET /api/playback/continue-watching, POST /api/playback/progress
When a frontend test calls playbackApi.getContinueWatching()
Then MSW intercepts and returns mock playback data
```

**Estimate:** M
**Priority:** Should

### S5: Remaining domains
As a **developer**, I want MSW handlers for backups, blocklist, calendar, collections, custom formats, import lists, logs, and updates so that all remaining frontend pages are testable.

**Acceptance Criteria:**
```gherkin
Given MSW handlers for all backup endpoints
When a frontend test calls backupApi.getBackups()
Then MSW intercepts and returns mock backup data

Given MSW handlers for all collection endpoints
When a frontend test calls collectionApi.getCollections()
Then MSW intercepts and returns mock collections

Given MSW handlers for all import list endpoints
When a frontend test calls importListsApi.getLists()
Then MSW intercepts and returns mock import lists

Given MSW handlers for all update endpoints
When a frontend test calls updatesApi.checkForUpdates()
Then MSW intercepts and returns mock update info
```

**Estimate:** L
**Priority:** Could

## Out of Scope
- Changing backend route behavior
- Testing the MSW handlers themselves (they're test infrastructure, not application code)
- Creating mock data factories (use inline objects per test)
