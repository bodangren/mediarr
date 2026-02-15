# Prowlarr UI Cloning - Implementation Plan

**Track:** prowlarr_ui_cloning_20260214  
**Status:** Planning Complete  
**Created:** 2026-02-14

---

## Overview

This plan implements the Prowlarr UI cloning based on the comprehensive specification. The implementation follows Test-Driven Development (TDD) methodology with clear phases, tests written before implementation, and quality gates at each phase.

**Goal:** Create equivalent functionality in the mediarr app for Prowlarr-style indexer management UI.

---

## Phase 1: Project Setup & Core Infrastructure [checkpoint: 0820b46]

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

- [x] **Task 1.5: Create routing structure** (commit: `65ddb12`)
  - [x] Write tests for route configuration
  - [x] Implement Next.js App Router routes matching Prowlarr structure
  - [x] Write tests for navigation active states
  - [x] Implement navigation with active highlighting
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 1'** (commit: `6f041d8`)

---

## Phase 2: Data Table System [checkpoint: ebfef6f]

**Objective:** Implement comprehensive table components with sorting, filtering, pagination, and selection.

### Tasks

- [x] **Task 2.1: Create base Table components (TDD)** (commit: `711c366`)
  - [x] Write tests for Table container component
  - [x] Implement Table wrapper component
  - [x] Write tests for TableHeader with sortable columns
  - [x] Implement TableHeader with sort indicators
  - [x] Write tests for TableBody and TableRow
  - [x] Implement TableBody and TableRow components
  - [x] Write tests for TableCell renderers
  - [x] Implement custom cell renderers (text, date, status)
  - [x] Verify coverage >80%

- [x] **Task 2.2: Implement sorting functionality (TDD)** (commit: `2bfbcf2`)
  - [x] Write tests for sort reducer
  - [x] Implement sort state management
  - [x] Write tests for multi-column sort predicates
  - [x] Implement sort predicates for common data types
  - [x] Write tests for sort UI interactions
  - [x] Implement SortMenu component
  - [x] Verify coverage >80%

- [x] **Task 2.3: Implement filtering system (TDD)** (commit: `7541e02`)
  - [x] Write tests for filter predicates
  - [x] Implement filter predicate functions
  - [x] Write tests for FilterMenu component
  - [x] Implement FilterMenu with predefined filters
  - [x] Write tests for FilterBuilder modal
  - [x] Implement FilterBuilder with AND/OR logic
  - [x] Verify coverage >80%

- [x] **Task 2.4: Implement pagination (TDD)** (commit: `ea97d7b`)
  - [x] Write tests for TablePager component
  - [x] Implement TablePager with page controls
  - [x] Write tests for client-side pagination logic
  - [x] Implement pagination reducer
  - [x] Write tests for page size selector
  - [x] Implement page size configuration
  - [x] Verify coverage >80%

- [x] **Task 2.5: Implement selection mode (TDD)** (commit: `82de7a8`)
  - [x] Write tests for SelectProvider context
  - [x] Implement SelectProvider for bulk operations
  - [x] Write tests for row selection (checkbox, shift-click)
  - [x] Implement SelectCheckboxCell component
  - [x] Write tests for SelectFooter with bulk actions
  - [x] Implement SelectFooter component
  - [x] Verify coverage >80%

- [x] **Task 2.6: Implement column management (TDD)** (commit: `c745bf0`)
  - [x] Write tests for TableOptionsModal
  - [x] Implement column visibility toggle
  - [x] Write tests for drag-and-drop column reordering
  - [x] Implement column reordering with react-dnd
  - [x] Write tests for column persistence
  - [x] Implement column state persistence
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 2'** (commit: `2fe545c`)

---

## Phase 3: Modal & Form System [checkpoint: 7083524]

**Objective:** Create comprehensive modal and form components for CRUD operations.

### Tasks

- [x] **Task 3.1: Create Modal system (TDD)** (commit: `9a67a58`)
  - [x] Write tests for Modal container
  - [x] Implement Modal component with backdrop
  - [x] Write tests for ModalHeader, ModalBody, ModalFooter
  - [x] Implement modal sub-components
  - [x] Write tests for ConfirmModal
  - [x] Implement ConfirmModal for destructive actions
  - [x] Verify coverage >80%

