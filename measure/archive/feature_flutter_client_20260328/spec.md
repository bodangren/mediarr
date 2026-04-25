# Specification: Flutter Cross-Platform Client

## Overview

Port the existing Kotlin Android TV client to Flutter, producing a single codebase that targets Android TV, Linux desktop, and macOS. The app provides a 10-foot leanback UI for library browsing and media playback, with automatic server discovery. Linux and macOS desktops serve primarily as debug targets but are fully functional clients.

The legacy Kotlin app (`clients/android-tv/`) is deprecated and will receive no further development.

## Functional Requirements

### FR-1: Server Discovery & Connection
- Auto-discover Mediarr server on the local network via mDNS (Bonjour/Avahi)
- Manual IP:port entry as fallback when mDNS is unavailable or fails
- Persist last-used server address for instant reconnection
- Connection status indicator in the UI

### FR-2: Library Browsing
- Browse movies and TV series from the Mediarr library
- Display poster art, metadata (year, quality, runtime), and status (monitored, downloaded, missing)
- Detail views for movies and series (season/episode listing for TV)
- Search/filter within the library
- D-pad / keyboard-first navigation with visible focus states

### FR-3: Media Playback
- Hardware-accelerated video playback (Android TV: ExoPlayer via platform channel or media_kit; Linux/macOS: mpv/libmpv via media_kit)
- 4K and HDR support on capable hardware
- Playback state syncing with the Mediarr server (resume position)
- Transport controls (play, pause, seek, next/previous episode)
- Subtitle track selection from available embedded/external subtitles

### FR-4: 10-Foot UI / Leanback Experience
- Full D-pad and arrow-key navigation on both platforms
- Large text, high-contrast visuals following Mediarr's "Modern Dark" design language
- Focus management with clear visual indicators
- No mouse/touch dependency (though touch should work on Android)

### FR-5: Project Structure
- Located at `clients/mediarr-client/`
- Legacy `clients/android-tv/` marked as deprecated (README banner, no further development)
- Shared API client layer consuming the existing Fastify REST endpoints

## Non-Functional Requirements

- **NFR-1:** App must build and run on Android TV (API 28+), Linux x86_64, and macOS (Apple Silicon + Intel)
- **NFR-2:** Playback must support hardware decoding where available
- **NFR-3:** App startup to library display under 3 seconds on a local network
- **NFR-4:** Test coverage >= 80% for business logic (API client, state management, discovery)
- **NFR-5:** CI-buildable with `flutter build` for all three targets

## Acceptance Criteria

1. `flutter run -d linux` and `flutter run -d macos` both launch the app, discover or connect to a local Mediarr server, and display the library
2. `flutter run -d <android-tv-emulator>` launches the app with full D-pad navigation
3. User can browse movies and series, open detail views, and start playback on all platforms
4. Playback position is synced to the server and resume works across sessions
5. mDNS discovery works on Android TV; manual fallback works on all platforms
6. Legacy `clients/android-tv/` README states deprecated status; AGENTS.md and measure docs direct agents to `clients/mediarr-client/`

## Out of Scope

- Push notifications (SSE) — deferred to a follow-up track
- Chromecast / casting support
- iOS target — deferred (macOS is in scope)
- Offline mode / local media caching
- User authentication (consistent with server's trusted-LAN model)
