# Specification: Android TV Client (Mediarr TV)

## Overview
A native Android app (Kotlin/Compose) that provides a modern, high-performance interface for browsing, watching, and managing the Mediarr library on a TV screen.

## Functional Requirements
- **Modern "10-foot UI"**:
  - Horizontal, scrolling rows for "Recently Added," "Movies," and "TV Shows."
  - Large poster grids with DPAD-friendly focus states.
  - Detail screen with high-resolution backdrops, plot summaries, and cast info.
  - Detail pages must remain fully navigable on TV screens using DPAD only, including content below the fold.
  - TV series detail pages must present season-level navigation and drill down into episode lists within each season.
  - Detail pages must surface watched and in-progress state so users can understand playback status at a glance.
  - Interactive player UI with transport controls (Play/Pause, Seek, Subtitle Select, Audio Track Select).
  - Playback controls must appear as a unified TV overlay instead of permanently reducing the video viewport.
  - Playback overlay interactions must remain fully DPAD navigable and auto-hide when the user returns to passive viewing.
- **Network Discovery**: Automatically find the Mediarr server via mDNS (`_mediarr._tcp`).
- **Media Playback**: 
  - Native integration with **ExoPlayer** for hardware-accelerated 4K/HDR support.
  - Dynamic loading of sidecar subtitles from the server's manifest.
  - Dynamic switching of audio and subtitle tracks.
  - Subtitle selection must include an explicit off state and subtitle timing adjustment controls.
  - Subtitle and audio selection must be accessible without leaving playback or introducing a second disconnected focus system.
- **State Syncing**:
  - Periodic heartbeat (every 30s) to notify the server of playback progress.
  - Automatic "Resume" prompt if a saved timestamp exists for a media item.
  - Support for marking media as "Watched" locally and on the server.
  - Watched and in-progress state must be reflected in both browsing rows and detail views, including season-level summaries for TV.
  - When playback reaches the end of a stream, the player should exit back to the detail experience instead of stranding the user in the player surface.

## Non-Functional Requirements
- **DPAD Navigation**: The entire UI must be navigable using only Up, Down, Left, Right, Select, and Back buttons.
- **Responsiveness**: Poster loading and UI transitions must be fluid (60fps) on mid-range Android TV boxes.

## Acceptance Criteria
- [ ] App finds the server automatically on first launch.
- [ ] Users can browse the entire library (Movies/TV) with posters.
- [ ] 4K Video plays smoothly with user-selected subtitle tracks.
- [ ] Stopping playback at 15:00 and resuming later starts the video at 15:00.
- [ ] Detail pages remain fully usable via DPAD without requiring pointer drag/scroll workarounds.
- [ ] Reaching the end of playback returns the user to the relevant detail screen.
- [ ] Movie, series, season, and episode views surface watched or in-progress status where applicable.
- [ ] TV series detail flows support season selection and episode drill-down with DPAD-safe navigation.
- [ ] Playback controls appear as an overlay without permanently shrinking the active video viewport.
- [ ] Users can switch subtitles, disable subtitles, and adjust subtitle timing from a TV-friendly playback controls flow.
- [ ] Subtitle and transport controls share a coherent DPAD navigation model during playback.
