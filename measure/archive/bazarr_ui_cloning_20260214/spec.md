# Bazarr UI Cloning Specification

## Overview

**Bazarr** is a companion application to Sonarr and Radarr that manages and downloads subtitles based on user requirements. Users define their preferences by TV show or movie, and Bazarr handles the entire process automatically. The application provides a comprehensive dashboard for managing series and movie subtitles, with features for searching, monitoring, editing, and organizing subtitle downloads.

**Key Purpose:**

- Automatic subtitle downloading for TV series and movies
- Integration with Sonarr (series) and Radarr (movies)
- Multi-language support with customizable language profiles
- Manual and automated subtitle search
- Subtitle file management and editing tools
- System monitoring and configuration

---

## Tech Stack

### Core Dependencies

- **React**: 19.2.3
- **TypeScript**: 5.4.4
- **Mantine UI**: 8.3.9 (@mantine/core, @mantine/form, @mantine/hooks, @mantine/modals, @mantine/notifications, @mantine/dropzone)
- **TanStack React Query**: 5.64.1 (Server state management)
- **TanStack React Table**: 8.19.2 (Data tables)
- **React Router**: 7.1.1 (Client-side routing)
- **Socket.IO Client**: 4.7.5 (Real-time updates)
- **Recharts**: 2.15.0 (Charts)
- **Axios**: 1.8.2 (HTTP client)
- **Vite**: 7.1.3 (Build tool)

### Additional Libraries

- **FontAwesome** (SVG icons)
- **React Timeago** (Relative time formatting)
- **Lodash** (Utility functions)
- **clsx** (Conditional className utilities)

---

## Application Architecture

### App Shell Layout

The application uses Mantine's `AppShell` component with three main sections:

1. **Header** (`AppHeader`)
   - Brand logo and title
   - Global search bar
   - Jobs manager notification button (with badge)
   - System menu (Restart, Shutdown, Logout)

2. **Navbar** (`AppNavbar`)
   - Collapsible navigation menu
   - Multi-level nested routes
   - Badge indicators for notifications
   - Theme toggle (light/dark mode)
   - Donate link

3. **Main Content Area**
   - Route-based content rendering
   - Page-specific toolbars
   - Dynamic content display

### Layout Patterns

- All pages use `Container fluid px={0}` for full-width layouts
- Content is organized using Mantine's `Stack`, `Group`, and `Grid` components
- Responsive design with breakpoints (base, sm, md, lg, xl)

---

## Navigation Structure

### Top-Level Routes

The application has 7 main sections with nested sub-routes:

#### 1. Series (`/series`)

**Purpose**: Manage TV series and their subtitle requirements

**Sub-routes:**

- `/` - Series list view (default)
- `/edit` - Mass editor for series profiles
- `/:id` - Episode detail view for a specific series

**Key Features:**

- Paginated table of all series from Sonarr
- Monitored/unmonitored status indicators
- Episode file counts and missing subtitles
- Language profile assignments
- Progress bars showing subtitle completion

#### 2. Movies (`/movies`)

**Purpose**: Manage movies and their subtitle requirements

**Sub-routes:**

- `/` - Movies list view (default)
- `/edit` - Mass editor for movie profiles
- `/:id` - Movie detail view

**Key Features:**

- Paginated table of all movies from Radarr
- Monitored status indicators
- Audio language display
- Missing subtitle badges
- Language profile assignments

#### 3. History (`/history`)

**Purpose**: View and analyze subtitle download history

**Sub-routes:**

- `/series` - Episode subtitle history
- `/movies` - Movie subtitle history
- `/stats` - Statistics with charts

**Key Features:**

- Detailed download history with timestamps
- Search and filtering capabilities
- Statistics view with bar charts (Recharts)
- Time frame selection (day, week, month, year)
- Provider and language filtering

#### 4. Wanted (`/wanted`)

**Purpose**: Manage missing subtitles that need to be searched

**Sub-routes:**

- `/series` - Wanted episode subtitles
- `/movies` - Wanted movie subtitles

**Key Features:**

- List of missing subtitles
- "Search All" button to trigger bulk searches
- Individual subtitle download buttons
- Badge indicators for missing count

#### 5. Blacklist (`/blacklist`)

**Purpose**: Manage blacklisted subtitle downloads

**Sub-routes:**

- `/series` - Blacklisted episode subtitles
- `/movies` - Blacklisted movie subtitles

**Key Features:**

- List of blacklisted items with reasons
- "Remove All" button to clear blacklist
- Individual item removal options

#### 6. Settings (`/settings`)

**Purpose**: Configure application settings

**Sub-routes (10 sections):**

- `/general` - General settings (host, security, jobs, proxy, updates, logging, backups, analytics)
- `/languages` - Language profiles, filters, and settings
- `/providers` - Subtitle provider configuration
- `/subtitles` - Subtitle download and modification settings
- `/sonarr` - Sonarr integration settings
- `/radarr` - Radarr integration settings
- `/plex` - Plex integration settings
- `/notifications` - Notification configuration
- `/scheduler` - Scheduled task configuration
- `/ui` - User interface preferences

#### 7. System (`/system`)

**Purpose**: System monitoring and management

**Sub-routes (7 sections):**