- [x] **Task 3.2: Create Form components (TDD)** (commit: `a38faa4`)
  - [x] Write tests for Form and FormGroup
  - [x] Implement Form wrapper components
  - [x] Write tests for TextInput
  - [x] Implement TextInput with validation
  - [x] Write tests for SelectInput and EnhancedSelectInput
  - [x] Implement dropdown inputs
  - [x] Write tests for CheckInput
  - [x] Implement checkbox component
  - [x] Write tests for TagInput
  - [x] Implement tag selection input
  - [x] Verify coverage >80%

- [x] **Task 3.3: Create specialized inputs (TDD)** (commit: `4a9bac4`)
  - [x] Write tests for PasswordInput
  - [x] Implement password input with visibility toggle
  - [x] Write tests for PathInput
  - [x] Implement path input with file browser
  - [x] Write tests for NumberInput
  - [x] Implement numeric input with validation
  - [x] Write tests for AutoCompleteInput
  - [x] Implement autocomplete with suggestions
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 3'** (commit: `d399df0`)

---

## Phase 4: Indexers Management Views [checkpoint: e7500f7]

**Objective:** Implement Indexer list, add, edit, and stats views.

### Tasks

- [x] **Task 4.1: Create IndexerIndex view (TDD)** (commit: `07e2e6d`)
  - [ ] Write tests for IndexerIndex container
  - [ ] Implement main IndexerIndex page component
  - [ ] Write tests for IndexerIndexTable
  - [ ] Implement data table for indexers
  - [ ] Write tests for PageToolbar with actions
  - [ ] Implement toolbar (Add, Refresh, Sync, Select Mode)
  - [ ] Write tests for PageJumpBar
  - [ ] Implement alphabet navigation
  - [ ] Verify coverage >80%

- [x] **Task 4.2: Create AddIndexerModal (TDD)** (commit: `82d93e7`)
  - [ ] Write tests for AddIndexerModal
  - [ ] Implement add indexer modal
  - [ ] Write tests for indexer preset selection
  - [ ] Implement preset grid/list selection
  - [ ] Write tests for indexer configuration form
  - [ ] Implement dynamic form based on schema
  - [ ] Write tests for indexer testing
  - [ ] Implement test connection functionality
  - [ ] Verify coverage >80%

- [x] **Task 4.3: Create EditIndexerModal (TDD)** (commit: `09d232d`)
  - [ ] Write tests for EditIndexerModal
  - [ ] Implement edit indexer modal
  - [ ] Write tests for form pre-population
  - [ ] Implement loading existing indexer data
  - [ ] Write tests for save functionality
  - [ ] Implement update API integration
  - [ ] Verify coverage >80%

- [x] **Task 4.4: Create IndexerStats view (TDD)** (commit: `97c2ffe`)
  - [ ] Write tests for IndexerStats container
  - [ ] Implement stats dashboard page
  - [ ] Write tests for statistics cards
  - [ ] Implement stat summary cards
  - [ ] Write tests for BarChart and StackedBarChart
  - [ ] Implement chart components (using Chart.js or Recharts)
  - [ ] Write tests for DoughnutChart
  - [ ] Implement doughnut/pie charts
  - [ ] Verify coverage >80%

- [x] **Task 4.5: Implement bulk operations (TDD)** (commit: `1e6fa87`)
  - [ ] Write tests for bulk delete functionality
  - [ ] Implement bulk delete with confirmation
  - [ ] Write tests for bulk test functionality
  - [ ] Implement test all indexers
  - [ ] Write tests for bulk edit
  - [ ] Implement bulk edit modal
  - [ ] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 4'** (commit: `53af60d`)

- [x] **Task 4.6: Import Prowlarr Indexer Definitions (TDD)** (commit: `74f373b`)
  - [x] Write tests for indexer definition parser
  - [x] Parse Prowlarr C# indexer definitions from reference/prowlarr
  - [x] Create TypeScript indexer preset definitions for torrent trackers
  - [x] Write tests for indexer preset loading
  - [x] Implement indexer preset loading from definitions
  - [x] Remove Newznab presets (torrent-only support)
  - [x] Write tests for indexer selection UI
  - [x] Update AddIndexerModal to display imported indexer presets
  - [x] Verify coverage >80%

