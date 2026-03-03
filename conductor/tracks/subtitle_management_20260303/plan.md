# Implementation Plan: Subtitle Management

## Phase 1: Subtitle Providers and Scoring
> Goal: Implement real subtitle providers (indexers) and a scoring algorithm.

- [ ] Task: Implement Subtitle Providers
    - [ ] Sub-task: Bridge OpenSubtitles (org/com) into `ManualSubtitleProvider` and `SubtitleFetchProvider`.
    - [ ] Sub-task: Implement a generic provider wrapper based on Bazarr's subliminal-like logic (reference `reference/bazarr/`).
    - [ ] Sub-task: Specifically add support for Addic7ed and Thai/Chinese sites (SubHD/Zimuku).
- [ ] Task: Implement Subtitle Scoring
    - [ ] Sub-task: Create a `SubtitleScoringService` based on Bazarr's `score.py` (hash match, title match, year match, etc.).
- [ ] Task: Write unit tests for providers and scoring logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Subtitle Providers' (Protocol in workflow.md)

## Phase 2: Configuration and Backend Automation
> Goal: Configure desired languages and implement automated searches.

- [ ] Task: Global Subtitle Settings
    - [ ] Sub-task: Add `wantedLanguages` (array of language codes) to `AppSettings`.
    - [ ] Sub-task: Add API endpoints for managing wanted languages.
- [ ] Task: Automated Subtitle Search Service
    - [ ] Sub-task: Create a service to scan for media missing wanted subtitles.
    - [ ] Sub-task: Implement the automated search/download loop.
- [ ] Task: Import Integration
    - [ ] Sub-task: Hook into the media import process to trigger a subtitle search on success.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Configuration and Backend Automation' (Protocol in workflow.md)

## Phase 3: Frontend Subtitle Badges
> Goal: Display color-coded language badges in the UI.

- [ ] Task: Implement Subtitle Status Logic in Frontend
    - [ ] Sub-task: Add `wantedLanguages` to the frontend settings store.
    - [ ] Sub-task: Update `Movie` and `Episode` types to include their subtitle track information.
- [ ] Task: Media Item Badges
    - [ ] Sub-task: Use `LanguageBadge.tsx` to display [en], [th], [zh] badges on Movie and Episode rows.
    - [ ] Sub-task: Green for grabbed, Gray for missing/wanted.
- [ ] Task: Parent/Collection Badges
    - [ ] Sub-task: Implement "Partial" (Yellow) status logic for Series and Seasons.
    - [ ] Sub-task: Render collection-level badges in the library overview.
- [ ] Task: Media Detail Integration
    - [ ] Sub-task: Add detailed subtitle status badges to `MovieDetailHeader` and Series detail header.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Subtitle Badges' (Protocol in workflow.md)