- `/tasks` - Background task manager
- `/logs` - System logs viewer
- `/providers` - Provider status and management
- `/backup` - Backup management
- `/status` - System health and information
- `/releases` - Update release notes
- `/announcements` - Application announcements

---

## Core Features and Implementation

### 1. Series Management

#### Series List View

**File**: `src/pages/Series/index.tsx`

**Components Used:**

- `QueryPageTable` - Paginated data table with query integration
- `ItemView` - Reusable view component for list pages
- `Toolbox` - Action toolbar

**Columns:**

- **Status**: Icons for monitored (bookmark) and status (play/stop for continuing/ended)
- **Name**: Link to episode detail view
- **Language Profile**: Profile name or empty
- **Episodes**: Progress bar showing completion (files/total)
- **Actions**: Edit button (opens modal)

**Actions:**

- "Mass Edit" button in toolbox
- Click on series name to view episodes
- Click edit icon to modify series settings

#### Series Episode Detail View

**File**: `src/pages/Episodes/index.tsx`

**Components Used:**

- `ItemOverview` - Overview banner with fanart, poster, and metadata
- `Toolbox` - Multi-button action toolbar
- `Table` - Episode list with expandable rows

**Toolbar Actions:**

- **Sync** - Sync series with Sonarr
- **Scan Disk** - Scan for existing subtitle files
- **Search** - Search for missing subtitles
- **Mass Edit** - Bulk edit episode subtitles
- **Upload** - Upload subtitle files via drag-and-drop
- **Edit Series** - Edit series settings
- **Expand/Collapse All** - Toggle episode groups

**Episode Table Features:**

- Grouped by season with expandable rows
- Per-episode subtitle status
- Manual search per episode
- Subtitle file listing
- Download progress indicators

### 2. Movies Management

#### Movies List View

**File**: `src/pages/Movies/index.tsx`

**Components Used:**

- `QueryPageTable` - Paginated data table
- `ItemView` - Reusable view component
- `Toolbox` - Action toolbar

**Columns:**

- **Monitored**: Icon indicating monitored status in Radarr
- **Name**: Link to movie detail view
- **Audio**: List of audio languages
- **Language Profile**: Profile name or empty
- **Missing Subtitles**: Badges showing missing languages
- **Actions**: Edit button

#### Movie Detail View

**File**: `src/pages/Movies/Details/index.tsx`

**Components Used:**

- `ItemOverview` - Movie overview with poster and metadata
- `Toolbox` - Action toolbar
- `Dropzone.FullScreen` - Drag-and-drop file upload
- `Table` - Subtitle file table

**Toolbar Actions:**

- **Sync** - Sync movie with Radarr
- **Scan Disk** - Scan for existing subtitles
- **Search** - Search for missing subtitles
- **Manual** - Manual subtitle search
- **Upload** - Upload subtitle files
- **Edit Movie** - Edit movie settings
- **More Actions Menu**:
  - Mass Edit
  - History

### 3. Wanted (Missing Subtitles)

#### Wanted Series View

**File**: `src/pages/Wanted/Series/index.tsx`

**Components Used:**

- `WantedView` - Reusable wanted view with "Search All" button
- `QueryPageTable` - Paginated table

**Columns:**

- **Name**: Series name (link to series)
- **Episode**: Episode number
- **Episode Title**: Episode name
- **Missing**: Badges for missing languages (clickable to download)

**Actions:**

- **Search All** - Trigger search for all missing subtitles
- **Individual search** - Click on missing language badge

#### Wanted Movies View

**File**: `src/pages/Wanted/Movies/index.tsx`

Similar structure to series wanted view but for movies.

### 4. History

#### History Series/Movies Views

**File**: `src/pages/History/Series/index.tsx` and `src/pages/History/Movies/index.tsx`

**Components Used:**

- `HistoryView` - Reusable history view
- `QueryPageTable` - Paginated table

**Columns Include:**

- Series/Movie name (link)
- Episode number (for series)
- Language
- Provider
- Action (download, upgrade, etc.)
- Score
- Timestamp

#### History Statistics View

**File**: `src/pages/History/Statistics/HistoryStats.tsx`

**Components Used:**

- `ResponsiveContainer` - Recharts container
- `BarChart` - Bar chart for statistics
- Filters: Time frame, Action, Provider, Language

**Features:**

- Bar chart showing subtitle download trends
- Series vs Movies comparison
- Multiple filter options
- Responsive design

### 5. Blacklist

#### Blacklist Series/Movies Views

**File**: `src/pages/Blacklist/Series/index.tsx` and `src/pages/Blacklist/Movies/index.tsx`

**Components Used:**

- `Table` - Blacklist table
- `Toolbox` - Actions

**Features:**

- List of blacklisted subtitles with:
  - Series/Movie name
  - Episode number
  - Language
  - Provider
  - Timestamp
- "Remove All" button
- Individual item removal

### 6. Settings

#### Settings General View

**File**: `src/pages/Settings/General/index.tsx`

**Components Used:**

- `Layout` - Settings layout wrapper
- `Section` - Grouped settings sections
- Reusable form components: `Text`, `Number`, `Password`, `Selector`, `Check`, `Chips`, `CollapseBox`, `Message`, `File`

**Sections:**

