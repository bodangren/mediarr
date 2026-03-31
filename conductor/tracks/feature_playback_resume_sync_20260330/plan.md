# Implementation Plan: Playback Resume & Continue Watching

## Phase 1 — Server: Continue Watching Endpoint

- [ ] Task: Add `GET /api/playback/continue-watching` to `playbackRoutes.ts` — query PlaybackProgress where `isWatched = false` and `position > 0`, join with Media (Movie/Series) for metadata, sort by `updatedAt` desc, limit 20
- [ ] Task: Add `PlaybackRepository.findContinueWatching()` method with the join query
- [ ] Task: Write tests for `findContinueWatching` — empty result, single movie, mixed movie+series, watched items excluded
- [ ] Task: Conductor - Checkpoint Phase 1

## Phase 2 — Flutter: Auto-Resume Playback

- [ ] Task: Modify `PlaybackService.play()` in `playback_service.dart` to accept a `resumeFrom` Duration parameter; default to `Duration.zero` if manifest has no resume data
- [ ] Task: Update `PlaybackScreen` to read `manifest.resume.position` from the API response and pass it to `PlaybackService.play()`
- [ ] Task: Write tests for `PlaybackService` verifying resume offset is applied when provided
- [ ] Task: Conductor - Checkpoint Phase 2

## Phase 3 — Flutter: Continue Watching Widget

- [ ] Task: Add `getContinueWatching()` method to `ApiClient` calling `GET /api/playback/continue-watching`
- [ ] Task: Create `ContinueWatchingSection` widget — horizontal scrollable list of media cards with progress bars and one-tap resume navigation to `PlaybackScreen`
- [ ] Task: Add the section to `MoviesScreen` and `SeriesScreen` home views (or create a new `HomeScreen` if warranted)
- [ ] Task: Write tests for `ContinueWatchingSection` — renders items, hides when empty, progress bar displays correct value
- [ ] Task: Conductor - Checkpoint Phase 3

## Phase 4 — SPA: Continue Watching Dashboard Widget

- [ ] Task: Add `continueWatchingApi.get()` call in SPA API client
- [ ] Task: Create `ContinueWatchingWidget` component — card grid with poster thumbnail, title, progress bar, click navigates to media detail page
- [ ] Task: Add widget to `DashboardPage.tsx` alongside existing 4 widgets
- [ ] Task: Write tests for `ContinueWatchingWidget` — renders items, progress bar, navigation, empty state
- [ ] Task: Run `cd app && npm run build` — zero TS errors
- [ ] Task: Run `CI=true npm test` — all tests pass
- [ ] Task: Run `CI=true bun test` — server tests pass
- [ ] Task: Conductor - Checkpoint Phase 4
