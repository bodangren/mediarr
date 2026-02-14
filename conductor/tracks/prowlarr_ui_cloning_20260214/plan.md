# Prowlarr UI Cloning - Implementation Plan

**Track:** prowlarr_ui_cloning_20260214  
**Status:** Planning Complete  
**Created:** 2026-02-14

---

## Overview

This plan implements the Prowlarr UI cloning based on the comprehensive specification. The implementation follows Test-Driven Development (TDD) methodology with clear phases, tests written before implementation, and quality gates at each phase.

**Goal:** Create equivalent functionality in the mediarr app for Prowlarr-style indexer management UI.

---

## Phase 1: Project Setup & Core Infrastructure

**Objective:** Establish the foundation with Next.js, TypeScript, Tailwind CSS, and core UI components.

### Tasks

- [x] **Task 1.1: Verify mediarr project structure and tech stack** (commit: `18d5a2b`)
  - [x] Check existing Next.js 15 setup with App Router
  - [x] Verify TypeScript configuration
  - [x] Confirm Tailwind CSS setup
  - [x] Document any gaps in infrastructure

- [x] **Task 1.2: Create base layout components (TDD)** (commit: `958784a`)
  - [x] Write tests for Page component structure
  - [x] Implement Page wrapper component with header, sidebar, content area
  - [x] Write tests for PageSidebar navigation
  - [x] Implement collapsible sidebar with navigation links
  - [x] Verify coverage >80%

- [x] **Task 1.3: Create core UI primitives (TDD)** (commit: `e7a4e83`)
  - [x] Write tests for Button component variants
  - [x] Implement Button (primary, secondary, danger variants)
  - [x] Write tests for Icon component
  - [x] Implement Icon component (using Lucide icons)
  - [x] Write tests for Alert component
  - [x] Implement Alert (info, success, warning, danger)
  - [x] Write tests for Label/Badge component
  - [x] Implement Label component (status badges)
  - [x] Verify coverage >80%

- [x] **Task 1.4: Set up state management infrastructure** (commit: `a0bd941`)
  - [x] Write tests for Redux store setup
  - [x] Implement Redux store with slices pattern
  - [x] Write tests for localStorage persistence
  - [x] Implement Redux middleware for state persistence
  - [x] Verify coverage >80%

- [~] **Task 1.5: Create routing structure**
  - [ ] Write tests for route configuration
  - [ ] Implement Next.js App Router routes matching Prowlarr structure
  - [ ] Write tests for navigation active states
  - [ ] Implement navigation with active highlighting
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 1'**

---

## Phase 2: Data Table System

**Objective:** Implement comprehensive table components with sorting, filtering, pagination, and selection.

### Tasks

- [ ] **Task 2.1: Create base Table components (TDD)**
  - [ ] Write tests for Table container component
  - [ ] Implement Table wrapper component
  - [ ] Write tests for TableHeader with sortable columns
  - [ ] Implement TableHeader with sort indicators
  - [ ] Write tests for TableBody and TableRow
  - [ ] Implement TableBody and TableRow components
  - [ ] Write tests for TableCell renderers
  - [ ] Implement custom cell renderers (text, date, status)
  - [ ] Verify coverage >80%

- [ ] **Task 2.2: Implement sorting functionality (TDD)**
  - [ ] Write tests for sort reducer
  - [ ] Implement sort state management
  - [ ] Write tests for multi-column sort predicates
  - [ ] Implement sort predicates for common data types
  - [ ] Write tests for sort UI interactions
  - [ ] Implement SortMenu component
  - [ ] Verify coverage >80%

- [ ] **Task 2.3: Implement filtering system (TDD)**
  - [ ] Write tests for filter predicates
  - [ ] Implement filter predicate functions
  - [ ] Write tests for FilterMenu component
  - [ ] Implement FilterMenu with predefined filters
  - [ ] Write tests for FilterBuilder modal
  - [ ] Implement FilterBuilder with AND/OR logic
  - [ ] Verify coverage >80%

- [ ] **Task 2.4: Implement pagination (TDD)**
  - [ ] Write tests for TablePager component
  - [ ] Implement TablePager with page controls
  - [ ] Write tests for client-side pagination logic
  - [ ] Implement pagination reducer
  - [ ] Write tests for page size selector
  - [ ] Implement page size configuration
  - [ ] Verify coverage >80%

