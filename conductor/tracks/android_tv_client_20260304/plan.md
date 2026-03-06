# Implementation Plan: Android TV Client (Mediarr TV)

## Execution Notes
- Manual verification tasks are intentionally deferred until the end of the track per user instruction on 2026-03-05.
- Work still follows TDD for unit-testable modules and phase checkpoint commits.
- Branch review on 2026-03-06 found functional gaps in discovery activation, full-library loading, TV episode playback, and DPAD-safe resume flows. These are tracked in the repair phase below.
- Manual testing on 2026-03-06 also found missing TV-safe detail scrolling, absent watched/in-progress indicators, lack of season drill-down for series, and missing end-of-playback return behavior. These are tracked in Phase 5 below.
- Continuation plan on 2026-03-07: finish the remaining work in strict order `6.1 -> 6.2 -> 7.1 -> 7.2 -> final verification/archive` so the playback UI is stabilized before subtitle timing and audio settings are layered on top.
- Current playback code already covers manifest subtitle parsing, explicit subtitle-off selection, and return-to-detail on playback completion, but `PlayerScreen` still uses a permanently visible subtitle rail and has no unified overlay/menu state. Phase 6 should start by centralizing overlay visibility, menu stack, and focus state into testable playback UI logic before additional settings work lands.
- Final acceptance should be validated primarily on a physical Android TV device. The emulator remains useful for install/smoke checks, but it is not the source of truth for DPAD navigation sign-off.

## Phase 1: Scaffolding & Discovery [checkpoint: 07e08d6]
> Goal: Create Android TV project foundation, network discovery, and a DPAD-first home surface with mock data.

### Task 1.1: Scaffold Android TV project structure
- [x] Task: Create `clients/android-tv/` Gradle project with Kotlin + Compose for TV + Media3 baseline. [07e08d6]
  - [x] Sub-task: Add Gradle wrapper/config (`settings.gradle.kts`, root/app build files, gradle properties, wrapper files).
  - [x] Sub-task: Add Android manifest, app theme, and Compose TV dependencies.
  - [x] Sub-task: Add package structure: `core`, `discovery`, `data`, `domain`, `ui`, `player`.
  - [x] Sub-task: Add entry activity and root `MediarrTvApp` composable.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest`
- Expected commit message: `feat(android-tv): scaffold compose-for-tv application`

### Task 1.2: Implement mDNS discovery (NsdManager)
- [x] Task: Implement discovery layer to resolve `_mediarr._tcp` server endpoints. [07e08d6]
  - [x] Sub-task: Add `DiscoveryEndpoint`, `DiscoveryState`, and `DiscoveryRepository` interfaces.
  - [x] Sub-task: Implement `NsdDiscoveryRepository` using Android `NsdManager`.
  - [x] Sub-task: Add endpoint persistence (`DataStore`) and startup fallback behavior.
  - [x] Sub-task: Add `DiscoveryViewModel` orchestration and retry controls.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Discovery*"`
- Expected commit message: `feat(android-tv): add mdns discovery and endpoint persistence`

### Task 1.3: Build Home screen rows with mock data and DPAD focus
- [x] Task: Build TV home experience with mock data first. [07e08d6]
  - [x] Sub-task: Add row/rail models for `Recently Added`, `Movies`, and `TV Shows`.
  - [x] Sub-task: Implement poster card component with focused/unfocused visual states.
  - [x] Sub-task: Implement horizontal row carousels and vertical stacked rows.
  - [x] Sub-task: Wire root navigation shell for Home -> Detail placeholders.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Home*"`
- Expected commit message: `feat(android-tv): implement mock home rows with dpad focus states`

### Task 1.4: Deferred manual verification checkpoint
- [~] Task: Conductor - User Manual Verification 'Phase 1: Scaffolding & Discovery' (started in deferred batch; see `verification_20260305.md`).

## Phase 2: Media Browsing & Detail View [checkpoint: b27c581]
> Goal: Replace mock browsing with live Mediarr API data and build detail experiences.

### Task 2.1: Add Mediarr API client and real metadata integration
- [x] Task: Fetch real metadata from Mediarr APIs (`/api/movies`, `/api/series`, `/api/playback/:id`). [b27c581]
  - [x] Sub-task: Implement HTTP client with JSON serialization and API models.
  - [x] Sub-task: Implement repositories for movie/series list and playback manifest reads.
  - [x] Sub-task: Add configuration source for discovered server base URL.
  - [x] Sub-task: Add error mapping and loading-state contracts for UI.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Repository*"`
- Expected commit message: `feat(android-tv): integrate mediarr metadata apis`