1. **Host**: IP, Port, Base URL, Instance Name
2. **Security**: Authentication type, username/password, API Key, CORS
3. **Jobs Manager**: Concurrent jobs limit
4. **External Integrations**: Webhooks
5. **Proxy**: Proxy settings with ignored addresses
6. **Updates**: Auto-update and branch selection
7. **Logging**: Debug mode, include/exclude filters, regex options
8. **Backups**: Backup folder, retention days
9. **Analytics**: Anonymous usage tracking

#### Settings Languages View

**File**: `src/pages/Settings/Languages/index.tsx`

**Key Features:**

- Language profiles management (create, edit, delete)
- Languages filter configuration
- Language equals mapping
- Embedded tracks language handling
- Tag-based automatic profile selection
- Default profiles for new shows/movies

**Components:**

- `LanguageSelector` - Multi-select language picker
- `ProfileSelector` - Profile dropdown
- `Table` - Profiles table
- `EqualsTable` - Language equals mapping

#### Settings Providers View

**File**: `src/pages/Settings/Providers/index.tsx`

**Features:**

- Enable/disable subtitle providers
- Anti-captcha provider configuration
- Integration management
- Provider-specific settings

#### Settings Components

All settings pages use a consistent component system from `src/pages/Settings/components/`:

- **Layout**: Wrapper with title and navigation
- **Section**: Grouped settings with header
- **Text**: Text input with validation
- **Number**: Numeric input
- **Password**: Password input with toggle
- **Selector**: Dropdown selector
- **Check**: Checkbox
- **Chips**: Chip-based multi-select
- **File**: File/directory picker
- **CollapseBox**: Collapsible section
- **Message**: Informational/warning/error messages

### 7. System Management

#### System Tasks View

**File**: `src/pages/System/Tasks/index.tsx`

**Components Used:**

- `Toolbox` with "Refresh" button
- `Table` - Tasks list

**Features:**

- List of scheduled tasks
- Task status, next run time, interval
- Manual task execution

#### System Logs View

**File**: `src/pages/System/Logs/index.tsx`

**Components Used:**

- `Toolbox` with multiple actions
- `Table` - Logs list

**Actions:**

- Refresh
- Download log file
- Empty log
- Filter (opens modal for debug and filter settings)

**Log Columns:**

- Timestamp
- Level (DEBUG, INFO, WARNING, ERROR)
- Module
- Message

#### System Status View

**File**: `src/pages/System/Status/index.tsx`

**Sections:**

1. **Health**: System health check table
2. **About**:
   - Bazarr version
   - Package version
   - Sonarr/Radarr versions
   - Operating system
   - Python version
   - Database engine/version
   - Directories
   - Uptime (live counter)
   - Time zone

3. **More Info**: Links to website, GitHub, Wiki, API docs, Discord

#### System Backups View

**File**: `src/pages/System/Backups/index.tsx`

**Components Used:**

- `Toolbox` with "Backup Now" button
- `Table` - Backups list

**Features:**

- Create backups on demand
- List of backup files with timestamps
- Restore from backup
- Delete backup

#### System Providers View

**File**: `src/pages/System/Providers/index.tsx`

**Components Used:**

- `Toolbox` with "Refresh" and "Reset" buttons
- `Table` - Providers list

**Features:**

- Provider status monitoring
- Error tracking
- Reset failed providers

#### System Releases View

**File**: `src/pages/System/Releases/index.tsx`

**Components Used:**

- `Stack` - Vertical layout
- `Card` - Release cards

**Features:**

- List of available releases
- Release notes
- Version comparison
- Pre-release indicators

#### System Announcements View

**File**: `src/pages/System/Announcements/index.tsx`

**Features:**

- Display application announcements
- Dismissible notifications

---

## UI Components and Patterns

### Reusable Components

#### Toolbox (`src/components/toolbox/`)

**Purpose**: Consistent action bar pattern across all pages

**Components:**

- `Toolbox` - Container component
- `Toolbox.Button` - Standard action button
- `Toolbox.MutateButton` - Async action button with loading state

**Usage:**

```tsx
<Toolbox>
  <Group gap="xs">
    <Toolbox.Button icon={faSync} onClick={refresh}>
      Refresh
    </Toolbox.Button>
    <Toolbox.MutateButton
      icon={faTrash}
      promise={deleteAction}
      onSuccess={handleSuccess}
    >
      Delete
    </Toolbox.MutateButton>
  </Group>
</Toolbox>
```

#### Tables (`src/components/tables/`)

**Purpose**: Reusable table components with consistent styling

**Components:**

- `BaseTable` - Base table component with Mantine styling
- `PageTable` - Table with pagination
- `QueryPageTable` - Table integrated with React Query
- `SimpleTable` - Basic table without pagination
- `PageControl` - Pagination controls

**Features:**

- Row selection
- Expandable rows
- Custom cell renderers
- Sorting
- Responsive design

#### Search (`src/components/Search.tsx`)

**Purpose**: Global search component in header

**Features:**

- Debounced search (500ms)
- Results from series and movies
- Poster thumbnails in results
- Click to navigate to item

#### Action (`src/components/`)

**Purpose**: Icon-based action button

**Features:**

- Tooltip support
- Loading state
- Disabled state
- Custom colors
- Size variants

