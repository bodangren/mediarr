# Radarr UI Cloning Specification

## Executive Summary

Radarr is a movie collection manager for Usenet and BitTorrent users that automates the process of downloading, organizing, and tracking movie files. This specification provides a comprehensive analysis of Radarr's frontend architecture, UI patterns, and all major views/features to serve as a blueprint for cloning the application.

**Tech Stack:**

- React 18.3.1
- Redux (client state management)
- TanStack React Query (server state management)
- React Router (navigation)
- SignalR (real-time updates)
- TypeScript
- Webpack

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Navigation Structure](#navigation-structure)
3. [Core Views & Pages](#core-views--pages)
4. [Settings System](#settings-system)
5. [System & Administration](#system--administration)
6. [UI Components & Patterns](#ui-components--patterns)
7. [Data Management](#data-management)
8. [Special Features](#special-features)
9. [State Management](#state-management)
10. [Real-time Features](#real-time-features)

---

## 1. Architecture Overview

### 1.1 Application Structure

Radarr follows a modular React architecture with clear separation of concerns:

```
src/
├── App/                    # Core application components
│   ├── State/             # Redux state definitions
│   ├── App.tsx            # Root component
│   └── AppRoutes.tsx      # Route definitions
├── Movie/                 # Movie-related features
├── Activity/              # Download/activity monitoring
├── Calendar/              # Calendar view
├── Settings/              # Configuration pages
├── System/                # System administration
├── Wanted/                # Missing/cutoff unmet movies
├── Collection/            # Movie collections
├── AddMovie/              # Add movies features
├── DiscoverMovie/        # Movie discovery
├── Components/            # Reusable UI components
├── Store/                 # Redux store
│   ├── Actions/          # Redux action creators
│   └── Selectors/        # Redux selectors
└── Utilities/            # Helper functions
```

### 1.2 Key Architectural Patterns

#### Redux + React Query Hybrid Pattern

- **Redux**: Manages client-side state, filters, selections, and UI state
- **React Query**: Handles server state caching, refetching, and synchronization
- This separation ensures optimal performance and data consistency

#### Page-Based Architecture

Each major view is a self-contained page with:

- Toolbar with actions
- Content body with main content
- Optional modals for actions
- Consistent pagination pattern

#### Component Hierarchy

```
Page
├── PageToolbar
│   ├── PageToolbarSection (left)
│   └── PageToolbarSection (right)
└── PageContentBody
    └── [Content Components]
```

---

## 2. Navigation Structure

### 2.1 Sidebar Navigation

The sidebar (`PageSidebar.tsx`) provides hierarchical navigation with the following structure:

```
Movies (Parent)
├── Add New (/add/new)
├── Import Library (/add/import)
├── Collections (/collections)
└── Discover (/add/discover)

Calendar (/calendar)

Activity (Parent)
├── Queue (/activity/queue) [with QueueStatus]
├── History (/activity/history)
└── Blocklist (/activity/blocklist)

Wanted (Parent)
├── Missing (/wanted/missing)
└── Cutoff Unmet (/wanted/cutoffunmet)

Settings (Parent)
├── Media Management (/settings/mediamanagement)
├── Profiles (/settings/profiles)
├── Quality (/settings/quality)
├── Custom Formats (/settings/customformats)
├── Indexers (/settings/indexers)
├── Download Clients (/settings/downloadclients)
├── Import Lists (/settings/importlists)
├── Connect (/settings/connect)
├── Metadata (/settings/metadata)
├── Tags (/settings/tags)
├── General (/settings/general)
└── UI (/settings/ui)

System (Parent)
├── Status (/system/status) [with HealthStatus]
├── Tasks (/system/tasks)
├── Backup (/system/backup)
├── Updates (/system/updates)
├── Events (/system/events)
└── Log Files (/system/logs/files)
```

### 2.2 Navigation Features

- **Active State**: Highlights current route and parent section
- **Status Indicators**: Queue status and health status shown inline
- **Responsive**: Mobile sidebar with swipe gestures
- **Child Links**: Expandable sections with child routes

---

## 3. Core Views & Pages

### 3.1 Movie Index (`/`)

**Purpose**: Main view displaying all movies in the library with filtering, sorting, and multiple view modes.

**Features**:

- **Three View Modes**:
  - **Posters View**: Grid of movie posters with hover actions
  - **Overview View**: Compact cards with key information
  - **Table View**: Detailed table with sortable columns

- **Filtering**:
  - Pre-defined filters (All, Monitored, Unmonitored, Missing, etc.)
  - Custom filters with filter builder
  - Filter modal for complex queries

- **Sorting**:
  - Multiple sort keys (Title, Sort Title, Added, Status, etc.)
  - Ascending/Descending direction

- **Actions Toolbar**:
  - Refresh Movies
  - RSS Sync
  - Search
  - Manual Import
  - Select Mode (for bulk operations)
  - View switcher
  - Sort menu
  - Filter menu

- **Selection Mode**:
  - Select all/deselect all
  - Select multiple items
  - Bulk actions:
    - Delete
    - Edit
    - Organize
    - Search

- **Jump Bar**: A-Z navigation when sorting by title

**Implementation Details**:

- Redux state: `movies`, `movieIndex`
- Client-side collection with pagination
- Virtual scrolling for performance
- Uses `createMovieClientSideCollectionItemsSelector`

**Key Files**:

- `Movie/Index/MovieIndex.tsx`
- `Movie/Index/Posters/MovieIndexPosters.tsx`
- `Movie/Index/Overview/MovieIndexOverviews.tsx`
- `Movie/Index/Table/MovieIndexTable.tsx`

---

### 3.2 Movie Details (`/movie/:titleSlug`)

**Purpose**: Detailed view of a single movie with all associated information and actions.

**Layout**:

```
┌─────────────────────────────────────────────────┐
│ [Backdrop Image]                                │
│ ┌────────┐  Title, Year                         │
│ │ Poster │  Monitored Toggle                    │
│ │        │  Certification, Runtime             │
│ │        │  Ratings (TMDB, IMDB, RT, Trakt)    │
│ │        │  Status, Quality Profile            │
│ │        │  Size on Disk                        │
│ │        │  Collection                          │
│ │        │  Genres, Studio                      │
│ │        │  Overview                            │
│ └────────┘  [← Prev] [Next →]                  │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ Files Section                                   │
│ ├─ Movie Files (editable table)                 │
│ └─ Extra Files                                  │
├─────────────────────────────────────────────────┤
│ Cast Section (poster grid)                      │
├─────────────────────────────────────────────────┤
│ Crew Section (poster grid)                      │
├─────────────────────────────────────────────────┤
│ Titles Section (table)                          │
└─────────────────────────────────────────────────┘
```

**Features**:

- **Header**:
  - Poster image
  - Monitored toggle (save state)
  - Title with marquee for long titles
  - Previous/Next navigation (swipe/keyboard shortcuts)
  - Certification, year, runtime
  - External links (TMDB, IMDB, Trailer)
  - Tags tooltip
  - Ratings display (multiple sources)
  - Path, Status, Quality Profile, Size
  - Collection membership
  - Overview

- **Toolbar Actions**:
  - Refresh and Scan
  - Search Movie
  - Interactive Search
  - Preview Rename
  - Manage Files
  - History
  - Edit Movie
  - Delete Movie

- **Files Section**:
  - Movie file editor table (editable quality, language)
  - Extra files table (view-only)

- **Cast Section**:
  - Poster grid of actors
  - Shows character name and actor name
  - Click to view details

- **Crew Section**:
  - Poster grid of crew members
  - Shows role and person name

- **Titles Section**:
  - Table of alternative titles
  - Source and title type

- **Modals**:
  - Organize Preview Modal
  - Edit Movie Modal
  - Delete Movie Modal
  - Movie History Modal
  - Interactive Import Modal (for file management)
  - Interactive Search Modal

- **Touch Gestures**:
  - Swipe left/right to navigate between movies
  - Keyboard arrow keys for navigation

**Implementation Details**:

- Loads movie files, extra files, credits, and queue details
- Registers page populator for real-time updates
- Uses Redux selectors for movie data
- Commands for refresh, search, rename

**Key Files**:

- `Movie/Details/MovieDetailsPage.tsx`
- `Movie/Details/MovieDetails.tsx`

---

### 3.3 Calendar (`/calendar`)

**Purpose**: Calendar view showing upcoming movie releases and availability.

**Features**:

- **Two View Modes**:
  - **Month/Week View**: Traditional calendar grid
  - **Agenda View**: List of upcoming releases

- **Day Views**:
  - Each day shows movie posters
  - Status indicators (downloaded, monitored, missing)
  - Release types (Cinema, Digital, Physical)

- **Toolbar**:
  - iCal Link (generate calendar feed)
  - RSS Sync
  - Search for Missing (bulk search)
  - Options (view settings)
  - Filters (monitored status, release types)

- **Calendar Options Modal**:
  - Toggle day view
  - Toggle week view
  - Set number of days to display (3-7)
  - Show monitored/unmonitored

- **Legend**:
  - Color-coded status indicators
  - Explanation of status types

- **Dynamic Days**:
  - Responsive based on screen width
  - Minimum 3 days, maximum 7 days
  - Auto-adjusts based on available space

**Implementation Details**:

- `Calendar` component renders days/agenda
- `CalendarHeader` for navigation (prev/next/today)
- `DaysOfWeek` for day headers
- `CalendarDays` for day cells
- Updates every hour automatically
- Responsive day count calculation

**Key Files**:

- `Calendar/CalendarPage.tsx`
- `Calendar/Calendar.tsx`
- `Calendar/Day/CalendarDays.tsx`
- `Calendar/Agenda/Agenda.tsx`

---

### 3.4 Activity Views

#### 3.4.1 Queue (`/activity/queue`)

**Purpose**: Real-time view of current and pending downloads.

**Features**:

- **Live Queue Display**:
  - Table view of queued items
  - Status indicators (queued, downloading, importing, etc.)
  - Time remaining
  - Download speed
  - Movie title and poster
  - Quality and language
  - Protocol (torrent/usenet)

- **Toolbar Actions**:
  - Refresh (refresh monitored downloads)
  - Grab Selected (for pending items)
  - Remove Selected (with options)

- **Item Actions**:
  - Grab pending item
  - Remove item (with confirmation)
  - View details modal

- **Remove Modal Options**:
  - Change category (if supported)
  - Block release
  - Add to import exclusions
  - Ignore movie

- **Selection**:
  - Select all
  - Individual selection with shift-click

- **Filtering**:
  - All
  - Downloading
  - Completed
  - Paused
  - Failed
  - Custom filters

- **Sorting**:
  - Time
  - Movie
  - Quality
  - Status

**Implementation Details**:

- Polling for queue updates
- Redux state: `queue.paged`
- Table with selectable rows
- Pager component for pagination

**Key Files**:

- `Activity/Queue/Queue.tsx`
- `Activity/Queue/QueueRow.tsx`
- `Activity/Queue/Status/QueueStatus.tsx` (sidebar indicator)

---

#### 3.4.2 History (`/activity/history`)

**Purpose**: Log of all past download/import activities.

**Features**:

- **History Table**:
  - Date/Time
  - Movie title and poster
  - Event type (grabbed, imported, failed, etc.)
  - Quality
  - Indexer
  - Release title
  - Actions (view details, remove)

- **Event Types**:
  - Grabbed
  - Downloaded
  - Imported
  - Deleted
  - Renamed
  - Failed

- **Toolbar**:
  - Refresh
  - Options (column visibility)
  - Filters (event type, quality, movie)

- **Filtering**:
  - All
  - Grabbed
  - Imported
  - Failed
  - Custom filters

- **History Details Modal**:
  - Full event information
  - Download client info
  - File path
  - Release info

- **Pagination**:
  - Standard table pager
  - Configurable page size

**Implementation Details**:

- Redux state: `history`
- Client-side filtering
- Table view with pager

**Key Files**:

- `Activity/History/History.tsx`
- `Activity/History/HistoryRow.tsx`

---

#### 3.4.3 Blocklist (`/activity/blocklist`)

**Purpose**: Manage blocked releases and import exclusions.

**Features**:

- **Blocklist Table**:
  - Date added
  - Movie title
  - Source (indexer)
  - Release title
  - Reason
  - Actions (remove)

- **Blocklist Types**:
  - Indexer releases (bad quality, bad upload)
  - Import exclusions (manual exclusions)

- **Toolbar**:
  - Remove All
  - Remove Selected
  - Options (column visibility)
  - Filters (movie, source)

- **Blocklist Details Modal**:
  - Full release information
  - Block reason
  - Option to unblock

- **Actions**:
  - Remove individual items
  - Bulk remove
  - Clear all

**Implementation Details**:

- Redux state: `blocklist`
- Similar structure to History

**Key Files**:

- `Activity/Blocklist/Blocklist.tsx`
- `Activity/Blocklist/BlocklistRow.tsx`

---

### 3.5 Wanted Views

#### 3.5.1 Missing (`/wanted/missing`)

**Purpose**: View and search for movies that are monitored but not yet downloaded.

**Features**:

- **Missing Movies Table**:
  - Movie poster
  - Title and year
  - Status (missing, cut-off unmet)
  - Cinema release date
  - Physical/digital release dates
  - Quality profile
  - Actions (search, edit, delete)

- **Toolbar Actions**:
  - Search All / Search Selected
  - Monitor/Unmonitor Selected
  - Manual Import
  - Options
  - Filters (monitored status)

- **Search Features**:
  - Bulk search for missing movies
  - Individual movie search
  - Confirmation dialog for bulk search

- **Filtering**:
  - All
  - Monitored
  - Unmonitored
  - Custom filters

- **Selection**:
  - Select all
  - Individual selection
  - Toggle monitored status

- **Monitor Toggle**:
  - Quick monitor/unmonitor from table

- **Manual Import**:
  - Open interactive import modal

**Implementation Details**:

- Redux state: `wanted.missing`
- Integrates with queue to show search status
- Command-based search system

**Key Files**:

- `Wanted/Missing/Missing.tsx`
- `Wanted/Missing/MissingRow.tsx`

---

#### 3.5.2 Cutoff Unmet (`/wanted/cutoffunmet`)

**Purpose**: View movies that have files but don't meet the quality cutoff.

**Features**:

- Similar structure to Missing view
- Filters for cutoff unmet status
- Shows current quality vs. cutoff quality
- Upgrade search functionality

---

### 3.6 Add Movies Features

#### 3.6.1 Add New Movie (`/add/new`)

**Purpose**: Add movies to the library by searching for new titles.

**Features**:

- **Search Input**:
  - Search TMDB for movies
  - Autocomplete suggestions
  - Recent searches

- **Movie Selection**:
  - Grid of search results
  - Show poster, title, year, overview
  - Add to library button
  - Already in library indicator

- **Import Settings**:
  - Root folder selection
  - Quality profile selection
  - Minimum availability (announced, in cinemas, released)
  - Monitored toggle

- **Bulk Add**:
  - Select multiple movies
  - Add all with common settings

**Implementation Details**:

- Search API integration
- TMDB data fetching
- Form validation

---

#### 3.6.2 Import Library (`/add/import`)

**Purpose**: Import existing movie files from disk.

**Features**:

- **Folder Browser**:
  - Browse root folders
  - Navigate subdirectories
  - Show unprocessed folders

- **Import Preview**:
  - List movies found in folders
  - Match with TMDB
  - Select to import

- **Import Options**:
  - Quality profile
  - Minimum availability
  - Monitor setting

- **Recent/Favorite Folders**:
  - Quick access to common folders

**Key Files**:

- `AddMovie/ImportMovie/ImportMovies.tsx`

---

#### 3.6.3 Discover (`/add/discover`)

**Purpose**: Discover and browse movies by various criteria.

**Features**:

- **Discovery Modes**:
  - Popular movies
  - Top rated
  - New releases
  - Upcoming

- **Filters**:
  - Year range
  - Genre
  - Language
  - Certification

- **Movie Grid**:
  - Posters with hover actions
  - Add to library button
  - View details

**Key Files**:

- `DiscoverMovie/DiscoverMovieConnector.tsx`
- `DiscoverMovie/Overview/DiscoverMovieOverviewInfoRow.tsx`

---

### 3.7 Collections (`/collections`)

**Purpose**: Manage movie collections (e.g., Marvel Cinematic Universe).

**Features**:

- **Collection List**:
  - Grid/list view
  - Collection poster (first movie)
  - Collection name
  - Movie count
  - Monitored status
  - Progress indicator

- **Collection Actions**:
  - Search collection
  - Toggle monitored
  - Edit collection
  - Delete collection

- **Add to Collection**:
  - Add movies to collection
  - Remove from collection

- **Filtering**:
  - Monitored/Unmonitored
  - Custom filters

- **Sorting**:
  - Title
  - Year
  - Movie count

**Key Files**:

- `Collection/CollectionConnector.tsx`
- `Collection/Edit/EditMovieCollectionModal.tsx`

---

## 4. Settings System

### 4.1 Settings Overview

All settings pages follow a consistent pattern:

- Sidebar navigation (in Settings section)
- Settings toolbar with pending changes indicator
- Form-based configuration
- Save/Cancel buttons

**Settings Toolbar** (`SettingsToolbar.tsx`):

- Shows number of pending changes
- Save all button
- Reset all button

---

### 4.2 Media Management Settings (`/settings/mediamanagement`)

**Purpose**: Configure file management and naming conventions.

**Settings**:

- **Root Folders**:
  - Add/remove root folders
  - Set default root folder
  - Show free space

- **Naming**:
  - Movie naming patterns
  - Folder naming patterns
  - Standard vs. Custom formats
  - Example preview

- **File Management**:
  - Import extra files (nfo, srt, etc.)
  - Extra file extensions
  - Allow hardlinking/symlinking
  - Propagate extras

- **Deleting Files**:
  - Delete files when deleting movies
  - Allow skipping trash

---

### 4.3 Profiles Settings (`/settings/profiles`)

**Purpose**: Manage quality profiles.

**Features**:

- **Quality Profiles List**:
  - Profile name
  - Number of allowed quality items
  - Number of allowed size limits
  - Movies using this profile

- **Quality Profile Editor**:
  - Add/edit/delete quality profiles
  - Set quality items (4K, 1080p, 720p, etc.)
  - Set cutoff quality
  - Set size limits per quality
  - Set language profiles

- **Profile Items**:
  - Resolution
  - Source (Bluray, Web-DL, etc.)
  - Modifier (Proper, Repack)
  - Qualities grouped by quality items

---

### 4.4 Quality Settings (`/settings/quality`)

**Purpose**: Define quality definitions and sizes.

**Settings**:

- **Quality Definitions**:
  - Add/edit/delete quality definitions
  - Group by source (Bluray, Web-DL, TV, DVD)
  - Set resolution limits
  - Set modifiers

- **Quality Sizes**:
  - Per quality size limits
  - Preferred size ranges
  - Thirty minute episode sizes

---

### 4.5 Custom Formats Settings (`/settings/customformats`)

**Purpose**: Create and manage custom format specifications.

**Features**:

- **Custom Formats List**:
  - Format name
  - Include/exclude patterns
  - Score (for sorting)

- **Format Editor**:
  - Name and description
  - Include conditions (multiple)
  - Exclude conditions (multiple)
  - Format score

- **Conditions**:
  - Release title
  - Release group
  - Indexer
  - Size
  - Language
  - Quality
  - And more...

- **Test Feature**:
  - Test format against sample releases
  - See which matches and which doesn't

---

### 4.6 Indexers Settings (`/settings/indexers`)

**Purpose**: Configure NZB and Torrent indexers.

**Settings**:

- **Indexer List**:
  - Add/edit/delete indexers
  - Enable/disable indexers
  - Show indexer status

- **Indexer Types**:
  - NZB: Newznab, Torznab
  - Torrent: Torznab, TorrentRss

- **Per-Indexer Settings**:
  - Name and description
  - API key/URL
  - Categories
  - Search capabilities
  - Categories mapping

- **Capabilities**:
  - Search types (movie, music, tv)
  - Release searching
  - RSS syncing
  - Priority

---

### 4.7 Download Clients Settings (`/settings/downloadclients`)

**Purpose**: Configure download clients (torrent/usenet).

**Settings**:

- **Client List**:
  - Add/edit/delete clients
  - Enable/disable clients
  - Show client status

- **Client Types**:
  - Usenet: SABnzbd, NZBGet, NZB Vortex
  - Torrent: Transmission, uTorrent, Deluge, qBittorrent, rTorrent

- **Per-Client Settings**:
  - Name and host
  - Port and authentication
  - Category settings
  - Recent TV priority
  - Older TV priority
  - Priority settings

- **Test Connection**:
  - Verify client is accessible
  - Show connection status

---

### 4.8 Import Lists Settings (`/settings/importlists`)

**Purpose**: Configure import lists for automatic movie additions.

**Settings**:

- **Import List List**:
  - Add/edit/delete lists
  - Enable/disable lists
  - Show list status

- **Import List Types**:
  - Trakt lists (user lists, popular, trending)
  - Plex watchlist
  - Radarr lists
  - IMDB lists
  - Rotten Tomatoes
  - And more...

- **Per-List Settings**:
  - Name and list type
  - List URL/ID
  - Quality profile
  - Root folder
  - Monitor setting
  - Min availability
  - Search for missing movies

---

### 4.9 Connect Settings (`/settings/connect`)

**Purpose**: Configure notification connections.

**Settings**:

- **Notification List**:
  - Add/edit/delete notifications
  - Enable/disable notifications
  - Tags for filtering

- **Notification Types**:
  - Email, Slack, Discord
  - Telegram, Pushover, Pushbullet
  - Plex, Emby, Jellyfin
  - Join, Notifiarr, Telegram
  - And many more...

- **Notification Triggers**:
  - On grab
  - On download
  - On import
  - On upgrade
  - On health issue

- **Per-Notification Settings**:
  - Webhook URL/API key
  - Tags (for movie filtering)
  - Specific triggers

---

### 4.10 Metadata Settings (`/settings/metadata`)

**Purpose**: Configure metadata providers.

**Settings**:

- **Metadata Providers**:
  - TheMovieDb (primary)
  - Add/edit/delete providers

- **Per-Provider Settings**:
  - Name
  - Enable/disable
  - Settings for specific provider

---

### 4.11 Tags Settings (`/settings/tags`)

**Purpose**: Manage tags for filtering and organization.

**Features**:

- **Tag List**:
  - Add/edit/delete tags
  - Show tag label
  - Show number of uses

- **Tag Usage**:
  - Apply tags to movies
  - Filter by tags
  - Use tags in notifications
  - Use tags in delay profiles
  - Use tags in import lists

---

### 4.12 General Settings (`/settings/general`)

**Purpose**: General application settings.

**Settings**:

- **Host**:
  - Bind address
  - Port
  - URL base
  - SSL settings

- **Security**:
  - Authentication
  - Username/password
  - API key

- **Proxy Settings**:
  - Enable proxy
  - Proxy URL
  - Proxy authentication

- **Logging**:
  - Log level
  - Analytics

- **Updates**:
  - Update mechanism
  - Update branch
  - Automatic updates

---

### 4.13 UI Settings (`/settings/ui`)

**Purpose**: Configure user interface preferences.

**Settings**:

- **Calendar**:
  - First day of week
  - Week start day

- **Date Format**:
  - Short date format
  - Long date format
  - Time format (12h/24h)

- **Display**:
  - Show movie poster
  - Show movie overview
  - Color impaired mode

- **Sorting**:
  - Movie sorting
  - Sort direction

- **Language**:
  - Interface language

---

## 5. System & Administration

### 5.1 Status (`/system/status`)

**Purpose**: View system health and information.

**Sections**:

- **Health** (`Health.tsx`):
  - System health checks
  - Warnings and errors
  - Clickable items for details

- **Disk Space** (`DiskSpace.tsx`):
  - Root folder disk usage
  - Free space
  - Progress bars

- **About** (`About.tsx`):
  - Version information
  - App start time
  - Database migration count
  - SQLite version (if applicable)

- **More Info** (`MoreInfo.tsx`):
  - OS information
  - Runtime information
  - Branch
  - Build time

- **Donations** (`Donations.tsx`):
  - Donation information
  - Links to donate

---

### 5.2 Tasks (`/system/tasks`)

**Purpose**: View and manage scheduled and queued tasks.

**Features**:

- **Scheduled Tasks** (`ScheduledTasks.tsx`):
  - List of all scheduled tasks
  - Task name
  - Interval
  - Last execution
  - Next execution
  - Actions: run, disable/enable

  Common tasks:
  - RSS Sync
  - Refresh Monitored Downloads
  - Update Movie Info
  - Clean Up Recycle Bin
  - Backup Database

- **Queued Tasks** (`QueuedTasks.tsx`):
  - Currently executing tasks
  - Task name
  - Start time
  - Duration
  - Priority
  - Status

- **Task Execution**:
  - Cancel queued tasks
  - View task logs

---

### 5.3 Backup (`/system/backup`)

**Purpose**: Database backup management.

**Features**:

- **Backup List**:
  - Show all available backups
  - Backup date and time
  - Backup type (automatic/manual)
  - Size

- **Actions**:
  - Create new backup
  - Restore backup
  - Delete backup
  - Download backup

- **Backup Scheduling**:
  - Configure automatic backups
  - Backup interval
  - Backup retention (number of backups to keep)

---

### 5.4 Updates (`/system/updates`)

**Purpose**: Application update management.

**Features**:

- **Current Version**:
  - Display installed version
  - Display latest version

- **Available Updates**:
  - List of available updates
  - Version numbers
  - Release notes
  - Changes view (`UpdateChanges.tsx`)

- **Actions**:
  - Check for updates
  - Download update
  - Install update

- **Update Mechanisms**:
  - Built-in updater
  - External update

---

### 5.5 Events (`/system/events`)

**Purpose**: View application events and logs.

**Features**:

- **Events Table**:
  - Timestamp
  - Event type
  - Severity (info, warning, error)
  - Message
  - Details

- **Filtering**:
  - Event type
  - Severity level
  - Time range

- **Pagination**:
  - Standard table pager

---

### 5.6 Log Files (`/system/logs/files`)

**Purpose**: View and download log files.

**Features**:

- **Log Files List**:
  - Log file name
  - File size
  - Last modified
  - Actions (view, download, delete)

- **Log Types**:
  - Application logs (`radarr.log`, `radarr.debug.log`)
  - Update logs (`update.txt`)
  - Database migration logs

- **Log Viewer**:
  - View log file contents
  - Pagination for large files
  - Search within logs

---

## 6. UI Components & Patterns

### 6.1 Page Components

#### Page (`Page.tsx`)

**Purpose**: Wrapper for all pages with consistent layout.

**Structure**:

```
Page
├── PageHeader
│   ├── PageSidebar toggle button
│   ├── PageTitle
│   └── PageHeaderActions
└── PageContent
    ├── PageToolbar
    │   ├── PageToolbarSection (left)
    │   └── PageToolbarSection (right)
    └── PageContentBody
        └── [Page-specific content]
```

---

#### PageToolbar (`PageToolbar.tsx`)

**Purpose**: Consistent action bar for pages.

**Features**:

- Two sections: left (primary actions) and right (secondary actions)
- Overflow menu for small screens
- Button icons with labels
- Spinning state for loading actions
- Disabled state for unavailable actions
- Separators between button groups

**Common Buttons**:

- Refresh (with spinning icon)
- Search
- Add New
- Edit
- Delete
- Options
- Filter menu
- Sort menu
- View menu

---

#### PageToolbarButton (`PageToolbarButton.tsx`)

**Features**:

- Icon and label
- Hover state
- Disabled state
- Loading/spinning state
- Overflow component (for mobile)

---

#### PageToolbarSeparator (`PageToolbarSeparator.tsx`)

**Purpose**: Visual separator between button groups.

---

#### PageContent (`PageContent.tsx`)

**Purpose**: Main content wrapper with scroll.

**Features**:

- Title prop for page title
- Consistent padding
- Scroll management
- Responsive behavior

---

#### PageContentBody (`PageContentBody.tsx`)

**Purpose**: Scrollable content area.

**Features**:

- Custom scroll styles
- Responsive height
- Scroll position tracking

---

### 6.2 Table Components

#### Table (`Table.tsx`)

**Purpose**: Reusable table component with sorting, pagination, and options.

**Features**:

- Configurable columns
- Sortable headers
- Select all checkbox
- Cell rendering
- Row rendering
- Optional pagination
- Column visibility options

**Props**:

- `columns`: Column configuration
- `pageSize`: Items per page
- `sortKey`: Current sort key
- `sortDirection`: Sort direction
- `optionsComponent`: Column options modal
- `selectAll`: Enable select all
- `allSelected`: All items selected
- `allUnselected`: All items unselected
- `onSelectAllChange`: Select all handler
- `onSortPress`: Sort handler
- `onTableOptionChange`: Options handler

---

#### TableHeader (`TableHeader.tsx`)

**Purpose**: Table header with sortable columns.

**Features**:

- Column headers
- Sort indicators
- Click to sort
- Sort direction toggle

---

#### TableBody (`TableBody.tsx`)

**Purpose**: Container for table rows.

---

#### TableRow (`TableRow.tsx`)

**Purpose**: Single table row.

**Features**:

- Hover state
- Selected state
- Action buttons
- Cell rendering

---

#### TableHeaderCell (`TableHeaderCell.tsx`)

**Purpose**: Single table header cell.

**Features**:

- Label
- Sort indicator
- Click to sort

---

#### TablePager (`TablePager.tsx`)

**Purpose**: Pagination controls.

**Features**:

- First/Previous/Next/Last buttons
- Page number input
- Total records display
- Fetching state

---

#### TableOptionsModalWrapper (`TableOptionsModalWrapper.tsx`)

**Purpose**: Wrapper for column visibility options.

**Features**:

- Opens modal with column checkboxes
- Persists column visibility to Redux

---

### 6.3 Modal Components

#### Modal (`Modal.tsx`)

**Purpose**: Reusable modal container.

**Features**:

- Backdrop
- Modal header
- Modal body
- Modal footer
- Close on escape
- Close on backdrop click
- Customizable size

---

#### ModalHeader (`ModalHeader.tsx`)

**Purpose**: Modal header with title and close button.

---

#### ModalBody (`ModalBody.tsx`)

**Purpose**: Modal content area with scroll.

---

#### ModalFooter (`ModalFooter.tsx`)

**Purpose**: Modal footer with action buttons.

---

#### ConfirmModal (`ConfirmModal.tsx`)

**Purpose**: Confirmation dialog for dangerous actions.

**Features**:

- Title and message
- Confirm/Cancel buttons
- Kind (danger, warning, info)

---

### 6.4 Menu Components

#### Menu (`Menu.tsx`)

**Purpose**: Dropdown menu container.

**Features**:

- Positioning (left/right)
- Alignment
- Close on click outside
- Close on escape

---

#### MenuItem (`MenuItem.tsx`)

**Purpose**: Single menu item.

**Features**:

- Label and icon
- Disabled state
- Divider (separator)
- Submenu support

---

#### FilterMenu (`FilterMenu.tsx`)

**Purpose**: Specialized menu for filters.

**Features**:

- Filter items
- Custom filters
- Filter builder modal

---

#### SortMenu (`SortMenu.tsx`)

**Purpose**: Specialized menu for sorting.

**Features**:

- Sort items
- Sort direction toggle

---

#### ViewMenu (`ViewMenu.tsx`)

**Purpose**: Specialized menu for view modes.

**Features**:

- View options (poster, overview, table)
- Active state indicator

---

### 6.5 Form Components

#### Input Components

Located in `Components/Form/`:

- **TextInput**: Text input field
- **NumberInput**: Numeric input
- **SelectInput**: Dropdown select
- **CheckInput**: Checkbox
- **FormInputGroup**: Group of related inputs
- **FormGroup**: Form group with label
- **FormLabel**: Label for form control

**Features**:

- Validation states
- Error messages
- Disabled state
- Help text
- Floating labels (optional)

---

#### FileBrowser (`Components/FileBrowser/`)

**Purpose**: File system browser for folder selection.

**Features**:

- Navigate directories
- Show folders and files
- Select folders
- Favorite folders
- Recent folders

---

### 6.6 Display Components

#### Alert (`Alert.tsx`)

**Purpose**: Display informational messages.

**Kinds**:

- Info (blue)
- Success (green)
- Warning (yellow)
- Danger (red)

---

#### Icon (`Icon.tsx`)

**Purpose**: Display icons.

**Features**:

- Icon name (from lucide-react)
- Size
- Kind (default, primary, etc.)

---

#### Label (`Label.tsx`)

**Purpose**: Display labels/badges.

**Kinds**:

- Default, info, success, warning, danger, primary

---

#### TagList (`TagList.tsx`)

**Purpose**: Display list of tags.

**Features**:

- Horizontal or vertical layout
- Tags with colors
- Clickable tags

---

#### ProgressBar (`ProgressBar.tsx`)

**Purpose**: Progress indicator.

**Features**:

- Percentage
- Width
- Kind (default, primary)
- Text display

---

#### CircularProgressBar (`CircularProgressBar.tsx`)

**Purpose**: Circular progress indicator.

**Features**:

- Percentage
- Size
- Stroke width
- Color

---

#### Rating Components

- **ImdbRating**: IMDB rating display
- **TmdbRating**: TMDB rating display
- **RottenTomatoRating**: Rotten Tomatoes rating
- **TraktRating**: Trakt rating display

---

#### MonitorToggleButton (`MonitorToggleButton.tsx`)

**Purpose**: Toggle button for monitored status.

**Features**:

- On/off states
- Spinning when saving
- Size customization

---

#### Marquee (`Marquee.js`)

**Purpose**: Scrolling text for long titles.

**Features**:

- Auto-scroll when text overflows
- Smooth animation
- Show tooltip on hover

---

### 6.7 Loading Components

#### LoadingIndicator (`LoadingIndicator.tsx`)

**Purpose**: Loading spinner.

**Features**:

- Spinning icon
- Text message (optional)

---

#### LoadingPage (`LoadingPage.tsx`)

**Purpose**: Full-page loading state.

---

### 6.8 Other Components

#### Scroller (`Scroller.tsx`, `OverlayScroller.tsx`)

**Purpose**: Custom scroll containers.

**Features**:

- Scroll direction (horizontal/vertical)
- Custom scrollbars
- Smooth scrolling

---

#### DragPreviewLayer (`DragPreviewLayer.tsx`)

**Purpose**: Layer for drag-and-drop previews.

---

#### KeyboardShortcutsModal (`KeyboardShortcutsModal.tsx`)

**Purpose**: Display keyboard shortcuts.

**Features**:

- List of all shortcuts
- Sectioned by view
- Show/hide toggle

---

## 7. Data Management

### 7.1 State Management Architecture

#### Redux State Structure

```typescript
interface AppState {
  app: AppSectionState; // App-level state (sidebar, etc.)
  movies: MoviesAppState; // Movie data
  movieIndex: MovieIndexAppState; // Movie index UI state
  queue: QueueAppState; // Download queue
  history: HistoryAppState; // Activity history
  blocklist: BlocklistAppState; // Blocked releases
  calendar: CalendarAppState; // Calendar data
  wanted: WantedAppState; // Missing/cutoff unmet
  settings: SettingsAppState; // Settings
  system: SystemAppState; // System status
  commands: CommandAppState; // Running commands
  customFilters: CustomFiltersAppState;
  // ... more sections
}
```

---

#### Client-Side Collection Pattern

Used for main data views (movies, collections, etc.):

```typescript
interface ClientSideCollectionAppState {
  isFetching: boolean;
  isPopulated: boolean;
  error: Error;
  totalItems: number;
  items: T[];
  columns: Column[];
  selectedFilterKey: string;
  filters: Filter[];
  customFilters: CustomFilter[];
  sortKey: string;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}
```

**Implementation**:

- All items fetched once
- Filtering/sorting done client-side
- Pagination handled client-side
- Optimized for large datasets

---

### 7.2 Actions

#### Action Creators

Located in `Store/Actions/`:

- `appActions.ts`: App-level actions
- `movieActions.ts`: Movie CRUD operations
- `queueActions.ts`: Queue management
- `historyActions.ts`: History operations
- `wantedActions.ts`: Missing movies
- `calendarActions.ts`: Calendar operations
- `settingsActions.ts`: Settings management
- And more...

**Common Actions**:

- `fetch[type]`: Fetch data from server
- `clear[type]`: Clear data from state
- `goto[type]Page`: Navigate to page
- `set[type]Filter`: Set filter
- `set[type]Sort`: Set sort
- `set[type]TableOption`: Set table options

---

#### Commands

Command-based system for async operations:

```typescript
interface CommandBody {
  name: string;
  movieId?: number;
  movieIds?: number[];
  // ... other properties
}

// Command Names
const REFRESH_MOVIE = "refreshMovie";
const MOVIE_SEARCH = "movieSearch";
const RENAME_FILES = "renameFiles";
// ... more
```

**Execution**:

```typescript
dispatch(
  executeCommand({
    name: REFRESH_MOVIE,
    movieIds: [1, 2, 3],
  }),
);
```

---

### 7.3 Selectors

#### Selector Types

Located in `Store/Selectors/`:

- `createAllMoviesSelector`: Get all movies
- `createMovieFileSelector`: Get movie files
- `createQueueItemSelector`: Get queue item
- `createCommandExecutingSelector`: Check if command is executing
- `createDimensionsSelector`: Get screen dimensions
- `createUISettingsSelector`: Get UI settings
- And more...

**Memoization**:
All selectors use `reselect` for memoization.

**Examples**:

```typescript
const createAllMoviesSelector = createSelector(
  (state: AppState) => state.movies.itemMap,
  (state: AppState) => state.movies.items,
  (itemMap, items) => {
    return items.map((item) => {
      return {
        ...item,
        // ... enhance with itemMap
      };
    });
  },
);
```

---

### 7.4 API Integration

#### React Query Setup

```typescript
const queryClient = new QueryClient();

// In App.tsx
<QueryClientProvider client={queryClient}>
  {/* ... */}
</QueryClientProvider>
```

#### Data Fetching

Commands and Redux actions handle API calls:

- `useEffect` triggers fetch on mount
- `registerPagePopulator` for real-time updates
- `unregisterPagePopulator` on unmount

---

## 8. Special Features

### 8.1 Drag and Drop

Used in:

- File ordering (not extensively used in Radarr)
- Table column ordering (not implemented)

**Note**: Radarr doesn't heavily use drag-and-drop. Most reordering is done via sort menus.

---

### 8.2 Filtering System

#### Filter Builder

Allows building complex filters with multiple conditions:

**Filter Types**:

- Text search (contains, equals, regex)
- Numeric comparisons (greater than, less than, equals)
- Date comparisons
- Boolean filters
- Enum filters
- Array filters

**Filter UI**:

- Filter menu for quick filters
- Filter modal for custom filters
- Filter builder with multiple conditions

**Filter Storage**:

- Custom filters saved to Redux
- Persisted to local storage or server

---

### 8.3 Search

#### Movie Search

**Location**: Page header search bar

**Features**:

- Search TMDB for movies
- Autocomplete suggestions
- Navigate to movie details
- Add new movie search

---

#### Interactive Search

**Purpose**: Manually select release for a movie.

**Features**:

- Search indexers for releases
- Filter by quality, language, indexer
- Show release history
- Grab selected release
- Add to blocklist

**Modal**:

- Search input
- Filters sidebar
- Release list with details
- Action buttons

---

### 8.4 Keyboard Shortcuts

**Common Shortcuts**:

- `Ctrl/Cmd + K`: Open keyboard shortcuts modal
- `Escape`: Close modal/dropdown
- `Arrow Keys`: Navigate between movies (in details view)
- `Enter`: Confirm action

**Display**:

- KeyboardShortcutsModal shows all shortcuts
- Accessible from page header

---

### 8.5 Touch Gestures

**Movie Details Navigation**:

- Swipe left: Next movie
- Swipe right: Previous movie

**Sidebar**:

- Swipe from left edge: Open sidebar
- Swipe sidebar right: Close sidebar

---

### 8.6 Jump Bar

**Purpose**: A-Z navigation when sorting by title.

**Features**:

- Shows character counts
- Click to jump to character
- Reverse order when sorting descending
- Only visible when sorting by title

---

### 8.7 Toast Notifications

**Message System** (`Components/Page/Sidebar/Messages/`):

**Features**:

- Display success/error/warning messages
- Auto-dismiss after timeout
- Manual dismiss
- Multiple messages

---

### 8.8 Real-time Updates

#### SignalR

**Purpose**: Real-time updates from server.

**Uses**:

- Queue updates
- Command completion
- Health status changes
- Movie updates

**Implementation**:

- SignalRConnector.js handles connection
- Listeners for specific event types
- Updates dispatched to Redux

---

#### Page Populator

**Purpose**: Re-fetch data when specific events occur.

**Usage**:

```typescript
useEffect(() => {
  const repopulate = () => {
    dispatch(fetchData());
  };

  registerPagePopulator(repopulate, [
    "movieUpdated",
    "movieFileUpdated",
    "queueUpdated",
  ]);

  return () => {
    unregisterPagePopulator(repopulate);
  };
}, [dispatch]);
```

---

### 8.9 Responsive Design

**Breakpoints**:

- Small screen: < 768px
- Large screen: >= 768px

**Responsive Behavior**:

- Sidebar: Collapsible on mobile (slide-in)
- Tables: Scrollable on mobile
- Cards: Stack on mobile
- Toolbar: Overflow menu on mobile
- View modes: Posters on mobile

---

### 8.10 Theme

**Color Scheme**:

- Primary: Blue (#3a86ff)
- Success: Green (#38b000)
- Warning: Yellow (#ffba08)
- Danger: Red (#d00000)
- Background: Dark (#1f2430)
- Text: Light

**Components**:

- Consistent color usage across all components
- Color impaired mode support
- Custom CSS variables

---

## 9. State Management

### 9.1 Redux Store Structure

#### Store Creation

```typescript
// createAppStore.js
const store = createStore(
  rootReducer,
  initialState,
  composeEnhancers(...middlewares),
);
```

#### Root Reducer

Combines all section reducers:

- `appReducer`: App state
- `moviesReducer`: Movies
- `queueReducer`: Queue
- And more...

---

### 9.2 Middleware

#### SignalR Middleware

**Purpose**: Handle real-time updates from SignalR.

---

#### Command Middleware

**Purpose**: Execute commands and track status.

---

#### Persist Middleware

**Purpose**: Persist certain state to local storage.

**Persisted State**:

- UI settings (column visibility, view modes)
- Filter preferences
- Sort preferences

---

### 9.3 Common State Patterns

#### ItemMap Pattern

Efficient lookup by ID:

```typescript
interface MoviesAppState {
  itemMap: Record<number, number>; // ID -> index
  items: Movie[];
}
```

**Usage**:

```typescript
const movie = items[itemMap[id]];
```

---

#### Selection State Pattern

Multi-selection:

```typescript
interface SelectState {
  allSelected: boolean;
  allUnselected: boolean;
  selectedState: Record<number, boolean>;
}
```

**Usage**:

- `useSelectState` hook
- Select all/unselect all
- Toggle individual items
- Shift-click selection

---

#### Error Handling Pattern

Consistent error state:

```typescript
interface AppSectionState {
  isFetching: boolean;
  isPopulated: boolean;
  error?: Error;
  items?: T[];
}
```

**Display**:

- Loading indicator when fetching
- Alert when error
- Content when populated

---

### 9.4 Optimizations

#### Memoization

- `useMemo` for expensive calculations
- `useCallback` for event handlers
- `reselect` for Redux selectors

#### Virtual Scrolling

- Used in large lists (table rows, posters)
- Only renders visible items
- Improves performance

#### Pagination

- Client-side pagination for filtered data
- Server-side pagination for large datasets
- Infinite scroll (optional)

---

## 10. Real-time Features

### 10.1 SignalR Integration

#### Connection Management

**SignalRConnector.js** handles:

- Connection initialization
- Automatic reconnection
- Connection state tracking
- Event subscription

#### Events

**Common Events**:

- `movieUpdated`: Movie data changed
- `movieFileUpdated`: Movie file changed
- `queueUpdated`: Queue status changed
- `healthIssue`: Health issue occurred
- `command`: Command completed

#### Event Handling

```typescript
// Register listeners
signalR.on("movieUpdated", (data) => {
  dispatch(handleMovieUpdated(data));
});

// Dispatch to Redux
function handleMovieUpdated(movie) {
  return {
    type: "MOVIE_UPDATED",
    payload: movie,
  };
}
```

---

### 10.2 Command System

#### Command Execution Flow

```
1. User action (e.g., click "Search")
2. Dispatch command
   executeCommand({ name: MOVIE_SEARCH, movieIds: [1] })
3. Command sent to server
4. Server processes command
5. Server sends command completion via SignalR
6. Redux state updated
7. UI re-renders
```

#### Command States

- `queued`: Command waiting to execute
- `started`: Command started
- `completed`: Command finished
- `failed`: Command failed

#### Command Tracking

```typescript
const commands = useSelector(createCommandsSelector());
const isExecuting = useSelector(createCommandExecutingSelector(MOVIE_SEARCH));
```

---

### 10.3 Polling

For features that don't support SignalR:

- Queue status (optional fallback)
- Calendar updates (hourly)
- Indexer sync (periodic)

---

## 11. Additional Features

### 11.1 Internationalization (i18n)

**Translation System**:

- `translate()` function for strings
- Translation keys
- Language files

**Supported Languages**:

- English (default)
- And many more (community contributed)

---

### 11.2 Accessibility

**ARIA Labels**:

- Screen reader support
- Keyboard navigation
- Focus management

**Color Blindness**:

- Color impaired mode
- Alternative indicators (icons, text)

---

### 11.3 Performance

**Code Splitting**:

- Webpack code splitting
- Route-based chunking
- Lazy loading

**Optimizations**:

- Memoization
- Virtual scrolling
- Pagination
- Debounced inputs
- Throttled events

---

### 11.4 Error Handling

**Global Error Handler**:

- Catches unhandled errors
- Displays error message
- Logs error to console

**Error Boundaries**:

- React error boundaries
- Graceful degradation

---

### 11.5 Analytics

**Optional Analytics**:

- Telemetry (can be disabled)
- Usage tracking (optional)
- Error reporting (optional)

---

## 12. Implementation Roadmap

### 12.1 Phase 1: Core Infrastructure

- [ ] Set up React project with TypeScript
- [ ] Configure Redux + React Query
- [ ] Set up React Router
- [ ] Create base components (Page, Toolbar, Modal, etc.)
- [ ] Implement SignalR integration

### 12.2 Phase 2: Movie Management

- [ ] Movie Index view (table, posters, overview)
- [ ] Movie Details view
- [ ] Add New Movie
- [ ] Import Library
- [ ] Movie CRUD operations

### 12.3 Phase 3: Activity & Queue

- [ ] Queue view
- [ ] History view
- [ ] Blocklist view
- [ ] Download client integration

### 12.4 Phase 4: Calendar & Wanted

- [ ] Calendar view
- [ ] Missing view
- [ ] Cutoff Unmet view

### 12.5 Phase 5: Settings

- [ ] All settings pages
- [ ] Settings persistence
- [ ] Configuration validation

### 12.6 Phase 6: System & Polish

- [ ] Status page
- [ ] Tasks page
- [ ] Updates page
- [ ] Log files
- [ ] Responsive design
- [ ] Accessibility

---

## 13. Key Takeaways

### 13.1 Architecture Strengths

1. **Modular Structure**: Clear separation of concerns
2. **Redux + React Query**: Optimal state management hybrid
3. **Consistent Patterns**: Reusable components and patterns
4. **Real-time Updates**: SignalR for live data
5. **Command System**: Async operations with status tracking

### 13.2 UI/UX Patterns

1. **Table Views**: Sortable, filterable, paginated
2. **Grid Views**: Posters with hover actions
3. **Toolbar Pattern**: Consistent action placement
4. **Modal System**: Confirmation and editing
5. **Filter System**: Quick filters + custom filters
6. **Selection Pattern**: Multi-select with shift-click

### 13.3 Best Practices

1. **Memoization**: Optimize performance
2. **Pagination**: Handle large datasets
3. **Error Handling**: Graceful error display
4. **Loading States**: Clear feedback
5. **Accessibility**: Keyboard navigation, ARIA labels

---

## 14. Appendix: File Reference

### Core Application Files

- `App/App.tsx`: Root component
- `App/AppRoutes.tsx`: Route definitions
- `App/State/AppState.ts`: Global state types
- `Store/createAppStore.js`: Store creation

### Main Views

- `Movie/Index/MovieIndex.tsx`: Movie index
- `Movie/Details/MovieDetails.tsx`: Movie details
- `Calendar/Calendar.tsx`: Calendar
- `Activity/Queue/Queue.tsx`: Queue
- `Activity/History/History.tsx`: History
- `Wanted/Missing/Missing.tsx`: Missing

### Components

- `Components/Page/Page.tsx`: Page wrapper
- `Components/Table/Table.tsx`: Table component
- `Components/Modal/Modal.tsx`: Modal component
- `Components/Menu/Menu.tsx`: Menu component

### State Management

- `Store/Actions/`: Action creators
- `Store/Selectors/`: Redux selectors
- `App/State/`: State definitions

---

**Document Version**: 1.0
**Last Updated**: 2026-02-14
**Analysis Based On**: Radarr Frontend Source Code
