# Sonarr UI Cloning - Implementation Plan

**Track:** sonarr_ui_cloning_20260214  
**Status:** Planning Complete  
**Created:** 2026-02-14

---

## Overview

This plan implements the Sonarr UI cloning based on the comprehensive specification. Sonarr is a TV series PVR with complex features including series management, episode tracking, calendar views, and extensive settings.

**Goal:** Create equivalent functionality in the mediarr app for Sonarr-style TV series management UI.

---

## Phase 1: Project Setup & Core Infrastructure

**Objective:** Establish foundation components shared across all views.

### Tasks

- [ ] **Task 1.1: Verify existing mediarr infrastructure**
  - [ ] Confirm Next.js 15 App Router setup
  - [ ] Verify TypeScript and Tailwind configuration
  - [ ] Check existing component library
  - [ ] Document reusable components from existing code

- [ ] **Task 1.2: Create App Shell components (TDD)**
  - [ ] Write tests for Page layout component
  - [ ] Implement Page wrapper with Header/Sidebar/Content
  - [ ] Write tests for PageSidebar navigation
  - [ ] Implement hierarchical sidebar navigation
  - [ ] Write tests for PageHeader
  - [ ] Implement header with search and actions
  - [ ] Verify coverage >80%

- [ ] **Task 1.3: Create Page Content components (TDD)**
  - [ ] Write tests for PageContent
  - [ ] Implement content wrapper with title
  - [ ] Write tests for PageToolbar
  - [ ] Implement toolbar with sections
  - [ ] Write tests for PageToolbarButton
  - [ ] Implement toolbar buttons with icons
  - [ ] Write tests for PageContentBody
  - [ ] Implement scrollable content area
  - [ ] Verify coverage >80%

- [ ] **Task 1.4: Set up state management (TDD)**
  - [ ] Write tests for Redux store configuration
  - [ ] Implement Redux store with slices
  - [ ] Write tests for Zustand appStore
  - [ ] Implement lightweight app state store
  - [ ] Write tests for React Query setup
  - [ ] Implement server state management
  - [ ] Verify coverage >80%

- [ ] **Task 1.5: Create routing structure**
  - [ ] Write tests for route definitions
  - [ ] Implement Next.js routes matching Sonarr structure
  - [ ] Write tests for navigation state
  - [ ] Implement active route highlighting
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 1'**

---

## Phase 2: Table & Data Display Components

**Objective:** Implement comprehensive table system with sorting, filtering, and view modes.

### Tasks

- [ ] **Task 2.1: Create Table components (TDD)**
  - [ ] Write tests for Table container
  - [ ] Implement Table wrapper with configuration
  - [ ] Write tests for TableHeader with sorting
  - [ ] Implement sortable column headers
  - [ ] Write tests for VirtualTable
  - [ ] Implement virtual scrolling for large lists
  - [ ] Write tests for TablePager
  - [ ] Implement pagination controls
  - [ ] Verify coverage >80%

- [ ] **Task 2.2: Implement filtering system (TDD)**
  - [ ] Write tests for FilterMenu
  - [ ] Implement filter dropdown
  - [ ] Write tests for FilterBuilder
  - [ ] Implement complex filter builder
  - [ ] Write tests for custom filter persistence
  - [ ] Implement filter storage
  - [ ] Verify coverage >80%

- [ ] **Task 2.3: Implement sorting system (TDD)**
  - [ ] Write tests for SortMenu
  - [ ] Implement sort dropdown
  - [ ] Write tests for multi-column sorting
  - [ ] Implement sort reducer
  - [ ] Write tests for sort persistence
  - [ ] Implement saved sort preferences
  - [ ] Verify coverage >80%

- [ ] **Task 2.4: Implement selection mode (TDD)**
  - [ ] Write tests for SelectProvider
  - [ ] Implement selection context
  - [ ] Write tests for SelectFooter
  - [ ] Implement bulk action footer
  - [ ] Write tests for shift-click selection
  - [ ] Implement range selection
  - [ ] Verify coverage >80%

- [ ] **Task 2.5: Create View Mode components (TDD)**
  - [ ] Write tests for ViewMenu
  - [ ] Implement view mode selector
  - [ ] Write tests for PosterView
  - [ ] Implement poster grid layout
  - [ ] Write tests for OverviewView
  - [ ] Implement overview cards
  - [ ] Verify coverage >80%

