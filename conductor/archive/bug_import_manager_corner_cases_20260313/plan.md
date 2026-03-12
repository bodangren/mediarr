# Plan: ImportManager corner cases

## Phase 1 — Red-Green: empty-directory silent failure

### Tasks
- [x] 1.1 Write a failing test: torrent path is a directory with no video files →
      `IMPORT_FAILED` emitted, `organizeFile` and `organizeMovieFile` NOT called.
      Mock `fs.stat` to return `isDirectory: true`; mock `fs.readdir` to return `[]`.
      Run the test; confirm it **fails** (no event emitted today).
- [x] 1.2 Fix `handleTorrentCompleted`: after `getFiles`, if `files.length === 0`,
      emit `IMPORT_FAILED` with reason "no importable video files found" and return early.
      Run the test; confirm it **passes**.
- [x] 1.3 Commit: `fix(import-manager): emit IMPORT_FAILED when torrent contains no video files` 6f9f6ec

---

## Phase 2 — Coverage: no-root-folder IMPORT_FAILED in fast paths

### Tasks
- [x] 2.1 Write test: fast-path linked episode — episode found, `series.path` null,
      `tvRootFolder` absent → `IMPORT_FAILED` emitted; `organizeFile` NOT called.
      (Use `episodeFindUnique` helper with full episode+season+series graph.)
      Run; confirm it **passes** (code already correct).
- [x] 2.2 Write test: fast-path linked movie — movie found, `movie.path` null,
      `movieRootFolder` absent → `IMPORT_FAILED` emitted; `organizeMovieFile` NOT called.
      Run; confirm it **passes** (code already correct).
- [x] 2.3 Commit: combined with 1.3 in commit 6f9f6ec

---

## Phase 3 — Coverage: retryImportByActivityEventId error branches

### Tasks
- [x] 3.1 Write test: `retryImportByActivityEventId(999)` where `activityEvent.findUnique`
      returns `null` → throws error matching /not found/i.
- [x] 3.2 Write test: `retryImportByActivityEventId(10)` where event has
      `eventType: 'SERIES_IMPORTED'` → throws error matching /not an import failure/i.
- [x] 3.3 Run full test suite: 334 pre-existing failures, no new failures introduced.
- [x] 3.4 Commit: combined with 1.3 in commit 6f9f6ec

---

## Phase 4 — Verify and archive
- [x] 4.1 Run full test suite: 334 pre-existing failures, 0 new. Confirmed.
- [x] 4.2 Run production build: passes cleanly.
- [x] 4.3 Update `conductor/tech-debt.md` and `conductor/lessons-learned.md`
- [x] 4.4 Archive track and update `tracks.md`
- [x] 4.5 Push to remote