#### ItemOverview (`src/pages/views/ItemOverview.tsx`)

**Purpose**: Display series/movie overview with fanart background

**Features:**

- Fanart background image
- Poster display
- Title and metadata badges
- Audio language badges
- Language profile badges
- Tags display
- Overview text
- Alternative titles (hover)

#### Modals (`src/components/modals/`)

**Purpose**: Reusable modal patterns

**Modal Types:**

- `HistoryModal` - Download history viewer
- `ManualSearchModal` - Manual subtitle search
- `SubtitleToolsModal` - Bulk subtitle editing tools

#### Forms (`src/components/forms/`)

**Purpose**: Reusable form components

**Form Types:**

- `ItemEditForm` - Edit series/movie settings
- `MovieUploadForm` - Upload movie subtitles
- `SeriesUploadForm` - Upload series subtitles
- `ProfileEditForm` - Edit language profiles
- `ColorToolForm` - Color adjustment tool
- `FrameRateForm` - Frame rate conversion
- `SyncSubtitleForm` - Subtitle synchronization
- `TimeOffsetForm` - Time offset adjustment
- `TranslationForm` - Subtitle translation

#### Dropzone (`src/components/async/DropContent.tsx`)

**Purpose**: Drag-and-drop file upload overlay

**Features:**

- Full-screen dropzone
- Custom drop content
- File validation
- Progress indication

### Mantine UI Components Used

**Layout:**

- `AppShell` - Main application layout
- `Container` - Content containers
- `Grid`, `Grid.Col` - Grid layouts
- `Stack` - Vertical stacking
- `Group` - Horizontal grouping

**Navigation:**

- `Anchor` - Links
- `NavLink` - Navigation links
- `Breadcrumbs` - Breadcrumb navigation

**Data Display:**

- `Table` - Tables (from Mantine)
- `Badge` - Status badges
- `Avatar` - User avatars
- `Image` - Images
- `BackgroundImage` - Background images
- `Progress`, `Progress.Root`, `Progress.Section` - Progress bars
- `RingProgress` - Circular progress indicators

**Forms:**

- `TextInput` - Text inputs
- `PasswordInput` - Password inputs
- `NumberInput` - Numeric inputs
- `Select` - Dropdown selectors
- `MultiSelect` - Multi-select
- `Checkbox` - Checkboxes
- `Switch` - Toggle switches
- `FileInput` - File inputs
- `Textarea` - Text areas

**Feedback:**

- `LoadingOverlay` - Loading overlays
- `Loader` - Spinners
- `Notification` - Notifications
- `Alert` - Alerts
- `Toast` - Toast messages (via @mantine/notifications)

**Overlays:**

- `Modal` - Modal dialogs
- `Drawer` - Side drawers
- `Popover`, `HoverCard` - Popovers

**Menus:**

- `Menu`, `Menu.Target`, `Menu.Dropdown`, `Menu.Item` - Dropdown menus
- `Menu.Divider` - Menu dividers

**Other:**

- `Divider` - Dividers
- `Space` - Spacing
- `Card` - Cards
- `Paper` - Paper containers
- `Title`, `Text` - Typography
- `SimpleGrid` - Simple grid
- `Collapse` - Collapsible content
- `ActionIcon` - Icon buttons
- `Tooltip` - Tooltips
- `Kbd` - Keyboard shortcuts
- `ScrollArea` - Scrollable areas

---

## Data Management Patterns

### Server State (React Query)

**Hooks Location**: `src/apis/hooks/`

**Key Hooks:**

**Series:**

- `useSeriesPagination` - Paginated series list
- `useSeriesById` - Single series
- `useSeriesAction` - Series actions (sync, scan, search)
- `useSeriesModification` - Update series settings
- `useEpisodesBySeriesId` - Episodes for a series

**Movies:**

- `useMoviesPagination` - Paginated movies list
- `useMovieById` - Single movie
- `useMovieAction` - Movie actions
- `useMovieModification` - Update movie settings
- `useDownloadMovieSubtitles` - Download subtitles

**Languages:**

- `useLanguages` - Available languages
- `useLanguageProfiles` - Language profiles
- `useEnabledLanguages` - Enabled languages

**History:**

- `useHistoryStats` - Statistics data

**System:**

- `useSystemSettings` - System settings
- `useSystemStatus` - System status
- `useSystemHealth` - Health checks
- `useSystemJobs` - Background jobs
- `useSystemLogs` - System logs
- `useSystemBackups` - Backups
- `useSystemProviders` - Provider status
- `useSystemReleases` - Release information
- `useSystemTasks` - Scheduled tasks

**General:**

- `useBadges` - Notification badges
- `useEnabledStatus` - Sonarr/Radarr enabled status

### Client State

**Custom Contexts:**

- `NavbarProvider` - Navbar state
- `OnlineProvider` - Online/offline status

**Local Storage Hooks:**

- `usePageSize` - Persisted page size

### Real-time Updates (Socket.IO)

**Location**: `src/modules/socketio/`

**Implementation:**

- Socket.IO client for real-time server events
- Reducer pattern for event handling
- Debounced event processing
- Connection state management

**Events Handled:**

- `connect` - Connection established
- `disconnect` - Connection lost
- `connect_error` - Connection error
- `data` - Server-sent data updates

