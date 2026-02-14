# Bazarr UI Cloning - Implementation Plan

**Track:** bazarr_ui_cloning_20260214  
**Status:** Planning Complete  
**Created:** 2026-02-14

---

## Overview

This plan implements the Bazarr UI cloning based on the comprehensive specification. Bazarr is a subtitle manager for Sonarr and Radarr with features for managing subtitles, language profiles, and provider configurations.

**Goal:** Create equivalent functionality in the mediarr app for Bazarr-style subtitle management UI.

---

## Phase 1: Project Setup & Core Infrastructure

**Objective:** Establish foundation with Mantine UI setup, layout components, and state management.

### Tasks

- [ ] **Task 1.1: Verify existing infrastructure**
  - [ ] Confirm Next.js 15 App Router setup
  - [ ] Check TypeScript configuration
  - [ ] Verify Tailwind CSS setup
  - [ ] Document differences from Mantine UI approach
  - [ ] Decide: Adapt to Tailwind or add Mantine

- [ ] **Task 1.2: Install and configure Mantine UI (TDD)**
  - [ ] Write tests for Mantine setup
  - [ ] Install @mantine/core and related packages
  - [ ] Configure Mantine provider
  - [ ] Write tests for theme configuration
  - [ ] Implement dark/light theme support
  - [ ] Verify coverage >80%

- [ ] **Task 1.3: Create App Shell components (TDD)**
  - [ ] Write tests for AppShell layout
  - [ ] Implement Mantine AppShell
  - [ ] Write tests for AppHeader
  - [ ] Implement header with search and notifications
  - [ ] Write tests for AppNavbar
  - [ ] Implement collapsible navigation
  - [ ] Verify coverage >80%

- [ ] **Task 1.4: Create Notification Drawer (TDD)**
  - [ ] Write tests for NotificationDrawer
  - [ ] Implement jobs manager drawer
  - [ ] Write tests for job groups
  - [ ] Implement running/pending/completed/failed sections
  - [ ] Write tests for job actions
  - [ ] Implement move/cancel/force actions
  - [ ] Verify coverage >80%

- [ ] **Task 1.5: Set up state management (TDD)**
  - [ ] Write tests for React Query setup
  - [ ] Implement TanStack Query configuration
  - [ ] Write tests for Context providers
  - [ ] Implement NavbarProvider and OnlineProvider
  - [ ] Write tests for localStorage hooks
  - [ ] Implement page size persistence
  - [ ] Verify coverage >80%

- [ ] **Task 1.6: Create routing structure**
  - [ ] Write tests for route configuration
  - [ ] Implement Next.js routes matching Bazarr
  - [ ] Write tests for navigation structure
  - [ ] Implement nested navigation
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 1'**

---

## Phase 2: Table & Data Components

**Objective:** Implement table system using TanStack React Table with Mantine styling.

### Tasks

- [ ] **Task 2.1: Create base Table components (TDD)**
  - [ ] Write tests for BaseTable
  - [ ] Implement base table with Mantine
  - [ ] Write tests for PageTable
  - [ ] Implement paginated table
  - [ ] Write tests for QueryPageTable
  - [ ] Implement React Query integration
  - [ ] Write tests for PageControl
  - [ ] Implement pagination controls
  - [ ] Verify coverage >80%

- [ ] **Task 2.2: Implement table features (TDD)**
  - [ ] Write tests for row selection
  - [ ] Implement checkbox selection
  - [ ] Write tests for expandable rows
  - [ ] Implement row expansion
  - [ ] Write tests for custom cell renderers
  - [ ] Implement progress bars, badges, icons
  - [ ] Verify coverage >80%

- [ ] **Task 2.3: Create ItemView component (TDD)**
  - [ ] Write tests for ItemView
  - [ ] Implement reusable list view
  - [ ] Write tests for ItemOverview
  - [ ] Implement overview banner with fanart
  - [ ] Write tests for WantedView
  - [ ] Implement wanted view template
  - [ ] Write tests for HistoryView
  - [ ] Implement history view template
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 2'**

---

## Phase 3: Toolbox & Actions

**Objective:** Create consistent action bar pattern across all pages.

### Tasks

- [ ] **Task 3.1: Create Toolbox components (TDD)**
  - [ ] Write tests for Toolbox container
  - [ ] Implement toolbox wrapper
  - [ ] Write tests for Toolbox.Button
  - [ ] Implement standard action button
  - [ ] Write tests for Toolbox.MutateButton
  - [ ] Implement async action button
  - [ ] Verify coverage >80%