---

## Phase 5: Search View [checkpoint: ea80719]

**Objective:** Implement manual search interface with results table and grab functionality.

### Tasks

- [x] **Task 5.1: Create SearchIndex view (TDD)** (commit: `5129d5f`)
  - [x] Write tests for SearchIndex container
  - [x] Implement main search page
  - [x] Write tests for search input form
  - [x] Implement search form with query, category, indexer selection
  - [x] Write tests for search parameters
  - [x] Implement advanced search options
  - [x] Verify coverage >80%

- [x] **Task 5.2: Create SearchResults table (TDD)** (commit: `c21f704`)
  - [x] Write tests for SearchResultsTable
  - [x] Implement search results data table
  - [x] Write tests for result columns
  - [x] Implement columns (Protocol, Age, Title, Indexer, Size, etc.)
  - [x] Write tests for indexer flags display
  - [x] Implement flags display (freeleech, etc.)
  - [x] Verify coverage >80%

- [x] **Task 5.3: Implement release actions (TDD)** (commit: `be7e655`)
  - [x] Write tests for grab functionality
  - [x] Implement grab release action
  - [x] Write tests for download functionality
  - [x] Implement download .torrent/.nzb
  - [x] Write tests for OverrideMatch feature
  - [x] Implement override match modal
  - [x] Write tests for bulk grab
  - [x] Implement bulk grab functionality
  - [x] Verify coverage >80%

- [x] **Task 5.4: Implement search filtering (TDD)** (commit: `1e24270`)
  - [x] Write tests for search filters
  - [x] Implement filter by protocol, size, peers
  - [x] Write tests for custom filter builder
  - [x] Implement search-specific filter builder
  - [x] Verify coverage >80%

- [x] **Task: Conductor - User Manual Verification 'Phase 5'** (commit: `e98f703`)

---

## Phase 6: History View

**Objective:** Implement query and release history tracking.

### Tasks

- [x] **Task 6.1: Create History view (TDD)** (commit: `0d92ee3`)
  - [ ] Write tests for History container
  - [ ] Implement history page
  - [ ] Write tests for history table
  - [ ] Implement paginated history log
  - [ ] Write tests for event type filtering
  - [ ] Implement filter by event type (grabbed, query, RSS, auth)
  - [ ] Verify coverage >80%

- [x] **Task 6.2: Implement history details (TDD)** (commit: `893d18d`)
  - [ ] Write tests for history details modal
  - [ ] Implement details viewer
  - [ ] Write tests for parameter display
  - [ ] Implement query parameters view
  - [ ] Write tests for success/failure indicators
  - [ ] Implement status display with colors
  - [ ] Verify coverage >80%

- [x] **Task 6.3: Implement history management (TDD)** (commit: `6e2445af`)
  - [x] Write tests for clear history functionality
  - [x] Implement clear history with confirmation
  - [x] Write tests for mark as failed
  - [x] Implement failed release marking
  - [x] Write tests for export functionality
  - [x] Implement history export
  - [x] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 6'**

---

## Phase 7: Settings Pages

**Objective:** Implement comprehensive settings for indexers, applications, download clients, and general configuration.

### Tasks

- [x] **Task 7.1: Create Settings Indexer page (TDD)**
  - [x] Write tests for IndexerSettings container
  - [x] Implement indexer configuration page
  - [x] Write tests for indexer list management
  - [x] Implement add/edit/delete indexers
  - [ ] Write tests for Indexer Proxies section
  - [ ] Implement proxy configuration
  - [ ] Write tests for Indexer Categories
  - [ ] Implement category management
  - [x] Verify coverage >80%

- [x] **Task 7.2: Create Application Settings page (TDD)**
  - [ ] Write tests for ApplicationSettings
  - [ ] Implement app integration settings
  - [ ] Write tests for Sonarr/Radarr/Lidarr/Readarr config
  - [ ] Implement application type configuration
  - [ ] Write tests for sync functionality
  - [ ] Implement indexer sync to apps
  - [ ] Verify coverage >80%

- [x] **Task 7.3: Create Download Client Settings (TDD)**
  - [ ] Write tests for DownloadClientSettings
  - [ ] Implement download client configuration
  - [ ] Write tests for client types (Transmission, uTorrent, SABnzbd, etc.)
  - [ ] Implement various client configs
  - [ ] Write tests for category mapping
  - [ ] Implement download categories
  - [ ] Verify coverage >80%