**Reducers:**

- Update series data
- Update movies data
- Update wanted items
- Update blacklist items
- Update history
- Update system status
- Update badges

### Background Tasks

**Location**: `src/modules/task/`

**Implementation:**

- Task dispatcher with queue management
- Grouped tasks
- Background execution
- Progress tracking

**Task Groups:**

- `ScanDisk` - Disk scanning tasks
- `Sync` - Sync tasks
- `Search` - Subtitle search tasks
- `Download` - Download tasks

---

## Key Interactions and User Flows

### 1. Series/Movie Management Flow

1. **View List**
   - Navigate to `/series` or `/movies`
   - Browse paginated table
   - See status, progress, and profile information

2. **View Details**
   - Click series/movie name
   - See overview with poster, fanart, metadata
   - View episodes/subtitles in table

3. **Edit Settings**
   - Click edit icon
   - Opens modal with settings form
   - Change language profile, tags, etc.
   - Save changes

4. **Mass Edit**
   - Click "Mass Edit" button
   - Select multiple items in table
   - Change profile for selection
   - Save all changes

### 2. Subtitle Search Flow

1. **Automatic Search**
   - Navigate to `/wanted`
   - See list of missing subtitles
   - Click "Search All" button
   - Background job searches for all missing
   - Jobs manager shows progress

2. **Manual Search**
   - Go to series/movie detail
   - Click "Manual" button
   - Opens search modal
   - Select language and provider
   - Browse results
   - Download selected subtitle

3. **Upload Subtitles**
   - Go to series/movie detail
   - Click "Upload" button
   - Drag-and-drop subtitle files
   - Files are processed and saved

### 3. History Analysis Flow

1. **View History**
   - Navigate to `/history/series` or `/history/movies`
   - Browse chronological list
   - Filter by provider, language, action

2. **View Statistics**
   - Navigate to `/history/stats`
   - Select time frame
   - Filter by action, provider, language
   - View bar chart with trends

### 4. Blacklist Management Flow

1. **View Blacklist**
   - Navigate to `/blacklist`
   - See blacklisted items with reasons

2. **Remove Items**
   - Click "Remove All" to clear
   - Or remove individual items

### 5. Settings Configuration Flow

1. **Navigate Settings**
   - Click "Settings" in navbar
   - Browse sections

2. **Configure Languages**
   - Go to `/settings/languages`
   - Create/edit language profiles
   - Set language filters
   - Configure auto-selection rules

3. **Configure Providers**
   - Go to `/settings/providers`
   - Enable/disable providers
   - Configure provider-specific settings
   - Set up anti-captcha

4. **Configure Integrations**
   - Go to `/settings/sonarr` or `/radarr`
   - Enter connection details
   - Test connection
   - Configure sync settings

### 6. System Management Flow

1. **Monitor Tasks**
   - Click notification bell in header
   - Opens jobs manager drawer
   - See running, pending, completed, failed jobs
   - Manage jobs (pause, cancel, force start, reorder)

2. **View Logs**
   - Navigate to `/system/logs`
   - See system logs
   - Filter logs
   - Download log file
   - Clear logs

3. **Manage Backups**
   - Navigate to `/system/backups`
   - Create backup
   - Restore from backup
   - Delete old backups

4. **Check Status**
   - Navigate to `/system/status`
   - View system health
   - See version information
   - Monitor uptime

5. **Manage Providers**
   - Navigate to `/system/providers`
   - Check provider status
   - Reset failed providers
   - View provider errors

---

## Unique and Notable Features

### 1. Jobs Manager (Notification Drawer)

**Location**: `src/App/NotificationDrawer.tsx`

**Features:**

- Real-time job progress tracking
- Grouped by status (running, pending, completed, failed)
- Circular progress indicators
- Job actions:
  - Move to top/bottom (pending jobs)
  - Force start
  - Cancel
- Clear queue by status
- Live event indicators (SignalR)
- Relative timestamps
- Collapsible sections

### 2. Drag-and-Drop File Upload

**Component**: `Dropzone.FullScreen`

**Features:**

- Full-screen dropzone overlay
- Custom drop content design
- File type validation
- Batch file processing
- Progress indication

### 3. Advanced Table Features

**Implemented with TanStack React Table:**

- **Row Selection**: Multi-select with checkboxes
- **Expandable Rows**: Season/episode grouping
- **Custom Cell Renderers**: Progress bars, badges, icons
- **Pagination**: Server-side pagination
- **Sorting**: Column sorting
- **Filtering**: Global search and column filters
- **Virtual Scrolling**: For large datasets

### 4. Language Profile System

**Sophisticated subtitle language management:**

- Multiple profiles with priorities
- Hearing impaired support
- Forced subtitle support
- Per-profile language sets
- Tag-based automatic assignment
- Default profiles for new content
- Language equals mapping

### 5. Real-time Updates

**Socket.IO Integration:**

- Live badge updates
- Automatic data refresh
- Connection status monitoring
- Event-based UI updates
- Optimistic UI updates

### 6. Modular Settings System

**Reusable setting components:**

- Auto-save on change
- Validation
- Conditional visibility (CollapseBox)
- Type-specific inputs
- Section grouping
- Contextual help messages