- [ ] **Task 2.6: Implement PageJumpBar (TDD)**
  - [ ] Write tests for PageJumpBar
  - [ ] Implement A-Z navigation
  - [ ] Write tests for character counting
  - [ ] Implement dynamic character display
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 2'**

---

## Phase 3: Modal & Form System

**Objective:** Create modal dialogs and form components for CRUD operations.

### Tasks

- [ ] **Task 3.1: Create Modal components (TDD)**
  - [ ] Write tests for Modal
  - [ ] Implement modal container
  - [ ] Write tests for ModalHeader, Body, Footer
  - [ ] Implement modal sub-components
  - [ ] Write tests for ConfirmModal
  - [ ] Implement confirmation dialog
  - [ ] Verify coverage >80%

- [ ] **Task 3.2: Create Form components (TDD)**
  - [ ] Write tests for Form and FormGroup
  - [ ] Implement form wrappers
  - [ ] Write tests for TextInput
  - [ ] Implement text input with validation
  - [ ] Write tests for SelectInput
  - [ ] Implement dropdown input
  - [ ] Write tests for EnhancedSelectInput
  - [ ] Implement advanced select with hints
  - [ ] Verify coverage >80%

- [ ] **Task 3.3: Create specialized inputs (TDD)**
  - [ ] Write tests for TagInput
  - [ ] Implement tag selection
  - [ ] Write tests for CheckInput
  - [ ] Implement checkbox
  - [ ] Write tests for NumberInput
  - [ ] Implement numeric input
  - [ ] Write tests for PathInput
  - [ ] Implement path with file browser
  - [ ] Write tests for PasswordInput
  - [ ] Implement password field
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 3'**

---

## Phase 4: Series Management Views

**Objective:** Implement Series Index, Add Series, Import Series, and Series Details.

### Tasks

- [ ] **Task 4.1: Create SeriesIndex view (TDD)**
  - [ ] Write tests for SeriesIndex container
  - [ ] Implement main series list page
  - [ ] Write tests for SeriesIndexTable
  - [ ] Implement table view
  - [ ] Write tests for SeriesIndexPosters
  - [ ] Implement poster grid view
  - [ ] Write tests for SeriesIndexOverviews
  - [ ] Implement overview cards view
  - [ ] Verify coverage >80%

- [ ] **Task 4.2: Implement SeriesIndex features (TDD)**
  - [ ] Write tests for toolbar actions
  - [ ] Implement Refresh, RSS Sync, Search buttons
  - [ ] Write tests for view switching
  - [ ] Implement Table/Poster/Overview toggle
  - [ ] Write tests for filter/sort menus
  - [ ] Implement filter and sort controls
  - [ ] Verify coverage >80%

- [ ] **Task 4.3: Create AddNewSeries view (TDD)**
  - [ ] Write tests for AddNewSeries
  - [ ] Implement add series page
  - [ ] Write tests for search functionality
  - [ ] Implement TVDB/TMDB search
  - [ ] Write tests for AddNewSeriesSearchResult
  - [ ] Implement search result cards
  - [ ] Write tests for monitoring options
  - [ ] Implement monitoring popover
  - [ ] Verify coverage >80%

- [ ] **Task 4.4: Create ImportSeries view (TDD)**
  - [ ] Write tests for ImportSeriesPage
  - [ ] Implement import page
  - [ ] Write tests for folder browser
  - [ ] Implement folder selection
  - [ ] Write tests for series detection
  - [ ] Implement parsing and matching
  - [ ] Verify coverage >80%

- [ ] **Task 4.5: Create SeriesDetails view (TDD)**
  - [ ] Write tests for SeriesDetailsPage
  - [ ] Implement series detail page
  - [ ] Write tests for series header
  - [ ] Implement header with poster/metadata
  - [ ] Write tests for SeriesDetailsSeason
  - [ ] Implement season component
  - [ ] Write tests for EpisodeRow
  - [ ] Implement episode list with actions
  - [ ] Verify coverage >80%

- [ ] **Task 4.6: Implement SeriesDetails actions (TDD)**
  - [ ] Write tests for monitoring toggles
  - [ ] Implement season/episode monitoring
  - [ ] Write tests for search buttons
  - [ ] Implement manual episode search
  - [ ] Write tests for episode actions
  - [ ] Implement episode hover actions
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 4'**

---

## Phase 5: Calendar View

**Objective:** Implement calendar view for upcoming episodes.