- [ ] **Task 3.2: Create Action components (TDD)**
  - [ ] Write tests for Action icon button
  - [ ] Implement icon-based actions
  - [ ] Write tests for tooltips
  - [ ] Implement hover tooltips
  - [ ] Write tests for loading states
  - [ ] Implement loading indicators
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 3'**

---

## Phase 4: Series Management

**Objective:** Implement Series list and episode detail views.

### Tasks

- [ ] **Task 4.1: Create Series list view (TDD)**
  - [ ] Write tests for Series page
  - [ ] Implement series list
  - [ ] Write tests for series columns
  - [ ] Implement status, name, profile columns
  - [ ] Write tests for episode progress
  - [ ] Implement progress bars
  - [ ] Verify coverage >80%

- [ ] **Task 4.2: Create Series Editor (TDD)**
  - [ ] Write tests for Editor page
  - [ ] Implement mass editor
  - [ ] Write tests for bulk selection
  - [ ] Implement multi-select
  - [ ] Write tests for bulk actions
  - [ ] Implement profile changes
  - [ ] Verify coverage >80%

- [ ] **Task 4.3: Create Episodes view (TDD)**
  - [ ] Write tests for Episodes page
  - [ ] Implement episode detail view
  - [ ] Write tests for ItemOverview
  - [ ] Implement series overview banner
  - [ ] Write tests for toolbar actions
  - [ ] Implement Sync, Scan, Search, Upload
  - [ ] Verify coverage >80%

- [ ] **Task 4.4: Implement episode table (TDD)**
  - [ ] Write tests for episode table
  - [ ] Implement grouped by season
  - [ ] Write tests for expandable rows
  - [ ] Implement season expansion
  - [ ] Write tests for subtitle status
  - [ ] Implement missing badges
  - [ ] Verify coverage >80%

- [ ] **Task 4.5: Create upload functionality (TDD)**
  - [ ] Write tests for Dropzone
  - [ ] Implement full-screen dropzone
  - [ ] Write tests for upload handling
  - [ ] Implement file upload processing
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 4'**

---

## Phase 5: Movies Management

**Objective:** Implement Movies list and detail views.

### Tasks

- [ ] **Task 5.1: Create Movies list view (TDD)**
  - [ ] Write tests for Movies page
  - [ ] Implement movies list
  - [ ] Write tests for movie columns
  - [ ] Implement monitored, name, audio columns
  - [ ] Write tests for missing badges
  - [ ] Implement language badges
  - [ ] Verify coverage >80%

- [ ] **Task 5.2: Create Movies Editor (TDD)**
  - [ ] Write tests for Movies Editor
  - [ ] Implement mass editor
  - [ ] Write tests for bulk operations
  - [ ] Implement bulk profile changes
  - [ ] Verify coverage >80%

- [ ] **Task 5.3: Create Movie Details view (TDD)**
  - [ ] Write tests for Movie Details
  - [ ] Implement movie detail page
  - [ ] Write tests for overview
  - [ ] Implement poster and metadata
  - [ ] Write tests for toolbar
  - [ ] Implement actions (Sync, Scan, Search, Upload)
  - [ ] Verify coverage >80%

- [ ] **Task 5.4: Implement subtitle table (TDD)**
  - [ ] Write tests for subtitle table
  - [ ] Implement subtitle file list
  - [ ] Write tests for subtitle actions
  - [ ] Implement download/remove
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 5'**

---

## Phase 6: Wanted Views

**Objective:** Implement missing subtitle tracking for series and movies.

### Tasks

- [ ] **Task 6.1: Create Wanted Series view (TDD)**
  - [ ] Write tests for Wanted Series
  - [ ] Implement wanted episodes
  - [ ] Write tests for wanted columns
  - [ ] Implement name, episode, missing columns
  - [ ] Write tests for Search All
  - [ ] Implement bulk search button
  - [ ] Verify coverage >80%

- [ ] **Task 6.2: Create Wanted Movies view (TDD)**
  - [ ] Write tests for Wanted Movies
  - [ ] Implement wanted movies
  - [ ] Write tests for missing badges
  - [ ] Implement clickable language badges
  - [ ] Write tests for individual search
  - [ ] Implement per-item search
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 6'**

---

## Phase 7: Blacklist

**Objective:** Implement blacklisted subtitle management.

### Tasks

