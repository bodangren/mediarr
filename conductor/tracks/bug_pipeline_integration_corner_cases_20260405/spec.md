# End-to-End Pipeline Integration Corner-Case Testing

## Problem Statement

The directive states: "Other edge cases in the end-to-end user workflow remain untested and unknown."

All major subsystems have been tested in isolation (WantedSearchService, ImportManager, SearchAggregationService, MediaSearchService, TorrentManager, RssMediaMonitor, Organizer services, LibraryScanService). However, **no tests verify the handoffs between subsystems** — the critical integration points where data flows from one service to another.

Real bugs have historically emerged at these boundaries:
- episodeId/movieId not forwarded from RSS monitor to addTorrent (fixed in bug_rss_media_monitor_corner_cases_20260313)
- Seed-limit deletion racing with import completion (fixed in bug_seed_limit_import_guard_20260402)
- AI parsing crash crashing the entire search pipeline (fixed in bug_searchaggregation_comprehensive_corner_cases_20260404d)

## Integration Points to Test

1. **RSS → Search → Grab → Import** — Full RSS-triggered pipeline
2. **Wanted → Search → Grab → Import** — Full Wanted-triggered pipeline
3. **Search → Scoring → Dedup → Grab** — SearchAggregation → MediaSearch handoff
4. **Grab → TorrentManager → ImportManager** — Torrent completion notification chain
5. **Import → Organizer → DB update** — File organization with DB transaction safety

## Acceptance Criteria

- [ ] Tests exist for each integration handoff with corner-case inputs
- [ ] Cross-service state propagation is verified (IDs, paths, flags)
- [ ] Failure at any integration point does not corrupt downstream state
- [ ] All tests pass (CI=true bun run test --run)
- [ ] Any bugs found are fixed with minimal code changes
- [ ] Production build succeeds

## Subsystem Scope

- `server/src/services/rss-media-monitor.ts` — RSS trigger point
- `server/src/services/wanted-search-service.ts` — Wanted trigger point
- `server/src/services/search-aggregation-service.ts` — Search orchestration
- `server/src/services/media-search-service.ts` — Indexer search + grab
- `server/src/services/torrent-manager.ts` — Torrent lifecycle
- `server/src/services/import-manager.ts` — Import orchestration
- `server/src/services/organizer.ts` — File organization
