# Plan: RssMediaMonitor + RssSyncService Corner-Case Testing

## Phase 1 — RssMediaMonitor TV Matching Corner Cases

- [x] 1.1 Test season pack release (empty episodeNumbers) — `episodeNumbers[0]` is `undefined`
- [x] 1.2 Test multi-episode release (S01E01E02) — only first episode matched
- [x] 1.3 Test series matched but episode not found (wrong season/episode)
- [x] 1.4 Test TV release with score below AUTO_GRAB_THRESHOLD — returns true (blocks movie path)
- [x] 1.5 Test release parser returns null for TV — falls through to movie path
- [x] 1.6 Test release parser returns parsed result with empty title — falls through
- [x] 1.7 Test series not monitored falls through to movie path — no bugs found
- [ ] **Phase 1 checkpoint**: `CI=true bun run test --run 2>&1 | tail -40`

## Phase 2 — RssMediaMonitor Movie Matching & Availability Corner Cases

- [x] 2.1 Test movie release without year in title — parseMovieTitle returns null
- [x] 2.2 Test movie release where year appears mid-title (e.g. "2012.2009")
- [x] 2.3 Test movie with minimumAvailability "announced" — should always grab
- [x] 2.4 Test movie with minimumAvailability "in_cinemas" and availability "announced" — should skip
- [x] 2.5 Test movie with minimumAvailability "in_cinemas" and availability "streaming" — should grab
- [x] 2.6 Test movie with null/undefined minimumAvailability — defaults to "released"
- [x] 2.7 Test movie with metadataProvider.getMovieAvailability path
- [x] 2.8 Test movie already has path (not wanted) — should skip
- [x] 2.9 Test movie score below AUTO_GRAB_THRESHOLD — no grab. No bugs found.
- [ ] **Phase 2 checkpoint**: `CI=true bun run test --run 2>&1 | tail -40`

## Phase 3 — RssMediaMonitor Scoring, Indexer Priority & Error Handling

- [x] 3.1 Test customFormatRepository throws — getFormatScores returns [] gracefully
- [x] 3.2 Test indexer lookup throws — getIndexerPriority returns 0 gracefully
- [x] 3.3 Test prisma.series.findFirst throws — error logged, no grab
- [x] 3.4 Test prisma.episode.findFirst throws — error logged, no grab
- [x] 3.5 Test prisma.movie.findFirst throws — error logged, no grab
- [x] 3.6 Test release with no seeders and no indexerId — score still computed
- [x] 3.7 Test TV low-score blocks movie path. No bugs found.
- [ ] **Phase 3 checkpoint**: `CI=true bun run test --run 2>&1 | tail -40`

## Phase 4 — RssSyncService Corner Cases

- [x] 4.1 Test sync with no enabled indexers — returns empty summary
- [x] 4.2 Test one indexer fails — others continue, error recorded
- [x] 4.3 Test non-Torznab indexer — silently returns 0 stored
- [x] 4.4 Test settings as string vs object — both parsed correctly
- [x] 4.5 Test HTTP error from indexer — error caught, failure recorded
- [x] 4.6 Test empty RSS feed (0 results) — 0 stored, no error
- [x] 4.7 Test storeRelease emits 'release:stored' event with indexerId
- [x] 4.8 Test IndexerHealthRepository success/failure recording
- [x] 4.9 Test no IndexerHealthRepository — sync still works. No bugs found.
- [ ] **Phase 4 checkpoint**: `CI=true bun run test --run 2>&1 | tail -40`
