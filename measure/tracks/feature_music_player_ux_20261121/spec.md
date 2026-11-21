# Spec — Music player: seamless 10-foot UX, D-pad and media keys only

**Track:** `feature_music_player_ux_20261121`
**Owner request (2026-11-21, verbatim):** *"Improve the music player to be a seamless UX in 10-foot interface with only d-pad and media keys on remote."*

## What exists (grounded in code, 2026-11-21)

- One screen, `lib/features/music/music_library_screen.dart` (946 lines): a **sidebar** (Artists / Albums /
  Recently Added / Songs), an artist grid, album art grid, track list, and a **now-playing bar**.
- `lib/features/music/music_player_service.dart` (424 lines): media_kit audio player, a simple queue, shuffle,
  repeat rules in pure helpers (`nextQueueIndex`), auto-advance on `player.stream.completed` (line ~173), and a
  resume store.
- Media keys are already handled **globally** by `lib/core/widgets/tv_media_keys.dart` (play/pause, next, previous,
  ff/rew, stop), with video sessions taking priority; the scope only acts when audio is loaded and no video is active.
- Header actions exist: Search, Play all, Shuffle all (seen on the device).

So the player is not missing features so much as **glue**: the path from "remote in hand" to "music playing" and the
path from "playing" to "change something" are where the friction is.

## Known frictions (measured on the device in earlier sessions, logged in the friction ledger)

1. **The nested sidebar costs two Left presses** to reach the main rail (every other screen needs one); the D-pad
   grammar changes per screen. (Ledger, 2026-11-19.)
2. **"Unknown Artist · 0 songs"** sits in the artists grid — an empty data row that looks broken.
3. **The now-playing bar is the only player surface**: there is no large, legible now-playing view with big art,
   title and a visible queue, and it is unclear whether the bar can even be reached with the D-pad.
4. No measurement exists for the journey *TV off → remote → music playing*, so none of this is ranked by cost.

## Requirements

### R1 — One D-pad grammar
- From any music content surface, **one Left press** returns focus to the main rail; the inner sidebar is reached by
  pressing Right/Down from the rail like any other content. No screen may require two Lefts to leave it.
- Focus is never lost when a list changes (search results, queue end, track change).

### R2 — The player is a first-class surface, not a bar
- The now-playing bar is **focusable** (a visible focus ring) and Enter opens a **full-width now-playing view**:
  large album art, title / artist / album, elapsed / remaining time, progress, and the six controls
  (previous, play/pause, next, shuffle, repeat, back) reachable with arrows only.
- Opening it never interrupts audio; Back returns to the same list with the same focused row.
- Media keys keep working identically in both places (they are global already — this must be regression-tested).

### R3 — Queue is visible and editable with the D-pad
- The now-playing view shows **Up next** (the queue from the current track onwards) and allows moving to any entry
  with arrows + Enter; removing an entry is a single Select on a focused "remove" affordance, with no confirmation
  trap (undo is not required, but the queue must not reshuffle on removal).

### R4 — No empty or broken rows
- A data row with zero tracks (e.g. **Unknown Artist** after re-tagging) is not rendered; the server-side scan should
  also retire such artists so the SPA agrees.

### R5 — Measured journey
- Walk and record: TV on → remote → Home → Music → *N* presses to first sound, presses to pause, presses to skip,
  presses to change album. Target: **≤ 4 presses** to first sound from Music being open; **1 key** to pause
  (media key or Select on the bar); **≤ 3 presses** to skip.

## Non-goals
- New rail destinations, a settings screen, or a separate "music mode".
- Background playback while video plays (video keeps priority; already implemented).
- Server-side audio features (lyrics, gapless) — the queue rules already exist.

## Acceptance
1. On the TV: Music → Select on an album → a track plays; bar focused; Enter opens now-playing with art and time.
2. Two Left presses on any music surface no longer needed to reach the rail (device measurement recorded).
3. Media keys pause/skip from both the list screen and the now-playing view.
4. Unknown Artist row absent; a `flutter test` covers the empty-artist filter.
5. Ledger entry with presses/seconds for each path, before and after.
