# SPA Subtitle Management Parity

## Overview

Bring the React SPA to parity with the Flutter client for subtitle management. The Flutter client already supports viewing subtitle inventory, searching external providers, downloading subtitles, and deleting unwanted ones. The SPA lacks these surfaces, creating an inconsistent cross-platform experience.

## Problem Statement

Users managing their media library through the web dashboard cannot see which subtitles exist for a movie or episode, cannot search for missing subtitles, and cannot download them without switching to the Flutter client or CLI. This is a significant product gap given that "Automated Lifecycle: subtitle fetching" is a core feature.

## Solution

Add subtitle management to the existing movie and episode detail pages in the SPA:

### Subtitle Inventory Display
- List all subtitle files associated with a media item
- Columns: language, format (SRT/ASS/VOBSUB), hearing-impaired flag, forced flag, file size
- Status badge: synced (matches file), unsynced, external (not linked to media file)
- Delete action with confirmation

### Subtitle Search
- "Search Subtitles" button on detail pages
- Modal with provider selection (OpenSubtitles, Bazarr-compatible, local)
- Language preference defaults from AppSettings
- Results table: language, provider, release name, score/uploader rating, HD/subtitle format
- Download action with progress indicator
- "Download All Missing" bulk action

### Subtitle Upload (Optional Simple)
- Drag-and-drop or file picker to upload local subtitle file
- Auto-link to current media item

### Settings Integration
- Subtitle settings page already exists; ensure wanted languages and providers are wired

## Acceptance Criteria

- [ ] Movie detail page shows subtitle inventory section
- [ ] Episode detail page shows subtitle inventory section
- [ ] Subtitle search modal returns results from configured providers
- [ ] Downloaded subtitles appear in inventory immediately (optimistic update)
- [ ] Delete subtitle removes file and updates inventory
- [ ] Wanted languages from settings pre-filter search results
- [ ] Integration tests cover inventory display, search flow, and delete action
- [ ] TypeScript typecheck passes; build succeeds

## Out of Scope

- Subtitle sync/shift adjustment (post-processing)
- OCR for image-based subtitles
- Subtitle translation
- Burn-in / transcode features
