# Specification: Flutter Client Cleanup

## Overview

The Flutter cross-platform client (`clients/mediarr-client/`) was scaffolded in a single rapid session. It has compile-breaking syntax errors, a name collision between two unrelated classes, misplaced model/state code in service files, duplicate methods, empty/stub screens, fragile provider patterns, unused dependencies, and fake tests. This track fixes all of these issues to produce a clean, compilable, well-organized Flutter client.

## Functional Requirements

1. **All `.dart` files in `lib/` compile without errors** — fix broken syntax in `series.dart`, `season.dart`, and `series_detail_screen.dart`
2. **No ambiguous name collisions** — rename `PlaybackState` in `episode.dart` to `EpisodePlaybackState`
3. **Models live in `shared/models/`** — extract `SystemStatus`, `ConnectionStatus`, `ApiClientState`, and `DiscoveredServer` from service files
4. **No duplicate methods** — remove `_unwrapEnvelope` (duplicate of `_unwrap`) from `api_client.dart`
5. **No unused code** — remove no-op `onKeyEvent` handler in `focusable_card.dart`, remove unused `riverpod_annotation`, `riverpod_generator`, `build_runner` from `pubspec.yaml`
6. **Provider safety** — replace try-catch-around-provider pattern in `discovery_screen.dart` with a safe default adapter
7. **Series detail screen works** — implement a functional `SeriesDetailScreen` showing seasons, episodes, and play actions
8. **Settings screen works** — implement `SettingsScreen` with connection info, server address display, reconnect button
9. **Tests are meaningful** — delete or rewrite the fake `playback_screen_test.dart`; audit other test files for similar issues
10. **`bonsoir_adapter.dart` resolves services** — call `resolve()` so host info is populated on real networks

## Non-Functional Requirements

- Maintain the existing 10-foot UI / D-pad navigation architecture
- All existing (non-fake) tests continue to pass
- No changes to the router structure or navigation flow
- No new dependencies added

## Acceptance Criteria

- `dart analyze lib/` reports zero errors
- `dart format lib/` reports zero changes needed
- All legitimate tests pass
- No `///` doc comments contain malformed or broken syntax
- No file in `lib/` contains both model classes and service logic
- `pubspec.yaml` contains only actively-used dependencies
- `SeriesDetailScreen` renders seasons and episodes with play actions
- `SettingsScreen` shows connection status and server info

## Out of Scope

- Migrating from `StateNotifier` to `Notifier` (deferred)
- Adding new features beyond the cleanup scope
- Performance optimization
- Platform-specific (Android TV) deep testing
- Adding `toJson` to models
