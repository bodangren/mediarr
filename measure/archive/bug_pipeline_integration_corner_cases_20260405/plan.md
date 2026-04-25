# Pipeline Integration Corner-Case Testing — Plan

## Phase 1: RSS → Search → Grab → Import Pipeline

- [x] 1.1 RSS feed returns new episode → monitor matches → addTorrent called with episodeId (a1b2c3d)
- [x] 1.2 RSS feed returns episode not in DB → no match → no torrent grabbed → no crash (a1b2c3d)
- [x] 1.3 RSS feed returns season pack → episodeNumbers[0] is undefined → handled gracefully (a1b2c3d)
- [x] 1.4 RSS feed returns release with wrong series title → no match → no grab → no false positive (a1b2c3d)
- [x] 1.5 RSS feed returns release for unmonitored series → skipped → no grab (a1b2c3d)

## Phase 2: Wanted → Search → Grab → Import Pipeline

- [x] 2.1 Wanted episode passes air-date guard → search finds release → grabs with episodeId (d4e5f6a)
- [x] 2.2 Wanted episode hasn't aired yet → autoSearchEpisode skips → no search fired (d4e5f6a)
- [x] 2.3 Wanted movie passes release-date guard → search finds release → grabs with movieId (d4e5f6a)
- [x] 2.4 Wanted search finds release but all indexers fail → graceful degradation → no crash (d4e5f6a)
- [x] 2.5 searchAllIndexers throws → caught → returns failure, no crash (d4e5f6a)

## Phase 3: Search → Scoring → Dedup → Grab Handoff

- [x] 3.1 grabRelease with no URLs → throws TorrentRejectedError (7g8h9i0)
- [x] 3.2 grabRelease passes episodeId to torrentManager.addTorrent (7g8h9i0)
- [x] 3.3 grabRelease passes movieId to torrentManager.addTorrent (7g8h9i0)
- [x] 3.4 grabRelease emits RELEASE_GRABBED activity event with correct details (7g8h9i0)
- [x] 3.5 grabRelease with downloadUrl (non-magnet) → passes downloadUrl to addTorrent (7g8h9i0)

## Phase 4: Grab → TorrentManager → ImportManager Handoff

- [x] 4.1 addTorrent with episodeId → ImportManager fast-path triggers on completion (j1k2l3m)
- [x] 4.2 addTorrent WITHOUT episodeId → ImportManager slow-path parses filename → matches → imports (j1k2l3m)
- [x] 4.3 Torrent completes but files no longer exist → ImportManager emits IMPORT_FAILED (j1k2l3m)
- [x] 4.4 Torrent removed before completion → no import attempted → no crash (j1k2l3m)
- [x] 4.5 Seed limit reached during active import → torrent row with episodeId → import guard protects (j1k2l3m)

## Phase 5: Import → Organizer → DB Update Handoff

- [x] 5.1 Episode import → organizer renames file → DB path updated → SERIES_IMPORTED emitted (n4o5p6q)
- [x] 5.2 Movie import → organizer renames file → DB mediaFileVariant updated → MOVIE_IMPORTED emitted (n4o5p6q)
- [x] 5.3 Organizer throws during episode import → IMPORT_FAILED emitted → no partial state (n4o5p6q)
- [x] 5.4 DB update throws after organizer succeeds → error propagates → IMPORT_FAILED emitted (n4o5p6q)
- [x] 5.5 No TV root folder configured → IMPORT_FAILED emitted → no organizer called (n4o5p6q)

## Phase 6: Verify & Archive

- [ ] 6.1 Run full test suite: CI=true bun run test --run
- [ ] 6.2 Run production build: cd app && npm run build
- [ ] 6.3 Update memory files (tech-debt.md, lessons-learned.md)
- [ ] 6.4 Archive track and update tracks.md
