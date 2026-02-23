# Implementation Plan: Bazarr Feature Parity

## Phase 1: Movie Mass Edit & Subtitle Upload

- [x] Task: Build Movie Subtitle Mass Edit Backend
    - [x] Sub-task: Write tests — verify `PUT /api/subtitles/movies/bulk` updates language profile for multiple movies.
    - [x] Sub-task: Write tests — verify validation rejects invalid profile IDs.
    - [x] Sub-task: Implement `PUT /api/subtitles/movies/bulk` endpoint accepting `{ movieIds: number[], languageProfileId: number }`.
    - [x] Sub-task: Update movie records with new language profile in transaction.
- [x] Task: Wire Movie Mass Edit UI
    - [x] Sub-task: Write tests — verify mass edit page calls real API and shows success feedback.
    - [x] Sub-task: Replace stub/mock in `/subtitles/movies/edit/page.tsx` with real mutation to `PUT /api/subtitles/movies/bulk`.
    - [x] Sub-task: Add success/error toast notification on save.
- [x] Task: Build Subtitle Upload Backend
    - [x] Sub-task: Write tests — verify `POST /api/subtitles/upload` accepts multipart file with metadata.
    - [x] Sub-task: Write tests — verify file type validation (.srt, .ass, .ssa, .sub, .vtt only).
    - [x] Sub-task: Write tests — verify uploaded file is stored and inventory updated.
    - [x] Sub-task: Implement `POST /api/subtitles/upload` endpoint: parse multipart form (file, language, forced, hearingImpaired, mediaId, mediaType).
    - [x] Sub-task: Store file using SubtitleNamingService for path generation.
    - [x] Sub-task: Create subtitle inventory record in database.
- [x] Task: Complete Subtitle Upload UI
    - [x] Sub-task: Write tests — verify upload form renders file picker, language selector, forced/HI toggles.
    - [x] Sub-task: Write tests — verify upload calls API and refreshes inventory.
    - [x] Sub-task: Build upload modal/form: file drop zone, language dropdown, forced checkbox, HI checkbox.
    - [x] Sub-task: Wire to `POST /api/subtitles/upload`.
    - [x] Sub-task: Show upload progress and success/error feedback.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Episode-Level Operations & Movie Detail Completion - PENDING
> **SOFT DEPENDENCY**: "Complete Movie Detail Subtitle Page" manual search → download flow benefits from `cross_cutting_parity Phase 4` (OpenSubtitlesProvider.download() wiring). Can proceed with search-only; download wiring added once Phase 4 delivers.

- [ ] Task: Wire Episode-Level Subtitle Actions
    - [ ] Sub-task: Write tests — verify episode sync calls `POST /api/subtitles/episode/:id/sync`.
    - [ ] Sub-task: Write tests — verify episode scan calls `POST /api/subtitles/episode/:id/scan`.
    - [ ] Sub-task: Write tests — verify episode manual search calls search API with episode context.
    - [ ] Sub-task: Implement `POST /api/subtitles/episode/:id/sync` endpoint (sync subtitles with disk).
    - [ ] Sub-task: Implement `POST /api/subtitles/episode/:id/scan` endpoint (scan disk for subtitle files).
    - [ ] Sub-task: Wire episode toolbar buttons (Sync, Scan, Search) to real endpoints.
    - [ ] Sub-task: Wire episode-level upload action to upload endpoint with episode context.
- [ ] Task: Build Subtitle Track Display
    - [ ] Sub-task: Write tests — verify subtitle track list renders per episode with language, source, flags.
    - [ ] Sub-task: Implement SubtitleTrackList component showing: language, source provider, forced flag, HI flag, file path.
    - [ ] Sub-task: Add delete action per subtitle track.
    - [ ] Sub-task: Display on both movie detail and series episode detail pages.
- [ ] Task: Complete Movie Detail Subtitle Page
    - [ ] Sub-task: Write tests — verify movie toolbar actions (Sync, Scan, Search) call real endpoints.
    - [ ] Sub-task: Wire Sync button to `POST /api/subtitles/movie/:id/sync`.
    - [ ] Sub-task: Wire Scan button to `POST /api/subtitles/movie/:id/scan`.
    - [ ] Sub-task: Wire Search button to manual search with movie context.
    - [ ] Sub-task: Implement `POST /api/subtitles/movie/:id/sync` and `POST /api/subtitles/movie/:id/scan` endpoints.
    - [ ] Sub-task: Complete manual search modal integration with provider results.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) - PENDING

## Phase 3: Advanced Subtitle Settings - PENDING

- [ ] Task: Build Advanced Settings Schema
    - [ ] Sub-task: Write tests — verify settings schema includes all subtitle-specific fields.
    - [ ] Sub-task: Extend Prisma settings schema with: postProcessingCommand, postProcessingArgs, subsyncEnabled, subsyncOnDownload, hiTagRemoval, ocrFixes, commonFixes, colorTagRemoval, reverseRtl, translationProvider, translationTargetLanguage, autoTranslate.
    - [ ] Sub-task: Add migration for new fields.
    - [ ] Sub-task: Update settings API to handle new fields.
- [ ] Task: Build Post-Processing Settings UI
    - [ ] Sub-task: Write tests — verify post-processing form renders and saves.
    - [ ] Sub-task: Add post-processing section to `/settings/subtitles` page: command path input, arguments input, enabled toggle.
    - [ ] Sub-task: Wire to settings API.
- [ ] Task: Build Audio Sync Settings UI
    - [ ] Sub-task: Write tests — verify audio sync form renders and saves.
    - [ ] Sub-task: Add audio synchronization section: subsync toggle, sync-on-download toggle.
    - [ ] Sub-task: Wire to settings API.
- [ ] Task: Build Sub-Zero Modification Settings UI
    - [ ] Sub-task: Write tests — verify Sub-Zero settings form renders all options.
    - [ ] Sub-task: Add subtitle modifications section: HI tag removal, OCR fixes, common fixes, color tag removal, reverse RTL — each as checkbox.
    - [ ] Sub-task: Wire to settings API.
- [ ] Task: Build Translation Settings UI
    - [ ] Sub-task: Write tests — verify translation provider selection and config.
    - [ ] Sub-task: Add translation section: provider dropdown (None, Gemini, Lingarr), target language dropdown, auto-translate toggle.
    - [ ] Sub-task: Wire to settings API.
- [ ] Task: Build Anti-Captcha Provider Config
    - [ ] Sub-task: Write tests — verify anti-captcha config renders in provider settings.
    - [ ] Sub-task: Add anti-captcha section to providers page: provider type (Anti-Captcha, Death-by-Captcha), API key field.
    - [ ] Sub-task: Wire to provider settings API.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) - PENDING
