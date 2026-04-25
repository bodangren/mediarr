# Spec: RssMediaMonitor corner cases — missing media link in RSS grabs

## Problem Statement

`RssMediaMonitor` is the service responsible for monitoring RSS feeds and automatically grabbing
torrents for wanted TV episodes and movies. It currently has **zero test coverage**.

Two confirmed bugs were found during code inspection:

1. **`handleTvRelease` grabs without `episodeId`**: When a TV episode is matched and grabbed, the
   call to `torrentManager.addTorrent({ magnetUrl })` omits `episodeId: episode.id`. This means
   the persisted torrent row has no link to the matched episode. When the download completes,
   `ImportManager` cannot use the fast-path (linked episode) and must fall back to the parser
   path — which can silently fail for non-standard filenames.

2. **`handleMovieRelease` grabs without `movieId`**: Same bug for movies — `movieId` is never
   passed to `addTorrent`, breaking the fast-path import for all RSS-triggered movie grabs.

## Acceptance Criteria

1. `handleTvRelease` passes `episodeId: episode.id` to `addTorrent` when grabbing a TV episode.
2. `handleMovieRelease` passes `movieId: movie.id` to `addTorrent` when grabbing a movie.
3. A `RssMediaMonitor.test.ts` file exists with tests covering:
   - Successful TV grab passes `episodeId` to `addTorrent`
   - Successful movie grab passes `movieId` to `addTorrent`
   - Release with no `magnetUrl` is skipped (no grab)
   - Episode that is already downloaded (`path != null`) is not grabbed
   - Movie whose score is below threshold is not grabbed
   - Unmonitored series is not grabbed
4. All new tests pass and no new test failures are introduced.

## Subsystem Scope

- `server/src/services/RssMediaMonitor.ts`
- New test file: `server/src/services/RssMediaMonitor.test.ts`
