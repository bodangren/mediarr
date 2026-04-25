# Specification: Library Scan & Import Fix

## Overview
Importing existing media — whether in-place (files already inside the root folder, e.g. `/data/media/movies/`) or out-of-place (files on an external path like a USB drive) — works badly. Files may not be detected, renamed incorrectly, or left in a half-imported state. Additionally, there is no ongoing disk scan to detect new files added outside the app, verify that tracked files still exist, or reconcile the database with the filesystem.

## Problem
1. **In-place import** (media already in the root folder) tries to rename/move files that are already where they belong, causing errors or duplicates.
2. **Out-of-place import** (external drives, different paths) has unreliable matching and organization.
3. **No ongoing reconciliation** — if a user manually adds, moves, or deletes files, the DB drifts out of sync with the filesystem.
4. **No scheduled rescan** — new media and subtitle files that appear on disk between imports are never detected until the user manually triggers something.

## Scope

### Import Fixes
- Fix in-place import to detect that a file is already inside a root folder and skip rename/move, only creating or updating the DB record and running metadata enrichment.
- Fix out-of-place import to correctly organize files into the root folder structure (using the existing `MovieOrganizeService` / `SeriesOrganizeService`), with proper error handling for conflicts and permissions.
- Ensure subtitle files (`.srt`, `.ass`, `.sub`) adjacent to media files are detected and imported alongside the media during both import modes.

### Disk Scan & Reconciliation
- Implement a `LibraryScanService` that walks all configured root folder paths, compares found files against DB records, and:
  - **Adds** new media files not in the DB (with metadata lookup).
  - **Removes** DB records for files that no longer exist on disk (or marks them as missing).
  - **Updates** file size / path if a file was moved within the root folder.
  - **Detects** new subtitle files adjacent to known media variants.
- Expose `POST /api/library/scan` to trigger a manual scan, with progress via SSE.

### Scheduled Daily Rescan
- Register a daily cron job in the `Scheduler` that runs the `LibraryScanService` for all root folders.
- This same job should also run subtitle inventory detection (finding new `.srt`/`.ass` files on disk).
- The job should be configurable (interval, enabled/disabled) via the General settings page.

## Out of Scope
- Renaming format configuration (current convention-based naming is intentional).
- Import from other app databases (Sonarr.db, Radarr.db migration).
- Deduplication of files across multiple root folders.
