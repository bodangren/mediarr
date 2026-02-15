# Radarr UI Cloning - Implementation Plan

**Track:** radarr_ui_cloning_20260214  
**Status:** Planning Complete  
**Created:** 2026-02-14

---

## Overview

This plan implements the Radarr UI cloning based on the comprehensive specification. Radarr is a movie collection manager with features for managing movies, downloads, quality profiles, and extensive configuration options.

**Goal:** Create equivalent functionality in the mediarr app for Radarr-style movie management UI.

---

## Phase 1: Project Setup & Core Infrastructure

**Objective:** Establish foundation with layout components, routing, and state management.

### Tasks

- [ ] **Task 1.1: Verify existing infrastructure**
  - [ ] Confirm Next.js 15 App Router setup
  - [ ] Check TypeScript and Tailwind configuration
  - [ ] Verify existing component library
  - [ ] Document available shared components

- [ ] **Task 1.2: Create App Shell components (TDD)**
  - [ ] Write tests for Page component
  - [ ] Implement page wrapper with layout
  - [ ] Write tests for PageSidebar
  - [ ] Implement navigation sidebar
  - [ ] Write tests for PageHeader
  - [ ] Implement header with logo and actions
  - [ ] Verify coverage >80%

- [ ] **Task 1.3: Create Page Layout components (TDD)**
  - [ ] Write tests for PageContent
  - [ ] Implement content wrapper
  - [ ] Write tests for PageToolbar
  - [ ] Implement action toolbar
  - [ ] Write tests for PageToolbarButton
  - [ ] Implement toolbar buttons
  - [ ] Write tests for PageToolbarSeparator
  - [ ] Implement visual separators
  - [ ] Verify coverage >80%

- [ ] **Task 1.4: Set up state management (TDD)**
  - [ ] Write tests for Redux store
  - [ ] Implement Redux with slices
  - [ ] Write tests for React Query setup
  - [ ] Implement server state management
  - [ ] Write tests for Zustand appStore
  - [ ] Implement app-level state
  - [ ] Verify coverage >80%

- [ ] **Task 1.5: Create routing structure**
  - [ ] Write tests for route configuration
  - [ ] Implement Next.js routes matching Radarr
  - [ ] Write tests for navigation active states
  - [ ] Implement active route highlighting
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 1'**

---

## Phase 2: Table & Data Components

**Objective:** Implement table system with sorting, filtering, pagination, and view modes.

### Tasks

- [ ] **Task 2.1: Create Table components (TDD)**
  - [ ] Write tests for Table
  - [ ] Implement table container
  - [ ] Write tests for TableHeader
  - [ ] Implement sortable headers
  - [ ] Write tests for TableBody and TableRow
  - [ ] Implement table content
  - [ ] Write tests for TableHeaderCell
  - [ ] Implement header cells with sort
  - [ ] Verify coverage >80%

- [ ] **Task 2.2: Implement pagination (TDD)**
  - [ ] Write tests for TablePager
  - [ ] Implement pagination controls
  - [ ] Write tests for page navigation
  - [ ] Implement page controls
  - [ ] Verify coverage >80%

- [ ] **Task 2.3: Implement table options (TDD)**
  - [ ] Write tests for TableOptionsModalWrapper
  - [ ] Implement column visibility
  - [ ] Write tests for column management
  - [ ] Implement show/hide columns
  - [ ] Verify coverage >80%

- [ ] **Task 2.4: Implement filtering (TDD)**
  - [ ] Write tests for FilterMenu
  - [ ] Implement filter dropdown
  - [ ] Write tests for Filter component
  - [ ] Implement filter system
  - [ ] Write tests for custom filters
  - [ ] Implement filter builder
  - [ ] Verify coverage >80%

- [ ] **Task 2.5: Implement sorting (TDD)**
  - [ ] Write tests for SortMenu
  - [ ] Implement sort dropdown
  - [ ] Write tests for sort direction
  - [ ] Implement asc/desc toggle
  - [ ] Verify coverage >80%

- [ ] **Task 2.6: Implement ViewMenu (TDD)**
  - [ ] Write tests for ViewMenu
  - [ ] Implement view mode selector
  - [ ] Write tests for view switching
  - [ ] Implement Poster/Overview/Table toggle
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 2'**

---

## Phase 3: Modal & Form Components

**Objective:** Create modal dialogs and form inputs for CRUD operations.

### Tasks

