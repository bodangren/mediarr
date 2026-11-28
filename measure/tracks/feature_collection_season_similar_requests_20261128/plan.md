# Request missing parts (collections/seasons) + similar titles — Plan

Spec: `spec.md`.

## Phase 1 — Server: real collection/season requests and TMDB similar [checkpoint: 61b275c]

- [x] Task: Write the failing tests — `CollectionService.requestMissingMovies` (sync + monitor + — 61b275c
  hand each missing part to the search worker; complete collection searches nothing), the series
  season request routes (per-season 200/404/422 and all-seasons default; monitors season+episodes,
  fires one search), and `SimilarTitlesService` (TMDB mapping, library availability, TVDB→TMDB
  resolution, missing-key/provider errors). Red confirmed before each implementation. — 61b275c
- [x] Task: Implement `requestMissingMovies`, the `/api/series/:id/seasons/:n/request` and — 61b275c
  `/api/series/:id/request-missing-seasons` routes, `SimilarTitlesService` plus
  `/api/movies/:id/similar` and `/api/series/:id/similar`, and rewrite
  `POST /api/collections/:id/search` to perform the request. — 61b275c
- [x] Task: Measure — User Manual Verification 'Phase 1': run the touched server suites and — 61b275c
  `npx tsc -p server/tsconfig.json --noEmit`. Evidence: collection request 2/2, season routes 3/3,
  similar service 3/3, `tsc` clean. — 61b275c

## Phase 2 — SPA: context menus and the similar section [checkpoint: 61b275c]

- [x] Task: Write the failing tests — collection actions menu offers/requests the missing parts; — 61b275c
  `SimilarTitlesSection` shows availability, deep-links in-library titles, requests a missing movie,
  exposes search-and-add, and degrades to a note on error. — 61b275c
- [x] Task: Implement `RowActionMenu`, the similar schema + `movieApi/seriesApi.getSimilar`, — 61b275c
  `seriesApi.requestSeason/requestMissingSeasons`, `collectionApi` richer response, the collection
  context menu, the series season menus/header action, and the "More like this" sections on movie
  and series details. — 61b275c
- [x] Task: Measure — User Manual Verification 'Phase 2': SPA suites for the touched components and — 61b275c
  `npx tsc -p app/tsconfig.json --noEmit`. Evidence: collection page 9/9, similar section 3/3,
  movie/series detail manage suites green (61 tests across the 7 affected files), `vite build`
  clean. — 61b275c

## Phase 3 — Ship live, verify, close

- [~] Task: Reload the engine at an idle slot; verify `GET /api/movies/:id/similar` returns real TMDB
  rows with availability and the request routes answer; build the SPA. Progress: SPA built and
  committed; TMDB `/movie/603/similar` verified 200 live with the configured key; engine reload
  deferred because the owner is watching episode 4884 (reloading would cut playback).
- [ ] Task: Update `measure/tracks.md`, record the outcome, and archive the track.
