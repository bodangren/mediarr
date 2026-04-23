# Player-First Flutter Shell Decision

## Current State Analysis

### Existing Flutter Screens

The Flutter client currently has the following screens:

1. **DiscoveryScreen** - Initial route for server discovery (mDNS or manual entry)
2. **ActivityScreen** - Queue/History management (torrents, activity events)
3. **SearchScreen** - Search for movies/series to add to library
4. **MoviesScreen** - Browse movie library
5. **SeriesScreen** - Browse TV series library
6. **SettingsScreen** - Client/server connection and playback settings

### Current Navigation Structure

```
DiscoveryScreen (initial route)
    ↓ (after connection)
LeanbackScaffold with sidebar navigation:
    - Activity (Queue/History)
    - Search
    - Movies
    - Series
    - Settings
```

### Issues with Current Architecture

1. **No Home/Continue Watching** - The app opens to Discovery, then shows Activity by default. There's no "Home" screen with Continue Watching, Recently Added, or Upcoming sections.

2. **Admin-First UX** - Activity and Search are prominent in the nav, but these are secondary for a media player. Users want to watch content first, manage downloads second.

3. **No Playback Resume** - While the API supports continue-watching, there's no UI for it in the Flutter client.

4. **Missing Calendar** - No way to see upcoming releases.

## Target Player-First Architecture

### Primary Goal
The Flutter client should be a **media player first, admin tool second**. The navigation should prioritize:

1. **Continue Watching** - Resume in-progress content (highest priority)
2. **Browse Library** - Movies and Series (combined or separate)
3. **Discover New Content** - Search/Add
4. **Settings** - Connection, playback preferences

### Proposed Navigation Model

```
DiscoveryScreen (initial route - unchanged)
    ↓ (after connection)
HomeScreen (new default route)
    - Continue Watching section (horizontal scroll)
    - Recently Added section (horizontal scroll)
    - Upcoming section (horizontal scroll)
    
LeanbackScaffold with sidebar navigation:
    - Home (NEW - default route)
    - Library (Movies + Series combined, or keep separate)
    - Search
    - Activity (Queue/History) - lower priority
    - Calendar (NEW)
    - Settings
```

### Screen Priority Changes

| Screen | Current Priority | Target Priority | Notes |
|--------|-----------------|-----------------|-------|
| Home/Continue Watching | N/A | 1 (default) | New screen needed |
| Movies | 3 | 2 | Part of Library |
| Series | 4 | 2 | Part of Library |
| Search | 2 | 3 | Lower priority |
| Activity | 1 (default) | 4 | Admin function |
| Calendar | N/A | 5 | New screen needed |
| Settings | 5 | 6 | Keep at end |

## Implementation Plan

### Phase 1: Home Screen (Continue Watching)

Create `HomeScreen` as the new default route with:
- Continue Watching section (horizontal cards with progress bars)
- Recently Added section
- Upcoming section
- One-tap resume for Continue Watching items

**Dependencies:**
- Server endpoint: `GET /api/playback/continue-watching` (already exists)
- Server endpoint: `GET /api/activity?types=download,import` (already exists)
- Server endpoint: `GET /api/dashboard/upcoming` (already exists)

### Phase 2: Library Consolidation

Option A: Keep Movies and Series separate
- MoviesScreen (existing)
- SeriesScreen (existing)

Option B: Combined Library screen
- New LibraryScreen with tabs or filters

**Recommendation:** Keep separate for now (less change), but consider combined view in future.

### Phase 3: Calendar Screen

Create `CalendarScreen` showing:
- Monthly grid with release indicators
- Day tap shows releases for that day
- D-pad navigable

**Dependencies:**
- Server endpoint: `GET /api/dashboard/upcoming?range=month` (already exists)

### Phase 4: Navigation Reorder

Update `LeanbackScaffold._destinations`:

```dart
const _destinations = [
  _NavDestination(  // NEW - default
    path: AppRoutes.home,
    icon: Icons.home_outlined,
    selectedIcon: Icons.home,
    label: 'Home',
  ),
  _NavDestination(
    path: AppRoutes.movies,
    icon: Icons.movie_outlined,
    selectedIcon: Icons.movie,
    label: 'Movies',
  ),
  _NavDestination(
    path: AppRoutes.series,
    icon: Icons.tv_outlined,
    selectedIcon: Icons.tv,
    label: 'Series',
  ),
  _NavDestination(
    path: AppRoutes.search,
    icon: Icons.search,
    selectedIcon: Icons.search,
    label: 'Search',
  ),
  _NavDestination(
    path: AppRoutes.activity,
    icon: Icons.downloading_outlined,
    selectedIcon: Icons.downloading,
    label: 'Activity',
  ),
  _NavDestination(  // NEW
    path: AppRoutes.calendar,
    icon: Icons.calendar_month_outlined,
    selectedIcon: Icons.calendar_month,
    label: 'Calendar',
  ),
  _NavDestination(
    path: AppRoutes.settings,
    icon: Icons.settings_outlined,
    selectedIcon: Icons.settings,
    label: 'Settings',
  ),
];
```

## Acceptance Criteria

- [ ] HomeScreen exists and is the default route after discovery
- [ ] HomeScreen shows Continue Watching, Recently Added, and Upcoming sections
- [ ] Continue Watching items have progress bars and one-tap resume
- [ ] Activity is no longer the default route
- [ ] CalendarScreen exists and shows monthly releases
- [ ] All navigation indices are updated in tests
- [ ] `cd clients/mediarr-client && flutter test` passes

## Out of Scope

- Rebuilding the deprecated Kotlin Android TV app
- Changing authentication or security model
- Implementing subtitle/quality features (separate tracks)
- Server SPA redesign

## Related Tracks

- `feature_flutter_continue_watching_20260330` - Home screen implementation
- `feature_flutter_activity_queue_20260330` - Activity screen (already done)
- `feature_flutter_subtitle_quality_20260330` - Subtitle/quality (future)

## Decision

**APPROVED**: Proceed with Player-First navigation model.

**Next Steps:**
1. Create HomeScreen with Continue Watching as default route
2. Add CalendarScreen
3. Reorder navigation to prioritize content over admin
4. Update all affected tests
5. Archive this decision document

**Rationale:**
- Aligns with product definition of "cross-platform media player"
- Reduces friction for primary use case (watching content)
- Keeps admin functions accessible but secondary
- Server SPA remains available for full admin functionality
