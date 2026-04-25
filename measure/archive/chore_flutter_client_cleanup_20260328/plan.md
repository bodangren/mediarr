# Implementation Plan: Flutter Client Cleanup

## Phase 1: Fix Compile Errors

- [ ] Task: Fix `series.dart` — remove dangling record literal at lines 62-80
- [ ] Task: Fix `season.dart` — correct malformed doc comment at lines 1-3
- [ ] Task: Implement `series_detail_screen.dart` with seasons, episodes, and play actions
- [ ] Task: Rename `PlaybackState` in `episode.dart` to `EpisodePlaybackState`
- [ ] Task: Measure - User Manual Verification 'Fix Compile Errors'

## Phase 2: Remove Dead Code & Deduplicate

- [ ] Task: Remove duplicate `_unwrapEnvelope` method from `api_client.dart`
- [ ] Task: Remove no-op `onKeyEvent` handler from `focusable_card.dart`
- [ ] Task: Remove unused dev dependencies (`riverpod_annotation`, `riverpod_generator`, `build_runner`) from `pubspec.yaml`
- [ ] Task: Measure - User Manual Verification 'Remove Dead Code & Deduplicate'

## Phase 3: Reorganize Misplaced Code

- [ ] Task: Extract `SystemStatus` from `api_client.dart` → `shared/models/system_status.dart`
- [ ] Task: Extract `ConnectionStatus` enum and `ApiClientState` from `api_client.dart` → `shared/providers/api_client_state.dart`
- [ ] Task: Extract `DiscoveredServer` from `discovery_service.dart` → `shared/models/discovered_server.dart`
- [ ] Task: Update all imports across `lib/` and `test/` to reflect new file locations
- [ ] Task: Measure - User Manual Verification 'Reorganize Misplaced Code'

## Phase 4: Fix Fragile Patterns

- [ ] Task: Replace try-catch-around-provider in `discovery_screen.dart` with a no-op default `MdnsDiscoveryAdapter`
- [ ] Task: Fix `bonsoir_adapter.dart` to call `resolve()` on discovered services for real host info
- [ ] Task: Measure - User Manual Verification 'Fix Fragile Patterns'

## Phase 5: Fix Tests & Implement Settings Screen

- [ ] Task: Delete or rewrite `playback_screen_test.dart` — current tests build standalone widgets, not PlaybackScreen
- [ ] Task: Audit and fix any other fake test files in `test/`
- [ ] Task: Implement `SettingsScreen` with connection status, server address display, and reconnect button
- [ ] Task: Measure - User Manual Verification 'Fix Tests & Implement Settings Screen'
