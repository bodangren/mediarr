# Spec: ImportManager Post-Import Corner-Case Testing

## Problem Statement

The current ImportManager test suite (23 tests across 3 files) covers the happy path and several known
bugs, but leaves gaps in multi-file torrent handling, movie-path error branches, notification dispatch,
and retry-path resolution. These are high-risk areas: a multi-file torrent where one file succeeds but
the organizer throws on another could leave the DB in an inconsistent state if not handled correctly.

## Acceptance Criteria

1. `organizeMovieFile` throw is caught, emits IMPORT_FAILED, does not prevent other files from importing
2. Multi-file torrent directory: files that match import successfully; files that don't match emit
   IMPORT_FAILED independently; a single organizer failure does not abort the batch
3. `retryImportByInfoHash` when torrent path no longer exists on disk throws with a clear error
4. `resolveRetryImportPath` tries `rootPath/name` first, falls back to `rootPath` alone
5. `notificationDispatchService.notifyDownload` called with correct title and mediaType on success
6. Total new tests: ≥ 10

## Subsystem Scope

- `ImportManager` (server/src/services/ImportManager.ts)
- Existing test files: `ImportManager.test.ts`, `ImportManager.slowPath.test.ts`, `ImportManager.helpers.test.ts`

## Out of Scope

- WantedSearchService, SearchAggregationService, MediaSearchService
- UI or API changes
- New features outside the import pipeline
