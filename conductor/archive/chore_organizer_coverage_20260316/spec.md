# Spec: Organizer Test Coverage

## Problem Statement

`Organizer.ts` is the service that moves/links completed torrent files into the media
library. It is called by `ImportManager` for every episode and movie import. It contains
several critical code paths that have **zero test coverage**:

- `organizeFile()` — the primary episode import path — completely untested
- Hard-link fallback to `fs.rename` when `fs.link` fails — untested
- `options.move` path (used during re-import / library scan) — untested for both episode
  and movie variants
- Cross-device `EXDEV` fallback in `moveFile()` → `copyFile` + `unlink` — untested
- `colocateMovieMetadata()` — untested
- `buildFilename` / `sanitize` with special characters — untested

Additionally, the existing `Organizer.test.ts` `vi.mock()` factory is missing `copyFile`
and `unlink` (required for the move/EXDEV paths), and uses `vi.clearAllMocks()` instead
of the canonical `vi.resetAllMocks()` pattern established by the TorrentManager track.

## Acceptance Criteria

1. `Organizer.test.ts` mock factory includes `copyFile` and `unlink`.
2. `vi.resetAllMocks()` used in `afterEach`; default implementations restored in
   `beforeEach`.
3. Tests exist for all of:
   - `organizeFile` happy path (link succeeds, returns destination path)
   - `organizeFile` link failure → rename fallback
   - `organizeFile` source === destination early return
   - `organizeFile` with `move: true` (same-device, rename)
   - `organizeFile` with `move: true` (EXDEV, copyFile + unlink)
   - `organizeMovieFile` with `move: true`
   - `colocateMovieMetadata`
   - `buildFilename` with characters requiring sanitization
4. All tests pass. No regressions in the full suite.

## Subsystem Scope

- `server/src/services/Organizer.ts`
- `server/src/services/Organizer.test.ts`
