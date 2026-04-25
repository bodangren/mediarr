# Spec: ImportManager corner cases — empty-directory + no-root-folder IMPORT_FAILED

## Problem Statement

Three categories of corner cases in `ImportManager` remain either broken or untested:

### Bug 1 — Empty torrent directory is a silent failure (confirmed broken)
When a completed torrent downloads to a directory that contains **no video files**
(e.g. only `.nfo`, `.txt`, or `.jpg` files), `handleTorrentCompleted` iterates an empty
`files` array and returns without emitting any event. The user never learns that the
import failed. This is the most impactful silent failure in the pipeline.

### Untested paths 2 & 3 — No root folder configured in fast paths
The two fast-path branches (linked episode, linked movie) already contain correct
`IMPORT_FAILED` emit logic when `resolveSeriesPath`/`resolveMoviePath` returns `null`
(i.e. the media has no stored path AND no root folder is configured in appSettings).
These branches have **no test coverage** and are therefore invisible to CI regressions.

### Untested paths 4 & 5 — `retryImportByActivityEventId` error branches
Two early-exit error paths (`event not found`, `event is not IMPORT_FAILED`) lack test
coverage. They work correctly today but are regression-blind.

## Acceptance Criteria

1. **Test (Red → Green):** When `getFiles` returns an empty array, a single `IMPORT_FAILED`
   activity event is emitted with a reason containing "no importable" (or similar).
   The code must be patched to make this test pass.

2. **Test:** Fast-path linked episode — episode found, but `series.path` is null AND
   `tvRootFolder` is not configured → `IMPORT_FAILED` emitted; `organizeFile` NOT called.

3. **Test:** Fast-path linked movie — movie found, but `movie.path` is null AND
   `movieRootFolder` is not configured → `IMPORT_FAILED` emitted; `organizeMovieFile` NOT called.

4. **Test:** `retryImportByActivityEventId` with an event that does not exist in the DB
   → throws with message matching "not found".

5. **Test:** `retryImportByActivityEventId` with an event whose `eventType` is not
   `IMPORT_FAILED` → throws with message matching "not an import failure".

## Subsystem Scope

- `server/src/services/ImportManager.ts`
- `server/src/services/ImportManager.test.ts`
