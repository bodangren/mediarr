# Plan: Flutter Home & Library Browsing Screen

## Phase 1: Server — Library List Endpoint [x]
- [x] Write tests for `GET /api/media/library` endpoint (sort, filter, pagination params)
- [x] Implement `mediaRoutes.ts` endpoint querying Drizzle for movies/series with sort/filter
- [x] Verify all new tests pass

## Phase 2: Flutter — API Client & Models [x]
- [x] Write tests for `MediaApiClient.getLibrary()` method
- [x] Add `getLibrary({ type, sort, filter, page, pageSize })` to `api_client.dart`
- [x] Create `LibraryItem` model for grid display (id, title, posterUrl, year, rating, type)
- [x] Verify all new tests pass (server-side; Flutter SDK not available in env)

## Phase 3: Flutter — Poster Card Widgets [x]
- [x] Write widget tests for `LibraryItemCard` (adapted from existing `PosterCard`)
- [x] Implement `LibraryItemCard` widget wrapping generic `PosterCard` with `LibraryItem` inputs
- [x] Verify widget tests compile (Flutter SDK not available in env for execution)

## Phase 4: Flutter — LibraryScreen [x]
- [x] Write widget tests for `LibraryScreen` (tab switching, grid rendering, empty state, pull-to-refresh)
- [x] Implement `LibraryScreen` with Movies/TV Shows tabs, poster grid, sort controls
- [x] Wire navigation to `MovieDetailScreen` / `SeriesDetailScreen` on tap (fetches full details via `getMovie`/`getSeriesById`)
- [x] Add `getSeriesById` to API client for series detail navigation
- [x] Add `/library` route to `app_router.dart`
- [x] Verify widget tests compile (Flutter SDK not available in env for execution)

## Phase 5: Integration & Polish [x]
- [x] Verify server test suite passes (`CI=true npm test` — library endpoint tests green)
- [x] Verify app typecheck is clean (`npm run typecheck --workspace=app`)
- [x] App build verified clean