- [x] **Task 7.4: Create Notification Settings (TDD)**
  - [ ] Write tests for NotificationSettings
  - [ ] Implement notification configuration
  - [ ] Write tests for notification types (Discord, Telegram, Email, etc.)
  - [ ] Implement various notification providers
  - [ ] Write tests for trigger configuration
  - [ ] Implement notification triggers
  - [ ] Verify coverage >80%

- [x] **Task 7.5: Create Tag Settings (TDD)**
  - [ ] Write tests for TagSettings
  - [ ] Implement tag management
  - [ ] Write tests for tag assignment
  - [ ] Implement tag to indexer/app/client mapping
  - [ ] Write tests for tag restrictions
  - [ ] Implement restriction rules
  - [ ] Verify coverage >80%

- [x] **Task 7.6: Create General Settings (TDD)**
  - [ ] Write tests for GeneralSettings
  - [ ] Implement general configuration
  - [ ] Write tests for host settings (port, bind address, URL base)
  - [ ] Implement host configuration
  - [ ] Write tests for security settings (API key, SSL, auth)
  - [ ] Implement security configuration
  - [ ] Write tests for logging and update settings
  - [ ] Implement logging and update config
  - [ ] Verify coverage >80%

- [x] **Task 7.7: Create UI Settings (TDD)**
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

- [x] **Task 8.1: Create System Status page (TDD)**
  - [ ] Write tests for SystemStatus container
  - [ ] Implement status dashboard
  - [ ] Write tests for Health component
  - [ ] Implement health checks display
  - [ ] Write tests for About section
  - [ ] Implement version and info display
  - [ ] Write tests for Disk Space display
  - [ ] Implement disk usage visualization
  - [ ] Verify coverage >80%

- [x] **Task 8.2: Create System Tasks page (TDD)**
  - [ ] Write tests for SystemTasks container
  - [ ] Implement tasks page
  - [ ] Write tests for ScheduledTasks table
  - [ ] Implement scheduled tasks list
  - [ ] Write tests for QueuedTasks table
  - [ ] implement queued tasks display
  - [ ] Write tests for manual task execution
  - [ ] Implement trigger task functionality
  - [ ] Verify coverage >80%

- [x] **Task 8.3: Create System Backup page (TDD)**
  - [ ] Write tests for SystemBackup container
  - [ ] Implement backup management page
  - [ ] Write tests for backup list
  - [ ] Implement existing backups display
  - [ ] Write tests for backup actions
  - [ ] Implement create, restore, delete, download
  - [ ] Verify coverage >80%

- [x] **Task 8.4: Create System Updates page (TDD)**
  - [ ] Write tests for SystemUpdates container
  - [ ] Implement updates page
  - [ ] Write tests for update check
  - [ ] Implement version check functionality
  - [ ] Write tests for changelog display
  - [ ] Implement update changes view
  - [ ] Write tests for install update
  - [ ] Implement update installation
  - [ ] Verify coverage >80%

- [x] **Task 8.5: Create System Events page (TDD)**
  - [ ] Write tests for SystemEvents container
  - [ ] Implement events log page
  - [ ] Write tests for event filtering
  - [ ] Implement filter by level and type
  - [ ] Write tests for event export
  - [ ] Implement export functionality
  - [ ] Verify coverage >80%

- [x] **Task 8.6: Create System Logs page (TDD)**
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

- [~] **Task 9.1: Implement SignalR integration (TDD)**
  - [x] Write tests for SignalR connection
  - [x] Implement SignalR client setup
  - [x] Write tests for indexer events (added, updated, deleted)
  - [x] Implement event handlers
  - [x] Write tests for health changed events
  - [x] Implement health status updates
  - [x] Write tests for command progress
  - [x] Implement command tracking
  - [ ] Verify coverage >80%

- [ ] **Task 9.2: Implement responsive design (TDD)**
  - [ ] Write tests for mobile sidebar behavior
  - [ ] Implement collapsible mobile navigation
  - [ ] Write tests for responsive tables
  - [ ] Implement column hiding on mobile
  - [ ] Write tests for touch gestures
  - [ ] Implement swipe navigation
  - [ ] Verify coverage >80%