### 7. Comprehensive Search

**Global search functionality:**

- Debounced search
- Results from series and movies
- Poster thumbnails
- Year in results
- Direct navigation to item

### 8. History Statistics with Charts

**Recharts Integration:**

- Bar charts for download trends
- Multiple data series
- Filtering capabilities
- Responsive design
- Custom styling

### 9. Subtitle Tools Modal

**Bulk subtitle operations:**

- Apply profiles
- Modify settings
- Batch search
- Batch operations

### 10. Manual Search Modal

**Advanced subtitle search:**

- Provider selection
- Language selection
- Score filtering
- Result preview
- Download action

---

## Component Architecture

### Page Component Structure

```
src/pages/
├── Series/                    # Series management
│   ├── index.tsx             # List view
│   ├── Editor.tsx            # Mass editor
│   └── series.test.tsx       # Tests
├── Movies/                    # Movies management
│   ├── index.tsx             # List view
│   ├── Editor.tsx            # Mass editor
│   ├── Details/              # Movie detail
│   │   ├── index.tsx         # Detail view
│   │   └── table.tsx         # Subtitle table
│   └── movies.test.tsx       # Tests
├── Episodes/                  # Series episodes
│   ├── index.tsx             # Episode detail view
│   ├── components.tsx        # Episode components
│   └── table.tsx             # Episode table
├── Wanted/                    # Missing subtitles
│   ├── Series/               # Wanted episodes
│   │   └── index.tsx
│   └── Movies/               # Wanted movies
│       └── index.tsx
├── Blacklist/                 # Blacklisted items
│   ├── Series/
│   │   └── index.tsx
│   └── Movies/
│       └── index.tsx
├── History/                   # Download history
│   ├── Series/               # Episode history
│   │   └── index.tsx
│   ├── Movies/               # Movie history
│   │   └── index.tsx
│   └── Statistics/           # Statistics
│       ├── HistoryStats.tsx
│       └── options.ts
├── Settings/                  # Settings pages
│   ├── General/              # General settings
│   ├── Languages/            # Language settings
│   ├── Providers/            # Provider settings
│   ├── Subtitles/            # Subtitle settings
│   ├── Sonarr/               # Sonarr integration
│   ├── Radarr/               # Radarr integration
│   ├── Plex/                 # Plex integration
│   ├── Notifications/        # Notifications
│   ├── Scheduler/            # Scheduler
│   ├── UI/                   # UI preferences
│   ├── components/           # Shared setting components
│   ├── keys.ts               # Setting keys
│   └── options.ts            # Option arrays
├── System/                    # System management
│   ├── Tasks/                # Task manager
│   │   └── index.tsx
│   ├── Logs/                 # Log viewer
│   │   └── index.tsx
│   ├── Providers/            # Provider status
│   │   └── index.tsx
│   ├── Backups/              # Backup management
│   │   └── index.tsx
│   ├── Status/               # System status
│   │   └── index.tsx
│   ├── Releases/             # Release notes
│   │   └── index.tsx
│   └── Announcements/        # Announcements
│       └── index.tsx
├── views/                     # Shared views
│   ├── ItemView.tsx          # List view template
│   ├── ItemOverview.tsx      # Overview banner
│   ├── WantedView.tsx        # Wanted view template
│   ├── MassEditor.tsx        # Mass editor template
│   └── HistoryView.tsx       # History view template
├── Authentication.tsx         # Login page
└── errors/                    # Error pages
    ├── CriticalError.tsx
    └── NotFound.tsx
```

### Shared Component Structure

```
src/components/
├── async/                     # Async utilities
│   ├── DropContent.tsx       # Dropzone content
│   ├── Lazy.tsx              # Lazy loading wrapper
│   └── QueryOverlay.tsx      # Query loading overlay
├── bazarr/                    # Bazarr-specific components
│   ├── AudioList.tsx         # Audio language display
│   ├── HistoryIcon.tsx       # History action icons
│   ├── Language.tsx           # Language display
│   ├── LanguageProfile.tsx    # Profile display
│   └── LanguageSelector.tsx  # Language selector
├── forms/                     # Form components
│   ├── ColorToolForm.tsx
│   ├── FrameRateForm.tsx
│   ├── ItemEditForm.tsx
│   ├── MovieUploadForm.tsx
│   ├── ProfileEditForm.tsx
│   ├── SeriesUploadForm.tsx
│   ├── SyncSubtitleForm.tsx
│   ├── TimeOffsetForm.tsx
│   ├── TranslationForm.tsx
│   └── uploadFormSelectorTypes.tsx
├── inputs/                    # Input components
│   ├── GroupedSelector.tsx   # Grouped dropdown
│   ├── Selector.tsx          # Dropdown selector
│   └── index.tsx
├── modals/                    # Modal components
│   ├── HistoryModal.tsx
│   ├── ManualSearchModal.tsx
│   ├── SubtitleToolsModal.tsx
│   └── index.ts
├── tables/                    # Table components
│   ├── BaseTable.tsx
│   ├── GroupTable.tsx
│   ├── PageTable.tsx
│   ├── PageControl.tsx
│   ├── QueryPageTable.tsx
│   ├── SimpleTable.tsx
│   └── index.tsx
├── toolbox/                   # Toolbar components
│   ├── Toolbox.tsx
│   ├── Button.tsx
│   └── Toolbox.module.scss
├── Search.tsx                 # Global search
├── StateIcon.tsx              # State indicators
├── SubtitleToolsMenu.tsx      # Subtitle tools menu
├── TextPopover.tsx            # Text popover
├── ErrorBoundary.tsx          # Error boundary
└── index.tsx
```