- [ ] **Task 3.1: Create Modal components (TDD)**
  - [ ] Write tests for Modal
  - [ ] Implement modal container
  - [ ] Write tests for ModalHeader
  - [ ] Implement modal header
  - [ ] Write tests for ModalBody
  - [ ] Implement modal body
  - [ ] Write tests for ModalFooter
  - [ ] Implement modal footer
  - [ ] Verify coverage >80%

- [ ] **Task 3.2: Create ConfirmModal (TDD)**
  - [ ] Write tests for ConfirmModal
  - [ ] Implement confirmation dialog
  - [ ] Write tests for danger/warning variants
  - [ ] Implement styled variants
  - [ ] Verify coverage >80%

- [ ] **Task 3.3: Create Menu components (TDD)**
  - [ ] Write tests for Menu
  - [ ] Implement dropdown menu
  - [ ] Write tests for MenuItem
  - [ ] Implement menu items
  - [ ] Verify coverage >80%

- [ ] **Task 3.4: Create Form components (TDD)**
  - [ ] Write tests for Form inputs
  - [ ] Implement TextInput
  - [ ] Write tests for SelectInput
  - [ ] Implement SelectInput
  - [ ] Write tests for CheckInput
  - [ ] Implement CheckInput
  - [ ] Write tests for FormGroup
  - [ ] Implement form groups
  - [ ] Verify coverage >80%

- [ ] **Task 3.5: Create specialized inputs (TDD)**
  - [ ] Write tests for TagInput
  - [ ] Implement tag selection
  - [ ] Write tests for PathInput
  - [ ] Implement path input
  - [ ] Write tests for FileBrowser
  - [ ] Implement file browser modal
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 3'**

---

## Phase 4: Movie Management Views

**Objective:** Implement Movie Index, Add Movie, Import Library, and Movie Details.

### Tasks

- [ ] **Task 4.1: Create MovieIndex view (TDD)**
  - [ ] Write tests for MovieIndex
  - [ ] Implement movie list page
  - [ ] Write tests for MovieIndexTable
  - [ ] Implement table view
  - [ ] Write tests for MovieIndexPosters
  - [ ] Implement poster grid view
  - [ ] Write tests for MovieIndexOverviews
  - [ ] Implement overview cards view
  - [ ] Verify coverage >80%

- [ ] **Task 4.2: Implement MovieIndex features (TDD)**
  - [ ] Write tests for toolbar actions
  - [ ] Implement Refresh, RSS Sync, Search
  - [ ] Write tests for view switching
  - [ ] Implement view mode toggle
  - [ ] Write tests for filter/sort
  - [ ] Implement filter and sort controls
  - [ ] Verify coverage >80%

- [ ] **Task 4.3: Create AddNewMovie view (TDD)**
  - [ ] Write tests for AddNewMovie
  - [ ] Implement add movie page
  - [ ] Write tests for TMDB search
  - [ ] Implement movie search
  - [ ] Write tests for AddNewMovieSearchResult
  - [ ] Implement search results
  - [ ] Verify coverage >80%

- [ ] **Task 4.4: Create ImportMovie view (TDD)**
  - [ ] Write tests for ImportMovie
  - [ ] Implement import page
  - [ ] Write tests for folder browser
  - [ ] Implement folder selection
  - [ ] Write tests for movie detection
  - [ ] Implement parsing and matching
  - [ ] Verify coverage >80%

- [ ] **Task 4.5: Create DiscoverMovie view (TDD)**
  - [ ] Write tests for DiscoverMovie
  - [ ] Implement discovery page
  - [ ] Write tests for discovery modes
  - [ ] Implement Popular/Top Rated/Upcoming
  - [ ] Verify coverage >80%

- [ ] **Task 4.6: Create MovieDetails view (TDD)**
  - [ ] Write tests for MovieDetailsPage
  - [ ] Implement movie detail page
  - [ ] Write tests for MovieDetails header
  - [ ] Implement header with poster/backdrop
  - [ ] Write tests for toolbar actions
  - [ ] Implement action buttons
  - [ ] Verify coverage >80%

- [ ] **Task 4.7: Implement MovieDetails sections (TDD)**
  - [ ] Write tests for Files section
  - [ ] Implement movie files table
  - [ ] Write tests for Cast section
  - [ ] Implement cast poster grid
  - [ ] Write tests for Crew section
  - [ ] Implement crew display
  - [ ] Write tests for Titles section
  - [ ] Implement alternate titles
  - [ ] Verify coverage >80%

