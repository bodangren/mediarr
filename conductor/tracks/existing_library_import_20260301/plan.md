# Implementation Plan: Existing Library Import

## Phase 1: Filesystem Scanning & Parsing Backend
> Goal: Be able to read a directory tree and guess what the files are.

- [ ] Task: Build Directory Scanner Service
    - [ ] Sub-task: Implement a recursive file scanner that filters for valid video extensions.
    - [ ] Sub-task: Group discovered files into logical folders (e.g., grouping episode files under a Series folder).
- [ ] Task: Enhance Filename Parsing
    - [ ] Sub-task: Ensure the `Parser` can reliably extract Movie titles/years and Series titles/Season/Episode numbers from plain directory names and filenames.

## Phase 2: Metadata Resolution
> Goal: Map the parsed filenames to actual TMDB/TVDB entities.

- [ ] Task: Implement Metadata Matching Logic
    - [ ] Sub-task: For each discovered Movie folder/file, query TMDB and select the highest confidence match.
    - [ ] Sub-task: For each discovered Series folder, query TVDB/TMDB and select the highest confidence match.
    - [ ] Sub-task: Create a `GET /api/import/scan` endpoint that returns the tree of discovered files alongside their proposed metadata matches.

## Phase 3: Bulk Import Execution
> Goal: Save the matched entities to the database.

- [ ] Task: Build Bulk Import API
    - [ ] Sub-task: Create `POST /api/import/execute` endpoint accepting a list of confirmed matches.
    - [ ] Sub-task: For Movies: Create the Movie record, create a MediaFile record pointing to the existing path, and mark as downloaded.
    - [ ] Sub-task: For Series: Create the Series record, fetch metadata/episodes, create MediaFile records for existing episodes, and link them.

## Phase 4: Frontend UI
> Goal: Provide a user-friendly wizard for the import process.

- [ ] Task: Build Import Wizard UI
    - [ ] Sub-task: Add "Import Existing" button to Library pages.
    - [ ] Sub-task: Step 1: Select root folder to scan.
    - [ ] Sub-task: Step 2: Display scanning progress.
    - [ ] Sub-task: Step 3: Review Matches. Show a list of detected media. Allow the user to click a row to fix incorrect matches via a manual search modal.
    - [ ] Sub-task: Step 4: Execute import and show progress.