- [ ] **Task 2.5: Implement selection mode (TDD)**
  - [ ] Write tests for SelectProvider context
  - [ ] Implement SelectProvider for bulk operations
  - [ ] Write tests for row selection (checkbox, shift-click)
  - [ ] Implement SelectCheckboxCell component
  - [ ] Write tests for SelectFooter with bulk actions
  - [ ] Implement SelectFooter component
  - [ ] Verify coverage >80%

- [ ] **Task 2.6: Implement column management (TDD)**
  - [ ] Write tests for TableOptionsModal
  - [ ] Implement column visibility toggle
  - [ ] Write tests for drag-and-drop column reordering
  - [ ] Implement column reordering with react-dnd
  - [ ] Write tests for column persistence
  - [ ] Implement column state persistence
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 2'**

---

## Phase 3: Modal & Form System

**Objective:** Create comprehensive modal and form components for CRUD operations.

### Tasks

- [ ] **Task 3.1: Create Modal system (TDD)**
  - [ ] Write tests for Modal container
  - [ ] Implement Modal component with backdrop
  - [ ] Write tests for ModalHeader, ModalBody, ModalFooter
  - [ ] Implement modal sub-components
  - [ ] Write tests for ConfirmModal
  - [ ] Implement ConfirmModal for destructive actions
  - [ ] Verify coverage >80%

- [ ] **Task 3.2: Create Form components (TDD)**
  - [ ] Write tests for Form and FormGroup
  - [ ] Implement Form wrapper components
  - [ ] Write tests for TextInput
  - [ ] Implement TextInput with validation
  - [ ] Write tests for SelectInput and EnhancedSelectInput
  - [ ] Implement dropdown inputs
  - [ ] Write tests for CheckInput
  - [ ] Implement checkbox component
  - [ ] Write tests for TagInput
  - [ ] Implement tag selection input
  - [ ] Verify coverage >80%

- [ ] **Task 3.3: Create specialized inputs (TDD)**
  - [ ] Write tests for PasswordInput
  - [ ] Implement password input with visibility toggle
  - [ ] Write tests for PathInput
  - [ ] Implement path input with file browser
  - [ ] Write tests for NumberInput
  - [ ] Implement numeric input with validation
  - [ ] Write tests for AutoCompleteInput
  - [ ] Implement autocomplete with suggestions
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 3'**

---

## Phase 4: Indexers Management Views

**Objective:** Implement Indexer list, add, edit, and stats views.

### Tasks

- [ ] **Task 4.1: Create IndexerIndex view (TDD)**
  - [ ] Write tests for IndexerIndex container
  - [ ] Implement main IndexerIndex page component
  - [ ] Write tests for IndexerIndexTable
  - [ ] Implement data table for indexers
  - [ ] Write tests for PageToolbar with actions
  - [ ] Implement toolbar (Add, Refresh, Sync, Select Mode)
  - [ ] Write tests for PageJumpBar
  - [ ] Implement alphabet navigation
  - [ ] Verify coverage >80%

- [ ] **Task 4.2: Create AddIndexerModal (TDD)**
  - [ ] Write tests for AddIndexerModal
  - [ ] Implement add indexer modal
  - [ ] Write tests for indexer preset selection
  - [ ] Implement preset grid/list selection
  - [ ] Write tests for indexer configuration form
  - [ ] Implement dynamic form based on schema
  - [ ] Write tests for indexer testing
  - [ ] Implement test connection functionality
  - [ ] Verify coverage >80%

- [ ] **Task 4.3: Create EditIndexerModal (TDD)**
  - [ ] Write tests for EditIndexerModal
  - [ ] Implement edit indexer modal
  - [ ] Write tests for form pre-population
  - [ ] Implement loading existing indexer data
  - [ ] Write tests for save functionality
  - [ ] Implement update API integration
  - [ ] Verify coverage >80%

- [ ] **Task 4.4: Create IndexerStats view (TDD)**
  - [ ] Write tests for IndexerStats container
  - [ ] Implement stats dashboard page
  - [ ] Write tests for statistics cards
  - [ ] Implement stat summary cards
  - [ ] Write tests for BarChart and StackedBarChart
  - [ ] Implement chart components (using Chart.js or Recharts)
  - [ ] Write tests for DoughnutChart
  - [ ] Implement doughnut/pie charts
  - [ ] Verify coverage >80%

