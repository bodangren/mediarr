# Flutter Media Detail Page Plan

## Phase 1: Backend API Audit & Navigation Contract (TDD)

- [ ] Audit existing `GET /api/movies/:id` and `GET /api/series/:id` response shapes
- [ ] Verify episode-list shape matches what `EpisodeList` widget will need (no missing fields)
- [ ] Define `MovieDetailRoute` and `SeriesDetailRoute` navigation contracts (GoRouter or Navigator 2.0)
- [ ] Write navigation test: tapping a movie in `LibraryScreen` pushes `MovieDetailScreen` with correct `movieId`
- [ ] Write navigation test: tapping a series in `LibraryScreen` pushes `SeriesDetailScreen` with correct `seriesId`
- [ ] Write navigation test: back gesture/button returns to `LibraryScreen`
- [ ] Run tests — expect RED

## Phase 2: Shared Components (TDD)

- [ ] Write widget tests for `MediaHero` — renders backdrop, poster, title, action buttons
- [ ] Write widget tests for `MetadataSection` — renders synopsis, genres, rating, cast chips
- [ ] Write widget tests for `ActionBar` — primary/secondary buttons fire callbacks, destructive action shows confirmation
- [ ] Write widget tests for `FileInfoCard` — displays quality, size, path, audio/subtitle summary
- [ ] Write widget tests for `EpisodeList` — renders episodes grouped by season, season selector works
- [ ] Implement `MediaHero`, `MetadataSection`, `ActionBar`, `FileInfoCard`, `EpisodeList`
- [ ] Run widget tests — expect GREEN

## Phase 3: Movie Detail Screen (TDD)

- [ ] Write widget tests for `MovieDetailScreen` — loading state, error state, success state
- [ ] Write widget tests for `MovieDetailScreen` — play action passes correct `movieId` to player route
- [ ] Write widget tests for `MovieDetailScreen` — delete action shows confirmation and calls delete API
- [ ] Write widget tests for `MovieDetailScreen` — search upgrade action calls search API and shows snackbar
- [ ] Implement `MovieDetailScreen` using shared components and existing API client
- [ ] Wire `MovieDetailScreen` into navigation graph from `LibraryScreen` movie tap
- [ ] Run widget tests — expect GREEN

## Phase 4: Series Detail Screen (TDD)

- [ ] Write widget tests for `SeriesDetailScreen` — loading, error, success states
- [ ] Write widget tests for `SeriesDetailScreen` — season selector filters episode list
- [ ] Write widget tests for `SeriesDetailScreen` — episode play action routes to player with `episodeId`
- [ ] Write widget tests for `SeriesDetailScreen` — episode search action triggers per-episode search
- [ ] Write widget tests for `SeriesDetailScreen` — series-level "Search All Missing" and "Delete Series" actions
- [ ] Implement `SeriesDetailScreen` using shared components and typed series API response
- [ ] Wire `SeriesDetailScreen` into navigation graph from `LibraryScreen` series tap
- [ ] Run widget tests — expect GREEN

## Phase 5: Integration & Verification

- [ ] Manual smoke test: open movie detail → verify metadata, file info, play, and delete
- [ ] Manual smoke test: open series detail → verify seasons, episodes, per-episode play, series-level search
- [ ] Run `flutter test` — all widget and unit tests green
- [ ] Run `flutter analyze` — zero lint issues
- [ ] Run root `CI=true npm test` — server + SPA suites still green
- [ ] Commit and push
