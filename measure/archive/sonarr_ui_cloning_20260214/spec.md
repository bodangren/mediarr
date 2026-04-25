# Sonarr UI Cloning Specification

## Document Overview

**Document Version:** 1.0
**Analysis Date:** February 14, 2026
**Target Application:** Sonarr v4.0.0
**Reference Path:** `/home/daniel-bo/Desktop/mediarr/reference/sonarr/frontend/src/`

## Table of Contents

1. [Application Overview](#application-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Navigation Structure](#navigation-structure)
5. [Main Views and Pages](#main-views-and-pages)
6. [UI Components and Patterns](#ui-components-and-patterns)
7. [State Management](#state-management)
8. [Data Fetching and API Integration](#data-fetching-and-api-integration)
9. [Key Features and Interactions](#key-features-and-interactions)
10. [Settings and Configuration](#settings-and-configuration)
11. [Special UI Features](#special-ui-features)

---

## Application Overview

**Sonarr** is a PVR (Personal Video Recorder) for Usenet and BitTorrent users designed to automatically download and manage TV series. It serves as a comprehensive media management system with a sophisticated web-based UI for series discovery, monitoring, downloading, and organizing.

### Core Purpose

- **Series Management**: Browse, search, add, and manage TV series
- **Episode Tracking**: Monitor episode availability, download status, and air dates
- **Download Queue**: Manage active downloads from Usenet and BitTorrent
- **Quality Control**: Configure quality profiles and custom formats for downloads
- **Calendar View**: Visual calendar for upcoming episodes
- **Activity Monitoring**: Track download history, queue, and blocklist
- **Advanced Filtering**: Complex filtering system for series and episodes

---

## Tech Stack

### Core Framework

- **React**: 18.3.1 - UI framework
- **TypeScript**: 5.7.2 - Type safety and development experience
- **Webpack**: 5.95.0 - Module bundler

### State Management

- **Redux**: 4.2.1 - Global application state
- **Redux Thunk**: 2.4.2 - Async actions
- **Zustand**: 5.0.3 - Lightweight state for specific features
- **TanStack React Query**: 5.61.0 - Server state management

### Routing and Navigation

- **React Router**: 5.2.0 - Client-side routing
- **React Router DOM**: 5.2.0 - DOM bindings
- **Connected React Router**: 6.9.3 - Redux integration

### Real-Time Communication

- **Microsoft SignalR**: 10.0.0 - Real-time updates from server

### UI Components and Styling

- **CSS Modules**: Component-scoped styling
- **PostCSS**: CSS processing (nesting, variables, mixins)
- **FontAwesome**: 7.1.0 - Icon system
- **react-dnd**: 16.0.1 - Drag and drop functionality
- **Floating UI**: 0.27.5 - Tooltip and popover positioning
- **react-autosuggest**: 10.1.0 - Autocomplete inputs
- **react-window**: 1.8.11 - Virtual scrolling for large lists

### Form and Input Handling

- **react-slider**: 1.1.4 - Range slider inputs
- **react-tabs**: 4.3.0 - Tabbed interfaces
- **react-google-recaptcha**: 2.1.0 - CAPTCHA integration

### Utilities

- **Lodash**: 4.17.21 - Utility functions
- **Moment.js**: 2.30.1 - Date/time handling
- **Moment Timezone**: 0.6.0 - Timezone support
- **Mousetrap**: 1.6.5 - Keyboard shortcuts

### Development Tools

- **ESLint**: 8.57.1 - Code linting
- **Prettier**: 2.8.8 - Code formatting
- **Stylelint**: 15.6.1 - CSS linting
- **TypeScript ESLint**: 8.18.1 - TypeScript-specific linting

---

## Architecture Overview

### Project Structure

```
frontend/src/
├── App/                    # Core application setup
│   ├── App.tsx             # Root application component
│   ├── AppRoutes.tsx       # Route definitions
│   ├── appStore.ts         # Zustand global store
│   ├── State/              # Redux state definitions
│   └── Select/             # Selection context for batch operations
├── Activity/               # Activity monitoring views
│   ├── Queue/              # Download queue management
│   ├── History/            # Download history
│   └── Blocklist/          # Blocked releases
├── AddSeries/              # Series addition workflows
│   ├── AddNewSeries/       # Search and add new series
│   └── ImportSeries/       # Import existing series from disk
├── Calendar/               # Calendar view of episodes
│   ├── Events/             # Episode event components
│   ├── Day/                # Calendar day components
│   ├── Agenda/             # List/agenda view
│   └── Options/            # Calendar settings
├── Commands/               # Server command execution
│   ├── Command.ts          # Command type definitions
│   ├── CommandNames.ts     # Available commands
│   └── useCommands.ts      # Command hooks
├── Components/             # Shared UI components
│   ├── Page/               # Page layout components
│   │   ├── Header/         # Page header
│   │   ├── Sidebar/        # Navigation sidebar
│   │   ├── Toolbar/        # Page toolbar
│   │   ├── PageContent/    # Main content area
│   │   └── PageJumpBar/    # A-Z navigation
│   ├── Modal/              # Modal dialogs
│   ├── Menu/               # Dropdown menus
│   ├── Form/               # Form inputs and controls
│   ├── Table/              # Data tables
│   ├── Filter/             # Filter components
│   ├── Tooltip/            # Tooltips
│   └── Link/               # Button and link components
├ Episode/                  # Episode-related components
├ EpisodeFile/              # Episode file management
├ Filters/                  # Filter system
│   ├── Filter.ts           # Filter type definitions
│   └── useCustomFilters.ts # Custom filter management
├ InteractiveImport/        # Interactive import workflow
├ InteractiveSearch/        # Manual search for releases
├ Season/                   # Season-related components
├ Series/                   # Series management
│   ├── Index/              # Series list views
│   │   ├── Table/          # Table view
│   │   ├── Posters/        # Poster grid view
│   │   ├── Overview/       # Overview cards view
│   │   └── Menus/          # Filter/sort/view menus
│   ├── Details/            # Series detail page
│   ├── Search/             # Series search
│   ├── History/            # Series-specific history
│   ├── MoveSeries/         # Move series location
│   └── Delete/             # Delete series
├ Settings/                 # Settings pages
│   ├── MediaManagement/    # File management settings
│   ├── Profiles/           # Quality profiles
│   ├── Quality/            # Quality definitions
│   ├── CustomFormats/      # Custom format specifications
│   ├── Indexers/           # Usenet/Torrent indexers
│   ├── DownloadClients/    # Download client settings
│   ├── ImportLists/        # Import list management
│   ├── Notifications/      # Notification connections
│   ├── Metadata/           # Metadata generation
│   ├── MetadataSource/     # Metadata source settings
│   ├── Tags/               # Tag management
│   ├── General/            # General settings
│   └── UI/                 # UI preferences
├ Store/                   # Redux store
│   ├── Actions/            # Redux actions and reducers
│   ├── Selectors/          # Memoized selectors
│   ├── Middleware/         # Middleware (persist, Sentry)
│   └── Migrators/          # State migration
├ System/                   # System management
│   ├── Status/             # System status and health
│   ├── Tasks/              # Scheduled tasks
│   ├── Backup/             # Backup management
│   ├── Updates/            # Application updates
│   ├── Events/             # Event logs
│   └── Logs/               # Log files
├ Tags/                     # Tag utilities
├ Wanted/                   # Wanted episodes
│   ├── Missing/            # Missing episodes
│   └── CutoffUnmet/        # Cutoff unmet episodes
└── Utilities/              # Utility functions
    ├── Fetch/              # API fetch utilities
    ├── String/             # String manipulation
    └── Object/             # Object manipulation
```

### Application Bootstrap Flow

1. **Entry Point**: `index.ts` initializes application
2. **Configuration**: Fetches `/initialize.json` for initial configuration
3. **Store Creation**: Creates Redux store with history integration
4. **App Rendering**: Renders `App.tsx` with providers
5. **Router Setup**: Sets up React Router with routes

### Component Hierarchy

```
App (root)
├── DocumentTitle
├── QueryClientProvider (React Query)
├── Provider (Redux)
├── ConnectedRouter
│   ├── ApplyTheme
│   └── Page
│       ├── PageHeader
│       ├── PageSidebar
│       └── AppRoutes
│           └── [Route Components]
```

---

## Navigation Structure

### Sidebar Navigation

The sidebar is the primary navigation mechanism with a hierarchical structure:

```typescript
LINKS: SidebarItem[] = [
  {
    iconName: 'SERIES_CONTINUING',
    title: 'Series',
    to: '/',
    children: [
      { title: 'Add New', to: '/add/new' },
      { title: 'Library Import', to: '/add/import' }
    ]
  },
  {
    iconName: 'CALENDAR',
    title: 'Calendar',
    to: '/calendar'
  },
  {
    iconName: 'ACTIVITY',
    title: 'Activity',
    to: '/activity/queue',
    children: [
      { title: 'Queue', to: '/activity/queue' },
      { title: 'History', to: '/activity/history' },
      { title: 'Blocklist', to: '/activity/blocklist' }
    ]
  },
  {
    iconName: 'WARNING',
    title: 'Wanted',
    to: '/wanted/missing',
    children: [
      { title: 'Missing', to: '/wanted/missing' },
      { title: 'Cutoff Unmet', to: '/wanted/cutoffunmet' }
    ]
  },
  {
    iconName: 'SETTINGS',
    title: 'Settings',
    to: '/settings',
    children: [
      { title: 'Media Management', to: '/settings/mediamanagement' },
      { title: 'Profiles', to: '/settings/profiles' },
      { title: 'Quality', to: '/settings/quality' },
      { title: 'Custom Formats', to: '/settings/customformats' },
      { title: 'Indexers', to: '/settings/indexers' },
      { title: 'Download Clients', to: '/settings/downloadclients' },
      { title: 'Import Lists', to: '/settings/importlists' },
      { title: 'Connect', to: '/settings/connect' },
      { title: 'Metadata', to: '/settings/metadata' },
      { title: 'Metadata Source', to: '/settings/metadatasource' },
      { title: 'Tags', to: '/settings/tags' },
      { title: 'General', to: '/settings/general' },
      { title: 'UI', to: '/settings/ui' }
    ]
  },
  {
    iconName: 'SYSTEM',
    title: 'System',
    to: '/system/status',
    children: [
      { title: 'Status', to: '/system/status' },
      { title: 'Tasks', to: '/system/tasks' },
      { title: 'Backup', to: '/system/backup' },
      { title: 'Updates', to: '/system/updates' },
      { title: 'Events', to: '/system/events' },
      { title: 'Log Files', to: '/system/logs/files' }
    ]
  }
]
```

### Navigation Features

1. **Collapsible on Mobile**: Sidebar slides in/out on small screens
2. **Active State Highlighting**: Current route is visually highlighted
3. **Parent/Child Navigation**: Hierarchical navigation with expandable sections
4. **Status Indicators**: Queue and Health status displayed on sidebar items
5. **Touch Gestures**: Swipe gestures for mobile navigation
6. **URL Base Support**: Supports custom URL base paths

### Route Structure

```typescript
<Route exact={true} path="/" component={SeriesIndex} />
<Route path="/add/new" component={AddNewSeries} />
<Route path="/add/import" component={ImportSeriesPage} />
<Route path="/series/:titleSlug" component={SeriesDetailsPage} />
<Route path="/calendar" component={CalendarPage} />
<Route path="/activity/history" component={History} />
<Route path="/activity/queue" component={Queue} />
<Route path="/activity/blocklist" component={Blocklist} />
<Route path="/wanted/missing" component={Missing} />
<Route path="/wanted/cutoffunmet" component={CutoffUnmet} />
<Route exact={true} path="/settings" component={Settings} />
<!-- All settings routes -->
<Route path="/system/status" component={Status} />
<!-- All system routes -->
```

---

## Main Views and Pages

### 1. Series Index (Home) - `/`

**Purpose**: Main landing page displaying all tracked series with multiple view modes

**Features**:

- **Three View Modes**:
  - Table View: Detailed data table with columns
  - Poster View: Grid of series posters
  - Overview View: Cards with series information
- **Filtering**: Complex filtering system with preset filters
- **Sorting**: Multiple sort options (title, added date, season count, etc.)
- **Bulk Operations**: Select multiple series for batch actions
- **Jump Bar**: A-Z navigation when sorted by title
- **Search**: Real-time search filtering
- **Status Indicators**: Series status (continuing, ended, deleted)
- **Progress Indicators**: Download progress for each series

**Key Components**:

- `SeriesIndex.tsx`: Main container
- `SeriesIndexTable.tsx`: Table view component
- `SeriesIndexPosters.tsx`: Poster grid view
- `SeriesIndexOverviews.tsx`: Overview card view
- `SeriesIndexFilterMenu`: Filter dropdown
- `SeriesIndexSortMenu`: Sort dropdown
- `SeriesIndexViewMenu`: View mode selector
- `PageJumpBar`: A-Z navigation
- `SeriesIndexFooter`: Statistics and info

**State Management**:

- `seriesOptionsStore.ts`: View options, sort, filter state
- Redux: Series data from server
- React Query: Fetch series with pagination/filtering

**Interactions**:

- Click series row → Navigate to series details
- Hover actions → Show action buttons (refresh, edit, delete)
- Select mode → Checkbox for bulk operations
- Drag and drop → Reorder series (limited implementation)

### 2. Add New Series - `/add/new`

**Purpose**: Search and add new TV series from metadata sources

**Features**:

- **Search Functionality**: Search TVDB/TheMovieDB for series
- **Metadata Preview**: Preview series details before adding
- **Quality Profile Selection**: Choose quality profile for downloads
- **Monitoring Options**: Set monitoring preferences
- **Series Type**: Standard, Anime, Daily
- **Season Monitoring**: Configure which seasons to monitor
- **Root Folder Selection**: Choose storage location
- **Add Multiple**: Add multiple series in one operation

**Key Components**:

- `AddNewSeries.tsx`: Main page
- `AddNewSeriesModal.tsx`: Modal for adding from other views
- `AddNewSeriesSearchResult.tsx`: Search result item
- `SeriesMonitoringOptionsPopoverContent`: Monitoring options
- `SeriesTypePopoverContent`: Series type selector
- `SeriesMonitorNewItemsOptionsPopoverContent`: New item monitoring

**Workflow**:

1. User enters search term
2. Results displayed with metadata
3. User clicks "Add" on desired series
4. Configuration modal opens (folder, quality, monitoring)
5. Series added to library

### 3. Import Series - `/add/import`

**Purpose**: Import existing series from disk

**Features**:

- **Folder Selection**: Browse and select series folders
- **Folder Parsing**: Parse folder names to identify series
- **Metadata Matching**: Match files to metadata sources
- **Quality Detection**: Detect quality of existing files
- **Interactive Import**: Manual override of matches
- **Import Mode**: Choose how to handle existing files
- **Monitor Configuration**: Set monitoring for imported series

**Key Components**:

- `ImportSeriesPage.tsx`: Main page
- `ImportSeries.tsx`: Import workflow component
- `ImportSeriesTable.tsx`: Table of detected series
- `ImportSeriesSelectSeries.tsx`: Series selection
- `ImportSeriesSearchResult.tsx`: Search result
- `ImportSeriesSelectFolder.tsx`: Folder browser

**Workflow**:

1. User selects root folder
2. Application scans for series
3. Series detected and matched to metadata
4. User reviews and confirms
5. Series imported

### 4. Calendar - `/calendar`

**Purpose**: Visual calendar view of upcoming and recent episodes

**Features**:

- **Multiple Views**: 3-day, 5-day, 7-day views (responsive)
- **Agenda View**: List view of all episodes
- **Date Navigation**: Previous/Next navigation, jump to today
- **Episode Status**: Color-coded by status (missing, downloaded, airing)
- **Filtering**: Filter by series, tags, status
- **iCal Export**: Export calendar feed
- **Queue Details**: Show download queue for upcoming episodes
- **Interactive Search**: Manual search for missing episodes

**Key Components**:

- `CalendarPage.tsx`: Main page
- `Calendar.tsx`: Main calendar component
- `CalendarDay.tsx`: Single day view
- `CalendarEvent.tsx`: Episode event
- `CalendarEventGroup.tsx`: Multiple episodes same time
- `CalendarHeader.tsx`: Navigation and controls
- `Legend.tsx`: Status legend
- `Agenda.tsx`: List/agenda view
- `CalendarOptionsModal`: Calendar settings

**State Management**:

- `calendarOptionsStore.ts`: View options, day count
- React Query: Fetch episode data for date range

**Responsive Behavior**:

- Desktop: 7-day view (adjusts based on width)
- Tablet: 5-day view
- Mobile: 3-day view, scrollable days

### 5. Series Details - `/series/:titleSlug`

**Purpose**: Detailed view of a single series

**Features**:

- **Series Information**: Metadata overview (plot, genres, network, etc.)
- **Season Breakdown**: List of seasons with episodes
- **Episode List**: All episodes with status
- **Season Monitoring**: Toggle monitoring per season
- **Episode Monitoring**: Toggle monitoring per episode
- **Search**: Manual search for episodes
- **History**: Series-specific history
- **Edit**: Edit series metadata
- **Delete**: Delete series
- **Move**: Move series to different folder
- **Tags**: Assign tags to series
- **Alternate Titles**: View and manage alternate titles
- **Links**: External links (TVDB, IMDb, etc.)
- **Progress**: Track download progress

**Key Components**:

- `SeriesDetailsPage.tsx`: Page wrapper
- `SeriesDetails.tsx`: Main details component
- `SeriesDetailsSeason.tsx`: Season component
- `SeriesDetailsLinks.tsx`: External links
- `SeriesTags.tsx`: Tag display
- `SeasonInfo.tsx`: Season information
- `EpisodeRow.tsx`: Episode row in season

**Interactions**:

- Hover episode → Show action buttons (search, monitor toggle)
- Click season → Expand/collapse episode list
- Monitoring toggle → Update monitoring status
- Search button → Open interactive search modal

### 6. Activity Queue - `/activity/queue`

**Purpose**: Monitor and manage active downloads

**Features**:

- **Real-time Updates**: SignalR for real-time queue updates
- **Queue Items**: List of downloads with progress
- **Time Remaining**: Estimated time for each download
- **Protocol Labels**: Show download protocol (torrent/usenet)
- **Status Indicators**: Download status (queued, downloading, paused, etc.)
- **Remove Item**: Remove item from queue
- **Bulk Remove**: Remove multiple items
- **Filtering**: Filter by status, series, quality
- **Sorting**: Sort by various criteria
- **Details Modal**: Detailed view of download

**Key Components**:

- `Queue.tsx`: Main queue component
- `QueueRow.tsx`: Single queue item
- `QueueStatus.tsx`: Queue status display
- `QueueStatusCell.tsx`: Status indicator cell
- `TimeLeftCell.tsx`: Time remaining display
- `ProtocolLabel.tsx`: Protocol label
- `QueueFilterModal.tsx`: Filter options
- `RemoveQueueItemModal.tsx`: Remove confirmation
- `QueueDetails.tsx`: Detailed view

**State Management**:

- `queueOptionsStore.ts`: Filter and sort options
- React Query: Fetch queue data with polling/SignalR

### 7. Activity History - `/activity/history`

**Purpose**: View download history

**Features**:

- **History Items**: List of all download attempts
- **Event Types**: Grabbed, imported, failed, deleted
- **Series Information**: Show series and episode
- **Quality Information**: Show quality of download
- **Date/Time**: When the event occurred
- **Details**: Detailed view of each event
- **Filtering**: Filter by event type, series, date range
- **Sorting**: Sort by date, series, quality
- **Pagination**: Navigate through history

**Key Components**:

- `History.tsx`: Main history component
- `HistoryRow.tsx`: Single history item
- `HistoryEventTypeCell.tsx`: Event type display
- `HistoryDetailsModal.tsx`: Detailed view
- `HistoryFilterModal.tsx`: Filter options

**Event Types**:

- Grabbed: Release grabbed from indexer
- Imported: Episode successfully imported
- Download Failed: Download failed
- Import Failed: Import failed
- Deleted: File deleted
- Renamed: File renamed

### 8. Activity Blocklist - `/activity/blocklist`

**Purpose**: Manage blocked releases

**Features**:

- **Blocklist Items**: List of blocked releases
- **Block Reason**: Why the release was blocked
- **Series Information**: Series and episode details
- **Release Information**: Release name and quality
- **Date Blocked**: When it was blocked
- **Unblock**: Remove from blocklist
- **Bulk Unblock**: Unblock multiple items
- **Filtering**: Filter by series, quality, date
- **Sorting**: Sort by date, series, etc.

**Key Components**:

- `Blocklist.tsx`: Main blocklist component
- `BlocklistRow.tsx`: Single blocklist item
- `BlocklistDetailsModal.tsx`: Detailed view
- `BlocklistFilterModal.tsx`: Filter options

### 9. Wanted Missing - `/wanted/missing`

**Purpose**: View and search for missing episodes

**Features**:

- **Missing Episodes**: List of episodes that are missing
- **Air Date**: When the episode aired
- **Series Information**: Show series details
- **Episode Number**: Season and episode number
- **Search**: Manual search for missing episodes
- **Bulk Search**: Search for multiple episodes
- **Filtering**: Filter by series, air date, status
- **Sorting**: Sort by air date, series, etc.
- **Pagination**: Navigate through results

**Key Components**:

- `Missing.tsx`: Main component
- `MissingRow.tsx`: Single missing episode
- `MissingFilterModal.tsx`: Filter options

### 10. Wanted Cutoff Unmet - `/wanted/cutoffunmet`

**Purpose**: View episodes that don't meet quality cutoff

**Features**:

- **Cutoff Unmet Episodes**: List of episodes below quality cutoff
- **Current Quality**: Current file quality
- **Cutoff Quality**: Required quality
- **Series Information**: Series details
- **Search**: Manual search for better quality
- **Bulk Search**: Search for multiple episodes
- **Filtering**: Filter by series, quality, date
- **Sorting**: Sort by various criteria

**Key Components**:

- `CutoffUnmet.tsx`: Main component
- `CutoffUnmetRow.tsx`: Single item
- `CutoffUnmetFilterModal.tsx`: Filter options

---

## UI Components and Patterns

### Page Layout Components

#### Page Component

**Purpose**: Root page layout wrapper

**Features**:

- App-wide layout structure
- Header sidebar navigation
- Error handling
- Loading states
- Theme application
- SignalR connection

**Structure**:

```tsx
<Page>
  <PageHeader /> {/* Top header with search and actions */}
  <div className="main">
    <PageSidebar /> {/* Navigation sidebar */}
    {children} {/* Page content */}
  </div>
</Page>
```

#### PageContent Component

**Purpose**: Content area wrapper with title and toolbar

**Features**:

- Page title
- Toolbar integration
- Responsive layout
- Error state display

**Usage**:

```tsx
<PageContent title="Series">
  <PageToolbar>{/* Toolbar buttons */}</PageToolbar>
  <PageContentBody>{/* Main content */}</PageContentBody>
</PageContent>
```

#### PageToolbar Component

**Purpose**: Toolbar with action buttons

**Features**:

- Button sections
- Alignment (left/right)
- Separator components
- Overflow menus for mobile

**Structure**:

```tsx
<PageToolbar>
  <PageToolbarSection>{/* Left-aligned buttons */}</PageToolbarSection>
  <PageToolbarSection alignContent={align.RIGHT}>
    {/* Right-aligned buttons */}
  </PageToolbarSection>
</PageToolbar>
```

### Modal Components

#### Modal Component

**Purpose**: Reusable modal dialog

**Features**:

- Overlay backdrop
- Close on escape key
- Close on backdrop click
- Custom header, body, footer
- Animated transitions

**Structure**:

```tsx
<Modal isOpen={isOpen} onModalClose={onClose}>
  <ModalHeader>Title</ModalHeader>
  <ModalBody>{/* Content */}</ModalBody>
  <ModalFooter>{/* Buttons */}</ModalFooter>
</Modal>
```

#### ConfirmModal Component

**Purpose**: Confirmation dialog for destructive actions

**Features**:

- Custom message
- Confirm/Cancel buttons
- Type-based styling (danger, warning, info)

### Menu Components

#### Menu Component

**Purpose**: Dropdown menu system

**Features**:

- Portal rendering
- Positioning
- Keyboard navigation
- Sub-menu support
- Overflow handling

**Sub-types**:

- `Menu`: Base menu component
- `FilterMenu`: Filter selection menu
- `SortMenu`: Sort selection menu
- `ViewMenu`: View mode selection menu
- `ToolbarMenuButton`: Button that opens menu

**Usage**:

```tsx
<FilterMenu
  selectedFilterKey={selectedFilter}
  filters={filters}
  onFilterSelect={onFilterSelect}
/>
```

### Form Components

#### Input Components

**TextInput**: Standard text input

- Validation support
- Help text
- Error messages
- Disabled state

**SelectInput**: Dropdown select

- Option selection
- Custom value display
- Search/filter options
- Multi-select variants

**EnhancedSelectInput**: Advanced select with hints

- Icons with options
- Secondary text
- Status indicators
- Grouped options

**TagInput**: Tag input with autocomplete

- Tag creation
- Tag removal
- Autocomplete suggestions
- Tag validation

**CheckInput**: Checkbox input

- Single checkbox
- Custom styling
- Indeterminate state

**NumberInput**: Numeric input

- Min/max values
- Step value
- Decimal support

**PasswordInput**: Password field

- Show/hide toggle
- Password strength

**PathInput**: File system path input

- File browser integration
- Path validation
- Auto-completion

**TextArea**: Multi-line text input

- Auto-resize
- Character count
- Scroll handling

**Form Groups**: Input container components

- `Form`: Form wrapper
- `FormGroup`: Field wrapper with label
- `FormLabel`: Label component
- `FormInputHelpText`: Help text
- `FormInputGroup`: Input group with buttons

### Table Components

#### Table Component

**Purpose**: Data table with sorting and filtering

**Features**:

- Sortable columns
- Column visibility toggle
- Custom column rendering
- Select all checkbox
- Horizontal scrolling
- Virtual scrolling support

**Structure**:

```tsx
<Table
  columns={columns}
  sortKey={sortKey}
  sortDirection={sortDirection}
  onSortPress={onSortPress}
  onTableOptionChange={onTableOptionChange}
>
  <TableBody>
    <TableRow>{/* Row cells */}</TableRow>
  </TableBody>
</Table>
```

#### VirtualTable Component

**Purpose**: High-performance table for large datasets

**Features**:

- Virtual scrolling (react-window)
- Fixed headers
- Dynamic row heights
- Performance optimization

### Button Components

#### Button Component

**Purpose**: Primary action button

**Variants**:

- Primary: Main actions
- Secondary: Secondary actions
- Warning: Destructive actions
- Success: Success actions
- Default: Standard actions

**States**:

- Normal
- Disabled
- Loading (spinner)
- Pressed

#### IconButton Component

**Purpose**: Icon-only button

**Features**:

- Various icon sizes
- Tooltip support
- Button variants
- Pressed state

#### SpinnerButton Component

**Purpose**: Button with loading spinner

**Features**:

- Spinner animation
- Loading text
- Disabled during load

### Filter Components

#### Filter Component

**Purpose**: Complex filtering system

**Features**:

- Preset filters
- Custom filters
- Filter builder
- Filter combinations (AND/OR)
- Filter persistence

**Filter Types**:

- String: Text matching
- Number: Numeric comparisons
- Date: Date ranges
- Boolean: True/False
- Enum: Select from options
- Array: Multiple values

**Usage**:

```typescript
const FILTERS: Filter[] = [
  {
    key: "monitored",
    label: "Monitored",
    filters: [{ key: "monitored", value: true, type: FilterTypes.EQUAL }],
  },
];
```

### Other UI Components

#### Alert Component

**Purpose**: Informational alerts

**Types**:

- Info
- Success
- Warning
- Danger

#### ProgressBar Component

**Purpose**: Progress indicator

**Features**:

- Percentage display
- Custom colors
- Animated progress
- Size variants

#### CircularProgressBar Component

**Purpose**: Circular progress indicator

**Features**:

- SVG-based rendering
- Percentage display
- Custom colors
- Size variants

#### Tooltip Component

**Purpose**: Tooltip for additional information

**Features**:

- Positioning (top, bottom, left, right)
- Delay configuration
- Rich content support
- Hover trigger

#### TagList Component

**Purpose**: Display tags

**Features**:

- Tag display with colors
- Tag removal
- Tag count display
- Overflow handling

#### Loading Components

**LoadingIndicator**: Spinner for loading state
**LoadingMessage**: Loading message with spinner

---

## State Management

### Redux Store

**Purpose**: Global application state management

**Store Structure**:

```javascript
{
  series: {
    items: [],
    error: null,
    isFetching: false,
    isPopulated: false
  },
  episodes: { ... },
  commands: { ... },
  settings: {
    general: { ... },
    ui: { ... },
    // Other settings
  },
  // Other sections
}
```

**Actions**:

- `baseActions`: Generic CRUD actions
- `settingsActions`: Settings-specific actions
- `captchaActions`: CAPTCHA handling

**Selectors**:

- `createClientSideCollectionSelector`: For client-side filtered collections
- `createServerSideCollectionSelector`: For server-side filtered collections
- `createDeepEqualSelector`: Memoized selector with deep equality
- `createSortedSectionSelector`: Sorted data selector

**Middleware**:

- Redux Thunk: Async action handling
- Redux Persist: State persistence to localStorage
- Sentry: Error tracking

**Actions/Creators**:

- `createFetchHandler`: Generic data fetching
- `createSaveHandler`: Generic data saving
- `createRemoveItemHandler`: Generic item deletion
- `createBulkEditItemHandler`: Bulk operations
- `createTestProviderHandler`: Provider testing
- `createFetchSchemaHandler`: Schema fetching
- `createSetServerSideCollectionFilterHandler`: Server-side filtering
- `createSetServerSideCollectionSortHandler`: Server-side sorting

### Zustand Store (appStore)

**Purpose**: Lightweight state for app-wide values

**State**:

```typescript
interface AppState {
  dimensions: {
    width: number;
    height: number;
    isExtraSmallScreen: boolean;
    isSmallScreen: boolean;
    isMediumScreen: boolean;
    isLargeScreen: boolean;
  };
  version: string;
  prevVersion?: string;
  isUpdated: boolean;
  isConnected: boolean;
  isReconnecting: boolean;
  isDisconnected: boolean;
  isRestarting: boolean;
  isSidebarVisible: boolean;
}
```

**Hooks**:

- `useAppValue`: Get single value
- `useAppValues`: Get multiple values
- `useAppDimension`: Get dimension value
- `useAppDimensions`: Get all dimensions

**Actions**:

- `saveDimensions`: Update window dimensions
- `setVersion`: Update app version
- `setIsSidebarVisible`: Toggle sidebar
- `setAppValue`: Set multiple values
- `pingServer`: Check server connectivity

### Component-Level State Stores (Zustand)

Many features use Zustand stores for local state management:

**Examples**:

- `seriesOptionsStore.ts`: Series index options (view, sort, filter)
- `calendarOptionsStore.ts`: Calendar options
- `queueOptionsStore.ts`: Queue filter/sort options
- `historyOptionsStore.ts`: History filter/sort options
- `blocklistOptionsStore.ts`: Blocklist filter/sort options
- `interactiveImportOptionsStore.ts`: Import options

**Pattern**:

```typescript
const useFeatureStore = create<FeatureState>((set) => ({
  state: value,
  setState: (newValue) => set({ state: newValue }),
}));
```

### React Query (Server State)

**Purpose**: Server state management and caching

**Usage Pattern**:

```typescript
const { data, isLoading, error, isFetched } = useApiQuery<DataType>({
  path: "/api/endpoint",
  queryParams: { param1: "value" },
  queryOptions: {
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 5000, // Consider stale after 5 seconds
    cacheTime: 300000, // Cache for 5 minutes
  },
});
```

**Key Features**:

- Automatic caching
- Background refetching
- Optimistic updates
- Query invalidation
- Query keys for cache management

**Mutation**:

```typescript
const { mutate } = useApiMutation<ResponseType, RequestType>({
  method: "POST",
  path: "/api/endpoint",
  mutationOptions: {
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(["/api/endpoint"], data);
    },
  },
});
```

---

## Data Fetching and API Integration

### API Client (`fetchJson`)

**Purpose**: Centralized API request handling

**Features**:

- Automatic JSON handling
- Error handling with `ApiError` class
- Request timeout support
- Abort controller support
- Automatic API key inclusion
- Custom headers support

**Usage**:

```typescript
import fetchJson from "Utilities/Fetch/fetchJson";

const data = await fetchJson<ResponseType>({
  path: "/api/v5/endpoint",
  method: "POST",
  body: { key: "value" },
  timeout: 30000,
});
```

**Error Handling**:

```typescript
try {
  const data = await fetchJson({ path: "/api/endpoint" });
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.statusCode, error.statusBody);
  }
}
```

### useApiQuery Hook

**Purpose**: React Query wrapper for API requests

**Features**:

- Automatic query key generation
- Query params support
- Custom headers
- Request abort support
- Automatic API key inclusion

**Implementation**:

```typescript
const useApiQuery = <T>(options: QueryOptions<T>) => {
  const { queryKey, requestOptions } = useMemo(() => {
    const { path, queryOptions, queryParams, ...otherOptions } = options;

    return {
      queryKey: queryParams ? [path, queryParams] : [path],
      requestOptions: {
        ...otherOptions,
        path: getQueryPath(path) + getQueryString(queryParams),
        headers: {
          ...options.headers,
          "X-Api-Key": window.Sonarr.apiKey,
          "X-Sonarr-Client": "Sonarr",
        },
      },
    };
  }, [options]);

  return {
    queryKey,
    ...useQuery({
      ...options.queryOptions,
      queryKey,
      queryFn: async ({ signal }) =>
        fetchJson<T>({ ...requestOptions, signal }),
    }),
  };
};
```

### useApiMutation Hook

**Purpose**: React Query wrapper for API mutations

**Features**:

- Optimistic updates support
- Automatic cache invalidation
- Success/error callbacks
- Loading states

### API Endpoints

**Base URL**: `/api/v5`

**Common Endpoints**:

```
GET    /api/v5/series              - Get all series
GET    /api/v5/series/{id}         - Get series by ID
POST   /api/v5/series              - Create series
PUT    /api/v5/series/{id}         - Update series
DELETE /api/v5/series/{id}         - Delete series
GET    /api/v5/episode             - Get episodes
GET    /api/v5/queue               - Get download queue
DELETE /api/v5/queue/{id}          - Remove queue item
GET    /api/v5/history             - Get history
GET    /api/v5/blocklist           - Get blocklist
GET    /api/v5/wanted/missing      - Get missing episodes
GET    /api/v5/calendar            - Get calendar data
POST   /api/v5/command             - Execute command
GET    /api/v5/command             - Get commands
GET    /api/v5/config/qualityprofile - Get quality profiles
GET    /api/v5/tag                 - Get tags
GET    /api/v5/system/status       - Get system status
GET    /api/v5/system/backup       - Get backups
```

### SignalR Integration

**Purpose**: Real-time updates from server

**Usage**:

```typescript
import SignalRListener from 'Components/SignalRListener';

<SignalRListener />
```

**Features**:

- Automatic reconnection
- Queue updates
- Command updates
- Health updates
- Series updates

### Custom Hooks

**useSeries**: Fetch series data
**useEpisode**: Fetch episode data
**useQueue**: Fetch queue data
**useHistory**: Fetch history data
**useBlocklist**: Fetch blocklist data
**useMissing**: Fetch missing episodes
**useCalendar**: Fetch calendar data
**useCommands**: Execute and monitor commands
**useSystemStatus**: Get system status
**useBackups**: Get backup list
**useTasks**: Get scheduled tasks
**useEvents**: Get event logs

---

## Key Features and Interactions

### 1. Filtering System

**Purpose**: Advanced filtering for data views

**Features**:

- Preset filters (common queries)
- Custom filters (user-defined)
- Filter combinations (AND/OR)
- Filter persistence
- Filter modal for complex filters

**Filter Types**:

- **Equality**: Exact match
- **Contains**: Substring match
- **Greater Than / Less Than**: Numeric comparisons
- **In Array**: Match any in array
- **Date Range**: Date range filters

**Filter Builder**:

```typescript
interface PropertyFilter {
  key: string;
  value: string | string[] | number[] | boolean[] | DateFilterValue;
  type: FilterType;
}

interface Filter {
  key: string | number;
  label: string | (() => string);
  filters: PropertyFilter[];
}
```

**Usage Example**:

```typescript
const FILTERS: Filter[] = [
  {
    key: "monitored",
    label: "Monitored",
    filters: [{ key: "monitored", value: true, type: FilterTypes.EQUAL }],
  },
  {
    key: "continuing",
    label: "Continuing",
    filters: [{ key: "status", value: "continuing", type: FilterTypes.EQUAL }],
  },
];
```

### 2. Sorting System

**Purpose**: Sort data by various columns

**Features**:

- Client-side sorting
- Server-side sorting
- Ascending/descending
- Multi-column sorting (limited)
- Sort persistence

**Sort Directions**:

```typescript
enum SortDirection {
  ASCENDING = "ascending",
  DESCENDING = "descending",
}
```

### 3. View Modes

**Purpose**: Multiple visual representations of data

**Series Index Views**:

1. **Table**: Detailed data table with columns
2. **Posters**: Grid of poster images
3. **Overview**: Cards with series information

**Calendar Views**:

1. **Calendar**: Calendar grid (3/5/7 days)
2. **Agenda**: List of all episodes

**View Persistence**:

- View preference saved to localStorage
- View restored on page reload

### 4. Batch Operations (Select Mode)

**Purpose**: Perform actions on multiple items

**Features**:

- Select all / Select none
- Invert selection
- Bulk refresh
- Bulk search
- Bulk edit
- Bulk delete

**Implementation**:

- `SelectProvider` context for selection state
- Checkbox in table rows
- Select mode toggle
- Select footer with actions

**Usage**:

```tsx
<SelectProvider items={data}>
  {/* Content */}
  <SelectFooter>{/* Action buttons */}</SelectFooter>
</SelectProvider>
```

### 5. Interactive Search

**Purpose**: Manual search for episodes/releases

**Features**:

- Search all indexers
- Filter by quality
- Filter by language
- Select release to download
- Override matches

**Workflow**:

1. User clicks search button
2. Interactive search modal opens
3. Results displayed with quality indicators
4. User selects release
5. Release added to queue

**Components**:

- `InteractiveSearch.tsx`: Main component
- `InteractiveSearchRow.tsx`: Search result row
- `ReleaseSceneIndicator.tsx`: Scene release indicator
- `Peers.tsx`: Torrent peer information
- `OverrideMatch/`: Override matching logic

### 6. Interactive Import

**Purpose**: Manually import files

**Features**:

- File browser
- Series matching
- Season selection
- Episode selection
- Quality selection
- Language selection
- Import mode selection

**Components**:

- `InteractiveImport.tsx`: Main component
- `InteractiveImportModal.tsx`: Modal wrapper
- `Folder/`: Folder selection
- `Series/`: Series matching
- `Season/`: Season selection
- `Episode/`: Episode selection
- `Quality/`: Quality selection
- `Language/`: Language selection
- `ReleaseType/`: Release type selection

### 7. Command Execution

**Purpose**: Execute server commands

**Command Types**:

- `RssSync`: Sync RSS feeds
- `RefreshSeries`: Refresh series metadata
- `SearchSeries`: Search for missing episodes
- `EpisodeSearch`: Search for specific episode
- `SeasonSearch`: Search for season
- `DownloadedEpisodesScan`: Scan for downloaded episodes
- `RenameEpisodes`: Rename episode files
- `RefreshMonitoredDownloads`: Refresh monitored downloads
- `MissingEpisodeSearch`: Search for missing episodes

**Usage**:

```typescript
import CommandNames from "Commands/CommandNames";
import { useExecuteCommand } from "Commands/useCommands";

const executeCommand = useExecuteCommand();

const handleRssSync = () => {
  executeCommand({
    name: CommandNames.RssSync,
  });
};
```

**Features**:

- Command execution
- Command monitoring
- Command cancellation
- Command status updates
- Rate limiting (5-second minimum between same commands)
- Progress feedback

### 8. Real-Time Updates (SignalR)

**Purpose**: Real-time updates from server

**Event Types**:

- Queue updates
- Command updates
- Health updates
- Series updates
- Episode updates

**Features**:

- Automatic reconnection
- Connection status monitoring
- Event handling
- Toast notifications for completed commands

### 9. Keyboard Shortcuts

**Purpose**: Keyboard navigation and actions

**Shortcuts**:

- `Escape`: Close modals, deselect
- `Enter`: Confirm actions
- Arrow keys: Navigation in lists

**Implementation**:

```typescript
import keyboardShortcuts from "Components/keyboardShortcuts";

keyboardShortcuts.bind("key", (event) => {
  // Handle shortcut
});
```

### 10. Drag and Drop

**Purpose**: Reorder items via drag and drop

**Features**:

- Drag to reorder
- Drop zones
- Visual feedback
- Touch support

**Libraries**:

- `react-dnd`: Drag and drop core
- `react-dnd-html5-backend`: HTML5 backend
- `react-dnd-touch-backend`: Touch backend
- `rdndmb-html5-to-touch`: Multi-backend support

---

## Settings and Configuration

### Settings Navigation

**Main Settings Page** (`/settings`):

- Lists all settings sections with descriptions
- Quick access to each settings page

### 1. Media Management Settings (`/settings/mediamanagement`)

**Purpose**: Configure file management and naming

**Settings Categories**:

- **Root Folders**: Storage locations for series
  - Add/Remove root folders
  - Free space monitoring
  - Quality profile assignment

- **Naming**: File and folder naming patterns
  - Episode naming patterns
  - Season naming patterns
  - Series naming patterns
  - Replace illegal characters
  - Colon handling

- **Unmapped Folders**: Handle unmapped folders
  - Import extra files
  - Unmapped folder handling

**Key Components**:

- `MediaManagement.tsx`: Main page
- `RootFolder/AddRootFolder.tsx`: Add root folder modal
- `Naming/Naming.tsx`: Naming settings
- `Naming/NamingModal.tsx`: Naming pattern editor

### 2. Profiles Settings (`/settings/profiles`)

**Purpose**: Manage quality profiles

**Features**:

- Create/edit quality profiles
- Quality cutoffs
- Language profiles
- Profile naming
- Default profile selection

**Profile Structure**:

- Profile name
- Cutoff (minimum acceptable quality)
- Qualities in profile (with scores)
- Language profile
- Format items

### 3. Quality Settings (`/settings/quality`)

**Purpose**: Define quality definitions

**Features**:

- Create/edit quality definitions
- Quality size limits
- Resolution preferences
- Source preferences (bluray, web-dl, etc.)
- Proper/repack handling

### 4. Custom Formats Settings (`/settings/customformats`)

**Purpose**: Create custom format specifications

**Features**:

- Create custom formats
- Format conditions (release name, audio, video, etc.)
- Format scoring
- Format testing
- Format examples

**Conditions**:

- Release name contains/doesn't contain
- Audio channels
- Audio codec
- Video codec
- Resolution
- Source
- Modifier (proper, repack, etc.)

### 5. Indexers Settings (`/settings/indexers`)

**Purpose**: Configure Usenet and Torrent indexers

**Features**:

- Add/remove indexers
- Indexer testing
- Torznab/Newznab configuration
- RSS configuration
- Search capabilities
- Download capabilities
- Rate limiting
- Torznab categories

**Indexer Types**:

- Newznab (Usenet)
- Torznab (Torrent)
- Other specialized indexers

### 6. Download Clients Settings (`/settings/downloadclients`)

**Purpose**: Configure download clients

**Client Types**:

- **Usenet**:
  - SABnzbd
  - NZBGet

- **Torrent**:
  - Transmission
  - uTorrent
  - Deluge
  - qBittorrent
  - rTorrent
  - Download Station
  - Flood
  - Hadouken

**Settings**:

- Host, port, username, password
- SSL/TLS configuration
- Category mapping
- Priority settings
- Completed download handling

### 7. Import Lists Settings (`/settings/importlists`)

**Purpose**: Configure automatic series import

**List Types**:

- Trakt lists
- Plex Watchlist
- IMDb lists
- Radarr Sync
- Custom lists

**Settings**:

- List URL/API configuration
- Quality profile
- Root folder
- Monitor options
- Import mode
- Import interval

### 8. Notifications Settings (`/settings/connect`)

**Purpose**: Configure notification connections

**Notification Types**:

- Email
- Discord
- Telegram
- Pushover
- Pushbullet
- Join
- Notifiarr
- Plex
- Emby
- Jellyfin
- Gotify
- Slack
- Webhook
- Custom scripts

**Settings**:

- Connection details
- Notification triggers
- Message templates
- OnGrab, OnDownload, OnUpgrade, OnRename

### 9. Metadata Settings (`/settings/metadata`)

**Purpose**: Configure metadata generation

**Metadata Types**:

- Kodi (NFO)
- Emby
- Xbmc
- Roksbox
- WDTV
- MediaBrowser

**Settings**:

- Metadata file location
- Series metadata
- Episode metadata
- Fanart/thumbnail handling
- Update interval

### 10. Metadata Source Settings (`/settings/metadatasource`)

**Purpose**: Configure metadata sources

**Sources**:

- TheTVDB
- TheMovieDB

**Settings**:

- Source selection
- API keys (if needed)
- Language preference
- Update interval
- Metadata timeout

### 11. Tags Settings (`/settings/tags`)

**Purpose**: Manage tags

**Features**:

- Create/delete tags
- Tag labels
- Color coding
- Usage statistics
- Tag search
- Auto-tagging specifications

### 12. General Settings (`/settings/general`)

**Purpose**: General application settings

**Settings**:

- **Host**:
  - Hostname
  - Port
  - URL Base
  - SSL/TLS
  - Authentication (None, Basic, Forms, API Key)

- **Security**:
  - API Key
  - SSL certificate validation
  - Proxy settings

- **Updates**:
  - Branch (main, develop, phantom)
  - Automatic updates
  - Update mechanism

- **Analytics**:
  - Send anonymous usage data
  - Analytics ID

### 13. UI Settings (`/settings/ui`)

**Purpose**: UI preferences

**Settings**:

- **Theme**:
  - Light/Dark theme
  - Color scheme

- **Display**:
  - Movie title sort order
  - Week start day
  - Time format (12h/24h)
  - Long date format
  - Short date format

- **Table**:
  - Enable scrollbars in tables
  - Show relative dates
  - Show monitored episodes

- **Accessibility**:
  - Enable color impaired mode

- **Calendar**:
  - First day of week
  - Week day header format

- **Site**:
  - Show collapsed state
  - Minimum availability delay

### Settings Persistence

All settings are persisted to:

- Server-side database
- LocalStorage for UI preferences
- Zustand stores for runtime settings

---

## Special UI Features

### 1. Page Jump Bar

**Purpose**: A-Z navigation for large datasets

**Features**:

- Dynamic character generation
- Shows count per character
- Click to jump to section
- Only visible when sorting alphabetically
- Supports reversed sort order

**Implementation**:

```tsx
<PageJumpBar
  items={{
    characters: { 'A': 10, 'B': 5, ... },
    order: ['A', 'B', 'C', ...]
  }}
  onItemPress={(char) => scrollToCharacter(char)}
/>
```

### 2. Status Indicators

**Queue Status**:

- Shows number of items in queue
- Color-coded by status
- Displays in sidebar

**Health Status**:

- Shows system health issues
- Warning/Error indicators
- Displayed in sidebar

**Series Status**:

- Continuing icon
- Ended icon
- Deleted icon
- Monitored/unmonitored indicator

**Episode Status**:

- Downloaded
- Missing
- Wanted
- Skipped
- Airing soon

### 3. Progress Indicators

**Series Progress**:

- Downloaded episodes count
- Total episodes count
- Season progress bars

**Episode Progress**:

- Download progress bar
- Queue progress bar

**Queue Time Remaining**:

- Estimated time for download
- Per-item time
- Total queue time

### 4. Responsive Design

**Breakpoints**:

```typescript
isExtraSmallScreen: width <= 480px
isSmallScreen: width <= 768px
isMediumScreen: width <= 992px
isLargeScreen: width <= 1200px
```

**Responsive Behaviors**:

- Sidebar: Collapsible on mobile, slide-in animation
- Tables: Horizontal scroll on mobile
- Calendar: Fewer days on mobile
- Toolbars: Collapsible menus on mobile
- Modals: Full-screen on mobile

### 5. Color Impaired Mode

**Purpose**: Improve readability for color-impaired users

**Implementation**:

- Context-based toggle
- Applies alternative color scheme
- Maintains contrast ratios
- Saved to user preferences

### 6. Theme Support

**Features**:

- Light theme
- Dark theme
- Automatic theme switching
- Theme persistence
- CSS custom properties for theming

### 7. Messages/Toasts

**Purpose**: Show temporary notifications

**Types**:

- Success (green)
- Error (red)
- Warning (yellow)
- Info (blue)

**Features**:

- Auto-hide after timeout
- Manual dismiss
- Stacking multiple messages
- Click to dismiss
- Command completion messages

**Usage**:

```typescript
import { showMessage } from "App/messagesStore";

showMessage({
  name: "RssSync",
  message: "RSS Sync Completed",
  type: SUCCESS,
  hideAfter: 4,
});
```

### 8. Virtual Scrolling

**Purpose**: Efficient rendering of large lists

**Implementation**:

- Uses `react-window` library
- Only renders visible items
- Recycles row components
- Supports dynamic row heights
- Custom scrollbar

### 9. Context Menus

**Purpose**: Right-click context menus

**Features**:

- Quick actions
- Context-sensitive options
- Customizable per item

### 10. Keyboard Navigation

**Features**:

- Tab navigation
- Arrow key navigation in lists
- Escape to close modals
- Enter to confirm
- Keyboard shortcuts for common actions

### 11. Drag and Drop Reordering

**Features**:

- Drag to reorder
- Visual drag indicators
- Drop targets
- Touch support

**Use Cases**:

- Reorder quality profiles
- Reorder custom formats
- Reorder notification connections

### 12. Search/Autocomplete

**Features**:

- Real-time search filtering
- Debounced input
- Keyboard navigation
- Highlight matches
- Multiple selection support

**Implementations**:

- Series search
- Import series search
- Episode search
- Tag input
- Path input

### 13. Copy to Clipboard

**Purpose**: Quick copy of values

**Usage**:

- API key copy
- Link copy
- Token copy

**Component**:

```tsx
<ClipboardButton value={textToCopy} kind={kinds.DEFAULT} />
```

### 14. Loading States

**Types**:

- Loading indicator (spinner)
- Loading message with spinner
- Skeleton loading (limited)
- Button loading state (spinner)

### 15. Error States

**Types**:

- Alert component for errors
- Inline error messages
- Form validation errors
- API error handling

### 16. Confirmation Modals

**Purpose**: Confirm destructive actions

**Features**:

- Custom messages
- Confirm/Cancel buttons
- Type-based styling (danger, warning)

**Component**:

```tsx
<ConfirmModal
  kind={kinds.DANGER}
  title="Delete Series"
  message="Are you sure you want to delete this series?"
  onConfirm={handleDelete}
  onCancel={handleCancel}
/>
```

### 17. Tooltips

**Purpose**: Provide additional information on hover

**Features**:

- Positioning (top, bottom, left, right)
- Delay configuration
- Rich content
- HTML support

### 18. Popovers

**Purpose**: Show additional content on demand

**Use Cases**:

- Monitoring options
- Quality profiles
- Series types
- Settings help

### 19. Infinite Scroll

**Purpose**: Load more items as user scrolls

**Implementation**:

- React Query pagination
- Scroll detection
- Loading indicator at bottom
- Manual load more option

### 20. File Browser

**Purpose**: Browse and select file system paths

**Features**:

- Directory navigation
- Bread crumbs
- Quick access to recent folders
- Folder favorites
- Search/filter folders

**Components**:

- `FileBrowser/`: File browser components
- `PathInput`: Path input with browser

### 21. Chart/Graph Components

**Purpose**: Visualize data

**Note**: Limited use in Sonarr, mostly for disk space and health

### 22. Time/Date Display

**Features**:

- Relative time (e.g., "2 hours ago")
- Absolute time
- User-configurable formats
- Timezone support
- Countdown timers (airing soon)

### 23. Quality Indicators

**Purpose**: Show quality of releases/files

**Features**:

- Quality badges (1080p, 4K, etc.)
- Source badges (Bluray, WEB-DL, etc.)
- Audio quality
- Codec indicators
- Proper/repack indicators

### 24. Language Indicators

**Purpose**: Show language of releases

**Features**:

- Language flags (optional)
- Language codes
- Multiple languages
- Unknown language handling

### 25. Series Posters

**Purpose**: Visual representation of series

**Features**:

- High-quality posters
- Fallback images
- Lazy loading
- Hover effects
- Poster selection options

---

## Additional Implementation Notes

### CSS Architecture

- **CSS Modules**: Component-scoped styling
- **PostCSS**: CSS processing with nesting, variables, mixins
- **BEM-ish Naming**: Component-based naming convention
- **Custom Properties**: CSS variables for theming

### Code Patterns

**Component Structure**:

```tsx
// Imports
// Interface definitions
// Props interface
// Component function
//   - Hooks (useState, useEffect, custom hooks)
//   - Callbacks (useCallback)
//   - Memos (useMemo)
//   - Render
// Export
```

**Custom Hooks Pattern**:

- Use prefix `use` for hooks
- Return consistent object or single value
- Handle loading/error states
- Use TypeScript for type safety

### Performance Optimizations

1. **React.memo**: Prevent unnecessary re-renders
2. **useMemo**: Memoize expensive calculations
3. **useCallback**: Memoize callbacks
4. **Virtual Scrolling**: For large lists
5. **Code Splitting**: Lazy load routes
6. **Image Optimization**: Lazy load images
7. **Debouncing**: For search input
8. **Throttling**: For scroll events

### Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management
- Color contrast
- Screen reader support

### Testing

**Note**: This specification doesn't include testing details as they weren't in the reference codebase analysis.

---

## Summary

Sonarr is a comprehensive, feature-rich application with:

- **Complex State Management**: Redux + Zustand + React Query
- **Sophisticated UI**: Multiple view modes, filtering, sorting, batch operations
- **Real-Time Features**: SignalR for live updates
- **Advanced Interactions**: Drag and drop, virtual scrolling, autocomplete
- **Extensive Settings**: 13 settings sections with detailed configuration
- **Responsive Design**: Mobile-friendly with adaptive layouts
- **Robust Architecture**: Well-organized codebase with reusable components

This specification provides a comprehensive overview of all views, features, components, patterns, and implementation details needed to clone or recreate the Sonarr UI.

---

## Next Steps for Implementation

1. **Create detailed component specifications** for each major component
2. **Define API contracts** for backend endpoints
3. **Create design system** with style guide
4. **Set up project structure** following Sonarr's patterns
5. **Implement core routing** and navigation
6. **Build shared UI components** library
7. **Implement state management** layer
8. **Create feature-specific views** iteratively
9. **Add real-time features** with SignalR
10. **Implement comprehensive settings** pages
11. **Add accessibility features**
12. **Perform performance optimization**
13. **Add testing** (unit, integration, e2e)
14. **Create deployment** pipeline