- [~] **Task 9.3: Implement keyboard shortcuts (TDD)**
  - [x] Write tests for keyboard shortcut registration
  - [x] Implement shortcuts system
  - [x] Write tests for common shortcuts
  - [x] Implement (?, ESC, Ctrl+S, etc.)
  - [x] Write tests for shortcut modal
  - [x] Implement shortcuts help modal
  - [ ] Verify coverage >80%

- [x] **Task 9.4: Implement theme system (TDD)** (commit: c8567632)
  - [x] Write tests for theme provider
  - [x] Implement dark/light theme switching
  - [x] Write tests for color impaired mode
  - [x] Implement accessibility theme
  - [x] Write tests for CSS variables
  - [x] Implement theme CSS variables
  - [x] Verify coverage >80%

- [x] **Task 9.5: Performance optimization** (commit: 5f2e842)
  - [x] Write tests for virtual scrolling
  - [x] Implement react-window virtualization
  - [x] Write tests for memoization
  - [x] Implement React.memo and useMemo optimizations
  - [x] Write tests for code splitting
  - [x] Implement route-based lazy loading
  - [x] Verify coverage >80%

- [x] **Task 9.6: Prune irrelevant Prowlarr-specific features** (commit: c5a8091b)
  - [x] Remove `/settings/applications` page and components (inter-app connections not needed in unified app)
  - [x] Remove `/settings/downloadclients` page and components (Mediarr has integrated torrent management)
  - [x] Remove `/settings/connect` page and components (notifications consolidated in Mediarr core settings)
  - [x] Remove `/settings/tags` page and components (tags consolidated in Mediarr core settings)
  - [x] Remove corresponding navigation entries, breadcrumb labels, and route files
  - [x] Remove or archive associated test files
  - [x] Update `/settings` landing page to reflect remaining settings (Indexers, General, UI)
  - [x] Verify no broken imports or dead references remain

- [x] **Task 9.7: Redesign navigation with grouped sections and icons** (commit: 3480d29)
  - [x] Add `icon` field to `NavigationItem` type (using Lucide React icons)
  - [x] Reorganize `NAV_ITEMS` into grouped sections: Media Library, Indexers & Search, System, Settings, Other
  - [x] Redesign `PageSidebar` with collapsible section headers, icons, and visual hierarchy
  - [x] Add section dividers and indentation for sub-items
  - [x] Redesign mobile bottom navigation with icon-based tabs and a "More" overflow menu
  - [x] Replace cryptic short labels ("IdxSet", "DLC") with meaningful labels or icon-only mode
  - [x] Write tests for new navigation grouping, collapse, and active state behavior
  - [x] Verify coverage >80%

- [x] **Task 9.8: Fix modal overflow and responsive sizing** (commit: `d3260e1e`)
   - [x] Add `max-h-[85vh] overflow-y-auto` to base `ModalBody` component
   - [x] Add sticky footer pattern to `ModalFooter` so action buttons stay visible during scroll
   - [x] Audit and fix all content-heavy modals: AddIndexerModal, EditIndexerModal
   - [x] Test modal behavior at mobile viewport (375px) — ensure usable without horizontal scroll
   - [x] Write tests for modal scroll behavior and footer visibility
   - [x] Verify coverage >80%

- [ ] **Task: Conductor - User Manual Verification 'Phase 9'**

---

## Phase 10: Integration & Testing

**Objective:** Verify integration with existing mediarr features and complete end-to-end testing.

### Tasks

- [~] **Task 10.1: Verify integration with existing mediarr features**
  - [x] Compare implemented features with existing mediarr functionality
  - [x] Identify missing features that need to be added
  - [x] Identify features that need to be fixed/improved
  - [x] Document integration points

- [~] **Task 10.2: Fix existing functionality gaps**
  - [x] Fix any broken features identified during integration
  - [x] Add missing functionality per spec requirements
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

---

## Audit Notes (2026-02-15)