- [ ] **Task 7.1: Create Blacklist Series view (TDD)**
  - [ ] Write tests for Blacklist Series
  - [ ] Implement blacklisted episodes
  - [ ] Write tests for blacklist table
  - [ ] Implement columns
  - [ ] Write tests for Remove All
  - [ ] Implement clear blacklist
  - [ ] Verify coverage >80%

- [ ] **Task 7.2: Create Blacklist Movies view (TDD)**
  - [ ] Write tests for Blacklist Movies
  - [ ] Implement blacklisted movies
  - [ ] Write tests for removal
  - [ ] Implement individual removal
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 7'**

---

## Phase 8: History

**Objective:** Implement download history and statistics.

### Tasks

- [ ] **Task 8.1: Create History Series view (TDD)**
  - [ ] Write tests for History Series
  - [ ] Implement episode history
  - [ ] Write tests for history columns
  - [ ] Implement series, episode, language columns
  - [ ] Verify coverage >80%

- [ ] **Task 8.2: Create History Movies view (TDD)**
  - [ ] Write tests for History Movies
  - [ ] Implement movie history
  - [ ] Write tests for movie columns
  - [ ] Implement movie, language columns
  - [ ] Verify coverage >80%

- [ ] **Task 8.3: Create History Statistics (TDD)**
  - [ ] Write tests for HistoryStats
  - [ ] Implement statistics page
  - [ ] Write tests for BarChart
  - [ ] Implement Recharts bar chart
  - [ ] Write tests for filters
  - [ ] Implement time frame, provider, language filters
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 8'**

---

## Phase 9: Settings Pages

**Objective:** Implement comprehensive settings for all configuration areas.

### Tasks

- [ ] **Task 9.1: Create Settings Layout (TDD)**
  - [ ] Write tests for Layout component
  - [ ] Implement settings wrapper
  - [ ] Write tests for Section component
  - [ ] Implement grouped sections
  - [ ] Write tests for setting components
  - [ ] Implement Text, Number, Password, Selector, Check
  - [ ] Verify coverage >80%

- [ ] **Task 9.2: Create General Settings (TDD)**
  - [ ] Write tests for General
  - [ ] Implement general settings
  - [ ] Write tests for Host section
  - [ ] Implement IP, port, base URL
  - [ ] Write tests for Security section
  - [ ] Implement auth, API key
  - [ ] Write tests for Jobs Manager
  - [ ] Implement concurrent jobs
  - [ ] Write tests for Proxy section
  - [ ] Implement proxy config
  - [ ] Write tests for Updates section
  - [ ] Implement auto-update
  - [ ] Write tests for Logging section
  - [ ] Implement debug mode
  - [ ] Write tests for Backups section
  - [ ] Implement backup config
  - [ ] Write tests for Analytics section
  - [ ] Implement usage tracking
  - [ ] Verify coverage >80%

- [ ] **Task 9.3: Create Languages Settings (TDD)**
  - [ ] Write tests for Languages
  - [ ] Implement language settings
  - [ ] Write tests for LanguageSelector
  - [ ] Implement multi-select picker
  - [ ] Write tests for ProfileSelector
  - [ ] Implement profile dropdown
  - [ ] Write tests for profile management
  - [ ] Implement create/edit/delete profiles
  - [ ] Write tests for EqualsTable
  - [ ] Implement language equals mapping
  - [ ] Verify coverage >80%

- [ ] **Task 9.4: Create Providers Settings (TDD)**
  - [ ] Write tests for Providers
  - [ ] Implement provider settings
  - [ ] Write tests for provider toggles
  - [ ] Implement enable/disable providers
  - [ ] Write tests for anti-captcha
  - [ ] Implement captcha config
  - [ ] Verify coverage >80%

- [ ] **Task 9.5: Create Subtitles Settings (TDD)**
  - [ ] Write tests for Subtitles
  - [ ] Implement subtitle settings
  - [ ] Write tests for download settings
  - [ ] Implement download config
  - [ ] Write tests for modification settings
  - [ ] Implement subtitle modifications
  - [ ] Verify coverage >80%

- [ ] **Task 9.6: Create Sonarr Settings (TDD)**
  - [ ] Write tests for Sonarr
  - [ ] Implement Sonarr integration
  - [ ] Write tests for connection config
  - [ ] Implement URL, API key
  - [ ] Write tests for sync settings
  - [ ] Implement sync config
  - [ ] Verify coverage >80%

