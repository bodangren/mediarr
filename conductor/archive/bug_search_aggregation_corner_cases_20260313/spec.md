# Spec: MediaSearchService Corner Cases

## Problem Statement

`MediaSearchService` has several completely untested execution paths and at least one confirmed bug:

1. **Bug — post-normalization guard inside try block (grabRelease):**
   The guard at line 690–698 that validates URLs after normalisation is placed *inside* the `try/catch` block. When it fires, the `catch` block intercepts the `TorrentRejectedError` and re-wraps it with the misleading prefix `"Torrent handoff failed: ..."`. Additionally, a `RELEASE_GRABBED` failure event is emitted even though `addTorrent` was never called.

2. **Zero coverage on `grabReleaseByGuid` (the manual grab flow):**
   The route `POST /api/releases/grab` calls `grabReleaseByGuid`, which has four distinct paths (indexer not found, indexer search throws, GUID not in results, success) — none are tested.

3. **Zero coverage on `grabRelease` failure propagation:**
   The case where `torrentManager.addTorrent` throws is untested, as is the `mediaContext` (episodeId/movieId) passthrough.

4. **Zero coverage on `searchAllIndexers` resilience:**
   When one indexer times out or errors, the others must still contribute their results and the error must be recorded with the correct `status` tag (`'timeout'` vs `'error'`). Neither scenario is tested.

## Acceptance Criteria

- A new test file `MediaSearchService.cornerCases.test.ts` exists covering all paths above.
- The post-normalization guard in `grabRelease` is moved **before** the `try` block so the original error message is preserved and `addTorrent` is provably never called.
- `grabReleaseByGuid` is tested for all four paths.
- `grabRelease` is tested for `addTorrent` failure wrapping and `mediaContext` passthrough.
- `searchAllIndexers` is tested for per-indexer timeout isolation and per-indexer error isolation.
- All existing tests continue to pass.

## Subsystem Scope

- `server/src/services/MediaSearchService.ts`
- `server/src/services/MediaSearchService.cornerCases.test.ts` (new)