### Task 2.2: Build Detail view screen
- [x] Task: Build detail screen with hero backdrop, synopsis, metadata, and play CTA. [b27c581]
  - [x] Sub-task: Implement `DetailScreen` composable with `Play` action.
  - [x] Sub-task: Display high-resolution poster/backdrop and overview text.
  - [x] Sub-task: Add state handling for loading/error/empty media payloads.
  - [x] Sub-task: Wire navigation from home poster selection into detail route.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Detail*"`
- Expected commit message: `feat(android-tv): add media detail experience`

### Task 2.3: Implement DPAD focus handling for Netflix-style rows
- [x] Task: Implement deterministic DPAD focus traversal across rows/cards/detail actions. [b27c581]
  - [x] Sub-task: Add focus restoration when returning from detail to home.
  - [x] Sub-task: Add row-edge behavior and no-focus-trap safeguards.
  - [x] Sub-task: Add view-model state for selected rail/card indices.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Focus*"`
- Expected commit message: `feat(android-tv): improve dpad traversal and focus restoration`

### Task 2.4: Deferred manual verification checkpoint
- [~] Task: Conductor - User Manual Verification 'Phase 2: Media Browsing & Detail View' (started in deferred batch; see `verification_20260305.md`).

## Phase 3: Playback & Syncing [checkpoint: 7dbbbd7]
> Goal: Add ExoPlayer playback, subtitle/audio selection, resume, and progress sync heartbeat.

### Task 3.1: Integrate ExoPlayer with subtitle/audio track support
- [x] Task: Integrate Media3 ExoPlayer playback flow using playback manifest stream/subtitle URLs. [7dbbbd7]
  - [x] Sub-task: Build `PlaybackSession` from manifest.
  - [x] Sub-task: Configure player media items and sidecar subtitle tracks.
  - [x] Sub-task: Expose audio/subtitle track selection UI.
  - [x] Sub-task: Add player lifecycle handling for app/background state.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*PlaybackSession*"`
- Expected commit message: `feat(android-tv): integrate exoplayer with subtitle and audio tracks`

### Task 3.2: Implement resume prompt and seek restoration
- [x] Task: Implement resume logic based on manifest `resume.position`. [7dbbbd7]
  - [x] Sub-task: Add Resume prompt (`Resume` vs `Start over`) before playback start.
  - [x] Sub-task: Perform seek to saved timestamp on resume path.
  - [x] Sub-task: Clear prompt state and persist local decision metadata.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Resume*"`
- Expected commit message: `feat(android-tv): add playback resume decision flow`

### Task 3.3: Add 30-second playback heartbeat sync
- [x] Task: Add heartbeat task during playback to sync progress with server. [7dbbbd7]
  - [x] Sub-task: Implement periodic (30s) progress POST to `/api/playback/progress`.
  - [x] Sub-task: Emit final heartbeat on pause/stop/end events.
  - [x] Sub-task: Map watched threshold responses into local playback state.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Heartbeat*"`
- Expected commit message: `feat(android-tv): add playback heartbeat progress syncing`

### Task 3.4: Deferred manual verification checkpoint
- [~] Task: Conductor - User Manual Verification 'Phase 3: Playback & Syncing' (blocked pending Phase 1/2 UI interaction fixes).

## Phase 4: Repair & Acceptance Recovery [checkpoint: d5f693d]
> Goal: Bring the committed Android TV implementation in line with the spec before the final deferred manual verification pass.

### Task 4.1: Repair discovery activation and remote endpoint selection
- [x] Task: Ensure discovered endpoints become the active API base URL and persist for future launches.
  - [x] Sub-task: Apply discovered endpoints to the runtime API client instead of only refreshing the home screen.
  - [x] Sub-task: Preserve emulator-safe fallback behavior when discovery is unavailable.
  - [x] Sub-task: Add tests for discovery-driven endpoint activation.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Discovery*" --tests "*HomeViewModel*"`
- Expected commit message: `fix(android-tv): activate discovered endpoints at runtime`

### Task 4.2: Restore complete library browsing and stable artwork loading
- [x] Task: Load the full available movie/series catalog and normalize remote image handling.
  - [x] Sub-task: Replace the fixed 40-item cap with full catalog pagination.
  - [x] Sub-task: Keep poster/backdrop URLs valid for both TMDB and TVDB-backed records.
  - [x] Sub-task: Add repository/API tests for paginated catalog aggregation.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*ApiClient*" --tests "*Repository*"`
- Expected commit message: `fix(android-tv): load complete catalog and stabilize artwork urls`

