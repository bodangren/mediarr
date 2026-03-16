# Spec: WantedSearchService.autoSearchAll Corner Cases

## Problem Statement

`WantedSearchService.autoSearchAll()` is the master orchestration method for the automated acquisition pipeline. It has **zero test coverage**. Two confirmed defects:

1. **Concurrent-execution race condition**: Calling `autoSearchAll()` while a previous run is still in progress (which is common since each search adds a 2 s delay) spawns duplicate background loops. Both loops query the same wanted-media lists and call `autoSearchMovie`/`autoSearchSeries` for each entry, resulting in duplicate grabs and potential double-downloads.

2. **Silent partial failure**: When `prisma.movie.findMany` or `prisma.series.findMany` throws mid-run, the outer `try/catch` logs and exits — but the completion event is never emitted. Callers and monitors receive no signal that the run was aborted.

## Acceptance Criteria

- [ ] A `isRunning` guard prevents `autoSearchAll` from spawning concurrent loops; a second call while the first is active returns immediately without starting a second loop.
- [ ] Start event (`SEARCH_EXECUTED` summary: "Started…") is emitted synchronously before background work begins.
- [ ] Completion event (`SEARCH_EXECUTED` summary: "Completed…") is emitted after all movies and series are searched, with accurate `moviesSearched` / `seriesSearched` counts.
- [ ] Empty DB (no wanted movies, no wanted series): start + completion events fire, no movie/series search is called.
- [ ] DB query failure: the run terminates, error is logged, and completion event is **not** emitted (existing behavior is preserved; test documents it).
- [ ] After `autoSearchAll` finishes, the guard is cleared so a subsequent call starts a new run.

## Subsystem Scope

- `server/src/services/WantedSearchService.ts` — `autoSearchAll()` method
- `server/src/services/WantedSearchService.autoSearchAll.test.ts` — new test file