- [ ] **Task 4.5: Implement bulk operations (TDD)**
  - [ ] Write tests for bulk delete functionality
  - [ ] Implement bulk delete with confirmation
  - [ ] Write tests for bulk test functionality
  - [ ] Implement test all indexers
  - [ ] Write tests for bulk edit
  - [ ] Implement bulk edit modal
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 4'**

---

## Phase 5: Search View

**Objective:** Implement manual search interface with results table and grab functionality.

### Tasks

- [ ] **Task 5.1: Create SearchIndex view (TDD)**
  - [ ] Write tests for SearchIndex container
  - [ ] Implement main search page
  - [ ] Write tests for search input form
  - [ ] Implement search form with query, category, indexer selection
  - [ ] Write tests for search parameters
  - [ ] Implement advanced search options
  - [ ] Verify coverage >80%

- [ ] **Task 5.2: Create SearchResults table (TDD)**
  - [ ] Write tests for SearchResultsTable
  - [ ] Implement search results data table
  - [ ] Write tests for result columns
  - [ ] Implement columns (Protocol, Age, Title, Indexer, Size, etc.)
  - [ ] Write tests for indexer flags display
  - [ ] Implement flags display (freeleech, etc.)
  - [ ] Verify coverage >80%

- [ ] **Task 5.3: Implement release actions (TDD)**
  - [ ] Write tests for grab functionality
  - [ ] Implement grab release action
  - [ ] Write tests for download functionality
  - [ ] Implement download .torrent/.nzb
  - [ ] Write tests for OverrideMatch feature
  - [ ] Implement override match modal
  - [ ] Write tests for bulk grab
  - [ ] Implement bulk grab functionality
  - [ ] Verify coverage >80%

- [ ] **Task 5.4: Implement search filtering (TDD)**
  - [ ] Write tests for search filters
  - [ ] Implement filter by protocol, size, peers
  - [ ] Write tests for custom filter builder
  - [ ] Implement search-specific filter builder
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 5'**

---

## Phase 6: History View

**Objective:** Implement query and release history tracking.

### Tasks

- [ ] **Task 6.1: Create History view (TDD)**
  - [ ] Write tests for History container
  - [ ] Implement history page
  - [ ] Write tests for history table
  - [ ] Implement paginated history log
  - [ ] Write tests for event type filtering
  - [ ] Implement filter by event type (grabbed, query, RSS, auth)
  - [ ] Verify coverage >80%

- [ ] **Task 6.2: Implement history details (TDD)**
  - [ ] Write tests for history details modal
  - [ ] Implement details viewer
  - [ ] Write tests for parameter display
  - [ ] Implement query parameters view
  - [ ] Write tests for success/failure indicators
  - [ ] Implement status display with colors
  - [ ] Verify coverage >80%

- [ ] **Task 6.3: Implement history management (TDD)**
  - [ ] Write tests for clear history functionality
  - [ ] Implement clear history with confirmation
  - [ ] Write tests for mark as failed
  - [ ] Implement failed release marking
  - [ ] Write tests for export functionality
  - [ ] Implement history export
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 6'**

---

## Phase 7: Settings Pages

**Objective:** Implement comprehensive settings for indexers, applications, download clients, and general configuration.

### Tasks

- [ ] **Task 7.1: Create Settings Indexer page (TDD)**
  - [ ] Write tests for IndexerSettings container
  - [ ] Implement indexer configuration page
  - [ ] Write tests for indexer list management
  - [ ] Implement add/edit/delete indexers
  - [ ] Write tests for Indexer Proxies section
  - [ ] Implement proxy configuration
  - [ ] Write tests for Indexer Categories
  - [ ] Implement category management
  - [ ] Verify coverage >80%

- [ ] **Task 7.2: Create Application Settings page (TDD)**
  - [ ] Write tests for ApplicationSettings
  - [ ] Implement app integration settings
  - [ ] Write tests for Sonarr/Radarr/Lidarr/Readarr config
  - [ ] Implement application type configuration
  - [ ] Write tests for sync functionality
  - [ ] Implement indexer sync to apps
  - [ ] Verify coverage >80%

