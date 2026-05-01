# Implementation Plan: Flutter Subtitle & Quality Control

## Phase 1 — Subtitle Management

- [x] Task: Add `getSubtitles(mediaId, mediaType)`, `searchSubtitles(mediaId, mediaType)`, `downloadSubtitle(subtitleId)` methods to `ApiClient`
- [x] Task: Add "Subtitles" section to `MovieDetailScreen` and `SeriesDetailScreen` — list of downloaded subtitle tracks with language flag/badge and provider name
- [x] Task: Create `SubtitleSearchSheet` — bottom sheet with search results (language, provider, HI badge, download count), one-tap download button
- [x] Task: Wire download button to `ApiClient.downloadSubtitle()` — show progress, add to track list on success
- [x] Task: Write tests for subtitle section and search sheet — renders tracks, download calls API, search shows results
- [x] Task: Measure - Checkpoint Phase 1

## Phase 2 — Quality Upgrade

- [ ] Task: Add `searchQualityUpgrade(mediaId, mediaType)` and `grabRelease(releaseId)` methods to `ApiClient` (grabRelease may already exist from D1)
- [ ] Task: Add "Quality Upgrade" section to media detail screens — shows current quality profile and quality, "Search for Upgrade" button
- [ ] Task: Create `QualityUpgradeSheet` — bottom sheet listing available higher-quality releases (title, quality, size, score), one-tap grab
- [ ] Task: Wire grab to `ApiClient.grabRelease()` — show success toast, update media status
- [ ] Task: Write tests for quality upgrade section and sheet — renders current quality, search calls API, grab calls API
- [ ] Task: Run `cd clients/mediarr-client && flutter test` — all pass
- [ ] Task: Measure - Checkpoint Phase 2
