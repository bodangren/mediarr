# Implementation Plan: Android TV Client (Mediarr TV)

## Phase 1: Scaffolding & Discovery
- [ ] Task: Create a new Android project (Mediarr TV) with Leanback/Compose for TV libraries.
- [ ] Task: Implement mDNS Discovery using NsdManager to find the Mediarr server.
- [ ] Task: Build the initial Home screen with rows of posters (Mock Data first).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Scaffolding & Discovery' (Protocol in workflow.md)

## Phase 2: Media Browsing & Detail View
- [ ] Task: Fetch real metadata from the Mediarr `PlaybackManifest` API.
- [ ] Task: Build the Detail View with backdrops, plots, and a "Play" button.
- [ ] Task: Implement DPAD focus handling for a Netflix-style row experience.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Media Browsing & Detail View' (Protocol in workflow.md)

## Phase 3: Playback & Syncing
- [ ] Task: Integrate ExoPlayer with support for dynamic sidecar subtitles from the manifest.
- [ ] Task: Implement the "Resume" logic using `lastPosition` from the manifest.
- [ ] Task: Add a background heartbeat task during playback to sync progress with the server.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Playback & Syncing' (Protocol in workflow.md)