### Application Structure

```
src/
├── App/                       # App layout
│   ├── index.tsx             # App shell
│   ├── Header.tsx            # Header component
│   ├── Navbar.tsx             # Navigation sidebar
│   ├── NotificationDrawer.tsx # Jobs manager
│   ├── ThemeLoader.tsx        # Theme loading
│   ├── ThemeProvider.tsx      # Theme provider
│   └── *.module.scss          # Styles
├── Router/                    # Routing
│   ├── index.tsx              # Router configuration
│   ├── RouterNames.ts         # Route constants
│   ├── Redirector.tsx         # Root redirect
│   └── type.d.ts              # Route types
├── apis/                      # API layer
│   ├── hooks/                 # React Query hooks
│   ├── queries/               # Query configurations
│   └── raw/                   # Raw API calls
├── components/                # Shared components
├── contexts/                  # React contexts
│   ├── Navbar.ts
│   ├── Online.ts
│   └── Loading.ts
├── modules/                   # Feature modules
│   ├── modals/                # Modal management
│   ├── socketio/              # Socket.IO client
│   └── task/                  # Task dispatcher
├── pages/                     # Page components
├── types/                     # TypeScript types
├── utilities/                 # Utility functions
├── constants/                 # Constants
├── assets/                    # Static assets
├── constants.ts               # Global constants
├── dom.tsx                    # DOM utilities
├── providers.tsx              # App providers
└── vite-env.d.ts              # Vite types
```

---

## State Management Summary

### React Query (Server State)

- All API data fetching
- Pagination
- Caching and invalidation
- Optimistic updates
- Background refetching

### Context API (Client State)

- Navbar open/close state
- Online/offline status
- Modal state management

### Socket.IO (Real-time)

- Live badge updates
- Automatic data refresh
- Connection monitoring

### Local Storage

- Page size preference
- UI preferences

---

## API Integration

### Query Hooks Pattern

All API interactions use custom hooks with React Query:

```typescript
// Example: Series pagination
const query = useSeriesPagination();

// Example: Single item
const { data: series } = useSeriesById(id);

// Example: Actions
const { mutateAsync: action } = useSeriesAction();
await action({ action: "sync", seriesid: id });

// Example: Mutations
const mutation = useSeriesModification();
mutation.mutate({ id, profileid });
```

### API Response Structure

Data is normalized and typed with TypeScript interfaces from `src/types/`.

---

## Styling Approach

### CSS Modules

- Component-specific styles use CSS modules (`.module.scss`)
- Mantine provides utility classes
- SCSS for component styling

### Mantine Theming

- Custom color scheme
- Light/dark mode support
- Responsive breakpoints
- Global styles via `postcss-preset-mantine`

### Responsive Design

- Mobile-first approach
- Breakpoints: base, sm, md, lg, xl
- Hidden/visible from breakpoint utilities
- Fluid typography and spacing

---

## Testing Strategy

### Unit Tests

- Component testing with Vitest
- React Testing Library
- Type checking with TypeScript

### Test Files Found:

- Series tests (`series.test.tsx`)
- Movies tests (`movies.test.tsx`)
- Settings tests (`settings.test.tsx`)
- Forms tests (`forms.test.tsx`)
- Search tests (`Search.test.tsx`)

---

## Performance Optimizations

### Code Splitting

- Lazy loading for heavy routes
- Dynamic imports for components
- Route-based code splitting

### Data Fetching

- Debounced search (500ms)
- Pagination to limit data transfer
- Query caching
- Selective field fetching

### Render Optimization

- React.memo for components
- useMemo for expensive calculations
- useCallback for event handlers
- Virtual scrolling for large tables

---

## Accessibility

### Features:

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support
- Color contrast (WCAG compliant)

---

## Internationalization (i18n)

**Note**: The Bazarr codebase does NOT appear to have internationalization built-in. All text is hardcoded in English.

---

## Security Features

### Authentication

- Form-based authentication (optional)
- API key authentication
- Session management

### CORS Support

- Configurable CORS headers
- Proxy support

### Input Validation

- Form validation on all inputs
- File type validation for uploads
- API key regeneration

---

## Deployment Considerations

### Build Configuration

- Vite for bundling
- Production optimizations
- Environment-specific builds

### PWA Support

- Vite PWA plugin
- Offline capabilities
- Service worker

### Environment Variables

- Base URL configuration
- API endpoints
- Feature flags

---

## Summary of All Views and Pages

### Navigation Structure (Complete Tree)

