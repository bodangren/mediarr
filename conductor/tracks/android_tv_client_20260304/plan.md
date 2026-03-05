# Implementation Plan: Android TV Client (Mediarr TV)

## Execution Notes
- Manual verification tasks are intentionally deferred until the end of the track per user instruction on 2026-03-05.
- Work still follows TDD for unit-testable modules and phase checkpoint commits.

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
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Scaffolding & Discovery' (deferred to end-of-track verification batch).

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
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Media Browsing & Detail View' (deferred to end-of-track verification batch).

## Phase 3: Playback & Syncing
> Goal: Add ExoPlayer playback, subtitle/audio selection, resume, and progress sync heartbeat.

### Task 3.1: Integrate ExoPlayer with subtitle/audio track support
- [x] Task: Integrate Media3 ExoPlayer playback flow using playback manifest stream/subtitle URLs.
  - [x] Sub-task: Build `PlaybackSession` from manifest.
  - [x] Sub-task: Configure player media items and sidecar subtitle tracks.
  - [x] Sub-task: Expose audio/subtitle track selection UI.
  - [x] Sub-task: Add player lifecycle handling for app/background state.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*PlaybackSession*"`
- Expected commit message: `feat(android-tv): integrate exoplayer with subtitle and audio tracks`

### Task 3.2: Implement resume prompt and seek restoration
- [x] Task: Implement resume logic based on manifest `resume.position`.
  - [x] Sub-task: Add Resume prompt (`Resume` vs `Start over`) before playback start.
  - [x] Sub-task: Perform seek to saved timestamp on resume path.
  - [x] Sub-task: Clear prompt state and persist local decision metadata.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Resume*"`
- Expected commit message: `feat(android-tv): add playback resume decision flow`

### Task 3.3: Add 30-second playback heartbeat sync
- [x] Task: Add heartbeat task during playback to sync progress with server.
  - [x] Sub-task: Implement periodic (30s) progress POST to `/api/playback/progress`.
  - [x] Sub-task: Emit final heartbeat on pause/stop/end events.
  - [x] Sub-task: Map watched threshold responses into local playback state.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest --tests "*Heartbeat*"`
- Expected commit message: `feat(android-tv): add playback heartbeat progress syncing`

### Task 3.4: Deferred manual verification checkpoint
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Playback & Syncing' (deferred to end-of-track verification batch).

## Final Deferred Verification Batch
- [ ] Task: Execute manual verification protocol for Phases 1-3 in one pass and attach consolidated evidence note.
- [ ] Task: Validate acceptance criteria end-to-end (discovery, browsing, 4K playback path, resume at timestamp).
- [ ] Task: Update track metadata status and archive track folder if all criteria pass.
- Test command: `cd clients/android-tv && ./gradlew :app:testDebugUnitTest && cd /home/daniel-bo/Desktop/mediarr && CI=true npm test`
- Expected commit message: `chore(conductor): complete deferred manual verification for android tv track`
