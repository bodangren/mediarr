# Request missing parts (collections/seasons) + similar titles — Plan

Spec: `spec.md`.

## Phase 1 — Server: real collection/season requests and TMDB similar [checkpoint: TBD]

- [ ] Task: Write the failing tests — `CollectionService.requestMissingMovies` (sync + monitor +
  hand each missing part to the search worker; complete collection searches nothing), the series
  season request routes (per-season 200/404/422 and all-seasons default; monitors season+episodes,
  fires one search), and `SimilarTitlesService` (TMDB mapping, library availability, TVDB→TMDB
  resolution, missing-key/provider errors).
- [ ] Task: Implement `requestMissingMovies`, the `/api/series/:id/seasons/:n/request` and
  `/api/series/:id/request-missing-seasons` routes, `SimilarTitlesService` plus
  `/api/movies/:id/similar` and `/api/series/:id/similar`, and rewrite
  `POST /api/collections/:id/search` to perform the request.
- [ ] Task: Measure — User Manual Verification 'Phase 1': run the touched server suites and
  `npx tsc -p server/tsconfig.json --noEmit`.

## Phase 2 — SPA: context menus and the similar section [checkpoint: TBD]

- [ ] Task: Write the failing tests — collection actions menu offers/requests the missing parts;
  `SimilarTitlesSection` shows availability, deep-links in-library titles, requests a missing movie,
  exposes search-and-add, and degrades to a note on error.
- [ ] Task: Implement `RowActionMenu`, the similar schema + `movieApi/seriesApi.getSimilar`,
  `seriesApi.requestSeason/requestMissingSeasons`, `collectionApi` richer response, the collection
  context menu, the series season menus/header action, and the "More like this" sections on movie
  and series details.
- [ ] Task: Measure — User Manual Verification 'Phase 2': SPA suites for the touched components and
  `npx tsc -p app/tsconfig.json --noEmit`.

## Phase 3 — Ship live, verify, close

- [ ] Task: Reload the engine at an idle slot; verify `GET /api/movies/:id/similar` returns real TMDB
  rows with availability and the request routes answer; build the SPA.
- [ ] Task: Update `measure/tracks.md`, record the outcome, and archive the track.