- [ ] **Task 4.8: Create Collections view (TDD)**
  - [ ] Write tests for Collection
  - [ ] Implement collections page
  - [ ] Write tests for collection grid
  - [ ] Implement collection display
  - [ ] Write tests for collection actions
  - [ ] Implement edit/delete
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 4'**

---

## Phase 5: Calendar View

**Objective:** Implement calendar for upcoming movie releases.

### Tasks

- [ ] **Task 5.1: Create Calendar page (TDD)**
  - [ ] Write tests for CalendarPage
  - [ ] Implement calendar container
  - [ ] Write tests for Calendar
  - [ ] Implement calendar grid
  - [ ] Write tests for CalendarHeader
  - [ ] Implement navigation
  - [ ] Verify coverage >80%

- [ ] **Task 5.2: Implement Calendar days (TDD)**
  - [ ] Write tests for CalendarDays
  - [ ] Implement day cells
  - [ ] Write tests for CalendarDay
  - [ ] Implement single day
  - [ ] Write tests for movie events
  - [ ] Implement release indicators
  - [ ] Verify coverage >80%

- [ ] **Task 5.3: Create Agenda view (TDD)**
  - [ ] Write tests for Agenda
  - [ ] Implement list view
  - [ ] Write tests for movie list
  - [ ] Implement chronological display
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 5'**

---

## Phase 6: Activity Views

**Objective:** Implement Queue, History, and Blocklist views.

### Tasks

- [ ] **Task 6.1: Create Queue view (TDD)**
  - [ ] Write tests for Queue
  - [ ] Implement queue page
  - [ ] Write tests for QueueRow
  - [ ] Implement queue item
  - [ ] Write tests for real-time updates
  - [ ] Implement live updates
  - [ ] Verify coverage >80%

- [ ] **Task 6.2: Implement Queue actions (TDD)**
  - [ ] Write tests for remove functionality
  - [ ] Implement remove from queue
  - [ ] Write tests for queue details
  - [ ] Implement details modal
  - [ ] Verify coverage >80%

- [ ] **Task 6.3: Create History view (TDD)**
  - [ ] Write tests for History
  - [ ] Implement history page
  - [ ] Write tests for HistoryRow
  - [ ] Implement history item
  - [ ] Write tests for event filters
  - [ ] Implement event type filtering
  - [ ] Verify coverage >80%

- [ ] **Task 6.4: Create Blocklist view (TDD)**
  - [ ] Write tests for Blocklist
  - [ ] Implement blocklist page
  - [ ] Write tests for BlocklistRow
  - [ ] Implement blocklist item
  - [ ] Write tests for unblock
  - [ ] Implement remove from blocklist
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 6'**

---

## Phase 7: Wanted Views

**Objective:** Implement Missing and Cutoff Unmet movie views.

### Tasks

- [ ] **Task 7.1: Create Missing view (TDD)**
  - [ ] Write tests for Missing
  - [ ] Implement missing movies page
  - [ ] Write tests for MissingRow
  - [ ] Implement missing movie row
  - [ ] Write tests for search functionality
  - [ ] Implement manual and bulk search
  - [ ] Verify coverage >80%

- [ ] **Task 7.2: Create Cutoff Unmet view (TDD)**
  - [ ] Write tests for CutoffUnmet
  - [ ] Implement cutoff unmet page
  - [ ] Write tests for CutoffUnmetRow
  - [ ] Implement cutoff unmet row
  - [ ] Write tests for quality display
  - [ ] Implement current vs cutoff
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 7'**

---

## Phase 8: Settings Pages

**Objective:** Implement comprehensive settings for all configuration areas.

### Tasks

- [ ] **Task 8.1: Create Media Management Settings (TDD)**
  - [ ] Write tests for MediaManagement
  - [ ] Implement media management
  - [ ] Write tests for RootFolder
  - [ ] Implement root folder config
  - [ ] Write tests for Naming
  - [ ] Implement naming patterns
  - [ ] Verify coverage >80%

- [ ] **Task 8.2: Create Profiles Settings (TDD)**
  - [ ] Write tests for Profiles
  - [ ] Implement quality profiles
  - [ ] Write tests for profile editor
  - [ ] Implement profile creation
  - [ ] Write tests for language profiles
  - [ ] Implement language config
  - [ ] Verify coverage >80%

- [ ] **Task 8.3: Create Quality Settings (TDD)**
  - [ ] Write tests for Quality
  - [ ] Implement quality definitions
  - [ ] Write tests for quality sizes
  - [ ] Implement size limits
  - [ ] Verify coverage >80%