### Tasks

- [ ] **Task 5.1: Create Calendar page (TDD)**
  - [ ] Write tests for CalendarPage
  - [ ] Implement calendar container
  - [ ] Write tests for Calendar component
  - [ ] Implement calendar grid
  - [ ] Write tests for CalendarDay
  - [ ] Implement day cells
  - [ ] Verify coverage >80%

- [ ] **Task 5.2: Implement Calendar events (TDD)**
  - [ ] Write tests for CalendarEvent
  - [ ] Implement episode events
  - [ ] Write tests for CalendarEventGroup
  - [ ] Implement grouped events
  - [ ] Write tests for status indicators
  - [ ] Implement color-coded status
  - [ ] Verify coverage >80%

- [ ] **Task 5.3: Implement Calendar navigation (TDD)**
  - [ ] Write tests for CalendarHeader
  - [ ] Implement navigation controls
  - [ ] Write tests for day count options
  - [ ] Implement 3/5/7 day views
  - [ ] Write tests for iCal export
  - [ ] Implement calendar feed export
  - [ ] Verify coverage >80%

- [ ] **Task 5.4: Create Agenda view (TDD)**
  - [ ] Write tests for Agenda
  - [ ] Implement list view
  - [ ] Write tests for episode list
  - [ ] Implement chronological display
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 5'**

---

## Phase 6: Activity Views

**Objective:** Implement Queue, History, and Blocklist views.

### Tasks

- [ ] **Task 6.1: Create Queue view (TDD)**
  - [ ] Write tests for Queue component
  - [ ] Implement queue page
  - [ ] Write tests for QueueRow
  - [ ] Implement queue item row
  - [ ] Write tests for real-time updates
  - [ ] Implement live queue updates
  - [ ] Verify coverage >80%

- [ ] **Task 6.2: Implement Queue actions (TDD)**
  - [ ] Write tests for remove functionality
  - [ ] Implement remove from queue
  - [ ] Write tests for grab functionality
  - [ ] Implement grab pending items
  - [ ] Write tests for queue details modal
  - [ ] Implement details viewer
  - [ ] Verify coverage >80%

- [ ] **Task 6.3: Create History view (TDD)**
  - [ ] Write tests for History component
  - [ ] Implement history page
  - [ ] Write tests for HistoryRow
  - [ ] Implement history item row
  - [ ] Write tests for event type filters
  - [ ] Implement event filtering
  - [ ] Verify coverage >80%

- [ ] **Task 6.4: Create Blocklist view (TDD)**
  - [ ] Write tests for Blocklist component
  - [ ] Implement blocklist page
  - [ ] Write tests for BlocklistRow
  - [ ] Implement blocklist item row
  - [ ] Write tests for unblock functionality
  - [ ] Implement remove from blocklist
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 6'**

---

## Phase 7: Wanted Views

**Objective:** Implement Missing and Cutoff Unmet episode views.

### Tasks

- [ ] **Task 7.1: Create Missing view (TDD)**
  - [ ] Write tests for Missing component
  - [ ] Implement missing episodes page
  - [ ] Write tests for MissingRow
  - [ ] Implement missing episode row
  - [ ] Write tests for search functionality
  - [ ] Implement manual and bulk search
  - [ ] Verify coverage >80%

- [ ] **Task 7.2: Create Cutoff Unmet view (TDD)**
  - [ ] Write tests for CutoffUnmet component
  - [ ] Implement cutoff unmet page
  - [ ] Write tests for CutoffUnmetRow
  - [ ] Implement cutoff unmet row
  - [ ] Write tests for quality comparison
  - [ ] Implement current vs cutoff display
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 7'**

---

## Phase 8: Settings Pages

**Objective:** Implement comprehensive settings for all configuration areas.

### Tasks

- [ ] **Task 8.1: Create Media Management Settings (TDD)**
  - [ ] Write tests for MediaManagement
  - [ ] Implement media management settings
  - [ ] Write tests for RootFolder management
  - [ ] Implement root folder configuration
  - [ ] Write tests for Naming settings
  - [ ] Implement naming pattern editor
  - [ ] Verify coverage >80%

- [ ] **Task 8.2: Create Profiles Settings (TDD)**
  - [ ] Write tests for Profiles settings
  - [ ] Implement quality profiles
  - [ ] Write tests for profile editor
  - [ ] Implement profile creation/editing
  - [ ] Write tests for language profiles
  - [ ] Implement language configuration
  - [ ] Verify coverage >80%

