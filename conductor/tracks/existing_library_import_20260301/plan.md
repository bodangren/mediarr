# Implementation Plan: Existing Library Import

## Phase 1: Filesystem Scanning & Parsing Backend
> Goal: Be able to read a directory tree and guess what the files are.

- [x] Task: Build Directory Scanner Service (`ExistingLibraryScanner.ts`)
    - [x] Sub-task: Implement recursive file scanner filtering for video extensions (`.mkv`, `.mp4`, `.avi`, `.ts`, `.m4v`).
    - [x] Sub-task: Detect and note `.nfo` files alongside videos for later metadata extraction.
    - [x] Sub-task: Group discovered files into logical folders (movie folder: single video; series folder: multiple videos with S/E patterns or season subfolders).
- [x] Task: Enhance Filename Parsing
    - [x] Sub-task: Add movie parsing (`parseMovie()`) to `Parser.ts` for extracting titles/years.
    - [x] Sub-task: Parse directory names for title/year (e.g., "The Matrix (1999)" → `{title, year}`).
    - [x] Sub-task: Parse NFO files to extract IMDB/TMDB/TVDB IDs when present.

## Phase 2: Metadata Resolution
> Goal: Map the parsed filenames to actual TMDB/TVDB entities.

- [ ] Task: Implement Metadata Matching Logic
    - [ ] Sub-task: Use `MetadataProvider.searchSeries()` / `searchMovies()` to lookup parsed titles.
    - [ ] Sub-task: Return top 3-5 match candidates with confidence scores for each scanned item.
    - [ ] Sub-task: Use NFO-derived IDs (IMDB/TMDB/TVDB) as exact match hints when present.
    - [ ] Sub-task: Create `POST /api/import/scan` endpoint returning scanned items with match candidates.

## Phase 3: Bulk Import Execution
> Goal: Save the matched entities to the database and optionally rename files.

- [ ] Task: Build Bulk Import API
    - [ ] Sub-task: Create `POST /api/import/execute` endpoint accepting a list of confirmed matches.
    - [ ] Sub-task: For Movies: Create the Movie record, create MediaFileVariant record, optionally rename using `Organizer` service.
    - [ ] Sub-task: For Series: Create the Series record, fetch metadata/episodes, create MediaFileVariant records for existing episodes.
    - [ ] Sub-task: Support hard-linking when renaming to preserve original files (optional toggle).

## Phase 4: Frontend UI
> Goal: Provide a user-friendly wizard for the import process.

- [ ] Task: Build Import Wizard UI
    - [ ] Sub-task: Add "Import Existing" button to Library pages.
    - [ ] Sub-task: Step 1: Select root folder to scan.
    - [ ] Sub-task: Step 2: Display scanning progress.
    - [ ] Sub-task: Step 3: Review Matches. Show list of detected media with dropdown selectors for ambiguous matches. Allow manual search modal to fix incorrect matches.
    - [ ] Sub-task: Step 4: Toggle for renaming files during import.
    - [ ] Sub-task: Step 5: Execute import and show progress.
