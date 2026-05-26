# Spec: Server Service Test Coverage Gap Remediation

## Overview

Knowledge graph analysis (2026-05-26) found 30 server service files with no dedicated `.test.ts`. This track targets the 10 highest-risk ones — services that manage critical data flows: task scheduling, settings CRUD, media lifecycle, search orchestration, and subtitle processing.

## Problem Statement

These services are only exercised through route-level integration tests. A logic bug in the service layer would be masked by the route handler's error handling and only surface as a wrong HTTP response, making debugging difficult.

### Target services (priority order)

| # | Service | File | Why it's high-risk |
|---|---------|------|--------------------|
| 1 | `Scheduler` | `server/src/services/Scheduler.ts` | Core cron orchestration — if jobs don't register, the entire automation pipeline stops |
| 2 | `SettingsService` | `server/src/services/SettingsService.ts` | Central config management — if reads/writes fail, every feature breaks |
| 3 | `EpisodeService` | `server/src/services/EpisodeService.ts` | Episode CRUD — data corruption here affects the entire TV library |
| 4 | `SeriesService` | `server/src/services/SeriesService.ts` | Series CRUD — same as above for series-level data |
| 5 | `TvSearchService` | `server/src/services/TvSearchService.ts` | TV-specific search orchestration — broken = no TV search results |
| 6 | `MediaSearchService` | `server/src/services/MediaSearchService.ts` | Has corner-case tests but no base `.test.ts` for core methods |
| 7 | `SubtitleNamingService` | `server/src/services/SubtitleNamingService.ts` | Generates subtitle file paths — wrong paths = subtitles not found |
| 8 | `SubtitleRequirementEngine` | `server/src/services/SubtitleRequirementEngine.ts` | Determines which subtitles are needed — wrong = missing or extra subs |
| 9 | `SubtitleProviderFactory` | `server/src/services/SubtitleProviderFactory.ts` | Creates provider instances — broken = all subtitle fetching fails |
| 10 | `FilterService` | `server/src/services/FilterService.ts` | Custom filter CRUD and evaluation — broken = library filtering broken |

## Stories

### S1: Scheduler service tests
As a **developer**, I want `Scheduler` to have unit tests so that cron job registration, execution, and error handling are verified.

**Acceptance Criteria:**
```gherkin
Given a Scheduler with mock cron and mock services
When start() is called
Then all expected cron jobs are registered (rssSync, wantedSearchMovies, wantedSearchSeries, libraryScan, subtitleSync)

Given a registered job
When the cron trigger fires
Then the job handler executes and logs success

Given a job handler that throws
When the cron trigger fires
Then the error is caught, logged, and does not crash the scheduler

Given a Scheduler is stopped
When stop() is called
Then all cron jobs are cleared
```

**Estimate:** M
**Priority:** Must

### S2: SettingsService tests
As a **developer**, I want `SettingsService` to have unit tests so that settings read, write, and merge operations are verified.

**Acceptance Criteria:**
```gherkin
Given a mock AppSettingsRepository
When getSettings() is called
Then it returns the full settings object from the repository

Given partial update payload
When updateSettings(payload) is called
Then only the provided fields are merged and persisted

Given an empty update payload
When updateSettings({}) is called
Then the existing settings are not modified

Given the repository throws on read
When getSettings() is called
Then the error propagates
```

**Estimate:** S
**Priority:** Must

### S3: EpisodeService tests
As a **developer**, I want `EpisodeService` to have unit tests so that episode CRUD and monitoring toggle are verified.

**Acceptance Criteria:**
```gherkin
Given a mock SeriesRepository
When getEpisodesBySeriesId(seriesId) is called
Then it returns episodes from the repository filtered by series

Given a mock repository
When updateEpisode(id, data) is called
Then it delegates to the repository with correct parameters

Given a monitored episode
When toggleMonitoring(id, false) is called
Then the episode's monitored field is set to false
```

**Estimate:** S
**Priority:** Must

### S4: SeriesService tests
As a **developer**, I want `SeriesService` to have unit tests so that series CRUD, monitoring toggle, and bulk operations are verified.

**Acceptance Criteria:**
```gherkin
Given a mock repository
When getSeries() is called
Then it returns all series from the repository

Given a mock repository
When getSeriesById(id) is called
Then it returns the matching series or null

Given a bulk update payload with 3 series
When bulkUpdate(changes) is called
Then each series is updated via the repository
```

**Estimate:** S
**Priority:** Must

### S5: TvSearchService tests
As a **developer**, I want `TvSearchService` to have unit tests so that TV-specific search orchestration is verified.

**Acceptance Criteria:**
```gherkin
Given a mock MetadataProvider
When searchSeries(query) is called
Then it delegates to the metadata provider with the query
And returns mapped SeriesSearchResult[]

Given a query with special characters
When searchSeries is called
Then the query is sanitized before passing to the provider
```

**Estimate:** S
**Priority:** Should

### S6: MediaSearchService base tests
As a **developer**, I want `MediaSearchService` to have a base test file covering core public methods (searchAllIndexers, grabRelease) so that the service is tested independently of corner cases.

**Acceptance Criteria:**
```gherkin
Given mock indexers returning results
When searchAllIndexers(params) is called
Then results from all indexers are aggregated and scored

Given a release to grab
When grabRelease(release) is called
Then it delegates to TorrentManager.addTorrent with correct parameters

Given an indexer that times out
When searchAllIndexers is called
Then the timeout is handled gracefully and other indexer results are still returned
```

**Estimate:** M
**Priority:** Should

### S7: SubtitleNamingService tests
As a **developer**, I want `SubtitleNamingService` to have unit tests so that subtitle file path generation is verified.

**Acceptance Criteria:**
```gherkin
Given a media file path and language code
When generatePath is called
Then it returns the correct subtitle file path (e.g., movie.en.srt)

Given forced and HI flags
When generatePath is called
Then the path includes the correct suffix (e.g., movie.en.forced.srt)
```

**Estimate:** S
**Priority:** Should

### S8: SubtitleRequirementEngine tests
As a **developer**, I want `SubtitleRequirementEngine` to have unit tests so that subtitle requirement computation is verified.

**Acceptance Criteria:**
```gherkin
Given a language profile with English (required) and French (optional)
And existing subtitle tracks for English
When compute is called
Then it returns English as satisfied and French as missing

Given all profile languages have existing tracks
When compute is called
Then it returns all as satisfied and none as missing
```

**Estimate:** S
**Priority:** Should

### S9: SubtitleProviderFactory tests
As a **developer**, I want `SubtitleProviderFactory` to have unit tests so that provider instantiation is verified.

**Acceptance Criteria:**
```gherkin
Given provider config for "openSubtitles"
When createProvider is called
Then it returns an OpenSubtitlesProvider instance

Given provider config for "subdl"
When createProvider is called
Then it returns a SubdlProvider instance

Given an unknown provider name
When createProvider is called
Then it throws an error
```

**Estimate:** S
**Priority:** Could

### S10: FilterService tests
As a **developer**, I want `FilterService` to have unit tests so that custom filter CRUD and evaluation are verified.

**Acceptance Criteria:**
```gherkin
Given a mock repository
When createFilter(input) is called
Then it delegates to the repository and returns the created filter

Given filter conditions
When evaluate(filter, media) is called
Then it returns true/false based on condition matching

Given a mock repository
When deleteFilter(id) is called
Then it delegates to the repository
```

**Estimate:** M
**Priority:** Could

## Out of Scope
- Testing repository layer (each repository has its own tests)
- Testing route handlers (separate integration test concern)
- Performance/load testing of Scheduler
