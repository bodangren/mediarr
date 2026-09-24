# Spec: TV Home Screen Redesign + Player Repair

Track: `feature_tv_home_redesign_20260924`
Date: 2026-09-24
Owner decision: build the mockup home screen first; repair the player next; both in this track.
Owner decision: scope is the home screen only. Movies, Series, and detail screens keep their current design.

## Source of truth

The owner supplied an "Improved UI mockup" on 2026-09-24. The mockup is the design authority for
the home screen. Where the mockup and `DESIGN.md` ("Near-Zero") disagree, the mockup wins here.

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

## Assumptions

- Artwork comes from the library (`posterUrl`, `fanartUrl`). The mockup artwork is placeholder.
- Each chip (4K, HD, PG-13) renders only when the API provides the field. Missing fields hide chips.
- The D-pad contract of Phase 4c holds: one visible cue per focus, browse to detail to play to resume.

## Non-goals

- No restyle of Movies, Series, detail, or playback screens beyond FR-7 to FR-9.
- No new server endpoints. The client consumes what the server exposes today.
- No transcoding, subtitle fetching, or subtitle conversion work.