### Task 4.3: Repair TV playback entry for series and resume navigation
- [x] Task: Route series playback through playable episodes and make resume flows TV-safe.
  - [x] Sub-task: Extend series detail loading to surface playable episode choices from `/api/series/:id`.
  - [x] Sub-task: Play episode ids through the existing playback/progress APIs instead of treating series ids as episodes.
  - [x] Sub-task: Replace handset resume prompt controls with TV-focused controls and add back handling.
  - [x] Sub-task: Add tests for series detail mapping and episode playback session creation.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Detail*" --tests "*Playback*" --tests "*Resume*"`
- Expected commit message: `fix(android-tv): route series playback through episode selections`

## Phase 5: TV UX Completion & Playback Exit
> Goal: Close the manual-test gaps that block a real TV experience and extend the series detail UX to track season progress.

### Task 5.1: Make detail pages fully DPAD navigable on TV
- [x] Task: Ensure movie and series detail screens can be traversed and scrolled entirely with DPAD input.
  - [x] Sub-task: Add deterministic focus/bring-into-view behavior for below-the-fold content.
  - [x] Sub-task: Ensure episode and action rows can be reached without pointer drag workarounds.
  - [x] Sub-task: Add UI or unit coverage for detail-screen focus progression.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Detail*" --tests "*Focus*"`
- Expected commit message: `fix(android-tv): make detail screens dpad navigable`

### Task 5.2: Add watched and in-progress indicators across home and detail views
- [x] Task: Surface playback progress and watched state throughout the browsing experience.
  - [x] Sub-task: Extend client models/repositories with progress or watched metadata from the server.
  - [x] Sub-task: Show in-progress or watched badges on home rows and detail screens.
  - [x] Sub-task: Add season-level completion and in-progress summaries for series.
  - [x] Sub-task: Add tests for progress-state mapping and UI presentation.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Home*" --tests "*Detail*" --tests "*Repository*"`
- Expected commit message: `feat(android-tv): surface watched and in-progress state`

### Task 5.3: Expand series detail from flat episode lists to season drill-down
- [x] Task: Present series as seasons first, then drill down into episodes within the selected season.
  - [x] Sub-task: Group playable episodes by season in repository/domain mapping.
  - [x] Sub-task: Add season list UI with watched and in-progress summaries.
  - [x] Sub-task: Add season detail or expandable episode presentation that remains DPAD-safe.
  - [x] Sub-task: Add tests for season grouping and selection behavior.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Detail*" --tests "*Repository*"`
- Expected commit message: `feat(android-tv): add season drilldown to series detail`

### Task 5.4: Exit player back to detail when playback completes
- [x] Task: Return users to the appropriate detail screen when a stream reaches completion.
  - [x] Sub-task: Observe player end-state transitions and route back on ended playback.
  - [x] Sub-task: Preserve final progress flush and watched-state sync before exiting.
  - [x] Sub-task: Add tests for completion handling and navigation callback behavior.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Playback*" --tests "*Heartbeat*"`
- Expected commit message: `fix(android-tv): return to detail after playback completion`

### Task 5.5: Improve home discoverability and visual polish
- [x] Task: Add dedicated recent-content rails and strengthen the TV visual language.
  - [x] Sub-task: Split the mixed recent rail into `Recently Added Movies` and `Recently Added Shows`.
  - [x] Sub-task: Update mock/test fixtures to match the expanded home-rail structure.
  - [x] Sub-task: Replace the plain stock dark surface with a more intentional TV Material theme and home backdrop treatment.
  - [x] Sub-task: Add or update unit coverage for the revised home-row contracts.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Home*" --tests "*Repository*"`
- Expected commit message: `feat(android-tv): polish home rails and tv theme`

### Task 5.6: Add TV subtitle selection controls
- [x] Task: Add a DPAD-usable subtitle switcher to playback while keeping manifest-order default selection.
  - [x] Sub-task: Surface subtitle choices in the player UI, including an off state.
  - [x] Sub-task: Apply selected subtitle choices through explicit Media3 track selection parameters.
  - [x] Sub-task: Add unit coverage for subtitle selector state and default-selection behavior.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Playback*" --tests "*Player*"`
- Expected commit message: `feat(android-tv): add tv subtitle selector`

## Phase 6: Unified Playback Overlay
> Goal: Replace the temporary always-visible playback controls with a proper TV overlay that keeps video full-size and presents transport/settings actions in one DPAD model.