- [ ] **Task 7.3: Create Download Client Settings (TDD)**
  - [ ] Write tests for DownloadClientSettings
  - [ ] Implement download client configuration
  - [ ] Write tests for client types (Transmission, uTorrent, SABnzbd, etc.)
  - [ ] Implement various client configs
  - [ ] Write tests for category mapping
  - [ ] Implement download categories
  - [ ] Verify coverage >80%

- [ ] **Task 7.4: Create Notification Settings (TDD)**
  - [ ] Write tests for NotificationSettings
  - [ ] Implement notification configuration
  - [ ] Write tests for notification types (Discord, Telegram, Email, etc.)
  - [ ] Implement various notification providers
  - [ ] Write tests for trigger configuration
  - [ ] Implement notification triggers
  - [ ] Verify coverage >80%

- [ ] **Task 7.5: Create Tag Settings (TDD)**
  - [ ] Write tests for TagSettings
  - [ ] Implement tag management
  - [ ] Write tests for tag assignment
  - [ ] Implement tag to indexer/app/client mapping
  - [ ] Write tests for tag restrictions
  - [ ] Implement restriction rules
  - [ ] Verify coverage >80%

- [ ] **Task 7.6: Create General Settings (TDD)**
  - [ ] Write tests for GeneralSettings
  - [ ] Implement general configuration
  - [ ] Write tests for host settings (port, bind address, URL base)
  - [ ] Implement host configuration
  - [ ] Write tests for security settings (API key, SSL, auth)
  - [ ] Implement security configuration
  - [ ] Write tests for logging and update settings
  - [ ] Implement logging and update config
  - [ ] Verify coverage >80%

- [ ] **Task 7.7: Create UI Settings (TDD)**
  - [ ] Write tests for UISettings
  - [ ] Implement UI preferences
  - [ ] Write tests for theme selection (dark/light/auto)
  - [ ] Implement theme switcher
  - [ ] Write tests for date/time format settings
  - [ ] Implement format configuration
  - [ ] Write tests for color impaired mode
  - [ ] Implement accessibility toggle
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 7'**

---

## Phase 8: System Pages

**Objective:** Implement system status, tasks, backup, updates, and logging.

### Tasks

- [ ] **Task 8.1: Create System Status page (TDD)**
  - [ ] Write tests for SystemStatus container
  - [ ] Implement status dashboard
  - [ ] Write tests for Health component
  - [ ] Implement health checks display
  - [ ] Write tests for About section
  - [ ] Implement version and info display
  - [ ] Write tests for Disk Space display
  - [ ] Implement disk usage visualization
  - [ ] Verify coverage >80%

- [ ] **Task 8.2: Create System Tasks page (TDD)**
  - [ ] Write tests for SystemTasks container
  - [ ] Implement tasks page
  - [ ] Write tests for ScheduledTasks table
  - [ ] Implement scheduled tasks list
  - [ ] Write tests for QueuedTasks table
  - [ ] implement queued tasks display
  - [ ] Write tests for manual task execution
  - [ ] Implement trigger task functionality
  - [ ] Verify coverage >80%

- [ ] **Task 8.3: Create System Backup page (TDD)**
  - [ ] Write tests for SystemBackup container
  - [ ] Implement backup management page
  - [ ] Write tests for backup list
  - [ ] Implement existing backups display
  - [ ] Write tests for backup actions
  - [ ] Implement create, restore, delete, download
  - [ ] Verify coverage >80%

- [ ] **Task 8.4: Create System Updates page (TDD)**
  - [ ] Write tests for SystemUpdates container
  - [ ] Implement updates page
  - [ ] Write tests for update check
  - [ ] Implement version check functionality
  - [ ] Write tests for changelog display
  - [ ] Implement update changes view
  - [ ] Write tests for install update
  - [ ] Implement update installation
  - [ ] Verify coverage >80%

- [ ] **Task 8.5: Create System Events page (TDD)**
  - [ ] Write tests for SystemEvents container
  - [ ] Implement events log page
  - [ ] Write tests for event filtering
  - [ ] Implement filter by level and type
  - [ ] Write tests for event export
  - [ ] Implement export functionality
  - [ ] Verify coverage >80%

- [ ] **Task 8.6: Create System Logs page (TDD)**
  - [ ] Write tests for SystemLogs container
  - [ ] Implement log files viewer
  - [ ] Write tests for log file list
  - [ ] Implement log files table
  - [ ] Write tests for log viewer
  - [ ] Implement log content display
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 8'**

