# Bazarr UI Cloning - Adapted Implementation Plan

**Track:** bazarr_ui_cloning_20260214  
**Status:** COMPLETED  
**Created:** 2026-02-14  
**Updated:** 2026-02-17

---

## Overview

This plan implements Bazarr-style subtitle management UI into the existing Mediarr app. The app already has:
- Next.js 15 + React 19 + TypeScript
- Tailwind CSS v4 with design tokens
- App shell with sidebar, command palette, keyboard shortcuts
- Real-time SSE events
- React Query for state management
- Basic subtitle page (movie-only)

**Adaptation Note:** Instead of introducing Mantine UI (as originally spec'd), we'll leverage the existing Tailwind-based component system for consistency.

---

## Phase 1: API Infrastructure Expansion

**Objective:** Extend existing APIs to support full Bazarr-style subtitle operations.

**Dependencies:** None - can start immediately

### Tasks

- [x] **Task 1.1: Expand subtitleApi for series support (TDD)**
  - [x] Write tests for series subtitle endpoints
  - [x] Add `listSeriesVariants(seriesId)` method
  - [x] Add `listSeasonEpisodes(seasonId)` method  
  - [x] Update routeMap with new endpoints
  - [x] Verify coverage >80%

- [x] **Task 1.2: Create languageProfilesApi (TDD)**
  - [x] Write tests for language profile CRUD
  - [x] Implement `listProfiles()`, `getProfile(id)`, `createProfile()`, `updateProfile()`, `deleteProfile()`
  - [x] Add schemas for LanguageProfile, LanguageProfileInput
  - [x] Verify coverage >80%

- [x] **Task 1.3: Create subtitleProvidersApi (TDD)**
  - [x] Write tests for provider configuration
  - [x] Implement `listProviders()`, `getProvider(id)`, `updateProvider()`, `testProvider()`
  - [x] Add schemas for SubtitleProvider, ProviderSettings
  - [x] Verify coverage >80%

- [x] **Task 1.4: Create subtitleHistoryApi (TDD)**
  - [x] Write tests for history endpoints
  - [x] Implement `listHistory()`, `getHistoryStats()`, `clearHistory()`
  - [x] Add filtering by type (series/movies), provider, language
  - [x] Verify coverage >80%

- [x] **Task 1.5: Create subtitleWantedApi (TDD)**
  - [x] Write tests for wanted/missing subtitles
  - [x] Implement `listWantedSeries()`, `listWantedMovies()`, `searchAll()`
  - [x] Add individual search endpoints
  - [x] Verify coverage >80%

- [x] **Task 1.6: Create subtitleBlacklistApi (TDD)**
  - [x] Write tests for blacklist endpoints
  - [x] Implement `listBlacklist()`, `removeFromBlacklist()`, `clearBlacklist()`
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 1'**

---

## Phase 2: Series Subtitle Management

**Objective:** Implement series and episode-level subtitle views.

**Dependencies:** Phase 1 complete

### Tasks

- [x] **Task 2.1: Create Series Subtitle List Page (TDD)**
  - [x] Write tests for `/subtitles/series` page
  - [x] Implement paginated series list with subtitle status
  - [x] Add columns: series name, season count, episode progress, missing badges
  - [x] Verify coverage >80%

- [x] **Task 2.2: Create Season/Episode Subtitle View (TDD)**
  - [x] Write tests for season/episode view
  - [x] Implement expandable season rows
  - [x] Add episode subtitle status display
  - [x] Verify coverage >80%

- [x] **Task 2.3: Add Episode Subtitle Actions (TDD)**
  - [x] Write tests for toolbar actions
  - [x] Implement Sync, Scan Disk, Search buttons
  - [x] Add manual search modal trigger
  - [x] Verify coverage >80%

- [x] **Task 2.4: Create Episode Subtitle Upload (TDD)**
  - [x] Write tests for upload component
  - [x] Implement drag-and-drop file upload
  - [x] Add language selection for uploads
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 2'**

---

## Phase 3: Enhanced Movie Subtitles

**Objective:** Expand existing movie subtitle functionality to match Bazarr features.

**Dependencies:** Phase 1 complete

### Tasks

- [x] **Task 3.1: Enhance Movie Subtitle Detail View (TDD)**
  - [x] Write tests for enhanced movie subtitle view
  - [x] Add poster/overview display
  - [x] Implement subtitle file table with actions
  - [x] Verify coverage >80%

- [x] **Task 3.2: Add Movie Subtitle Toolbar Actions (TDD)**
  - [x] Write tests for toolbar
  - [x] Implement Sync, Scan, Search, Manual Search buttons
  - [x] Add More Actions menu (History, etc.)
  - [x] Verify coverage >80%

- [x] **Task 3.3: Create Movie Mass Editor (TDD)**
  - [x] Write tests for mass editor
  - [x] Implement multi-select in movie table
  - [x] Add bulk language profile assignment
  - [x] Verify coverage >80%

- [x] **Task 3.4: Create Movie Subtitle List Page (TDD)**
  - [x] Create movie table with subtitle status
  - [x] Add filters for search and missing subtitles
  - [x] Add Mass Edit button

- [x] **Task: Conductor - User Manual Verification 'Phase 3'**

---

## Phase 4: Wanted (Missing) Subtitles

**Objective:** Implement views for tracking and searching missing subtitles.

**Dependencies:** Phase 2, Phase 3

### Tasks

- [x] **Task 4.1: Create Wanted Series View (TDD)**
  - [x] Write tests for `/subtitles/wanted/series` page
  - [x] Implement missing episode subtitle list
  - [x] Add "Search All" button with progress
  - [x] Add individual search per item
  - [x] Verify coverage >80%

- [x] **Task 4.2: Create Wanted Movies View (TDD)**
  - [x] Write tests for `/subtitles/wanted/movies` page
  - [x] Implement missing movie subtitle list
  - [x] Add missing language badges
  - [x] Verify coverage >80%

- [x] **Task 4.3: Add Wanted Navigation Badge (TDD)**
  - [x] Write tests for badge component
  - [x] Implement real-time count badge
  - [x] Connect to SSE events
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 4'**

---

## Phase 5: History & Statistics

**Objective:** Implement subtitle download history with statistics.

**Dependencies:** Phase 4

### Tasks

- [x] **Task 5.1: Create History Series View (TDD)**
  - [x] Write tests for `/subtitles/history/series` page
  - [x] Implement episode subtitle history table
  - [x] Add columns: series, episode, language, provider, action, timestamp
  - [x] Add clear history button with confirmation
  - [x] Add filters (provider, language, action, date range)
  - [x] Verify coverage >80%

- [x] **Task 5.2: Create History Movies View (TDD)**
  - [x] Write tests for `/subtitles/history/movies` page
  - [x] Implement movie subtitle history table
  - [x] Add clear history button with confirmation
  - [x] Add filters (provider, language, action, date range)
  - [x] Verify coverage >80%

- [x] **Task 5.3: Create History Statistics (TDD)**
  - [x] Write tests for `/subtitles/history/stats` page
  - [x] Implement bar chart for download trends
  - [x] Add time frame filters (day, week, month, year)
  - [x] Add provider/language filtering
  - [x] Add summary cards (total downloads, top provider, top language)
  - [x] Verify coverage >80%

- [x] **Task 5.4: Create HistoryFilters Component (TDD)**
  - [x] Write tests for HistoryFilters component
  - [x] Implement filter UI with provider, language, action, date range
  - [x] Add clear filters button
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 5'**

---

## Phase 6: Blacklist Management

**Objective:** Implement blacklisted subtitle management.

**Dependencies:** Phase 5

### Tasks

- [x] **Task 6.1: Create Blacklist Series View (TDD)**
  - [x] Write tests for `/subtitles/blacklist/series` page
  - [x] Implement blacklisted episode subtitles table
  - [x] Add "Remove All" button
  - [x] Add individual removal
  - [x] Verify coverage >80%

- [x] **Task 6.2: Create Blacklist Movies View (TDD)**
  - [x] Write tests for `/subtitles/blacklist/movies` page
  - [x] Implement blacklisted movie subtitles table
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 6'**

---

## Phase 7: Language Profiles

**Objective:** Implement language profile management for subtitles.

**Dependencies:** Phase 1

### Tasks

- [x] **Task 7.1: Create Language Profiles List (TDD)**
  - [x] Write tests for `/subtitles/profiles` page
  - [x] Implement profiles table with CRUD
  - [x] Add create/edit modals
  - [x] Verify coverage >80%

- [x] **Task 7.2: Create Profile Editor (TDD)**
  - [x] Write tests for profile edit form
  - [x] Implement language multi-select
  - [x] Add cutoff/upgrade options
  - [x] Add hearing impaired, forced options
  - [x] Verify coverage >80%

- [x] **Task 7.3: Add Language Equals Mapping (TDD)**
  - [x] Write tests for language mapping table
  - [x] Implement language equivalence rules
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 7'**

---

## Phase 8: Provider Configuration

**Objective:** Implement subtitle provider management.

**Dependencies:** Phase 1

### Tasks

- [x] **Task 8.1: Create Providers List (TDD)**
  - [x] Write tests for `/subtitles/providers` page
  - [x] Implement providers table with enable/disable
  - [x] Add provider status indicators
  - [x] Verify coverage >80%

- [x] **Task 8.2: Create Provider Settings Forms (TDD)**
  - [x] Write tests for provider configuration forms
  - [x] Implement dynamic forms per provider type
  - [x] Add test connection button
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 8'**

---

## Phase 9: Settings Pages

**Objective:** Implement comprehensive subtitle settings.

**Dependencies:** Phase 7, Phase 8

### Tasks

- [x] **Task 9.1: Create Subtitle General Settings (TDD)**
  - [x] Write tests for `/subtitles/settings/general` page
  - [x] Implement download settings
  - [x] Add file naming options
  - [x] Verify coverage >80%

- [x] **Task 9.2: Create Subtitle Modifications Settings (TDD)**
  - [x] Write tests for modifications page
  - [x] Implement subtitle modification options
  - [x] Add sync/offset settings
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 9'**

---

## Phase 10: Modals & Forms

**Objective:** Implement reusable modals and forms for subtitle operations.

**Dependencies:** Phase 2, Phase 3

### Tasks

- [x] **Task 10.1: Create Manual Search Modal (TDD)**
  - [x] Write tests for manual search modal
  - [x] Implement search results display
  - [x] Add download action
  - [x] Verify coverage >80%

- [x] **Task 10.2: Create Item Edit Modal (TDD)**
  - [x] Write tests for series/movie edit modal
  - [x] Implement language profile selector
  - [x] Add tag selection
  - [x] Verify coverage >80%

- [x] **Task 10.3: Create Subtitle Tools Modal (TDD)**
  - [x] Write tests for tools modal
  - [x] Implement bulk operations UI
  - [x] Add color/frame rate tools placeholder
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 10'**

---

## Phase 11: Integration & Polish

**Objective:** Finalize integration, add real-time updates, and polish.

**Dependencies:** All previous phases

### Tasks

- [x] **Task 11.1: Update Navigation Structure (TDD)**
  - [x] Write tests for navigation updates
  - [x] Add subtitles section to sidebar
  - [x] Organize routes: series, movies, wanted, history, blacklist, profiles, providers, settings
  - [x] Verify coverage >80%

- [x] **Task 11.2: Add SSE Event Handlers (TDD)**
  - [x] Write tests for subtitle-specific events
  - [x] Implement handlers for search progress
  - [x] Add download complete events
  - [x] Verify coverage >80%

- [x] **Task 11.3: Create Global Search Integration (TDD)**
  - [x] Write tests for search integration
  - [x] Add subtitle-specific search results
  - [x] Verify coverage >80%

- [x] **Task 11.4: End-to-End Testing**
  - [x] Create E2E test suite for subtitle flows
  - [x] Test series subtitle management
  - [x] Test wanted subtitle search
  - [x] Test settings

- [x] **Task: Conductor - User Manual Verification 'Phase 11'**

---

## Parallelization Strategy

```
Phase 1 (API Infrastructure)
    │
    ├──→ Phase 2 (Series) ──┐
    │                       │
    └──→ Phase 3 (Movies) ──┤
                            │
    Phase 4 (Wanted) ←──────┤
                            │
    Phase 5 (History) ←─────┤
                            │
    Phase 6 (Blacklist) ←───┤
                            │
    Phase 7 (Profiles) ←────┤ (can start after Phase 1)
                            │
    Phase 8 (Providers) ←───┤ (can start after Phase 1)
                            │
    Phase 9 (Settings) ←────┘ (needs Phase 7, 8)
                            │
    Phase 10 (Modals) ←─────┐ (can start after Phase 2, 3)
                            │
    Phase 11 (Integration) ←┘ (needs all phases)
```

---

## Notes

- Use existing Tailwind components from `@/components/primitives/`
- Follow existing patterns from movies/series implementations
- Maintain >80% code coverage
- Use React Query for server state
- Use SSE for real-time updates
- Integrate with existing navigation structure
- Reuse existing table, modal, form components

---

## Initial Delegation

Phase 1 tasks can all run in parallel since they're independent API modules.
