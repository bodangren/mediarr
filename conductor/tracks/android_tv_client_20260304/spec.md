# Specification: Android TV Client (Mediarr TV)

## Overview
A native Android app (Kotlin/Compose) that provides a modern, high-performance interface for browsing, watching, and managing the Mediarr library on a TV screen.

## Functional Requirements
- **Modern "10-foot UI"**:
  - Horizontal, scrolling rows for "Recently Added," "Movies," and "TV Shows."
  - Large poster grids with DPAD-friendly focus states.
  - Detail screen with high-resolution backdrops, plot summaries, and cast info.
  - Interactive player UI with transport controls (Play/Pause, Seek, Subtitle Select, Audio Track Select).
- **Network Discovery**: Automatically find the Mediarr server via mDNS (`_mediarr._tcp`).
- **Media Playback**: 
  - Native integration with **ExoPlayer** for hardware-accelerated 4K/HDR support.
  - Dynamic loading of sidecar subtitles from the server's manifest.
  - Dynamic switching of audio and subtitle tracks.
- **State Syncing**:
  - Periodic heartbeat (every 30s) to notify the server of playback progress.
  - Automatic "Resume" prompt if a saved timestamp exists for a media item.
  - Support for marking media as "Watched" locally and on the server.

## Non-Functional Requirements
- **DPAD Navigation**: The entire UI must be navigable using only Up, Down, Left, Right, Select, and Back buttons.
- **Responsiveness**: Poster loading and UI transitions must be fluid (60fps) on mid-range Android TV boxes.

## Acceptance Criteria
- [ ] App finds the server automatically on first launch.
- [ ] Users can browse the entire library (Movies/TV) with posters.
- [ ] 4K Video plays smoothly with user-selected subtitle tracks.
- [ ] Stopping playback at 15:00 and resuming later starts the video at 15:00.
