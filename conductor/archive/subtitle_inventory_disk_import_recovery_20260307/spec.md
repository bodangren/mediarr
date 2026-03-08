# Specification: Subtitle Inventory Disk Import Recovery

## Overview
Repair the subtitle disk scan flow so subtitle files that already exist beside imported movie and episode files are discovered and persisted into the shared subtitle inventory tables.

## Functional Requirements
- `POST /api/subtitles/movie/:id/scan` must perform a real filesystem-backed scan for sidecar subtitle files related to the movie's stored variant files.
- `POST /api/subtitles/series/:id/scan` must perform the same scan across the series' episode variants.
- Scan results must upsert variant subtitle inventory records so subsequent inventory APIs and playback/managment flows can see the imported subtitles.
- Scan responses must report accurate `subtitlesFound` and `newSubtitles` values based on current disk contents and newly imported records.
- Re-running the same scan must be idempotent and must not create duplicate subtitle inventory rows.
- Only supported sidecar subtitle extensions (`.srt`, `.ass`, `.ssa`, `.sub`, `.vtt`) are in scope for this recovery path.

## Non-Functional Requirements
- Keep all subtitle import logic inside the existing monolith and reuse current variant inventory persistence paths.
- Preserve existing subtitle metadata when it can be derived from filenames, but prefer importing a file as unknown-language rather than silently skipping it.
- Do not break existing subtitle automation, manual upload, or playback APIs.

## Acceptance Criteria
- A movie scan imports existing sibling subtitle files into `VariantSubtitleTrack` and reports a positive `newSubtitles` count on first scan.
- A series scan imports existing sibling subtitle files for episode variants and reports totals across the series.
- A second scan over unchanged files reports `newSubtitles: 0` and does not create duplicates.
- Inventory API responses for the affected movie/episode variants include the imported subtitle tracks after scanning.

## Out of Scope
- OCR or extraction of embedded subtitle streams.
- Renaming or moving existing subtitle files on disk.
- Subtitle timing/editing workflows.
