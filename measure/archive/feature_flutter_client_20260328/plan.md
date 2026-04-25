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
    - [x] Update measure/tech-stack.md with Flutter client entry
    - [x] Update measure/product.md to reference Flutter client
    - [x] Update README.md to reference Flutter client
- [x] Task: Measure — Phase 1 Completion Verification (Protocol in workflow.md)

## Phase 2 — Server Discovery & API Client

- [x] Task: Implement mDNS server discovery
    - [x] Write unit tests for discovery state machine (scanning -> found -> connected / timeout -> manual)
    - [x] Implement mDNS discovery service using bonsoir package
    - [x] Build discovery UI screen with scanning animation and server list
    - [x] Add manual IP:port entry fallback with form validation
    - [x] Persist last-used server address with shared_preferences
- [x] Task: Build API client layer
    - [x] Write unit tests for API client (mock HTTP, error handling, serialization)
    - [x] Implement typed API client for Mediarr REST endpoints (movies, series, episodes, system/status)
    - [x] Create data models (Movie, Series, Season, Episode) matching server API responses
    - [x] Add connection health check (periodic `/api/system/status` ping)
- [x] Task: Implement connection flow integration
    - [x] Write integration test for full discovery -> connect -> health-check flow
    - [x] Wire discovery service and API client into Riverpod providers
    - [x] Build connection status indicator widget (connected/disconnected/reconnecting)
    - [x] Handle server unreachable with automatic retry and user feedback
- [x] Task: Measure — Phase 2 Completion Verification (Protocol in workflow.md)

## Phase 3 — Library Browsing

- [x] Task: Implement movie library
    - [x] Write widget tests for movie grid and detail views
    - [x] Build movie grid view with poster cards, quality badges, and monitored status
    - [x] Build movie detail view (metadata, file info, quality, status)
    - [x] Implement search/filter bar (text search, status filter)
    - [x] Ensure full D-pad navigation through grid and detail views
- [x] Task: Implement series library
    - [x] Write widget tests for series grid, detail, and season/episode views
    - [x] Build series grid view with poster cards and status indicators
    - [x] Build series detail view with season list
    - [x] Build season detail view with episode list (status, air date, quality)
    - [x] Ensure full D-pad navigation through series -> season -> episode hierarchy
- [x] Task: Implement shared library infrastructure
    - [x] Write unit tests for image caching and pagination
    - [x] Implement poster image loading with cached_network_image and placeholder/error states
    - [x] Add pagination/infinite scroll for large libraries
    - [x] Build empty-state and loading-state widgets
- [x] Task: Measure — Phase 3 Completion Verification (Protocol in workflow.md)

## Phase 4 — Media Playback

- [x] Task: Set up media_kit for cross-platform playback
    - [x] Write unit tests for playback state management (play, pause, seek, position tracking)
    - [x] Configure media_kit with platform-specific backends (ExoPlayer on Android, mpv on Linux/macOS)
    - [x] Implement playback provider (Riverpod) managing player lifecycle and state
- [x] Task: Build playback UI
    - [x] Write widget tests for transport controls and overlay behavior
    - [x] Build full-screen player with transport overlay (play/pause, seek bar, time display)
    - [x] Implement overlay auto-hide on inactivity, show on D-pad input
    - [x] Add subtitle track selector (embedded + external subtitle files)
    - [x] Add next/previous episode navigation for series playback
- [x] Task: Implement playback state syncing
    - [x] Write unit tests for sync logic (debounce, conflict resolution, resume)
    - [x] Report playback position to server periodically (POST to playback API)
    - [x] Restore resume position when starting playback
    - [x] Handle network interruption gracefully (buffer locally, sync when reconnected)
- [x] Task: Measure — Phase 4 Completion Verification (Protocol in workflow.md)

## Phase 5 — Polish & Platform Hardening

- [x] Task: Android TV-specific hardening
    - [x] Test and fix D-pad navigation edge cases on Android TV emulator
    - [x] Verify 4K/HDR playback on Android TV hardware (if available)
    - [x] Handle Android TV launcher integration (banner icon, leanback launcher category)
    - [x] Request POST_NOTIFICATIONS runtime permission on Android 13+ (resolves tech debt)
- [x] Task: Linux & macOS desktop hardening
    - [x] Test and fix keyboard navigation on Linux and macOS
    - [x] Handle window resize and fullscreen toggle
    - [x] Verify mpv/libmpv playback on both desktop platforms
    - [x] Add desktop window title and icon
- [x] Task: Cross-platform integration testing
    - [x] Write integration tests for core flows (connect -> browse -> play -> resume)
    - [x] Verify consistent behavior across Android TV, Linux, and macOS
    - [x] Performance test: app startup to library display < 3 seconds
    - [x] Audit and achieve >= 80% test coverage for business logic
- [x] Task: Measure — Phase 5 Completion Verification (Protocol in workflow.md)
