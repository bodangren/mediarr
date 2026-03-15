# Plan: Organizer Test Coverage

## Phase 1 — Fix mock setup + add organizeFile basic coverage

- [x] 1.1 Fix `vi.mock()` factory: add `copyFile` and `unlink`; switch to hoisted helpers
  for consistent restoration; add `vi.resetAllMocks()` in `afterEach`
- [x] 1.2 Red→Green: `organizeFile` happy path — link succeeds → returns Season-folder path
- [x] 1.3 Red→Green: `organizeFile` link fails → falls back to rename
- [x] 1.4 Red→Green: `organizeFile` source equals destination → early return, no link/rename called
- [x] 1.x Checkpoint: 1061 tests pass, 11 skipped

## Phase 2 — Move option & cross-device fallback

- [x] 2.1 Red→Green: `organizeFile` with `move: true` (same-device) → rename called, link NOT called
- [x] 2.2 Red→Green: `organizeFile` with `move: true` + rename throws EXDEV → copyFile + unlink
- [x] 2.3 Red→Green: `organizeMovieFile` with `move: true` (same-device) → rename called
- [x] 2.x Checkpoint: 1061 tests pass, 11 skipped

## Phase 3 — buildFilename, sanitize, colocateMovieMetadata

- [x] 3.1 Red→Green: `buildFilename` with series/episode title containing `:?<>|` → sanitized filename
- [x] 3.2 Red→Green: `colocateMovieMetadata` writes file content to correct path
- [x] 3.x Checkpoint: 1061 tests pass, 11 skipped

## Phase 4 — Verify & Archive

- [ ] 4.1 Full test suite: `CI=true bun run test --run 2>&1 | tail -60`
- [ ] 4.2 Production build: `cd app && npm run build 2>&1 | tail -20`
- [ ] 4.3 Archive track and push
