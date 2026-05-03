# Feature: Flutter Home & Library Browsing Screen

## Context
The Flutter cross-platform client has Search, Activity/Queue, Continue Watching, Calendar, Subtitle, and Quality screens, but lacks a dedicated **Home/Library browsing screen**. The current HomeScreen focuses on Continue Watching and Recently Added, but there is no persistent library browsing view (movie grid, series grid, filtering, sorting) that serves as the primary entry point for exploring the full collection. Tech debt item `bug_manual_test_player_client_findings_20260417` confirms the Flutter client lacks a Home/Continue Watching screen as the primary entry point.

## Problem
Users must rely on the Calendar or Search screens to browse their library. There is no single screen showing the full movie/series library with poster grids, sort/filter controls, and detail navigation — a core *arr workflow.

## Proposed Solution
Add a new **HomeScreen** with two tabbed sections (Movies, TV Shows), each displaying a poster grid with:
- Sort options (by title, year, date added, rating)
- Filter options (by quality profile, genre)
- Poster grid with title/year overlay
- Tap to navigate to existing MovieDetailScreen / SeriesDetailScreen
- Pull-to-refresh for library updates
- Empty state with "Add Media" prompt linking to Search screen

## Affected Files
- `clients/mediarr-client/lib/screens/home_screen.dart` (new)
- `clients/mediarr-client/lib/widgets/movie_poster_card.dart` (new)
- `clients/mediarr-client/lib/widgets/series_poster_card.dart` (new)
- `clients/mediarr-client/lib/services/api_client.dart` (add library list endpoint)
- `server/src/routes/mediaRoutes.ts` (add `/api/media/library` list endpoint with sort/filter params)
- `clients/mediarr-client/lib/router/app_router.dart` (update default route to Home)

## Testing Strategy
- Unit tests for library list endpoint (sort, filter, pagination)
- Widget tests for HomeScreen, MoviePosterCard, SeriesPosterCard
- Integration test verifying router navigates from Home to detail screens