- [ ] **Task 8.4: Create Custom Formats Settings (TDD)**
  - [ ] Write tests for CustomFormats
  - [ ] Implement custom formats
  - [ ] Write tests for format editor
  - [ ] Implement format conditions
  - [ ] Write tests for format testing
  - [ ] Implement test feature
  - [ ] Verify coverage >80%

- [ ] **Task 8.5: Create Indexers Settings (TDD)**
  - [ ] Write tests for Indexers
  - [ ] Implement indexer config
  - [ ] Write tests for indexer types
  - [ ] Implement Newznab/Torznab
  - [ ] Verify coverage >80%

- [ ] **Task 8.6: Create Download Clients Settings (TDD)**
  - [ ] Write tests for DownloadClients
  - [ ] Implement download clients
  - [ ] Write tests for client types
  - [ ] Implement various clients
  - [ ] Verify coverage >80%

- [ ] **Task 8.7: Create Import Lists Settings (TDD)**
  - [ ] Write tests for ImportLists
  - [ ] Implement import lists
  - [ ] Write tests for list types
  - [ ] Implement Trakt/Plex/IMDb
  - [ ] Verify coverage >80%

- [ ] **Task 8.8: Create Connect Settings (TDD)**
  - [ ] Write tests for Connect
  - [ ] Implement notifications
  - [ ] Write tests for notification types
  - [ ] Implement Discord/Slack/etc
  - [ ] Verify coverage >80%

- [ ] **Task 8.9: Create Metadata Settings (TDD)**
  - [ ] Write tests for Metadata
  - [ ] Implement metadata
  - [ ] Write tests for metadata types
  - [ ] Implement Kodi/Emby
  - [ ] Verify coverage >80%

- [ ] **Task 8.10: Create Tags Settings (TDD)**
  - [ ] Write tests for Tags
  - [ ] Implement tag management
  - [ ] Write tests for tag usage
  - [ ] Implement tag assignment
  - [ ] Verify coverage >80%

- [ ] **Task 8.11: Create General Settings (TDD)**
  - [ ] Write tests for General
  - [ ] Implement general settings
  - [ ] Write tests for host settings
  - [ ] Implement host config
  - [ ] Write tests for security
  - [ ] Implement auth/API key
  - [ ] Write tests for updates
  - [ ] Implement update config
  - [ ] Verify coverage >80%

- [ ] **Task 8.12: Create UI Settings (TDD)**
  - [ ] Write tests for UI
  - [ ] Implement UI preferences
  - [ ] Write tests for theme
  - [ ] Implement theme selection
  - [ ] Write tests for formats
  - [ ] Implement date/time formats
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 8'**

---

## Phase 9: System Pages

**Objective:** Implement System status, tasks, backup, updates, events, and logs.

### Tasks

- [ ] **Task 9.1: Create System Status (TDD)**
  - [ ] Write tests for Status
  - [ ] Implement status page
  - [ ] Write tests for Health
  - [ ] Implement health checks
  - [ ] Write tests for DiskSpace
  - [ ] Implement disk usage
  - [ ] Write tests for About
  - [ ] Implement version info
  - [ ] Verify coverage >80%

- [ ] **Task 9.2: Create System Tasks (TDD)**
  - [ ] Write tests for Tasks
  - [ ] Implement tasks page
  - [ ] Write tests for ScheduledTasks
  - [ ] Implement scheduled tasks
  - [ ] Write tests for QueuedTasks
  - [ ] Implement queued tasks
  - [ ] Verify coverage >80%

- [ ] **Task 9.3: Create System Backup (TDD)**
  - [ ] Write tests for Backup
  - [ ] Implement backup page
  - [ ] Write tests for backup management
  - [ ] Implement create/restore/delete
  - [ ] Verify coverage >80%

- [ ] **Task 9.4: Create System Updates (TDD)**
  - [ ] Write tests for Updates
  - [ ] Implement updates page
  - [ ] Write tests for update check
  - [ ] Implement version check
  - [ ] Write tests for UpdateChanges
  - [ ] Implement changelog
  - [ ] Verify coverage >80%

- [ ] **Task 9.5: Create System Events (TDD)**
  - [ ] Write tests for Events
  - [ ] Implement events page
  - [ ] Write tests for event filtering
  - [ ] Implement filter by level/type
  - [ ] Verify coverage >80%