```
/
├── /                           # Redirect to default (series or movies)
├── /series/                    # TV Series
│   ├── /                       # Series list
│   ├── /edit                   # Mass editor (hidden from nav)
│   └── /:id                    # Episode detail view
├── /movies/                    # Movies
│   ├── /                       # Movies list
│   ├── /edit                   # Mass editor (hidden from nav)
│   └── /:id                    # Movie detail view
├── /history/                   # Download History
│   ├── /series                 # Episode history
│   ├── /movies                 # Movie history
│   └── /stats                  # Statistics with charts
├── /wanted/                    # Missing Subtitles
│   ├── /series                 # Wanted episodes
│   └── /movies                 # Wanted movies
├── /blacklist/                 # Blacklist
│   ├── /series                 # Blacklisted episodes
│   └── /movies                 # Blacklisted movies
├── /settings/                  # Settings
│   ├── /general                # General Settings
│   ├── /languages              # Languages & Profiles
│   ├── /providers              # Provider Configuration
│   ├── /subtitles              # Subtitle Settings
│   ├── /sonarr                 # Sonarr Integration
│   ├── /radarr                 # Radarr Integration
│   ├── /plex                   # Plex Integration
│   ├── /notifications          # Notifications
│   ├── /scheduler              # Scheduler
│   └── /ui                     # UI Preferences
├── /system/                    # System
│   ├── /tasks                  # Task Manager
│   ├── /logs                   # Log Viewer
│   ├── /providers              # Provider Status
│   ├── /backup                 # Backup Management
│   ├── /status                 # System Status
│   ├── /releases               # Release Notes
│   └── /announcements          # Announcements
├── /login                      # Authentication
└── /* (404)                    # Not Found
```

---

## Key Takeaways for Cloning

### Essential Patterns to Implement:

1. **AppShell Layout** - Consistent header/navbar/content structure
2. **Toolbox Pattern** - Action bars with Button and MutateButton variants
3. **QueryPageTable** - Server-side pagination with React Query
4. **Settings Components** - Reusable form components with auto-save
5. **Jobs Manager** - Real-time task monitoring with Socket.IO
6. **Modal System** - Context-based modal management
7. **ItemOverview** - Banner with fanart, poster, and metadata
8. **Badge System** - Status indicators with icons
9. **Progress Indicators** - Linear and circular progress
10. **Navigation Structure** - Multi-level nested routes with badges

### Data Flow:

- React Query for all API calls
- Socket.IO for real-time updates
- Context for local state
- Local Storage for preferences

### UI Framework:

- Mantine UI for all components
- FontAwesome for icons
- Recharts for data visualization

---

## Component Reuse Matrix

### Views:

- `ItemView` - Used by Series and Movies list views
- `WantedView` - Used by Wanted Series and Movies
- `HistoryView` - Used by History Series and Movies
- `MassEditor` - Used by Series and Movies mass editors
- `ItemOverview` - Used by Episodes and Movies detail views

### Tables:

- `BaseTable` - Base for all tables
- `PageTable` - For paginated data
- `QueryPageTable` - For React Query integration
- `SimpleTable` - For non-paginated data

### Forms:

- All settings use shared form components
- Upload forms follow similar pattern

---

## Page-Specific Features Summary

| Page                 | Key Features                            | Components Used                          |
| -------------------- | --------------------------------------- | ---------------------------------------- |
| Series List          | Pagination, Progress bars, Status icons | ItemView, QueryPageTable, Toolbox        |
| Series Episodes      | Expandable rows, Actions, Upload        | ItemOverview, Toolbox, Table, Dropzone   |
| Movies List          | Audio languages, Missing badges         | ItemView, QueryPageTable, Toolbox        |
| Movie Details        | Subtitle table, Upload, Manual search   | ItemOverview, Toolbox, Table, Dropzone   |
| Wanted               | Search All, Individual search           | WantedView, QueryPageTable, Toolbox      |
| Blacklist            | Remove All, Item removal                | Table, Toolbox                           |
| History              | Timestamps, Filters                     | HistoryView, QueryPageTable              |
| History Stats        | Bar charts, Multiple filters            | ResponsiveContainer, BarChart, Select    |
| Settings General     | 9 sections, Various inputs              | Layout, Section, form components         |
| Settings Languages   | Profiles, Auto-selection                | Layout, Section, Table, custom selectors |
| Settings Providers   | Provider toggles, Anti-captcha          | Layout, Section, ProviderView            |
| System Tasks         | Task list, Execution                    | Table, Toolbox                           |
| System Logs          | Filtering, Download, Clear              | Table, Toolbox, LayoutModal              |
| System Status        | Health check, Version info, Uptime      | InfoContainer, Table                     |
| System Backups       | Create, Restore, Delete                 | Table, Toolbox                           |
| System Providers     | Status, Reset                           | Table, Toolbox                           |
| System Releases      | Release notes, Cards                    | Card, Stack                              |
| System Announcements | Display announcements                   | (likely simple list)                     |

---

## Conclusion

Bazarr provides a comprehensive, well-architected frontend for managing subtitle downloads. The application demonstrates excellent patterns for:

- **Modular Architecture** - Clear separation of concerns
- **Reusable Components** - Highly reusable toolbox, tables, and forms
- **Real-time Features** - Socket.IO integration for live updates
- **Data Management** - React Query for efficient server state
- **User Experience** - Intuitive navigation, clear feedback, powerful tools
- **Scalability** - Code splitting, lazy loading, pagination

The application serves as an excellent reference for building similar management interfaces with React, TypeScript, and Mantine UI.
