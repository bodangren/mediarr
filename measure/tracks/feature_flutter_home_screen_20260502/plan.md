# Plan: Flutter Home & Library Browsing Screen

## Phase 1: Server — Library List Endpoint
- [ ] Write tests for `GET /api/media/library` endpoint (sort, filter, pagination params)
- [ ] Implement `mediaRoutes.ts` endpoint querying Drizzle for movies/series with sort/filter
- [ ] Verify all new tests pass

## Phase 2: Flutter — API Client & Models
- [ ] Write tests for `MediaApiClient.getLibrary()` method
- [ ] Add `getLibrary({ type, sort, filter, page, pageSize })` to `api_client.dart`
- [ ] Create `LibraryItem` model for grid display (id, title, posterUrl, year, rating, type)
- [ ] Verify all new tests pass

## Phase 3: Flutter — Poster Card Widgets
- [ ] Write widget tests for `MoviePosterCard` and `SeriesPosterCard`
- [ ] Implement poster card widgets with title/year overlay, tap callback
- [ ] Verify all new tests pass

## Phase 4: Flutter — HomeScreen
- [ ] Write widget tests for `HomeScreen` (tab switching, grid rendering, empty state, pull-to-refresh)
- [ ] Implement `HomeScreen` with Movies/TV Shows tabs, poster grid, sort/filter controls
- [ ] Wire navigation to MovieDetailScreen / SeriesDetailScreen on tap
- [ ] Set HomeScreen as default route in `app_router.dart`
- [ ] Verify all new tests pass

## Phase 5: Integration & Polish
- [ ] Write integration test: Home → tap poster → detail screen → back
- [ ] Verify full test suite passes (`CI=true npm test`)
- [ ] Verify build is clean