### Task 6.1: Replace the permanent subtitle rail with an overlay-based playback surface
- [x] Task: Rework playback controls into a TV overlay that appears on interaction and preserves the full video viewport.
  - [x] Sub-task: Introduce a playback overlay state holder/reducer that owns visibility, current panel, and focus-anchor state independent of the Compose layout.
  - [x] Sub-task: Disable the always-visible subtitle rail and replace it with an overlay shell that keeps the video viewport full-size while exposing transport actions plus a settings entry point.
  - [x] Sub-task: Show the overlay on initial playback and DPAD interaction, then auto-hide it after inactivity without interrupting playback or stranding focus.
  - [x] Sub-task: Add unit coverage for overlay visibility, idle timeout, and initial-open behavior where practical.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Playback*" --tests "*Player*"`
- Expected commit message: `feat(android-tv): add unified playback overlay`

### Task 6.2: Unify playback focus and navigation flow
- [x] Task: Ensure transport controls, subtitle access, and audio access operate inside one coherent DPAD interaction model.
  - [x] Sub-task: Model nested playback panels (`controls`, `settings`, and future leaf menus) as one overlay navigation stack instead of separate focus systems.
  - [x] Sub-task: Keep focus movement predictable when opening, closing, and re-opening the overlay so the user returns to a stable anchor action.
  - [x] Sub-task: Ensure Back unwinds nested playback panels before leaving playback and that passive playback cleanly resumes after auto-hide.
  - [x] Sub-task: Add unit or UI-adjacent coverage for overlay back-stack and focus-state transitions.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Playback*" --tests "*Player*"`
- Expected commit message: `fix(android-tv): unify playback overlay focus flow`

## Phase 7: Playback Settings & Accessibility
> Goal: Expand the overlay into a practical TV playback settings experience for subtitles and audio without leaving the player.

### Task 7.1: Add subtitle settings panel with timing adjustment
- [x] Task: Move subtitle controls into a playback settings panel and support subtitle timing adjustment.
  - [x] Sub-task: Promote the existing subtitle selection helpers into a settings submenu with explicit off state and current-selection labeling.
  - [x] Sub-task: Add a session-scoped subtitle timing offset control with visible increment/decrement actions and a readable current offset value.
  - [x] Sub-task: Apply subtitle timing adjustments to the active subtitle rendering path without rebuilding the playback session; document the exact Media3 mechanism if a workaround is required.
  - [x] Sub-task: Add unit coverage for subtitle settings state, offset clamping, and label formatting.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Playback*" --tests "*Subtitle*"`
- Expected commit message: `feat(android-tv): add subtitle settings panel and timing adjustment`

### Task 7.2: Add audio track selection and playback-settings refinement
- [x] Task: Surface audio track selection and finalize the playback settings structure.
  - [x] Sub-task: Read available audio tracks from Media3 after player preparation and expose them through the same playback settings state model used by subtitles.
  - [x] Sub-task: Add a DPAD-safe audio submenu and switch tracks through explicit track-selection parameters without regressing subtitle behavior.
  - [x] Sub-task: Refine labels, defaults, empty states, and menu copy so the settings flow stays TV-appropriate when tracks are missing or auto-selected.
  - [x] Sub-task: Add unit or integration-adjacent coverage for audio option mapping and unified playback-settings navigation.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Playback*" --tests "*Player*"`
- Expected commit message: `feat(android-tv): add audio track selection to playback settings`

## Final Deferred Verification Batch
- [x] Task: Execute manual verification protocol for Phases 1-3 in one pass and attach consolidated evidence note.
- Evidence note: `conductor/tracks/android_tv_client_20260304/verification_20260305.md`
- 2026-03-06 note: physical-device testing confirmed navigation works correctly on an Android TV box; emulator feature coverage is generally good, but emulator DPAD behavior remains unreliable and should not be treated as the source of truth. Phase 5 UX work is now implemented with targeted unit coverage; remaining work is unified playback controls, final acceptance validation, and archival.
- [ ] Task: Validate acceptance criteria end-to-end (discovery, browsing, 4K playback path, resume at timestamp).
  - [ ] Sub-task: Re-run `./gradlew :app:testDebugUnitTest` after each remaining phase and run the combined Android/web regression command before sign-off.
  - [ ] Sub-task: On physical Android TV hardware, verify overlay launch/auto-hide, subtitle off/on/timing adjustment, audio switching, resume-from-timestamp, and return-to-detail on playback end.
  - [ ] Sub-task: Treat emulator validation as secondary evidence only for boot/install/smoke behavior.
- [ ] Task: Update track metadata status and archive track folder if all criteria pass.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest && cd /home/daniel-bo/Desktop/mediarr && CI=true npm test`
- Expected commit message: `chore(conductor): complete deferred manual verification for android tv track`