- [ ] **Task 9.7: Create Radarr Settings (TDD)**
  - [ ] Write tests for Radarr
  - [ ] Implement Radarr integration
  - [ ] Write tests for connection config
  - [ ] Implement URL, API key
  - [ ] Write tests for sync settings
  - [ ] Implement sync config
  - [ ] Verify coverage >80%

- [ ] **Task 9.8: Create Plex Settings (TDD)**
  - [ ] Write tests for Plex
  - [ ] Implement Plex integration
  - [ ] Write tests for connection config
  - [ ] Implement Plex settings
  - [ ] Verify coverage >80%

- [ ] **Task 9.9: Create Notifications Settings (TDD)**
  - [ ] Write tests for Notifications
  - [ ] Implement notification config
  - [ ] Write tests for notification types
  - [ ] Implement Discord/Email/etc
  - [ ] Verify coverage >80%

- [ ] **Task 9.10: Create Scheduler Settings (TDD)**
  - [ ] Write tests for Scheduler
  - [ ] Implement scheduler config
  - [ ] Write tests for task intervals
  - [ ] Implement task scheduling
  - [ ] Verify coverage >80%

- [ ] **Task 9.11: Create UI Settings (TDD)**
  - [ ] Write tests for UI
  - [ ] Implement UI preferences
  - [ ] Write tests for theme
  - [ ] Implement light/dark mode
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 9'**

---

## Phase 10: System Pages

**Objective:** Implement System tasks, logs, providers, backups, status, releases, and announcements.

### Tasks

- [ ] **Task 10.1: Create System Tasks (TDD)**
  - [ ] Write tests for Tasks
  - [ ] Implement tasks page
  - [ ] Write tests for task table
  - [ ] Implement scheduled tasks list
  - [ ] Write tests for manual execution
  - [ ] Implement run task button
  - [ ] Verify coverage >80%

- [ ] **Task 10.2: Create System Logs (TDD)**
  - [ ] Write tests for Logs
  - [ ] Implement logs page
  - [ ] Write tests for log table
  - [ ] Implement log entries
  - [ ] Write tests for log actions
  - [ ] Implement download, clear, filter
  - [ ] Verify coverage >80%

- [ ] **Task 10.3: Create System Providers (TDD)**
  - [ ] Write tests for System Providers
  - [ ] Implement providers status
  - [ ] Write tests for status table
  - [ ] Implement provider list
  - [ ] Write tests for reset action
  - [ ] Implement reset failed providers
  - [ ] Verify coverage >80%

- [ ] **Task 10.4: Create System Backups (TDD)**
  - [ ] Write tests for Backups
  - [ ] Implement backups page
  - [ ] Write tests for backup table
  - [ ] Implement backup list
  - [ ] Write tests for backup actions
  - [ ] Implement create, restore, delete
  - [ ] Verify coverage >80%

- [ ] **Task 10.5: Create System Status (TDD)**
  - [ ] Write tests for Status
  - [ ] Implement status page
  - [ ] Write tests for Health section
  - [ ] Implement health checks
  - [ ] Write tests for About section
  - [ ] Implement version info
  - [ ] Write tests for uptime counter
  - [ ] Implement live uptime display
  - [ ] Verify coverage >80%

- [ ] **Task 10.6: Create System Releases (TDD)**
  - [ ] Write tests for Releases
  - [ ] Implement releases page
  - [ ] Write tests for release cards
  - [ ] Implement release notes
  - [ ] Verify coverage >80%

- [ ] **Task 10.7: Create System Announcements (TDD)**
  - [ ] Write tests for Announcements
  - [ ] Implement announcements page
  - [ ] Write tests for announcement display
  - [ ] Implement dismissible announcements
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 10'**

---

## Phase 11: Forms & Modals

**Objective:** Implement reusable forms and modals for editing and tools.

### Tasks

- [ ] **Task 11.1: Create Item Edit Forms (TDD)**
  - [ ] Write tests for ItemEditForm
  - [ ] Implement series/movie edit form
  - [ ] Write tests for profile selection
  - [ ] Implement profile dropdown
  - [ ] Write tests for tag selection
  - [ ] Implement tags input
  - [ ] Verify coverage >80%

- [ ] **Task 11.2: Create Upload Forms (TDD)**
  - [ ] Write tests for SeriesUploadForm
  - [ ] Implement series upload form
  - [ ] Write tests for MovieUploadForm
  - [ ] Implement movie upload form
  - [ ] Write tests for language selection
  - [ ] Implement language dropdown
  - [ ] Verify coverage >80%

