# Prowlarr UI Cloning Specification

**Track:** prowlarr_ui_cloning_20260214
**Date:** 2025-02-14
**Status:** Draft
**Priority:** High

---

## Table of Contents

1. [Overview](#overview)
2. [Purpose and Functionality](#purpose-and-functionality)
3. [Technology Stack](#technology-stack)
4. [Architecture Overview](#architecture-overview)
5. [Navigation Structure](#navigation-structure)
6. [Main Views and Pages](#main-views-and-pages)
7. [Core Features and Functionality](#core-features-and-functionality)
8. [UI Components and Patterns](#ui-components-and-patterns)
9. [Data Management Patterns](#data-management-patterns)
10. [Settings and Configuration](#settings-and-configuration)
11. [Special Features](#special-features)
12. [State Management](#state-management)
13. [Routing and Navigation](#routing-and-navigation)
14. [Real-time Updates](#real-time-updates)
15. [Implementation Considerations](#implementation-considerations)

---

## Overview

Prowlarr is an indexer manager/proxy application that provides a centralized interface for managing torrent trackers and usenet indexers. It integrates with various PVR applications (Lidarr, Radarr, Sonarr, Readarr) to provide seamless indexer management across multiple applications.

### Key Characteristics

- **Single Page Application (SPA)** built with React
- **Server-side rendered** static pages for initial load
- **Real-time updates** via SignalR for indexer status and notifications
- **Client-side filtering and sorting** for better UX
- **RESTful API** backend integration
- **Persistent state** using redux-localstorage

---

## Purpose and Functionality

Prowlarr serves as an indexer aggregation and management platform with the following primary functions:

1. **Indexer Management**: Configure, test, and manage multiple torrent trackers and usenet indexers from a single interface
2. **Application Integration**: Sync indexers to other \*arr applications without manual configuration
3. **Search Functionality**: Perform manual searches across indexers with category and parameter filtering
4. **Release Management**: View, grab, and manage search results with direct download client integration
5. **History and Statistics**: Track indexer usage, query history, and performance metrics
6. **Configuration Management**: Comprehensive settings for applications, download clients, notifications, tags, and system configuration

---

## Technology Stack

### Core Technologies

- **React**: 17.0.2 (UI library)
- **TypeScript**: 5.7.2 (Type safety)
- **Redux**: 4.2.1 (State management)
- **React Router**: 5.2.0 (Client-side routing)
- **Connected React Router**: 6.9.3 (Redux + Router integration)
- **Redux Thunk**: 2.4.2 (Async actions)
- **Reselect**: 4.1.8 (Memoized selectors)

### UI Libraries

- **React DnD**: 14.0.4 (Drag and drop)
- **Chart.js**: 4.4.4 (Data visualization)
- **React Virtualized**: 9.22.6 (Virtual scrolling)
- **React Window**: 1.8.11 (Windowing)
- **React Popper**: 1.3.7 (Positioning)
- **FontAwesome**: 6.7.2 (Icons)

### Communication

- **SignalR**: @microsoft/signalr 8.0.7 (Real-time updates)
- **jQuery**: 3.7.1 (AJAX requests, legacy)

### Build Tools

- **Webpack**: 5.95.0 (Module bundler)
- **Babel**: 7.27.1 (JavaScript transpiler)
- **PostCSS**: 8.4.47 (CSS processing)

### CSS Architecture

- **Custom CSS Modules**: Component-scoped styles
- **CSS Mixins**: Reusable style patterns (truncation, scroller, cover)
- **PostCSS Mixins**: Dynamic CSS values
- **Variables**: Centralized design tokens (dimensions, fonts, z-indexes, animations)

---

## Architecture Overview

### Directory Structure

```
frontend/src/
├── App/                    # Application-level components and contexts
│   ├── App.tsx            # Root component with Redux Provider
│   ├── AppRoutes.tsx      # Route definitions
│   ├── State/             # TypeScript state interfaces
│   ├── SelectContext.tsx  # Selection state management
│   └── ColorImpairedContext.ts
├── Components/            # Reusable UI components
│   ├── Page/             # Page layout components
│   ├── Table/            # Data table components
│   ├── Modal/            # Modal dialogs
│   ├── Form/             # Form inputs and controls
│   ├── Menu/             # Dropdown menus
│   ├── Filter/           # Filter builders
│   ├── Chart/            # Data visualization
│   └── ...
├── Indexer/              # Indexer-related pages
│   ├── Index/            # Indexer list view
│   ├── Stats/            # Indexer statistics
│   ├── Info/             # Indexer details
│   ├── Add/              # Add indexer modal
│   ├── Edit/             # Edit indexer modal
│   └── Delete/           # Delete indexer modal
├── Search/               # Search functionality
│   ├── Table/            # Search results table
│   ├── Menus/            # Sort/filter menus
│   └── Mobile/           # Mobile views
├── History/              # Query/release history
│   ├── History.js        # History list view
│   ├── Details/          # History item details
│   └── ...
├── Settings/             # Settings pages
│   ├── Indexers/         # Indexer settings
│   ├── Applications/    # App integration settings
│   ├── DownloadClients/  # Download client settings
│   ├── Notifications/    # Notification settings
│   ├── Tags/             # Tag management
│   ├── General/          # General settings
│   ├── UI/               # UI preferences
│   └── Development/      # Development settings
├── System/               # System pages
│   ├── Status/           # System status
│   ├── Tasks/            # Scheduled/queued tasks
│   ├── Backup/           # Backup management
│   ├── Updates/          # Update management
│   ├── Events/           # Event log
│   └── Logs/             # Log files
├── Store/                # Redux store
│   ├── Actions/          # Action creators
│   ├── Selectors/        # Memoized selectors
│   └── Middleware/       # Redux middleware
├── Styles/               # Global styles
│   ├── Themes/           # Dark/light themes
│   ├── Variables/        # CSS variables
│   └── Mixins/           # CSS mixins
└── Utilities/            # Helper functions
```

### Component Architecture Patterns

#### 1. Page Components

- **Structure**: PageContent → PageToolbar → PageContentBody
- **Purpose**: Provides consistent page layout with toolbar and content area
- **Example**:

```jsx
<PageContent title="Indexers">
  <PageToolbar>
    <PageToolbarSection>{/* Primary actions */}</PageToolbarSection>
    <PageToolbarSection alignContent={align.RIGHT}>
      {/* Secondary actions (sort, filter, options) */}
    </PageToolbarSection>
  </PageToolbar>
  <PageContentBody>{/* Main content */}</PageContentBody>
</PageContent>
```

#### 2. Connector Pattern

- **Purpose**: Separate presentation from state management
- **Structure**: `[Component]Connector.js` wraps `[Component].js`
- **Example**:

```js
// IndexerIndexConnector.js
class IndexerIndexConnector extends Component {
  componentDidMount() {
    dispatch(fetchIndexers());
  }

  render() {
    return <IndexerIndex {...this.props} />;
  }
}
```

#### 3. State Management Flow

```
Component → Dispatch Action → API Request → Redux Action → Reducer → State Update → Re-render
```

---

## Navigation Structure

### Main Navigation (Sidebar)

The sidebar navigation uses a hierarchical structure with parent and child items:

```javascript
const links = [
  {
    iconName: icons.MOVIE_CONTINUING,
    title: "Indexers",
    to: "/",
    alias: "/indexers",
    children: [{ title: "Stats", to: "/indexers/stats" }],
  },
  {
    iconName: icons.SEARCH,
    title: "Search",
    to: "/search",
  },
  {
    iconName: icons.ACTIVITY,
    title: "History",
    to: "/history",
  },
  {
    iconName: icons.SETTINGS,
    title: "Settings",
    to: "/settings",
    children: [
      { title: "Indexers", to: "/settings/indexers" },
      { title: "Apps", to: "/settings/applications" },
      { title: "Download Clients", to: "/settings/downloadclients" },
      { title: "Notifications", to: "/settings/connect" },
      { title: "Tags", to: "/settings/tags" },
      { title: "General", to: "/settings/general" },
      { title: "UI", to: "/settings/ui" },
    ],
  },
  {
    iconName: icons.SYSTEM,
    title: "System",
    to: "/system/status",
    children: [
      { title: "Status", to: "/system/status" },
      { title: "Tasks", to: "/system/tasks" },
      { title: "Backup", to: "/system/backup" },
      { title: "Updates", to: "/system/updates" },
      { title: "Events", to: "/system/events" },
      { title: "Log Files", to: "/system/logs/files" },
    ],
  },
];
```

### Navigation Features

- **Collapsible sidebar** (mobile-responsive)
- **Active state highlighting** for current page
- **Parent-child relationships** with expansion indicators
- **Status indicators** (health status on System/Status)
- **Touch gesture support** for mobile sidebar open/close

---

## Main Views and Pages

### 1. Indexers View (`/`)

**Purpose**: Main dashboard for managing all configured indexers

**Key Features**:

- Sortable/filterable list of indexers
- Bulk operations (select mode, delete, edit, test)
- Add new indexer via modal
- Jump bar for alphabetized navigation
- Status indicators (enabled/disabled, redirect, sync status)
- Capabilities display (categories, privacy type, protocol)
- Sync with applications button

**Components**:

- `IndexerIndex` - Main container
- `IndexerIndexTable` - Data table with sort/filter
- `AddIndexerModal` - Modal for adding new indexers
- `EditIndexerModal` - Modal for editing indexers
- `PageJumpBar` - Alphabet navigation

**Data Displayed**:

- Indexer name and logo
- Status (enabled/disabled/redirecting)
- Privacy level (public, semi-private, private)
- Protocol (torznab, newznab, cardigann)
- VIP expiration
- Capabilities (categories supported)
- Tags
- App sync status

### 2. Indexer Stats View (`/indexers/stats`)

**Purpose**: Dashboard displaying indexer performance metrics

**Key Features**:

- Statistical cards (active indexers, total queries, total grabs, active apps)
- Multiple chart types:
  - Stacked bar chart for average response times
  - Bar chart for failure rates
  - Stacked bar chart for total queries by type
  - Bar chart for successful grabs
  - Bar charts for user agent queries/grabs
  - Doughnut charts for host queries/grabs
- Refresh functionality
- Filter by tags/categories

**Charts**:

- **Average Response Times**: Shows query vs grab response times per indexer
- **Failure Rate**: Percentage of failed queries per indexer
- **Total Indexer Queries**: Search, RSS, and Auth queries breakdown
- **Successful Grabs**: Number of successful grabs per indexer
- **User Agent Queries**: Queries by application (Sonarr, Radarr, etc.)
- **User Agent Grabs**: Grabs by application
- **Host Queries**: Queries by indexer host
- **Host Grabs**: Grabs by indexer host

### 3. Search View (`/search`)

**Purpose**: Manual search interface for querying indexers

**Key Features**:

- Search input with category and indexer selection
- Search results table with sortable columns
- Grab releases to download clients
- Override match feature for incorrect releases
- Download release as .nzb/.torrent file
- Bulk grab functionality
- Filter by protocol, size, peers, seeders, etc.
- Sort by age, title, indexer, size, etc.
- Custom filter builder

**Search Parameters**:

- Search query string
- Search type (search, tvsearch, movie, music, book)
- Category selection
- Indexer selection (all or specific)
- Limit results count
- Offset for pagination

**Result Columns**:

- Protocol (torrent/usenet)
- Age
- Title
- Indexer
- Size
- Files count
- Grabs
- Peers (seeders/leechers)
- Category
- Indexer flags (freeleech, halfleech, etc.)
- Actions (grab, download, override match)

### 4. History View (`/history`)

**Purpose**: Log of all indexer queries and releases

**Key Features**:

- Paginated history log
- Filter by event type (release grabbed, RSS, query, auth)
- Filter by success/failure
- Sort by date
- View detailed parameters for each query
- Clear history functionality
- Mark releases as failed
- Export history

**Event Types**:

- Release Grabbed (eventType: 1)
- Indexer Query (eventType: 2)
- Indexer RSS (eventType: 3)
- Indexer Auth (eventType: 4)

**Columns**:

- Event type
- Indexer
- Query/parameters
- Categories
- Date/time
- Elapsed time
- Success/failure status
- Details button for more info

### 5. Settings Index View (`/settings`)

**Purpose**: Landing page for all settings categories

**Structure**:
Simple links with descriptions to each settings section:

- Indexers
- Apps
- Download Clients
- Notifications
- Tags
- General
- UI

### 6. Indexer Settings (`/settings/indexers`)

**Purpose**: Configure indexer-related settings

**Sub-sections**:

- **Indexers**: Manage individual indexers (add, edit, delete, test)
- **Indexer Proxies**: Configure per-indexer proxies (SOCKS4/5, HTTP, Flaresolverr)
- **Indexer Categories**: Manage Newznab/Torznab categories

**Features**:

- Add new indexer from presets
- Edit indexer configuration
- Test individual indexers
- Test all indexers
- Clone indexers
- Delete indexers
- Configure indexer-specific settings (rate limits, seed requirements, etc.)
- Set up proxies for specific indexers
- Manage category mappings

### 7. Application Settings (`/settings/applications`)

**Purpose**: Configure application integrations (Sonarr, Radarr, Lidarr, Readarr)

**Features**:

- Add/edit/delete applications
- Test connection to applications
- Configure API keys and URLs
- Select which indexers to sync to each application
- Configure app-specific settings (profiles, root folders, etc.)
- Bulk edit applications
- Assign tags to applications

**Application Types**:

- Sonarr (TV series)
- Radarr (Movies)
- Lidarr (Music)
- Readarr (Books)
- Mylar3 (Comics)

### 8. Download Client Settings (`/settings/downloadclients`)

**Purpose**: Configure download clients for manual grabs

**Sub-sections**:

- **Download Clients**: Manage download clients (Transmission, uTorrent, SABnzbd, etc.)
- **Categories**: Configure download categories for different content types

**Features**:

- Add/edit/delete download clients
- Test connection to download clients
- Configure client-specific settings (host, port, username, password)
- Map indexer categories to download categories
- Set default download client
- Configure download folder paths

### 9. Notification Settings (`/settings/connect`)

**Purpose**: Configure notification providers

**Features**:

- Add/edit/delete notification connections
- Configure notification types (grab, download, health warning, etc.)
- Test notification delivery
- Configure provider-specific settings (webhooks, email, Discord, Telegram, etc.)

**Notification Types**:

- On Grab
- On Download
- On Health Warning
- On Application Update
- On Indexer Authorization Failure
- On Indexer Health Restored

### 10. Tag Settings (`/settings/tags`)

**Purpose**: Manage tags for organizing indexers and applications

**Features**:

- Create/delete tags
- Assign labels to tags
- Assign tags to indexers, applications, and download clients
- Filter by tags in various views
- View tag details (which items use the tag)
- Assign restrictions/allowances per tag

### 11. General Settings (`/settings/general`)

**Purpose**: Application-wide configuration

**Settings Categories**:

- **Host**: Instance name, URL base, bind address, port
- **Security**: API key, SSL, authentication settings
- **Proxy**: SOCKS5 proxy configuration
- **Logging**: Log level, log database retention
- **Indexing**: Indexer sync settings
- **Update**: Automatic update settings, update mechanism (built-in, apt, docker, external, script)
- **Analytics**: Send anonymous usage data

### 12. UI Settings (`/settings/ui`)

**Purpose**: User interface preferences

**Settings**:

- Theme (dark/light/auto)
- Language selection
- Timezone
- First day of week
- Short date format
- Long date format
- Time format
- Show relative dates
- Enable color impaired mode
- Calendar week column header
- Movie runtime format
- Size unit (MB/GB)
- Static URL for static assets

### 13. Development Settings (`/settings/development`)

**Purpose**: Developer/debugging options

**Features**:

- Enable/disable dev mode
- Configure console logging levels
- API key for development
- External API settings
- Test API endpoints

### 14. System Status (`/system/status`)

**Purpose**: View system health and information

**Sub-sections**:

- **Health**: System health checks with status indicators
- **About**: Version info, start time, app paths
- **More Info**: Additional system details (OS, runtime, database)
- **Donations**: Donation links and information

**Health Checks**:

- Database migration status
- API key status
- Indexer proxy status
- Application sync status
- Download client status
- Notification status

### 15. System Tasks (`/system/tasks`)

**Purpose**: View and manage scheduled and queued tasks

**Sub-sections**:

- **Scheduled Tasks**: List of all scheduled tasks with next run time
- **Queued Tasks**: List of tasks currently in queue

**Task Types**:

- Indexer sync
- Cleanup history
- Update check
- RSS sync
- Refresh indexers

**Features**:

- View task execution history
- Manually trigger tasks
- View task duration and status

### 16. System Backup (`/system/backup`)

**Purpose**: Create and restore backups

**Features**:

- List existing backups
- Create manual backup
- Restore from backup
- Delete backups
- Download backup files

### 17. System Updates (`/system/updates`)

**Purpose**: Manage application updates

**Features**:

- Check for updates
- View available updates
- View changelog (new features, bug fixes)
- Install latest update
- Configure update mechanism
- Handle major version updates (with warning)

**Update Information**:

- Version number
- Release date
- Branch (master/develop)
- Changes (new, fixed)
- Installation status

### 18. System Events (`/system/events`)

**Purpose**: View application event log

**Features**:

- Paginated event list
- Filter by level (info, warning, error, fatal)
- Sort by time
- Filter by event type
- Export events
- Clear events

### 19. System Log Files (`/system/logs/files`)

**Purpose**: View and download application log files

**Features**:

- List of log files (info.log, update.log, etc.)
- View log file contents
- Download log files
- Auto-refresh log view
- Filter log lines

---

## Core Features and Functionality

### 1. Indexer Management

#### Adding Indexers

- **Preset-based**: Choose from 500+ predefined trackers/indexers
- **Generic Support**: Add custom Newznab/Torznab indexers
- **Cardigann Support**: Custom YML definitions for JSON/XML parsing
- **Configuration Fields**:
  - Name
  - Implementation (specific indexer or generic)
  - Base URL
  - API Key
  - Categories
  - Tags
  - Proxy settings
  - Rate limiting
  - Seed requirements (for torrents)
  - VIP expiration date
  - Redirect settings

#### Testing Indexers

- **Individual Test**: Test connection and authentication for single indexer
- **Bulk Test**: Test all indexers at once
- **Status Indicators**: Show test results (success/failed with error message)

#### Syncing to Applications

- **Automatic Sync**: Push indexer configurations to connected apps
- **Selective Sync**: Choose which indexers to sync to which apps
- **Override Handling**: Handle conflicting settings between apps

### 2. Search Functionality

#### Manual Search

- **Query Input**: Free-text search with category selection
- **Parameter Search**: Advanced search with parameters (season, episode, year, etc.)
- **Category Selection**: Choose from Newznab/Torznab categories
- **Indexer Selection**: Search specific indexers or all
- **Result Limiting**: Control number of results returned
- **Pagination**: Navigate through result sets

#### Release Actions

- **Grab**: Send release to configured download client
- **Download**: Download .torrent/.nzb file directly
- **Override Match**: Mark release as match for incorrect naming
- **Bulk Operations**: Select and grab multiple releases

#### Override Match

- Select alternative download client for release
- Configure custom download parameters
- Handle release renaming

### 3. History Tracking

#### Query History

- Log all indexer queries (search, RSS, auth)
- Track query parameters
- Record response times
- Track success/failure status

#### Release History

- Log all grabbed releases
- Track which app grabbed the release
- Record download client used
- Link back to indexer that provided the release

### 4. Bulk Operations

#### Selection Mode

- Toggle select mode on any list view
- Select all / deselect all
- Select via checkboxes
- Shift-click for range selection

#### Bulk Actions

- **Delete**: Remove multiple indexers
- **Edit**: Edit multiple items at once (set common fields)
- **Test**: Test multiple indexers
- **Grab**: Grab multiple releases
- **Tag**: Apply/remove tags to multiple items

### 5. Filtering and Sorting

#### Client-Side Filtering

- Predefined filters (All, Grabbed, Failed, etc.)
- Custom filter builder with complex conditions
- Filter by tags, categories, date ranges, numeric values

#### Filter Builder

- Build complex filters with AND/OR logic
- Filter types:
  - String (contains, equals, starts with, ends with)
  - Number (equals, greater than, less than, between)
  - Exact (enum values)
  - Date (relative and absolute)
  - Boolean (true/false)
- Save custom filters
- Share filters between views

#### Client-Side Sorting

- Sort by any table column
- Primary and secondary sort keys
- Ascending/descending
- Sort predicates for complex data (e.g., peers = seeders \* 1M + leechers)

#### Server-Side Filtering/Sorting

- Pagination support
- Filter/Sort on server for large datasets
- Page size configuration
- Jump to specific page

### 6. Table Features

#### Column Management

- Show/hide columns
- Reorder columns (drag and drop)
- Column visibility persistence
- Sort indicators on sortable columns
- Column-specific cell renderers

#### Virtual Scrolling

- Windowed rendering for large datasets
- Fixed performance regardless of item count
- Scroll position restoration

#### Row Actions

- Row click for details
- Action buttons (edit, delete, clone)
- Context menus
- Hover effects

### 7. Modal System

#### Modal Types

- **Content Modal**: Standard modal with header, body, footer
- **Confirm Modal**: Confirmation dialog with cancel/confirm actions
- **Edit Modal**: Form-based editing with save/cancel
- **Add Modal**: Form-based adding with save/cancel

#### Modal Features

- Size variants (small, medium, large, extra large)
- Backdrop overlay
- ESC key to close
- Click outside to close (optional)
- Transition animations
- Modal stacking

---

## UI Components and Patterns

### 1. Page Layout Components

#### PageContent

**Purpose**: Wrapper for page content with title

**Props**:

- `title`: Page title
- `className`: Additional classes
- `children`: Page content

#### PageToolbar

**Purpose**: Action bar at top of page

**Structure**:

```jsx
<PageToolbar>
  <PageToolbarSection>{/* Left-aligned actions */}</PageToolbarSection>
  <PageToolbarSection alignContent={align.RIGHT}>
    {/* Right-aligned actions (sort, filter, options) */}
  </PageToolbarSection>
</PageToolbar>
```

**Components**:

- `PageToolbarButton`: Action button with icon and label
- `PageToolbarSeparator`: Visual separator
- `SpinnerButton`: Button with loading state

#### PageContentBody

**Purpose**: Scrollable content area

**Features**:

- Scroll position restoration
- Virtual scrolling support
- Loading states
- Empty states

#### PageJumpBar

**Purpose**: Alphabet navigation for alphabetized lists

**Features**:

- Shows characters that exist in sorted data
- Click to jump to items starting with character
- Dynamically updates based on sort order

### 2. Table Components

#### Table

**Purpose**: Main data table component

**Features**:

- Configurable columns
- Sortable headers
- Virtual scrolling
- Select mode
- Row hover effects

**Column Configuration**:

```javascript
{
  name: 'title',
  label: 'Title',
  isSortable: true,
  isVisible: true,
  isModifiable: true,
  isHidden: false
}
```

#### TableHeader

**Purpose**: Table header with sort indicators

**Features**:

- Sort click handlers
- Sort direction arrows
- Column resize (optional)

#### TableBody

**Purpose**: Table body with rows

**Features**:

- Virtual scrolling
- Row rendering
- Empty state

#### TableRow

**Purpose**: Individual table row

**Features**:

- Select checkbox
- Cell rendering
- Hover effects
- Click handlers

#### TableCell Components

**Purpose**: Specialized cell renderers

**Types**:

- `RelativeDateCell`: Displays relative time (e.g., "2 hours ago")
- `TableRowCell`: Standard text cell
- `TableSelectCell`: Checkbox cell for selection
- Custom cell renderers for specific data types

#### TablePager

**Purpose**: Pagination controls

**Features**:

- First/Previous/Next/Last buttons
- Page number display
- Page size selector
- Jump to page input

#### TableOptionsModal

**Purpose**: Modal for column visibility and ordering

**Features**:

- Checkbox list for columns
- Drag and drop reordering
- Save/Reset options

### 3. Modal Components

#### Modal

**Purpose**: Base modal component

**Props**:

- `isOpen`: Visibility state
- `size`: Size variant
- `onClose`: Close handler
- `children`: Modal content

**Structure**:

```jsx
<Modal>
  <ModalHeader>
    <ModalTitle>Title</ModalTitle>
    <ModalCloseButton />
  </ModalHeader>
  <ModalBody>Content</ModalBody>
  <ModalFooter>Buttons</ModalFooter>
</Modal>
```

#### ConfirmModal

**Purpose**: Confirmation dialog

**Props**:

- `isOpen`: Visibility
- `kind`: Alert kind (info, warning, danger)
- `title`: Title text
- `message`: Message content
- `confirmLabel`: Confirm button text
- `cancelLabel`: Cancel button text
- `onConfirm`: Confirm handler
- `onCancel`: Cancel handler

### 4. Form Components

#### Form

**Purpose**: Form container with validation

**Features**:

- Validation state
- Submit handlers
- Disable on invalid

#### FormGroup

**Purpose**: Form input wrapper

**Structure**:

```jsx
<FormGroup>
  <FormLabel>Label</FormLabel>
  <FormInputGroup>
    <input />
    <FormInputHelpText>Help text</FormInputHelpText>
  </FormInputGroup>
</FormGroup>
```

#### Input Types

- `TextInput`: Text input
- `NumberInput`: Number input
- `PasswordInput`: Password input with visibility toggle
- `TextArea`: Multi-line text
- `SelectInput`: Dropdown selection
- `EnhancedSelectInput`: Enhanced dropdown with search
- `CheckInput`: Checkbox
- `AutoCompleteInput`: Auto-complete
- `AutoSuggestInput`: Suggestions
- `TagInput`: Tag selection input
- `TextTagInput`: Free-text tag input
- `PathInput`: File/folder path input
- `OAuthInput`: OAuth authentication
- `CaptchaInput`: CAPTCHA input
- `IndexerFlagsSelectInput`: Indexer flags selection
- `NewznabCategorySelectInput`: Newznab categories
- `DownloadClientSelectInput`: Download client selection
- `AppProfileSelectInput`: App profile selection
- `DeviceInput`: Device selection

#### Form Features

- Validation messages
- Disabled states
- Required field indicators
- Help text
- Error states

### 5. Menu Components

#### Menu

**Purpose**: Dropdown menu wrapper

**Features**:

- Positioning (left/right)
- Animation
- Click outside to close

#### MenuButton

**Purpose**: Button that opens menu

**Props**:

- `iconName`: Icon to display
- `text`: Button text
- `indicator`: Show indicator dot
- `isDisabled`: Disabled state

#### FilterMenu

**Purpose**: Filter dropdown

**Features**:

- Predefined filter options
- Custom filters link
- Filter modal trigger

#### SortMenu

**Purpose**: Sort dropdown

**Features**:

- Sort key options
- Sort direction toggle
- Visual indicators for current sort

#### ViewMenu

**Purpose**: View options (table, poster, etc.)

**Features**:

- View type selection
- View size options

### 6. Filter Components

#### FilterModal

**Purpose**: Modal for building custom filters

**Features**:

- Filter builder UI
- Save custom filters
- Load existing filters
- Delete custom filters

#### FilterBuilder

**Purpose**: Complex filter construction UI

**Structure**:

```jsx
<FilterBuilder>
  <FilterBuilderRow>
    <FilterBuilderRowValue type="title" />
    <FilterBuilderRowOperator type="contains" />
    <FilterBuilderRowValue value="test" />
  </FilterBuilderRow>
  <FilterBuilderRow>
    <FilterBuilderRowConnector type="AND" />
    <FilterBuilderRowValue type="age" />
    <FilterBuilderRowOperator type="greaterThan" />
    <FilterBuilderRowValue type="number" value="7" />
  </FilterBuilderRow>
  <AddRowButton />
</FilterBuilder>
```

**Components**:

- `FilterBuilderRow`: Single filter condition
- `FilterBuilderRowValue`: Field selector
- `FilterBuilderRowOperator`: Comparison operator
- `FilterBuilderRowConnector`: AND/OR connector
- `FilterBuilderButton`: Add/remove rows

**Filter Types**:

- String: contains, equals, startsWith, endsWith, notContains
- Number: equals, greaterThan, lessThan, between
- Date: lastDays, inLast, notInLast
- Exact: equals, notEquals
- Boolean: isTrue, isFalse

**Value Types**:

- TEXT: Free text input
- NUMBER: Numeric input
- DATE: Date picker
- SELECT: Dropdown selection
- MULTI_SELECT: Multi-select
- TAG: Tag selector
- INDEXER: Indexer selector
- CATEGORY: Category selector
- PROTOCOL: Protocol (torrent/usenet)
- BOOL: Boolean toggle

### 7. Chart Components

#### BarChart

**Purpose**: Vertical bar chart

**Features**:

- X/Y axis labels
- Data labels
- Color kind (info, success, warning, danger)
- Step size for Y axis

#### StackedBarChart

**Purpose**: Stacked bar chart for multiple data series

**Features**:

- Multiple datasets
- Stacked rendering
- Legend

#### DoughnutChart

**Purpose**: Doughnut/pie chart

**Features**:

- Percentage display
- Legend
- Click to filter

#### LineChart

**Purpose**: Line chart for trends

**Features**:

- Multiple data series
- Smooth curves
- Data points

### 8. Other Components

#### Alert

**Purpose**: Status messages

**Kinds**:

- INFO: Information
- SUCCESS: Success
- WARNING: Warning
- DANGER: Error

#### Label

**Purpose**: Status badges

**Kinds**:

- DEFAULT: Default
- INFO: Information
- SUCCESS: Success
- WARNING: Warning
- DANGER: Error
- PRIMARY: Primary
- INVERSE: Inverse

**Features**:

- Outline variant
- Compact size

#### Icon

**Purpose**: Icon display

**Features**:

- Icon name (from FontAwesome)
- Size
- Color
- Kind (for themed icons)
- Title (tooltip)

#### ProgressBar

**Purpose**: Progress indicator

**Features**:

- Percentage
- Show text
- Size (small, medium, large)
- Kind (info, success, warning, danger)

#### LoadingIndicator

**Purpose**: Loading spinner

**Features**:

- Size
- Full page overlay

#### TagList

**Purpose**: Display list of tags

**Features**:

- Click to filter
- Color coded
- Compact mode

#### DescriptionList

**Purpose**: Key-value pairs

**Structure**:

```jsx
<DescriptionList>
  <DescriptionListItem>
    <DescriptionListItemTitle>Key</DescriptionListItemTitle>
    <DescriptionListItemDescription>Value</DescriptionListItemDescription>
  </DescriptionListItem>
</DescriptionList>
```

#### Tooltip

**Purpose**: Hover tooltips

**Features**:

- Position (top, right, bottom, left)
- Delay
- Custom content

#### Toast/Notifications

**Purpose**: Temporary status messages

**Features**:

- Auto-dismiss
- Manual dismiss
- Multiple toasts
- Position (top-right, etc.)

---

## Data Management Patterns

### 1. Redux Store Structure

#### State Sections

```javascript
{
  indexers: { ... },         // Indexer data and status
  indexerStats: { ... },     // Statistics data
  indexerStatus: { ... },    // Per-indexer status
  indexerHistory: { ... },   // Indexer-specific history
  releases: { ... },         // Search results
  history: { ... },          // Query/release history
  tags: { ... },             // Tags data
  applications: { ... },     // App integrations
  downloadClients: { ... },  // Download clients
  notifications: { ... },    // Notification connections
  settings: {
    indexers: { ... },
    applications: { ... },
    downloadClients: { ... },
    notifications: { ... },
    general: { ... },
    ui: { ... },
    development: { ... },
    indexerProxies: { ... },
    indexerCategories: { ... },
    appProfiles: { ... }
  },
  system: {
    status: { ... },
    tasks: { ... },
    backups: { ... },
    updates: { ... },
    events: { ... },
    logs: { ... }
  },
  app: { ... },             // App-level state
  customFilters: { ... }    // User-defined filters
}
```

#### State Properties Pattern

```javascript
{
  isFetching: false,      // Loading state
  isPopulated: false,     // Data loaded
  error: null,            // Error object
  items: [],              // Data array
  selectedFilterKey: 'all', // Current filter
  filters: [...],          // Available filters
  customFilters: [...],    // Custom filters
  sortKey: 'sortName',    // Sort field
  sortDirection: 'asc',  // Sort direction
  columns: [...],         // Column config
  pageSize: 50,           // Items per page
  totalPages: 0,          // Total pages
  totalRecords: 0,        // Total records
  pendingChanges: {},     // Unsaved changes
  isSaving: false,        // Saving state
  saveError: null,        // Save error
  isDeleting: false,      // Deleting state
  isTesting: false,       // Testing state
  selectedSchema: {}      // Selected configuration schema
}
```

### 2. Action Creators

#### Thunk Actions

```javascript
// Async action creators using redux-thunk
export const fetchIndexers = createThunk(FETCH_INDEXERS);
export const saveIndexer = createThunk(SAVE_INDEXER);
export const deleteIndexer = createThunk(DELETE_INDEXER);
export const testIndexer = createThunk(TEST_INDEXER);
export const testAllIndexers = createThunk(TEST_ALL_INDEXERS);
```

#### Standard Actions

```javascript
export const selectIndexerSchema = createAction(SELECT_INDEXER_SCHEMA);
export const setIndexerValue = createAction(SET_INDEXER_VALUE);
export const setIndexerSort = createAction(SET_INDEXER_SORT);
export const setIndexerFilter = createAction(SET_INDEXER_FILTER);
export const setIndexerTableOption = createAction(SET_INDEXER_TABLE_OPTION);
```

#### Command Actions

```javascript
export const executeCommand = (payload) => {
  return {
    type: EXECUTE_COMMAND,
    payload,
  };
};
```

### 3. Action Handlers

#### Thunk Handlers

```javascript
export const actionHandlers = handleThunks({
  [FETCH_INDEXERS]: createFetchHandler(section, "/indexer"),
  [SAVE_INDEXER]: createSaveProviderHandler(section, "/indexer"),
  [DELETE_INDEXER]: createRemoveItemHandler(section, "/indexer"),
  [TEST_INDEXER]: createTestProviderHandler(section, "/indexer"),
  [TEST_ALL_INDEXERS]: createTestAllProvidersHandler(section, "/indexer"),
});
```

#### Reducer Handlers

```javascript
export const reducers = createHandleActions(
  {
    [SET_INDEXER_VALUE]: createSetSettingValueReducer(section),
    [SET_INDEXER_FIELD_VALUE]: createSetProviderFieldValueReducer(section),
    [SET_INDEXER_SORT]: createSetClientSideCollectionSortReducer(section),
    [SET_INDEXER_FILTER]: createSetClientSideCollectionFilterReducer(section),
    [SET_INDEXER_TABLE_OPTION]: createSetTableOptionReducer(section),
  },
  defaultState,
  section,
);
```

### 4. Selectors

#### Memoized Selectors

```javascript
// Using reselect for memoization
export const createIndexerClientSideCollectionItemsSelector = () => {
  return createSelector(
    (state) => state.indexers,
    createDimensionsSelector(),
    (indexers, dimensions) => {
      // Filter, sort, and paginate
      return {
        items: filteredAndSortedItems,
        totalItems: indexers.items.length,
        // ...other computed values
      };
    },
  );
};
```

#### Selector Patterns

- **createSortedSectionSelector**: Sort items by property
- **createSettingsSelector**: Get settings with defaults
- **createProviderSettingsSelector**: Get provider-specific settings
- **createDimensionsSelector**: Get viewport dimensions
- **createSystemStatusSelector**: Get system status
- **createCommandExecutingSelector**: Check if command is running
- **createCustomFiltersSelector**: Get custom filters for section

### 5. API Communication

#### Ajax Request Pattern

```javascript
import createAjaxRequest from "Utilities/createAjaxRequest";

const promise = createAjaxRequest({
  url: "/indexer",
  method: "GET",
  contentType: "application/json",
}).request;

promise.done((data) => {
  dispatch(setItems({ items: data }));
});

promise.fail((xhr) => {
  dispatch(setError({ error: xhr }));
});
```

#### Request Helpers

- `createFetchHandler`: Standard GET request
- `createSaveProviderHandler`: Save provider configuration
- `createRemoveItemHandler`: Delete item
- `createTestProviderHandler`: Test provider
- `createBulkEditItemHandler`: Bulk edit
- `createBulkRemoveItemHandler`: Bulk delete

### 6. Client-Side Collection Pattern

#### Filtering

```javascript
const filterPredicates = {
  added: function (item, filterValue, type) {
    return dateFilterPredicate(item.added, filterValue, type);
  },
  categories: function (item, filterValue, type) {
    const predicate = filterTypePredicates[type];
    const { categories = [] } = item.capabilities || {};
    const categoryList = categories.reduce((acc, cat) => {
      acc.push(cat.id);
      if (cat.subCategories) {
        cat.subCategories.forEach((sub) => acc.push(sub.id));
      }
      return acc;
    }, []);
    return predicate(categoryList, filterValue);
  },
};
```

#### Sorting

```javascript
const sortPredicates = {
  status: function ({ enable, redirect }) {
    let result = 0;
    if (redirect) result++;
    if (enable) result += 2;
    return result;
  },
  vipExpiration: function ({ fields = [] }) {
    return fields.find((f) => f.name === "vipExpiration")?.value ?? "";
  },
};
```

#### Pagination

```javascript
const startIndex = (currentPage - 1) * pageSize;
const endIndex = startIndex + pageSize;
const paginatedItems = filteredAndSortedItems.slice(startIndex, endIndex);
```

### 7. Server-Side Collection Pattern

#### Query Parameters

```javascript
{
  page: 1,
  pageSize: 20,
  sortKey: 'date',
  sortDirection: 'desc',
  filter: { key: 'all', filters: [] }
}
```

#### Response Structure

```javascript
{
  page: 1,
  pageSize: 20,
  sortKey: 'date',
  sortDirection: 'desc',
  totalRecords: 1234,
  records: [...],
  items: [...]
}
```

---

## Settings and Configuration

### 1. Settings Persistence

#### LocalStorage Persistence

```javascript
export const persistState = [
  "indexers.sortKey",
  "indexers.sortDirection",
  "indexers.customFilters",
  "indexers.selectedFilterKey",
  "indexers.columns",
  "history.pageSize",
  "history.sortKey",
  "history.sortDirection",
  "history.selectedFilterKey",
  "history.columns",
];
```

#### Redux LocalStorage Middleware

- Persist specific state sections to localStorage
- Restore on app load
- Sync across tabs

### 2. Settings Management

#### Settings Toolbar

**Purpose**: Common toolbar for all settings pages

**Features**:

- Save button (with pending changes indicator)
- Save and apply buttons
- Cancel changes button
- Breadcrumb navigation

#### Pending Changes Pattern

```javascript
const pendingChanges = {
  name: "New Name",
  enable: true,
};

// Save handler
const onSave = () => {
  dispatch(saveIndexer({ pendingChanges }));
};

// Cancel handler
const onCancel = () => {
  dispatch(cancelSaveIndexer());
};
```

### 3. Configuration Schema

#### Schema Fetching

```javascript
// Fetch available indexer schemas
dispatch(fetchIndexerSchema());

// Select specific schema
dispatch(
  selectIndexerSchema({
    implementation: "Torznab",
    name: "IndexerName",
  }),
);
```

#### Schema Structure

```javascript
{
  name: 'Indexer Name',
  implementation: 'Torznab',
  implementationName: 'Generic Torznab',
  configContract: 'TorznabSettings',
  enable: true,
  fields: [
    {
      name: 'baseUrl',
      label: 'Base URL',
      helpText: 'Base URL of indexer',
      value: '',
      type: 'textbox',
      isRequired: true
    },
    {
      name: 'apiKey',
      label: 'API Key',
      helpText: 'API Key for authentication',
      value: '',
      type: 'textbox',
      privacy: 'apiKey'
    },
    // ... more fields
  ],
  info: {
    // Metadata
  }
}
```

### 4. Provider Pattern

#### Base Provider Interface

```javascript
interface Provider {
  id: number;
  name: string;
  implementation: string;
  implementationName: string;
  configContract: string;
  enable: boolean;
  fields: ProviderField[];
  tags: number[];
}
```

#### Provider Actions

- **Fetch**: Get all providers
- **Fetch Schema**: Get provider configuration schema
- **Select Schema**: Select provider type
- **Set Field Value**: Update configuration field
- **Save**: Save provider configuration
- **Delete**: Remove provider
- **Test**: Test provider connection
- **Clone**: Copy provider configuration

---

## Special Features

### 1. Tag System

#### Tag Structure

```javascript
{
  id: 1,
  label: '4K',
  delay: 0,
  order: 0,
  restrictions: []
}
```

#### Tag Features

- Apply to indexers, applications, download clients
- Filter by tags in all list views
- Tag restrictions (e.g., only sync specific tags to specific apps)
- Color coding in UI
- Drag and drop ordering
- Import/export tags

#### Tag Usage

```javascript
// Filter items by tags
const filteredItems = items.filter((item) => {
  return item.tags.some((tag) => selectedTags.includes(tag.id));
});

// Apply tags to items
dispatch(
  setIndexerValue({
    name: "tags",
    value: [1, 2, 3],
  }),
);
```

### 2. Bulk Operations

#### Select Context

```javascript
// SelectProvider wraps lists
<SelectProvider items={items}>{/* Items can be selected */}</SelectProvider>;

// useSelect hook in components
const [selectedState, selectDispatch] = useSelect();
```

#### Select Actions

```javascript
{
  type: 'selectAll' | 'unselectAll' | 'toggleSelected' | 'reset' | 'updateItems' | 'removeItem',
  id?: number,
  isSelected?: boolean,
  shiftKey?: boolean,
  items?: ModelBase[]
}
```

#### Bulk Edit Pattern

```javascript
// Select items
dispatch({ type: "selectAll" });

// Open bulk edit modal
<BulkEditModal
  items={selectedItems}
  onApply={(changes) => dispatch(bulkEditIndexers(changes))}
/>;
```

### 3. Drag and Drop

#### Table Column Reordering

```javascript
<TableOptionsColumnDragSource
  name={column.name}
  onDragEnd={onDragEnd}
>
  {/* Column name for dragging */}
</TableOptionsColumnDragSource>

<DragPreviewLayer />
```

#### Drag and Drop Libraries

- `react-dnd`: Core DnD library
- `react-dnd-html5-backend`: HTML5 backend
- `react-dnd-touch-backend`: Touch support
- `react-dnd-multi-backend`: Multiple backends

### 4. Real-time Updates

#### SignalR Connection

```javascript
<SignalRConnector /> -
  // SignalR events
  indexerAdded -
  indexerUpdated -
  indexerDeleted -
  indexerHealthChanged -
  applicationUpdateAvailable -
  commandStarted -
  commandCompleted;
```

#### SignalR Features

- Automatic reconnection
- Connection status indicator
- Real-time indexer status
- Command progress updates

### 5. Keyboard Shortcuts

#### Shortcut Registry

```javascript
const shortcuts = {
  OPEN_KEYBOARD_SHORTCUTS_MODAL: {
    key: "?",
    action: openModal,
  },
  SAVE_SETTINGS: {
    key: "s",
    modifiers: ["ctrl", "meta"],
    action: saveSettings,
  },
  // ... more shortcuts
};
```

#### Shortcut Component

```javascript
class KeyboardShortcuts extends Component {
  componentDidMount() {
    this.props.bindShortcut(
      shortcuts.OPEN_KEYBOARD_SHORTCUTS_MODAL.key,
      this.onOpenModal,
    );
  }
  // ...
}
```

### 6. File Browser

#### File Browser Modal

```javascript
<FileBrowserModal
  isOpen={isModalOpen}
  value={currentPath}
  onChange={onPathChange}
  type="folder"
  name="Select Folder"
/>
```

#### Features

- Navigate directories
- Filter by extension (for files)
- Show hidden files toggle
- Path input

### 7. CAPTCHA Handling

#### CAPTCHA Components

- `CaptchaInput`: Standard CAPTCHA input
- `CardigannCaptchaInput`: Custom CAPTCHA for Cardigann indexers
- Auto-refresh CAPTCHA images
- CAPTCHA challenge handling

### 8. OAuth Authentication

#### OAuth Components

- `OAuthInput`: OAuth configuration
- `OAuthConnector`: OAuth connection handler
- Provider-specific OAuth flows

### 9. Health Checks

#### Health Status Indicators

```javascript
<HealthStatus>
  <HealthItem type="ok" message="All systems operational" />
  <HealthItem
    type="warning"
    message="Indexer: TestIndexer - High failure rate"
  />
  <HealthItem type="error" message="Database migration pending" />
</HealthStatus>
```

#### Health Types

- OK: Everything working
- WARNING: Non-critical issues
- ERROR: Critical issues requiring attention

### 10. Internationalization (i18n)

#### Translation Function

```javascript
import translate from "Utilities/String/translate";

// Simple translation
translate("Indexers");

// With parameters
translate("DefaultNameCopiedProfile", { name: item.name });
```

#### Translation Files

- Located in `Frontend/src/Localization`
- JSON format
- Multiple languages supported
- Incomplete translations shown in English

### 11. Theme System

#### Theme Architecture

- CSS variables for colors
- Dark/light theme variants
- Auto theme detection (prefers-color-scheme)
- Theme persistence

#### Color Impaired Mode

```javascript
<ColorImpairedContext.Provider value={enableColorImpairedMode}>
  {/* App content */}
</ColorImpairedContext.Provider>
```

- Adjusts colors for better accessibility
- Toggle in UI settings
- Affects charts, status indicators, etc.

### 12. Responsive Design

#### Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

#### Mobile Features

- Collapsible sidebar
- Touch gestures
- Mobile-specific components (e.g., SearchIndexOverview)
- Responsive tables (column hiding)
- Full-screen modals

### 13. Scroll Position Restoration

#### Scroll Position Pattern

```javascript
import withScrollPosition from "Components/withScrollPosition";

const Component = withScrollPosition((props) => {
  // props.initialScrollTop contains restored position
  return <div>{/* content */}</div>;
}, "uniquePageKey");
```

#### Scroll Storage

```javascript
const scrollPositions = {
  indexerIndex: 1250,
  history: 450,
  // ... other pages
};
```

---

## State Management

### 1. Redux Store Setup

#### Store Configuration

```javascript
import { createStore, applyMiddleware, compose } from "redux";
import createPersistState from "redux-localstorage";
import createSentryMiddleware from "Store/Middleware/createSentryMiddleware";
import middlewares from "Store/Middleware/middlewares";
import createReducers from "Store/Actions/createReducers";

const store = createStore(
  createReducers(),
  undefined,
  compose(
    applyMiddleware(...middlewares),
    createPersistState("prowlarr", persistState),
    createSentryMiddleware(),
  ),
);
```

### 2. Reducer Pattern

#### Section-based Reducers

```javascript
export const reducers = createHandleActions(
  {
    [ACTION_TYPE]: (state, { payload }) => {
      // Handle action
      return newState;
    },
  },
  defaultState,
  section,
);
```

#### Reducer Helpers

- `createSetSettingValueReducer`: Set simple setting
- `createSetProviderFieldValueReducer`: Set provider field
- `createSetClientSideCollectionSortReducer`: Set sort
- `createSetClientSideCollectionFilterReducer`: Set filter
- `createSetTableOptionReducer`: Set table option
- `createClearReducer`: Clear state

### 3. Middleware

#### Thunk Middleware

```javascript
import reduxThunk from "redux-thunk";

// Async actions
const fetchIndexers = () => {
  return (dispatch, getState) => {
    // Async logic
    return fetch("/api/indexers")
      .then((response) => response.json())
      .then((data) => dispatch(setIndexers(data)));
  };
};
```

#### Batch Actions Middleware

```javascript
import { batchActions } from "redux-batched-actions";

// Dispatch multiple actions in single update
dispatch(
  batchActions([
    updateItem({ id: 1, isGrabbing: true }),
    set({ isGrabbing: false }),
  ]),
);
```

#### Sentry Middleware

- Error tracking
- Performance monitoring
- Crash reporting

### 4. State Persistence

#### Persisted State Sections

```javascript
const persistState = [
  // Indexer state
  "indexers.sortKey",
  "indexers.sortDirection",
  "indexers.customFilters",
  "indexers.selectedFilterKey",
  "indexers.columns",

  // History state
  "history.pageSize",
  "history.sortKey",
  "history.sortDirection",
  "history.selectedFilterKey",
  "history.columns",

  // Settings
  "settings.ui.item",
  "settings.general.item",
];
```

---

## Routing and Navigation

### 1. Route Definitions

#### React Router Setup

```javascript
import { Route, Redirect, Switch } from "react-router-dom";
import { ConnectedRouter } from "connected-react-router";

<ConnectedRouter history={history}>
  <Switch>
    <Route exact path="/" component={IndexerIndex} />
    <Route path="/indexers/stats" component={IndexerStats} />
    <Route path="/search" component={SearchIndexConnector} />
    <Route path="/history" component={HistoryConnector} />
    {/* ... more routes */}
  </Switch>
</ConnectedRouter>;
```

### 2. URL Base Support

#### URL Base Handling

```javascript
const urlBase = window.Prowlarr.urlBase;
const pathname = urlBase
  ? location.pathname.substr(urlBase.length) || "/"
  : location.pathname;
```

### 3. Navigation Patterns

#### Programmatic Navigation

```javascript
import { push } from "connected-react-router";

// Navigate to path
dispatch(push("/settings/indexers"));

// Navigate with query params
dispatch(push("/search?q=test&category= Movies"));
```

#### Link Component

```javascript
import Link from "Components/Link/Link";

<Link to="/settings/indexers">Indexer Settings</Link>;
```

### 4. Route-based Data Loading

#### Page Populator Pattern

```javascript
import {
  registerPagePopulator,
  unregisterPagePopulator,
} from "Utilities/pagePopulator";

class PageConnector extends Component {
  componentDidMount() {
    registerPagePopulator(this.repopulate);
    this.props.fetchData();
  }

  componentWillUnmount() {
    unregisterPagePopulator(this.repopulate);
    this.props.clearData();
  }

  repopulate = () => {
    this.props.fetchData();
  };
}
```

---

## Real-time Updates

### 1. SignalR Integration

#### SignalR Connection

```javascript
import { HubConnectionBuilder } from "@microsoft/signalr";

const connection = new HubConnectionBuilder()
  .withUrl("/signalr")
  .withAutomaticReconnect()
  .build();

connection.start();
```

#### SignalR Events

```javascript
connection.on("indexerAdded", (indexer) => {
  dispatch(addIndexer(indexer));
});

connection.on("indexerUpdated", (indexer) => {
  dispatch(updateIndexer(indexer));
});

connection.on("indexerDeleted", (id) => {
  dispatch(removeIndexer(id));
});

connection.on("healthChanged", (health) => {
  dispatch(updateHealth(health));
});
```

### 2. Connection Status

#### Connection State

```javascript
{
  isDisconnected: false,
  reconnecting: false,
  lastError: null
}
```

#### Connection Lost Modal

```javascript
<ConnectionLostModal isOpen={isDisconnected} onModalClose={onModalClose} />
```

---

## Implementation Considerations

### 1. Performance Optimization

#### Virtual Scrolling

- Use `react-window` or `react-virtualized` for large lists
- Only render visible items
- Maintain scroll position

#### Memoization

- Use `reselect` for computed selectors
- `React.memo` for component memoization
- `useMemo` and `useCallback` for expensive computations

#### Code Splitting

- Route-based code splitting with `react-loadable`
- Lazy loading of components
- Webpack dynamic imports

### 2. Error Handling

#### Error Boundary

```javascript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to Sentry
    // Show error UI
  }
}
```

#### Global Error Handler

- Sentry integration for error tracking
- User-friendly error messages
- Graceful degradation

### 3. Accessibility

#### ARIA Attributes

- Proper ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader compatibility

#### Focus Management

- Focus trap in modals
- Focus restoration after modal close
- Visible focus indicators

#### Color Contrast

- WCAG AA compliance for text
- Color impaired mode option
- High contrast mode support

### 4. Security

#### XSS Prevention

- Escape user input
- React's automatic escaping
- Careful use of `dangerouslySetInnerHTML`

#### CSRF Protection

- CSRF tokens on forms
- SameSite cookie attributes

#### Content Security Policy

- CSP headers
- Restrict inline scripts/styles

### 5. Testing Considerations

#### Unit Tests

- Component testing with Jest + React Testing Library
- Selector testing
- Reducer testing
- Action creator testing

#### Integration Tests

- Redux flow testing
- API integration testing
- Routing testing

#### End-to-End Tests

- User flow testing
- Cross-browser testing
- Mobile testing

---

## Summary

Prowlarr provides a comprehensive indexer management platform with a rich, feature-rich frontend built on React and Redux. Key architectural decisions include:

1. **Component-based architecture** with reusable UI components
2. **Redux for centralized state management** with predictable state updates
3. **Client-side filtering and sorting** for responsive UX
4. **SignalR for real-time updates** of indexer status
5. **Modal-based editing** for configuration changes
6. **Bulk operations** for efficient management of multiple items
7. **Tag system** for flexible organization
8. **Custom filter builder** for advanced filtering needs
9. **Responsive design** with mobile support
10. **Theme support** with accessibility features

The UI patterns and architecture described in this specification provide a solid foundation for building a similar indexer management application.

---

## Next Steps

Based on this specification, the following implementation steps are recommended:

1. **Set up project structure** with Next.js, TypeScript, and Tailwind CSS
2. **Create core UI components** (PageLayout, Table, Modal, Form inputs)
3. **Implement navigation** with Next.js App Router
4. **Build Indexers view** with list, add, edit, delete functionality
5. **Implement Search view** with query, results, and grab functionality
6. **Create History view** with filtering and pagination
7. **Build Settings pages** for all configuration areas
8. **Implement System pages** for status, tasks, updates
9. **Add real-time updates** via WebSockets/SignalR equivalent
10. **Implement bulk operations** and selection mode
11. **Add filtering and sorting** capabilities
12. **Implement tag system**
13. **Add charts and statistics** visualization
14. **Test responsive design** and mobile experience
15. **Accessibility audit** and improvements

---

**Document Version:** 1.0
**Last Updated:** 2025-02-14
