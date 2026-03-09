# Plan: Library Scan & Import Fix

## Phases

### Phase 1: Fix In-Place Import Logic in BulkImportService
**Goal:** When a file is already inside the target root folder, skip the Organizer move/rename.

- [x] In `BulkImportService.importMovie`: before calling `organizer.organizeMovieFile`, check if `file.path` already starts with `item.rootFolderPath` (normalizing paths). If yes, use `file.path` as-is for the `filePath` variable and skip the organizer call.
- [x] In `BulkImportService.importSeries`: apply the same in-place check before calling `organizer.organizeFile`.
- [x] Write unit tests in `BulkImportService.test.ts` covering:
  - In-place movie import (file already in root) → organizer NOT called, path set to original
  - Out-of-place movie import → organizer called
  - In-place series episode import → organizer NOT called
  - Out-of-place series import → organizer called

### Phase 2: LibraryScanService + API Route
**Goal:** Create a service that reconciles the DB with the filesystem and expose a manual trigger.

- [x] Create `server/src/services/LibraryScanService.ts`:
  - Constructor accepts `prisma` and `subtitleAutomationService`
  - Method `scanRootFolder(rootPath: string, mediaType: 'movie' | 'tv'): Promise<ScanResult>`
    - Walk root folder recursively, collect video files (`.mkv`, `.mp4`, `.avi`, `.ts`, `.m4v`)
    - For movies: match by path prefix against `Movie.path`; for tv: match by path against `Episode.path`
    - **Adds**: DB records for files with no matching DB record (using filename parsing to find a match by title/year from the DB or mark as unmatched)
    - **Removes/Marks missing**: if a DB record's path no longer exists on disk, set a `missing` flag or clear the path
    - **Subtitle detection**: if a `.srt`, `.ass`, or `.sub` file is adjacent to a known video file, log it (subtitle import is best-effort)
  - Method `scanAll(settings: { movieRootFolder: string; tvRootFolder: string }): Promise<ScanSummary>`
- [x] Add `POST /api/library/scan` in `server/src/api/routes/libraryRoutes.ts`:
  - Reads `movieRootFolder` and `tvRootFolder` from settings
  - Calls `libraryScanService.scanAll()`
  - Returns `{ moviesAdded, moviesMissing, tvEpisodesAdded, tvEpisodesMissing, subtitleFilesDetected, durationMs }`
- [x] Register `registerLibraryRoutes` in `createApiServer.ts`
- [x] Add `libraryScanService` to `ApiDependencies` type
- [x] Wire `LibraryScanService` in `main.ts`
- [x] Write unit tests in `LibraryScanService.test.ts` covering scan results for movies and episodes

### Phase 3: Scheduled Daily Rescan
**Goal:** Register a daily library scan cron job.

- [x] Add `scheduleLibraryScan` method to `Scheduler.ts`:
  - Accepts a `libraryScanService` with `scanAll` method and a settings provider
  - Default cron: `'0 2 * * *'` (2 AM daily)
- [x] In `main.ts`, after `scheduleSubtitleWantedSearch`, call `scheduler.scheduleLibraryScan(libraryScanService, settingsService)`
- [x] Write tests for the new Scheduler method in `Scheduler.meta.test.ts`