- [ ] **Task 9.6: Create System Logs (TDD)**
  - [ ] Write tests for LogFiles
  - [ ] Implement logs page
  - [ ] Write tests for log viewer
  - [ ] Implement log content
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 9'**

---

## Phase 10: Interactive Features & Polish

**Objective:** Implement interactive search, real-time updates, and final polish.

### Tasks

- [ ] **Task 10.1: Implement Interactive Search (TDD)**
  - [ ] Write tests for InteractiveSearch
  - [ ] Implement search modal
  - [ ] Write tests for search results
  - [ ] Implement results table
  - [ ] Write tests for grab action
  - [ ] Implement release grabbing
  - [ ] Verify coverage >80%

- [ ] **Task 10.2: Implement Override Match (TDD)**
  - [ ] Write tests for OverrideMatch
  - [ ] Implement override modal
  - [ ] Write tests for match options
  - [ ] Implement override options
  - [ ] Verify coverage >80%

- [ ] **Task 10.3: Implement SignalR integration (TDD)**
  - [ ] Write tests for SignalR connection
  - [ ] Implement SignalR client
  - [ ] Write tests for movie events
  - [ ] Implement movie updates
  - [ ] Write tests for queue events
  - [ ] Implement queue updates
  - [ ] Write tests for command tracking
  - [ ] Implement command status
  - [ ] Verify coverage >80%

- [ ] **Task 10.4: Implement Command system (TDD)**
  - [ ] Write tests for command execution
  - [ ] Implement command dispatch
  - [ ] Write tests for command monitoring
  - [ ] Implement progress tracking
  - [ ] Verify coverage >80%

- [x] **Task 10.5: Implement responsive design (TDD)** [75b82284]
  - [x] Write tests for mobile navigation
  - [x] Implement mobile sidebar
  - [x] Write tests for responsive tables
  - [x] Implement column hiding
  - [x] Write tests for touch gestures
  - [x] Implement swipe navigation
  - [x] Verify coverage >80%

- [ ] **Task 10.6: Implement Jump Bar (TDD)**
  - [ ] Write tests for PageJumpBar
  - [ ] Implement A-Z navigation
  - [ ] Write tests for character counts
  - [ ] Implement dynamic characters
  - [ ] Verify coverage >80%

- [ ] **Task 10.7: Implement keyboard shortcuts (TDD)**
  - [ ] Write tests for shortcuts
  - [ ] Implement keyboard system
  - [ ] Write tests for shortcuts modal
  - [ ] Implement help display
  - [ ] Verify coverage >80%

- [ ] **Task 10.8: Implement theme system (TDD)**
  - [ ] Write tests for theme provider
  - [ ] Implement dark/light modes
  - [ ] Write tests for color impaired
  - [ ] Implement accessibility mode
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 10'**

---

## Phase 11: Integration & Completion

**Objective:** Verify integration with existing mediarr features and finalize.

### Tasks

- [ ] **Task 11.1: Compare with existing features**
  - [ ] Audit existing movie-related features
  - [ ] Identify missing functionality
  - [ ] Document feature gaps
  - [ ] Prioritize fixes

- [ ] **Task 11.2: Fix existing functionality**
  - [ ] Fix broken features
  - [ ] Add missing core features
  - [ ] Ensure API compatibility
  - [ ] Verify data integrity

- [ ] **Task 11.3: End-to-end testing**
  - [ ] Create E2E test suite
  - [ ] Test movie management
  - [ ] Test search and grab
  - [ ] Test settings
  - [ ] Test mobile

- [ ] **Task 11.4: Documentation**
  - [ ] Document components
  - [ ] Create API guide
  - [ ] Write user guide
  - [ ] Update README

- [ ] **Task: Conductor - User Manual Verification 'Phase 11'**

---

## Dependencies Between Phases

```
Phase 1 (Infrastructure)
    ↓
Phase 2 (Tables)
    ↓
Phase 3 (Modals/Forms)
    ↓
Phase 4 (Movies)
    ↓
Phase 5 (Calendar) ←→ Phase 6 (Activity) ←→ Phase 7 (Wanted)
    ↓
Phase 8 (Settings)
    ↓
Phase 9 (System)
    ↓
Phase 10 (Interactive/Polish)
    ↓
Phase 11 (Integration)
```

---

## Notes

- Follow TDD methodology: Tests → Implementation → Coverage
- Use Lucide React for icons
- Use Tailwind CSS for styling
- Maintain >80% code coverage
- Follow existing mediarr patterns
- Use Redux + React Query + Zustand pattern per spec
