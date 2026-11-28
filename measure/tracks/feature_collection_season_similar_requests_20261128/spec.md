# Spec — Request missing collection parts, missing seasons, and "similar" titles

## Owner request (2026-11-28)

> *"In movie collections, I want to be able to use a context menu to 'request' the missing parts of
> the collection. Same for the seasons in series. And under movie or series details, can we list
> 'similar' which maybe we get from TMDB (show availability and offer a context menu with request
> again)."*

## Measured (before)

- `POST /api/collections/:id/search` called `CollectionService.searchMissingMovies`, which only
  **counted** missing movies — the comment in the code said "in a full implementation this would
  trigger searches". The collection page had a flat "Search for Missing" button and a "Missing"
  badge per movie; there was no context menu and no request actually reached the search worker.
- Series detail had a per-season interactive "Search" button (release picker) but no automatic
  "request this season" action; there was no header action for the whole missing set.
- No "similar" data existed anywhere in the server or SPA (only a Levenshtein title-similarity helper
  inside filename parsing). A working TMDB read-access token is configured in `AppSettings.apiKeys`
  and `GET /movie/{id}/similar` answers 200 live, so TMDB is a usable source.

## Requirements

1. **Collection context menu — request missing parts.** One action that (a) syncs the TMDB parts into
   the library as `Movie` rows if absent, (b) monitors every part that has no file, (c) hands each to
   the search worker (`WantedSearchService.autoSearchMovie`) and returns honest counts
   (`created`, `monitored`, `searched`, `missing`, `total`). A completed collection answers
   "Collection is complete — nothing to request".
2. **Season context menu — request missing parts.** Per-season action that monitors the season and
   its episodes, then hands the series to `autoSearchSeries`; a header action requests every season
   at once. Unknown season → 404; bad id → 422. The interactive "Search" picker stays available.
3. **Similar titles on movie/series details.** `GET /api/movies/:id/similar` and
   `GET /api/series/:id/similar` return TMDB `similar` results mapped to
   `{mediaType, tmdbId, title, year, posterUrl, overview, voteAverage, inLibrary, libraryId}`.
   Series resolve the TMDB id from `tvdbId` via `/find/{tvdbId}?external_source=tvdb_id` when the row
   has none. Library availability is matched by TMDB id.
4. **Similar section UI.** "More like this" grid on both detail pages: poster, year, rating,
   **In library / Missing** badge; in-library titles deep-link, missing movies offer
   **Request movie** in a context menu (add-to-wanted with `searchNow`), and every missing title also
   offers **Search & add** (series are added through the search screen because TVDB identity is
   required). TMDB key missing / provider failure degrades to a note, not a broken page.
5. No new REST calls from automation; these are client contracts only.

## Acceptance

- Red tests first: `CollectionService.requestMissingMovies` (creates+monitors+searches, complete
  collection searches nothing), the series season request routes (200/404/422, monitors seasons and
  episodes, fires one search), `SimilarTitlesService` (mapping, availability, TVDB→TMDB resolution,
  missing-key/provider errors), and the SPA (collection menu action calls the API, similar grid shows
  availability and request menu).
- `npx tsc -p server/tsconfig.json --noEmit`, `npx tsc -p app/tsconfig.json --noEmit`, server
  vitest suites for the touched files, SPA vitest suites for the touched components, and the SPA
  production build all clean.
- Live: engine reloaded with the routes; `GET /api/movies/:id/similar` returns real TMDB rows with
  availability; the season request endpoint answers for a real series without corrupting monitoring
  state (monitoring is what the owner asked for; the search hand-off is logged).
