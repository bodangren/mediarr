# Collections were empty — backfilled from TMDB (2026-11-09)

## Cause
`Collection` rows are only created when a movie is added through the UI (`POST /api/movies` with
`tmdbCollectionId` → `CollectionService.linkMovieToCollection`). The existing 567-movie library predates that
path, so `Collection` had **0 rows** and the TV Collections screen (GET /api/collections) was empty.

## Fix
- **`POST /api/collections/backfill`** (`limit` 1–500): for movies with `collectionId = null` and a TMDB id,
  ask TMDB whether the movie belongs to a collection and link it; returns
  `{scanned, linked, noCollection, failed, remaining}`.
- **`backfillMovieCollections`** service + daily **`collection-backfill`** job (05:00, limit 100). It remembers
  standalone TMDB ids in `collection-backfill-state.json`, so scheduled runs do not re-query the 371 films
  that genuinely belong to no collection.
- Route test and service test (single pass + standalone memory); tsc clean.

## Live result
```
call 1: scanned 500, linked 167, noCollection 333, failed 0, remaining 400
call 2: scanned 400, linked  29, noCollection 371, failed 0, remaining 371
DB: 112 collections, 196 movies linked
```
TV 1.3.67 Collections screen now lists 112 collections with counts, e.g.
28 Days/Weeks/Years (2 of 2), Alien (4 of 4), Bad Boys (4 of 4), Beetlejuice (1 of 1) —
`tv-collections-populated-20261109.png`.