### Phase Status Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Infrastructure | COMPLETE | All components implemented (uses custom store instead of Redux) |
| Phase 2: Table System | COMPLETE | All 14 components implemented with tests |
| Phase 3: Modal/Form System | COMPLETE | Tests now confirmed to exist |
| Phase 4: Indexer Views | COMPLETE | Full implementation with tests |
| Phase 5: Search View | COMPLETE | Full implementation with tests |
| Phase 6: History View | COMPLETE | Full implementation with tests |
| Phase 7: Settings | PARTIAL | Indexers/Applications/Download Clients/Notifications/Tags/General/UI implemented; parity hardening and manual verification remain |
| Phase 8: System | PARTIAL | Status/Tasks/Backup/Updates/Events/Logs pages implemented; parity hardening still pending |
| Phase 9: Real-time | IN PROGRESS | Realtime event contract + cache bridge and keyboard shortcut baseline implemented; responsive/theme/perf work remains |
| Phase 10: Integration | IN PROGRESS | Feature parity audit executed and gap fixes started; E2E/documentation remain |

### Critical Gaps Identified

1. **Navigation (resolved 2026-02-15)**: Missing settings/system routes are now exposed via `NAV_ITEMS` (sidebar + command palette).

2. **General/UI Settings Parity**: `/settings/general` and `/settings/ui` still alias to the shared base settings page and need dedicated parity-complete surfaces.

3. **System Page Hardening**: Core system pages exist, but parity validation and edge-case hardening are still pending.

4. **Indexer Definitions**: Current implementation has only 2 hardcoded presets (Generic Torznab, Generic Newznab). Need to import actual torrent indexer definitions from reference/prowlarr

### Recommended Actions

1. Completed 2026-02-15: Added missing routes to `app/src/lib/navigation.ts`
2. Complete dedicated `/settings/general` and `/settings/ui` pages with Prowlarr-equivalent controls.
3. Add parity-hardening passes for System pages (error states, empty states, advanced actions, and UX fit/finish).
4. Add API clients for missing features (applications, downloadclients, notifications, tags, proxies, categories)
5. **NEW**: Import Prowlarr torrent indexer definitions (Task 4.6)

### Audit Update (2026-02-15 - Parity Verification + Gap Fixes)

- Added integration audit artifact: `artifacts/parity-audit-20260215.md`.
- Executed broad Prowlarr UI verification sweep across indexers, search, history, settings, and system routes:
  - `CI=true npm run test --workspace=app -- 'src/app/(shell)/indexers/page.test.tsx' 'src/app/(shell)/search/page.test.tsx' 'src/app/(shell)/history/page.test.tsx' 'src/app/(shell)/settings/indexers/page.test.tsx' 'src/app/(shell)/settings/applications/page.test.tsx' 'src/app/(shell)/settings/downloadclients/page.test.tsx' 'src/app/(shell)/settings/connect/page.test.tsx' 'src/app/(shell)/settings/tags/page.test.tsx' 'src/app/(shell)/settings/general/page.test.tsx' 'src/app/(shell)/settings/ui/page.test.tsx' 'src/app/(shell)/system/status/page.test.tsx' 'src/app/(shell)/system/tasks/page.test.tsx' 'src/app/(shell)/system/backup/page.test.tsx' 'src/app/(shell)/system/updates/page.test.tsx' 'src/app/(shell)/system/events/page.test.tsx' 'src/app/(shell)/system/logs/files/page.test.tsx'`
  - Result: 170/170 tests passed.
- Implemented real-time parity wiring:
  - Extended `eventsApi` contracts and listeners for indexer lifecycle/health and command lifecycle events.
  - Extended `useEventsCacheBridge` to invalidate indexer/health/system/task query slices when those events arrive.
  - Added focused tests: `src/lib/api/eventsApi.test.ts`, `src/lib/events/useEventsCacheBridge.test.tsx`.
- Implemented keyboard shortcuts parity:
  - Added centralized shortcut registry and global save shortcut event in `src/lib/shortcuts.ts`.
  - Added keyboard shortcuts help modal in `AppShell` (`?`), preserved command palette shortcut (`Cmd/Ctrl+K`), and added global save shortcut (`Cmd/Ctrl+S`) plus Escape overlay close behavior.
  - Wired `Cmd/Ctrl+S` saves for settings pages:
    - `src/app/(shell)/settings/general/page.tsx`
    - `src/app/(shell)/settings/ui/page.tsx`
  - Added focused tests for help modal and save shortcuts.
