# Plan: MediaSearchService Corner Cases

## Phase 1 — grabRelease: post-normalization guard bug

### Tasks
- [x] 1.1 Write failing test: `grabRelease` with non-magnet magnetUrl + no downloadUrl throws with ORIGINAL guard message (not "Torrent handoff failed: ...")
- [x] 1.2 Run test → confirm Red
- [x] 1.3 Fix: move post-normalization guard before the try block in `grabRelease`; also fixed timeout detection ('timed out' vs 'timeout')
- [x] 1.4 Run test → confirm Green
- [x] 1.5 Run full test suite; fix any regressions

## Phase 2 — grabRelease: addTorrent failure + mediaContext passthrough

### Tasks
- [x] 2.1 Write failing test: `addTorrent` throws plain Error → rethrown as TorrentRejectedError
- [x] 2.2 Write test: `mediaContext.episodeId` is forwarded in addTorrent options
- [x] 2.3 Write test: `mediaContext.movieId` is forwarded in addTorrent options
- [x] 2.4 Run tests → confirm Green (all in cornerCases.test.ts)
- [x] 2.5 No regressions

## Phase 3 — grabReleaseByGuid: all four paths

### Tasks
- [x] 3.1 Write test: indexer ID not in enabled list → throws NotFoundError
- [x] 3.2 Write test: indexer search throws → throws ValidationError
- [x] 3.3 Write test: indexer returns results but none match GUID → throws NotFoundError
- [x] 3.4 Write test: success — matching GUID found, grabRelease succeeds
- [x] 3.5 Run tests → Green
- [x] 3.6 No regressions

## Phase 4 — searchAllIndexers: per-indexer timeout and error isolation

### Tasks
- [x] 4.1 Write test: one indexer times out → overall result still has results from other indexers; timed-out indexer has status='timeout'
- [x] 4.2 Write test: one indexer throws non-timeout error → other indexers still contribute; errored indexer has status='error'
- [x] 4.3 Write test: IMDB fallback leaves results empty when fallback also returns empty
- [x] 4.4 Run tests → Green (after fixing 'timed out' detection)
- [x] 4.5 24/24 MediaSearchService tests pass, no regressions
