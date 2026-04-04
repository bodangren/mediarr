# Plan: ImportManager Post-Import Corner-Case Testing

## Phase 1 — Movie-Path Error Branches

- [x] 1.1 Write failing test: `organizeMovieFile` throws → emits IMPORT_FAILED with reason, does not rethrow
- [x] 1.2 Write failing test: movie import fast-path, organizer throws → emits IMPORT_FAILED
- [x] 1.3 Write failing test: `notificationDispatchService.notifyDownload` called with movie title + 'movie' on success
- [x] 1.4 Write failing test: episode import, `notificationDispatchService.notifyDownload` called with series title + 'episode'
- [x] 1.5 Run tests, confirm all pass
- [x] 1.6 Commit: `8339924`

## Phase 2 — Multi-File Torrent Corner Cases

- [x] 2.1 Write failing test: directory with 3 video files — 2 match, 1 doesn't → 2 imported, 1 IMPORT_FAILED
- [x] 2.2 Write failing test: directory with 2 files — first organizer throws, second imports → 1 FAILED + 1 IMPORTED
- [x] 2.3 Write failing test: directory with only non-video files → IMPORT_FAILED
- [x] 2.4 Fix bug: wrap per-file processing in try/catch so one failure doesn't abort batch
- [x] 2.5 Run tests, confirm all pass
- [x] 2.6 Commit: `b96d32e`

## Phase 3 — Retry & Path Resolution Edge Cases

- [x] 3.1 Write failing test: `retryImportByInfoHash` when path doesn't exist → throws
- [x] 3.2 Write failing test: `resolveRetryImportPath` prefers rootPath/name over bare rootPath
- [x] 3.3 Write failing test: `retryImportByActivityEventId` with empty sourcePath → throws
- [x] 3.4 Run tests, confirm all pass
- [x] 3.5 Commit: `3298c13`

## Phase 4 — Verification

- [x] 4.1 Run full test suite: 204 passed, 1404 tests passed, 0 failures
- [x] 4.2 Production build: clean
- [x] 4.3 Finalize: update memory files, archive track
