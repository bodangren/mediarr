# Plan: Subtitle UI Reporting & Targeted Search

## Phases

### Phase 1: Fix Movie Subtitle Badge (Library Card)
**Goal:** The `MovieOverviewCard` always shows gray for subtitle status; fix it to use the correct colored badge.

- [x] In `app/src/components/views/MovieOverviewView.tsx` line ~133, change hardcoded gray badge classes to use `subtitleStatusBadgeClass(subtitleSummary.status)`. Import `subtitleStatusBadgeClass` from `@/lib/subtitles/coverage`.
- [x] Write/update test in `MovieOverviewView.test.tsx` (or nearest test file) verifying that a movie with subtitles renders a non-gray badge.

### Phase 2: On-Demand Subtitle Search Buttons
**Goal:** Add "Search Subtitles" action to movie detail page and season header in series detail page.

#### Movie Detail Page (`App.tsx` — `MovieDetailPage`)
- [x] Add `isSearchingSubtitles` state (`useState(false)`)
- [x] Add `handleSearchSubtitles` async handler that calls `api.subtitleApi.searchMovieSubtitles(movie.id)`, showing a toast on start/success/failure
- [x] Add "Search Subtitles" button in the Controls section (after "Manual Subtitles" button), disabled while `isSearchingSubtitles`

#### Series Detail Page (`App.tsx` — `SeriesDetailPage`)
- [x] Add `searchingSubtitlesSeason` state (`useState<number | null>(null)`) to track which season is being searched
- [x] Add `handleSearchSeasonSubtitles(seasonNumber: number)` handler that calls `api.subtitleApi.searchSeasonSubtitles(series.id, seasonNumber)`
- [x] Since the existing server endpoint searches the whole series, add a new `POST /api/subtitles/series/:id/season/:seasonNumber/search` route on the server
- [x] Add frontend API method `searchSeasonSubtitles(seriesId: number, seasonNumber: number)` to `subtitleApi.ts`
- [x] Add route to `routeMap.ts`: `subtitleSeasonSearch: (seriesId: number, season: number) => string`
- [x] Add "Sub Search" button in each season header row in `SeriesDetailPage`, disabled while that season is being searched

### Phase 3: Targeted Daily Subtitle Search
**Goal:** Replace the exhaustive "search ALL variants" daily cycle with a targeted "search recently-added + failed" cycle.

- [x] Add `runTargetedAutomationCycle(options?: { recentDays?: number; limit?: number }): Promise<SubtitleAutomationStats>` to `SubtitleAutomationService`:
  - Only syncs variants for: (a) movies/episodes added in the last `recentDays` days (default 7), and (b) variants that already have a `FAILED` WantedSubtitle record
  - Calls `processWantedQueue(limit)` as before to fetch/download any PENDING or FAILED items
- [x] Update `Scheduler` to add `scheduleTargetedSubtitleSearch` method
- [x] Update `main.ts` to use the targeted method for the scheduled job
- [x] Write tests in `SubtitleAutomationService.test.ts` for `runTargetedAutomationCycle` verifying it only processes recent/failed variants
