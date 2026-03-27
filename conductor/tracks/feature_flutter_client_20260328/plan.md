# Implementation Plan: Flutter Cross-Platform Client

> Track: `feature_flutter_client_20260328`
> Spec: [spec.md](./spec.md)

## Phase 1 — Project Scaffold & Platform Setup

- [x] Task: Initialize Flutter project at `clients/mediarr-client/`
    - [x] Run `flutter create` with Android and Linux and macOS targets enabled
    - [x] Configure `pubspec.yaml` with initial dependencies (riverpod, go_router, media_kit, nsd/bonsoir)
    - [x] Set Android `minSdkVersion` 28, enable leanback in AndroidManifest
    - [ ] Verify `flutter build linux`, `flutter build macos`, and `flutter build apk` all succeed with starter app (blocked: cmake/ninja/clang needed)
- [x] Task: Establish app architecture and folder structure
    - [x] Create directory layout: `lib/{core,features,shared}` with feature-first organization
    - [x] Set up Riverpod for state management with `ProviderScope` at root
    - [x] Configure go_router with shell route for 10-foot navigation chrome
    - [x] Write unit tests for router configuration
- [x] Task: Implement design system foundations
    - [x] Create Mediarr dark theme (`ThemeData`) matching "Modern Dark" design tokens
    - [x] Build `FocusableCard` widget with visible focus ring for D-pad navigation
    - [x] Build `LeanbackScaffold` shell with sidebar navigation (Library, Movies, Series, Settings)
    - [x] Write widget tests for focus traversal and theme application
- [x] Task: Deprecate legacy Android TV client
    - [x] Add deprecation banner to `clients/android-tv/README.md`
    - [x] Update AGENTS.md with Flutter client mandate
    - [x] Update conductor/tech-stack.md with Flutter client entry
    - [x] Update conductor/product.md to reference Flutter client
    - [x] Update README.md to reference Flutter client
- [~] Task: Conductor — Phase 1 Completion Verification (Protocol in workflow.md)

## Phase 2 — Server Discovery & API Client

- [ ] Task: Implement mDNS server discovery
    - [ ] Write unit tests for discovery state machine (scanning -> found -> connected / timeout -> manual)
    - [ ] Implement mDNS discovery service using bonsoir package
    - [ ] Build discovery UI screen with scanning animation and server list
    - [ ] Add manual IP:port entry fallback with form validation
    - [ ] Persist last-used server address with shared_preferences
- [ ] Task: Build API client layer
    - [ ] Write unit tests for API client (mock HTTP, error handling, serialization)
    - [ ] Implement typed API client for Mediarr REST endpoints (movies, series, episodes, system/status)
    - [ ] Create data models (Movie, Series, Season, Episode) matching server API responses
    - [ ] Add connection health check (periodic `/api/system/status` ping)
- [ ] Task: Implement connection flow integration
    - [ ] Write integration test for full discovery -> connect -> health-check flow
    - [ ] Wire discovery service and API client into Riverpod providers
    - [ ] Build connection status indicator widget (connected/disconnected/reconnecting)
    - [ ] Handle server unreachable with automatic retry and user feedback
- [ ] Task: Conductor — Phase 2 Completion Verification (Protocol in workflow.md)

## Phase 3 — Library Browsing

- [ ] Task: Implement movie library
    - [ ] Write widget tests for movie grid and detail views
    - [ ] Build movie grid view with poster cards, quality badges, and monitored status
    - [ ] Build movie detail view (metadata, file info, quality, status)
    - [ ] Implement search/filter bar (text search, status filter)
    - [ ] Ensure full D-pad navigation through grid and detail views
- [ ] Task: Implement series library
    - [ ] Write widget tests for series grid, detail, and season/episode views
    - [ ] Build series grid view with poster cards and status indicators
    - [ ] Build series detail view with season list
    - [ ] Build season detail view with episode list (status, air date, quality)
    - [ ] Ensure full D-pad navigation through series -> season -> episode hierarchy
- [ ] Task: Implement shared library infrastructure
    - [ ] Write unit tests for image caching and pagination
    - [ ] Implement poster image loading with cached_network_image and placeholder/error states
    - [ ] Add pagination/infinite scroll for large libraries
    - [ ] Build empty-state and loading-state widgets
- [ ] Task: Conductor — Phase 3 Completion Verification (Protocol in workflow.md)

## Phase 4 — Media Playback

- [ ] Task: Set up media_kit for cross-platform playback
    - [ ] Write unit tests for playback state management (play, pause, seek, position tracking)
    - [ ] Configure media_kit with platform-specific backends (ExoPlayer on Android, mpv on Linux/macOS)
    - [ ] Implement playback provider (Riverpod) managing player lifecycle and state
- [ ] Task: Build playback UI
    - [ ] Write widget tests for transport controls and overlay behavior
    - [ ] Build full-screen player with transport overlay (play/pause, seek bar, time display)
    - [ ] Implement overlay auto-hide on inactivity, show on D-pad input
    - [ ] Add subtitle track selector (embedded + external subtitle files)
    - [ ] Add next/previous episode navigation for series playback
- [ ] Task: Implement playback state syncing
    - [ ] Write unit tests for sync logic (debounce, conflict resolution, resume)
    - [ ] Report playback position to server periodically (POST to playback API)
    - [ ] Restore resume position when starting playback
    - [ ] Handle network interruption gracefully (buffer locally, sync when reconnected)
- [ ] Task: Conductor — Phase 4 Completion Verification (Protocol in workflow.md)

## Phase 5 — Polish & Platform Hardening

- [ ] Task: Android TV-specific hardening
    - [ ] Test and fix D-pad navigation edge cases on Android TV emulator
    - [ ] Verify 4K/HDR playback on Android TV hardware (if available)
    - [ ] Handle Android TV launcher integration (banner icon, leanback launcher category)
    - [ ] Request POST_NOTIFICATIONS runtime permission on Android 13+ (resolves tech debt)
- [ ] Task: Linux & macOS desktop hardening
    - [ ] Test and fix keyboard navigation on Linux and macOS
    - [ ] Handle window resize and fullscreen toggle
    - [ ] Verify mpv/libmpv playback on both desktop platforms
    - [ ] Add desktop window title and icon
- [ ] Task: Cross-platform integration testing
    - [ ] Write integration tests for core flows (connect -> browse -> play -> resume)
    - [ ] Verify consistent behavior across Android TV, Linux, and macOS
    - [ ] Performance test: app startup to library display < 3 seconds
    - [ ] Audit and achieve >= 80% test coverage for business logic
- [ ] Task: Conductor — Phase 5 Completion Verification (Protocol in workflow.md)