- [ ] **Task 11.3: Create Profile Edit Form (TDD)**
  - [ ] Write tests for ProfileEditForm
  - [ ] Implement profile editor
  - [ ] Write tests for language selection
  - [ ] Implement language multi-select
  - [ ] Write tests for options
  - [ ] Implement profile options
  - [ ] Verify coverage >80%

- [ ] **Task 11.4: Create Subtitle Tool Forms (TDD)**
  - [ ] Write tests for ColorToolForm
  - [ ] Implement color adjustment
  - [ ] Write tests for FrameRateForm
  - [ ] Implement frame rate conversion
  - [ ] Write tests for SyncSubtitleForm
  - [ ] Implement subtitle sync
  - [ ] Write tests for TimeOffsetForm
  - [ ] Implement time offset
  - [ ] Write tests for TranslationForm
  - [ ] Implement subtitle translation
  - [ ] Verify coverage >80%

- [ ] **Task 11.5: Create Modals (TDD)**
  - [ ] Write tests for HistoryModal
  - [ ] Implement history viewer
  - [ ] Write tests for ManualSearchModal
  - [ ] Implement manual search
  - [ ] Write tests for SubtitleToolsModal
  - [ ] Implement tools modal
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 11'**

---

## Phase 12: Real-time Features & Polish

**Objective:** Implement Socket.IO integration, search, and final polish.

### Tasks

- [ ] **Task 12.1: Implement Socket.IO integration (TDD)**
  - [ ] Write tests for Socket.IO client
  - [ ] Implement socket connection
  - [ ] Write tests for event handlers
  - [ ] Implement reducers for events
  - [ ] Write tests for badge updates
  - [ ] Implement real-time badge updates
  - [ ] Write tests for data refresh
  - [ ] Implement automatic refresh
  - [ ] Verify coverage >80%

- [ ] **Task 12.2: Implement Global Search (TDD)**
  - [ ] Write tests for Search component
  - [ ] Implement global search
  - [ ] Write tests for debounced search
  - [ ] Implement 500ms debounce
  - [ ] Write tests for search results
  - [ ] Implement results with posters
  - [ ] Verify coverage >80%

- [ ] **Task 12.3: Implement responsive design (TDD)**
  - [ ] Write tests for mobile layout
  - [ ] Implement responsive AppShell
  - [ ] Write tests for table scrolling
  - [ ] Implement horizontal scroll
  - [ ] Verify coverage >80%

- [ ] **Task 12.4: Implement theme system (TDD)**
  - [ ] Write tests for theme switching
  - [ ] Implement light/dark toggle
  - [ ] Write tests for theme persistence
  - [ ] Implement saved preference
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 12'**

---

## Phase 13: Integration & Completion

**Objective:** Verify integration with existing mediarr features and finalize.

### Tasks

- [ ] **Task 13.1: Compare with existing features**
  - [ ] Audit existing subtitle-related features
  - [ ] Identify missing functionality
  - [ ] Document feature gaps
  - [ ] Prioritize fixes

- [ ] **Task 13.2: Fix existing functionality**
  - [ ] Fix broken features
  - [ ] Add missing core features
  - [ ] Ensure API compatibility
  - [ ] Verify data integrity

- [ ] **Task 13.3: End-to-end testing**
  - [ ] Create E2E test suite
  - [ ] Test series management
  - [ ] Test subtitle search
  - [ ] Test settings
  - [ ] Test mobile

- [ ] **Task 13.4: Documentation**
  - [ ] Document components
  - [ ] Create API guide
  - [ ] Write user guide
  - [ ] Update README

- [ ] **Task: Conductor - User Manual Verification 'Phase 13'**

---

## Dependencies Between Phases

```
Phase 1 (Infrastructure)
    ↓
Phase 2 (Tables) ←→ Phase 3 (Toolbox)
    ↓
Phase 4 (Series) ←→ Phase 5 (Movies)
    ↓
Phase 6 (Wanted) ←→ Phase 7 (Blacklist) ←→ Phase 8 (History)
    ↓
Phase 9 (Settings)
    ↓
Phase 10 (System)
    ↓
Phase 11 (Forms/Modals)
    ↓
Phase 12 (Real-time/Polish)
    ↓
Phase 13 (Integration)
```

---

## Notes

- Follow TDD methodology: Tests → Implementation → Coverage
- Use Mantine UI components
- Use FontAwesome for icons (or migrate to Lucide)
- Maintain >80% code coverage
- Use React Query for server state
- Use Socket.IO for real-time updates
- Follow existing mediarr patterns where applicable
