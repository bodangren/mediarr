# Spec: Bazarr Feature Parity

## Overview

Close remaining gaps between the Bazarr reference application and mediarr's subtitle management capabilities. The gap analysis (2026-02-17) found that core features (wanted, history, blacklist, profiles, providers) are at near-full parity, but gaps remain in movie mass edit backend wiring, subtitle upload, episode-level operations, and advanced subtitle settings.

## Functional Requirements

### FR-1: Movie Language Profile Mass Edit (Backend Wiring)
- Wire the existing stubbed mass edit page to a real backend endpoint.
- Support updating language profiles for multiple movies at once.
- Backend: `PUT /api/subtitles/movies/bulk` accepting movie IDs and new language profile ID.

### FR-2: Subtitle Upload Workflow
- Complete the subtitle upload UI (file drop zone or file picker).
- Accept .srt, .ass, .ssa, .sub, .vtt subtitle files.
- Allow specifying language, forced flag, and hearing-impaired flag on upload.
- Store uploaded subtitle and update inventory.
- Backend: `POST /api/subtitles/upload` accepting multipart file with metadata.

### FR-3: Episode-Level Subtitle Detail Operations
- Ensure all episode-level actions work: sync, scan disk, manual search, upload.
- Subtitle track display per episode (show existing subtitle files with language, source, forced/HI flags).
- History and blacklist access per episode.
- Backend: Verify/wire `POST /api/subtitles/episode/:id/sync`, `POST /api/subtitles/episode/:id/scan`.

### FR-4: Advanced Subtitle Settings
- **Post-Processing**: Custom script execution after subtitle download (command path, arguments).
- **Audio Synchronization**: subsync integration toggle, sync on download option.
- **Subtitle Modifications (Sub-Zero)**: HI tag removal, OCR fixes, common fixes, color tag removal, reverse RTL.
- **Translation**: Provider selection (Gemini, Lingarr), target language, auto-translate toggle.
- Backend: Extend settings schema with subtitle-specific fields. `PATCH /api/settings` already handles settings save.

### FR-5: Movie Detail Subtitle Page Completion
- Wire all toolbar actions (Sync, Scan, Search) to real backend calls.
- Complete manual search modal integration with actual provider search.
- Display subtitle tracks table with source, language, forced/HI flags.

### FR-6: Anti-Captcha Provider Configuration
- Add anti-captcha provider selection (Anti-Captcha, Death-by-Captcha) in provider settings.
- Credential input for captcha-solving services.
- Backend: Extend provider settings schema.

## Non-Functional Requirements

- Subtitle upload must validate file type and reject invalid formats.
- Upload file size limit: 5MB.
- All new endpoints must have >80% test coverage.

## Acceptance Criteria

1. Mass edit page updates language profiles for selected movies via real API call.
2. User can upload a subtitle file with language/forced/HI metadata and see it in inventory.
3. All episode-level actions (sync, scan, search, upload) execute real operations.
4. Subtitle settings page includes post-processing, audio sync, Sub-Zero mods, and translation options.
5. Movie detail subtitle page has fully wired toolbar actions and manual search.
6. Anti-captcha provider can be configured in provider settings.

## Out of Scope

- Adding new subtitle providers beyond what's already supported.
- Subtitle OCR or speech-to-text generation.
- Profile tag-based automatic assignment (low priority, minor gap).