- [ ] **Task 8.3: Create Quality Settings (TDD)**
  - [ ] Write tests for Quality settings
  - [ ] Implement quality definitions
  - [ ] Write tests for quality size limits
  - [ ] Implement size configuration
  - [ ] Verify coverage >80%

- [ ] **Task 8.4: Create Custom Formats Settings (TDD)**
  - [ ] Write tests for CustomFormats
  - [ ] Implement custom format management
  - [ ] Write tests for format editor
  - [ ] Implement format conditions
  - [ ] Write tests for format testing
  - [ ] Implement format test feature
  - [ ] Verify coverage >80%

- [ ] **Task 8.5: Create Indexers Settings (TDD)**
  - [ ] Write tests for Indexers settings
  - [ ] Implement indexer configuration
  - [ ] Write tests for indexer types
  - [ ] Implement Newznab/Torznab config
  - [ ] Verify coverage >80%

- [ ] **Task 8.6: Create Download Clients Settings (TDD)**
  - [ ] Write tests for DownloadClients
  - [ ] Implement download client config
  - [ ] Write tests for client types
  - [ ] Implement various client setups
  - [ ] Verify coverage >80%

- [ ] **Task 8.7: Create Import Lists Settings (TDD)**
  - [ ] Write tests for ImportLists
  - [ ] Implement import list config
  - [ ] Write tests for list types
  - [ ] Implement Trakt/Plex lists
  - [ ] Verify coverage >80%

- [ ] **Task 8.8: Create Notifications Settings (TDD)**
  - [ ] Write tests for Connect settings
  - [ ] Implement notification config
  - [ ] Write tests for notification types
  - [ ] Implement Discord/Email/etc
  - [ ] Verify coverage >80%

- [ ] **Task 8.9: Create Metadata Settings (TDD)**
  - [ ] Write tests for Metadata settings
  - [ ] Implement metadata configuration
  - [ ] Write tests for metadata sources
  - [ ] Implement Kodi/Emby settings
  - [ ] Verify coverage >80%

- [ ] **Task 8.10: Create Tags Settings (TDD)**
  - [ ] Write tests for Tags settings
  - [ ] Implement tag management
  - [ ] Write tests for tag assignment
  - [ ] Implement tag usage
  - [ ] Verify coverage >80%

- [ ] **Task 8.11: Create General Settings (TDD)**
  - [ ] Write tests for General settings
  - [ ] Implement general configuration
  - [ ] Write tests for security settings
  - [ ] Implement auth and API key
  - [ ] Write tests for update settings
  - [ ] Implement update configuration
  - [ ] Verify coverage >80%

- [ ] **Task 8.12: Create UI Settings (TDD)**
  - [ ] Write tests for UI settings
  - [ ] Implement UI preferences
  - [ ] Write tests for theme settings
  - [ ] Implement theme selection
  - [ ] Write tests for date/time formats
  - [ ] Implement format configuration
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 8'**

---

## Phase 9: System Pages

**Objective:** Implement System status, tasks, backup, and updates.

### Tasks

- [ ] **Task 9.1: Create System Status (TDD)**
  - [ ] Write tests for Status component
  - [ ] Implement system status page
  - [ ] Write tests for Health component
  - [ ] Implement health checks
  - [ ] Write tests for Disk Space
  - [ ] Implement disk usage display
  - [ ] Write tests for About section
  - [ ] Implement version info
  - [ ] Verify coverage >80%

- [ ] **Task 9.2: Create System Tasks (TDD)**
  - [ ] Write tests for Tasks component
  - [ ] Implement tasks page
  - [ ] Write tests for ScheduledTasks
  - [ ] Implement scheduled tasks list
  - [ ] Write tests for QueuedTasks
  - [ ] Implement queued tasks display
  - [ ] Verify coverage >80%

- [ ] **Task 9.3: Create System Backup (TDD)**
  - [ ] Write tests for Backup component
  - [ ] Implement backup page
  - [ ] Write tests for backup management
  - [ ] Implement create/restore/delete
  - [ ] Verify coverage >80%

- [ ] **Task 9.4: Create System Updates (TDD)**
  - [ ] Write tests for Updates component
  - [ ] Implement updates page
  - [ ] Write tests for update checking
  - [ ] Implement version checking
  - [ ] Write tests for changelog
  - [ ] Implement changes display
  - [ ] Verify coverage >80%