---

## Phase 9: Real-time Features & Polish

**Objective:** Implement SignalR integration, responsive design, and final polish.

### Tasks

- [ ] **Task 9.1: Implement SignalR integration (TDD)**
  - [ ] Write tests for SignalR connection
  - [ ] Implement SignalR client setup
  - [ ] Write tests for indexer events (added, updated, deleted)
  - [ ] Implement event handlers
  - [ ] Write tests for health changed events
  - [ ] Implement health status updates
  - [ ] Write tests for command progress
  - [ ] Implement command tracking
  - [ ] Verify coverage >80%

- [ ] **Task 9.2: Implement responsive design (TDD)**
  - [ ] Write tests for mobile sidebar behavior
  - [ ] Implement collapsible mobile navigation
  - [ ] Write tests for responsive tables
  - [ ] Implement column hiding on mobile
  - [ ] Write tests for touch gestures
  - [ ] Implement swipe navigation
  - [ ] Verify coverage >80%

- [ ] **Task 9.3: Implement keyboard shortcuts (TDD)**
  - [ ] Write tests for keyboard shortcut registration
  - [ ] Implement shortcuts system
  - [ ] Write tests for common shortcuts
  - [ ] Implement (?, ESC, Ctrl+S, etc.)
  - [ ] Write tests for shortcut modal
  - [ ] Implement shortcuts help modal
  - [ ] Verify coverage >80%

- [ ] **Task 9.4: Implement theme system (TDD)**
  - [ ] Write tests for theme provider
  - [ ] Implement dark/light theme switching
  - [ ] Write tests for color impaired mode
  - [ ] Implement accessibility theme
  - [ ] Write tests for CSS variables
  - [ ] Implement theme CSS variables
  - [ ] Verify coverage >80%

- [ ] **Task 9.5: Performance optimization**
  - [ ] Write tests for virtual scrolling
  - [ ] Implement react-window virtualization
  - [ ] Write tests for memoization
  - [ ] Implement React.memo and useMemo optimizations
  - [ ] Write tests for code splitting
  - [ ] Implement route-based lazy loading
  - [ ] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 9'**

---

## Phase 10: Integration & Testing

**Objective:** Verify integration with existing mediarr features and complete end-to-end testing.

### Tasks

- [ ] **Task 10.1: Verify integration with existing mediarr features**
  - [ ] Compare implemented features with existing mediarr functionality
  - [ ] Identify missing features that need to be added
  - [ ] Identify features that need to be fixed/improved
  - [ ] Document integration points

- [ ] **Task 10.2: Fix existing functionality gaps**
  - [ ] Fix any broken features identified during integration
  - [ ] Add missing functionality per spec requirements
  - [ ] Ensure API compatibility
  - [ ] Verify data flow integrity

- [ ] **Task 10.3: End-to-end testing**
  - [ ] Create E2E tests for critical user flows
  - [ ] Test indexer management flow
  - [ ] Test search and grab flow
  - [ ] Test settings configuration flow
  - [ ] Verify mobile responsiveness E2E

- [ ] **Task 10.4: Final documentation**
  - [ ] Document component usage
  - [ ] Create API integration guide
  - [ ] Write deployment notes
  - [ ] Update project README

- [ ] **Task: Conductor - User Manual Verification 'Phase 10'**

---

## Dependencies Between Phases

```
Phase 1 (Infrastructure)
    ↓
Phase 2 (Tables) ←→ Phase 3 (Modals/Forms)
    ↓
Phase 4 (Indexers)
    ↓
Phase 5 (Search) ←→ Phase 6 (History)
    ↓
Phase 7 (Settings)
    ↓
Phase 8 (System)
    ↓
Phase 9 (Real-time/Polish)
    ↓
Phase 10 (Integration)
```

---

## Notes

- Each task follows TDD: Write tests → Implement → Verify coverage
- Use commit messages following pattern: `feat(prowlarr): description`
- Attach git notes to commits per workflow.md guidelines
- Update this plan with commit SHAs as tasks complete
- Target >80% code coverage for all new code
- Use Lucide React icons (not FontAwesome) per project standards
- Follow existing mediarr code style and patterns
