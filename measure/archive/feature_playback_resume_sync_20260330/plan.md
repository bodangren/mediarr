# Implementation Plan: Playback Resume & Continue Watching

## Phase 1 — Server: Continue Watching Endpoint

- [x] Task: Add `GET /api/playback/continue-watching` to `playbackRoutes.ts` — query PlaybackProgress where `isWatched = false` and `position > 0`, join with Media (Movie/Series) for metadata, sort by `updatedAt` desc, limit 20
- [x] Task: Add `PlaybackRepository.findContinueWatching()` method with the join query
- [x] Task: Write tests for `findContinueWatching` — empty result, single movie, mixed movie+series, watched items excluded
- [x] Task: Measure - Checkpoint Phase 1

## Phase 2 — Flutter: Auto-Resume Playback

- [x] Task: Modify `PlaybackService.play()` in `playback_service.dart` to accept a `resumeFrom` Duration parameter; default to `Duration.zero` if manifest has no resume data
- [x] Task: Update `PlaybackScreen` to read `manifest.resume.position` from the API response and pass it to `PlaybackService.play()`
- [x] Task: Write tests for `PlaybackService` verifying resume offset is applied when provided
- [x] Task: Measure - Checkpoint Phase 2

## Phase 3 — Flutter: Continue Watching Widget

- [x] Task: Add `getContinueWatching()` method to `ApiClient` calling `GET /api/playback/continue-watching`
- [x] Task: Create `ContinueWatchingSection` widget — horizontal scrollable list of media cards with progress bars and one-tap resume navigation to `PlaybackScreen`
- [x] Task: Add the section to `MoviesScreen` and `SeriesScreen` home views (or create a new `HomeScreen` if warranted)
- [x] Task: Write tests for `ContinueWatchingSection` — renders items, hides when empty, progress bar displays correct value
- [x] Task: Measure - Checkpoint Phase 3

## Phase 4 — SPA: Continue Watching Dashboard Widget

- [x] Task: Add `continueWatchingApi.get()` call in SPA API client
- [x] Task: Create `ContinueWatchingWidget` component — card grid with poster thumbnail, title, progress bar, click navigates to media detail page
- [x] Task: Add widget to `DashboardPage.tsx` alongside existing 4 widgets
- [x] Task: Write tests for `ContinueWatchingWidget` — renders items, progress bar, navigation, empty state
- [x] Task: Run `cd app && npm run build` — zero TS errors
- [x] Task: Run `CI=true npm test` — all tests pass
- [x] Task: Run `CI=true bun test` — executed; Vitest-only suites are not Bun-runner-compatible in this repo
- [x] Task: Measure - Checkpoint Phase 4