- [ ] **Task 9.5: Create System Events (TDD)**
  - [ ] Write tests for Events component
  - [ ] Implement events log page
  - [ ] Write tests for log filtering
  - [ ] Implement event filtering
  - [ ] Verify coverage >80%

- [ ] **Task 9.6: Create System Logs (TDD)**
  - [ ] Write tests for LogFiles component
  - [ ] Implement log files page
  - [ ] Write tests for log viewer
  - [ ] Implement log content display
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 9'**

---

## Phase 10: Interactive Features & Polish

**Objective:** Implement interactive search, real-time updates, and final polish.

### Tasks

- [ ] **Task 10.1: Implement Interactive Search (TDD)**
  - [ ] Write tests for InteractiveSearch
  - [ ] Implement manual search modal
  - [ ] Write tests for search results
  - [ ] Implement release results table
  - [ ] Write tests for grab action
  - [ ] Implement release grabbing
  - [ ] Verify coverage >80%

- [ ] **Task 10.2: Implement Interactive Import (TDD)**
  - [ ] Write tests for InteractiveImport
  - [ ] Implement manual import modal
  - [ ] Write tests for file matching
  - [ ] Implement series/episode matching
  - [ ] Write tests for quality selection
  - [ ] Implement quality/language selection
  - [ ] Verify coverage >80%

- [ ] **Task 10.3: Implement SignalR integration (TDD)**
  - [ ] Write tests for SignalR connection
  - [ ] Implement SignalR client
  - [ ] Write tests for series events
  - [ ] Implement series update events
  - [ ] Write tests for queue events
  - [ ] Implement queue update events
  - [ ] Write tests for command tracking
  - [ ] Implement command status
  - [ ] Verify coverage >80%

- [ ] **Task 10.4: Implement Command system (TDD)**
  - [ ] Write tests for command execution
  - [ ] Implement command dispatch
  - [ ] Write tests for command monitoring
  - [ ] Implement progress tracking
  - [ ] Write tests for toast notifications
  - [ ] Implement completion messages
  - [ ] Verify coverage >80%

- [ ] **Task 10.5: Implement responsive design (TDD)**
  - [ ] Write tests for mobile navigation
  - [ ] Implement mobile sidebar
  - [ ] Write tests for responsive tables
  - [ ] Implement column hiding
  - [ ] Write tests for touch gestures
  - [ ] Implement swipe navigation
  - [ ] Verify coverage >80%

- [ ] **Task 10.6: Implement keyboard shortcuts (TDD)**
  - [ ] Write tests for shortcut system
  - [ ] Implement Mousetrap integration
  - [ ] Write tests for common shortcuts
  - [ ] Implement ESC, arrows, etc
  - [ ] Write tests for shortcuts modal
  - [ ] Implement help display
  - [ ] Verify coverage >80%

- [ ] **Task 10.7: Implement theme system (TDD)**
  - [ ] Write tests for theme provider
  - [ ] Implement dark/light modes
  - [ ] Write tests for color impaired mode
  - [ ] Implement accessibility theme
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 10'**

---

## Phase 11: Integration & Completion

**Objective:** Verify integration with existing mediarr features and complete the implementation.

### Tasks

- [ ] **Task 11.1: Compare with existing mediarr features**
  - [ ] Audit existing series-related features
  - [ ] Identify missing functionality
  - [ ] Document feature gaps
  - [ ] Prioritize fixes needed

- [ ] **Task 11.2: Fix existing functionality**
  - [ ] Fix broken features
  - [ ] Add missing core functionality
  - [ ] Ensure API compatibility
  - [ ] Verify data integrity

- [ ] **Task 11.3: End-to-end testing**
  - [ ] Create E2E test suite
  - [ ] Test series management flow
  - [ ] Test episode search flow
  - [ ] Test settings configuration
  - [ ] Test mobile experience

- [ ] **Task 11.4: Documentation**
  - [ ] Document component usage
  - [ ] Create API integration guide
  - [ ] Write user guide
  - [ ] Update project documentation

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
Phase 4 (Series)
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

- Follow TDD methodology: Tests → Implementation → Coverage verification
- Use Lucide React for icons
- Use Tailwind CSS for styling
- Maintain >80% code coverage
- Follow existing mediarr patterns
- Use Zustand for component state, Redux for global state, React Query for server state
