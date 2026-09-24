# Spec: TV Home Screen Redesign + Player Repair

Track: `feature_tv_home_redesign_20260924`
Date: 2026-09-24
Owner decision: build the mockup home screen first; repair the player next; both in this track.
Owner decision: scope is the home screen only. Movies, Series, and detail screens keep their current design.
Owner decision on 2026-09-25: stop playback when the user leaves the playback screen.

## Source of truth

The owner supplied an "Improved UI mockup" on 2026-09-24 and a revised image on 2026-09-25.
The 2026-09-25 image is the current home-screen design authority. The image on 2026-09-24 remains
the source for the functional requirements. Where either mockup and `DESIGN.md` ("Near-Zero")
disagree, the mockup wins here.

## Problem

The current home screen does not present the library the way the owner wants. The hero lacks
metadata and state-aware actions. Continue Watching cards hide the progress and resume data in
one text line. Rows have no "See All" action. The rail does not carry Search or Settings.

## Functional requirements (home screen)

- FR-1 **Rail.** Five destinations: Home, Movies, Series, Search, Settings. Each item shows one
  icon (32 px) and one label (18 px). The focused item shows a filled pill with accent tint and
  bright text and icon. The current `Mediarr` and `Server` items go away. "Change server" moves to
  Settings and routes to `/discovery?switch=1`.
- FR-2 **Hero.** Full-bleed backdrop with a left-to-right and bottom scrim. Content stack:
  `FEATURED` eyebrow (small, letter-spaced, muted), large title (44 px+, up to two lines), one
  metadata line (`2024 | Sci-Fi | 2h 4m`) with chips for `4K`, `HD`, `PG-13`, a synopsis clamped to
  three lines, and two actions: **Resume** (primary, play icon) and **Details** (dark, info icon).
  The primary action reads `Resume` when the title has playback progress and `Play` otherwise.
- FR-3 **Continue Watching cards.** Thumbnail with a progress bar and a percent value at the right
  edge, then the title, then `Resume at 47:32`. The focused card shows one glow ring (the one-cue
  rule). Select resumes playback.
- FR-4 **Recently Added row.** Landscape thumbnails with a bottom title bar. The row header carries
  a `See All >` action that opens the matching grid screen.
- FR-5 **Search screen.** One text field plus one results grid over movies and series. Select opens
  the matching detail screen. Minimal and D-pad operable.
- FR-6 **Settings screen.** Shows the server address, a `Change server` action (`/discovery?switch=1`),
  and the app version. Minimal and D-pad operable.

## Functional requirements (player repair, owner defects of 2026-09-24)

- FR-7 **Overlay auto-hide.** The transport overlay hides 4 s after the last input and reappears on
  any input. Every input restarts the hide window. The hide must not depend on a one-shot timer that
  can miss its condition.
- FR-8 **Overlay D-pad path.** When the overlay is visible, D-pad Left and Right move focus between
  the transport buttons. Select activates the focused button. Seeks stay on the video surface path.
  Every control is reachable with the remote. No pointer-only interaction.
- FR-9 **Chinese subtitles display.** External subtitle tracks reach the player. The FR-6 default
  selection (English audio, Chinese Simplified subtitles) applies to them. The subtitle picker lists
  them. The nudge (FR-7 of Phase 4) applies to them.
- FR-10 **Subtitle size.** Render subtitle text at a size that the owner can read from the TV
  viewing position. Apply the size to external and embedded tracks.
- FR-11 **Playback control size.** Increase the bottom-row transport and subtitle-nudge controls for
  TV use. Keep the focus cue visible on every control.
- FR-12 **Stop playback on exit.** Stop playback when the user leaves the playback route. Do not
  continue audio or video in the background.
- FR-13 **Remote media keys.** While `PlaybackScreen` is active, Play, Pause, and Play/Pause keys
  must control playback with the overlay visible or hidden. After route exit, no media session may
  continue playback.
- FR-14 **Home mockup fidelity.** At 1920×1080, show the full-width hero, four Continue Watching
  cards, and the start of Recently Added. Use landscape art as a hero backdrop. Keep the rail and
  existing D-pad path.

## Evidence rule (F10)

No task is marked done unless the cited artifact shows the claimed state. Device frames record one
frame per step with its MD5. Byte-identical frames prove that nothing changed. They never prove a
state change.

## Root causes recorded at spec time

1. Overlay never hides: `playback_service.dart:436` hides on a one-shot 4 s timer only when
   `status == playing`. `media_player.dart:121` drops `buffering: false`, so one buffering blip
   sticks the status and the hide never runs.
2. Controls unreachable: `playback_screen.dart:132` maps every key to seek, wake, or toggle. The
   screen has no `FocusTraversalGroup`, so `FocusableAction` buttons hold no D-pad path.
3. Subtitles absent: `media_player.dart:154` opens `Media(streamUrl)` only. `PlaybackManifest`
    (`api_client.dart:100`) carries no subtitle list, so `/api/playback/subtitles/:trackId`
    (`playbackRoutes.ts:187`) tracks never reach the player.
4. Subtitle text and the bottom transport row are too small for the owner to read on the TV.
5. The player route does not reliably stop playback when the user backs out. The owner selected
   stop-on-exit behavior. Remote media keys also need a foreground playback path.
6. The home layout uses cards that are too wide for four cards and places Recently Added below the
   first 1080p view. The revised mockup shows four Continue Watching cards and Recently Added.

## Assumptions

- Artwork comes from the library (`posterUrl`, `fanartUrl`). The mockup artwork is placeholder.
- Each chip (4K, HD, PG-13) renders only when the API provides the field. Missing fields hide chips.
- The D-pad contract of Phase 4c holds: one visible cue per focus, browse to detail to play to resume.

## Non-goals

- No restyle of Movies, Series, or detail screens.
- Playback restyle is limited to FR-10 and FR-11.
- No new server endpoints. The client consumes what the server exposes today.
- No transcoding, subtitle fetching, or subtitle conversion work.
