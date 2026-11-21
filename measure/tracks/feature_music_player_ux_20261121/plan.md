# Plan — Music player 10-foot UX

Track: `feature_music_player_ux_20261121` · Spec: [`spec.md`](./spec.md) · Owner request 2026-11-21

TDD per task; commit per task with a `git notes` summary; `measure(plan)` commit for checkbox updates.
Device verification happens on the TV (`adb -s 192.168.10.60:5555`), **only when the screen is not in use by the
owner** (on 2026-11-21 the TV was running a desktop session — never send input then).

## Phase 0 — Measure the real journey before changing anything

- [x] **P0.1** On an idle TV: record presses for TV on → Music → first sound, pause, skip, change album, back out.
      Include the now-playing bar behaviour (is it focusable? does Enter do anything? where does focus go after a
      track ends?). Write the numbers into `device-20261107/friction-ledger.jsonl`.
- [x] **P0.2** Confirm which media keys the remote actually sends (log `tv_media_keys.dart` handling on press);
      record any key the remote lacks so the D-pad path is the primary one.

### Fixes shipped and verified on the device (2026-11-21, APK 136)

- **Continue listening owns first focus.** The screen's `_focusContentAfterBuild` always pulled focus into the
  artist grid, so the one-press resume was never reachable without arrows (four APKs proved the ordering, not the
  intent). The handoff now prefers the banner when it is on screen. Device frame: the banner is ringed on arrival,
  one Select plays. Cold start → sound: **6 presses** (5 to Music, 1 to resume) instead of 8.
- **Empty artists are not rendered.** The grid filters `trackCount == 0`, so "Unknown Artist · 0 songs" is gone
  (artists count 14 → 13 on the device). Regression test `music_empty_artist_test.dart`.
- Resume loading no longer blocks or breaks the grid (store failures are caught; the resume store is behind
  `musicResumeStoreProvider` so tests can inject one).

### Phase 0 results (2026-11-21, APK 130)

- Cold start → Music screen: **5 presses** (Left, Down×3, Enter). Inside Music → audio: **3 presses**
  (artist, album, Play album). Total **8** to first sound; 0:07 on the bar at Enter+7s.
- The screen offers a **"Continue listening · Master of Puppets — at 3:32"** banner, which is the one-press resume —
  but focus lands on the artists grid, so that banner costs nothing only if it is focused first. **This is the
  largest friction measured.**
- Media keys reach the player and are now logged as smoke telemetry (`media-key Media Pause music=true`).
  MEDIA_PAUSE paused, MEDIA_PLAY resumed during the measurement.
- "Unknown Artist · 0 songs" is still rendered (friction confirmed on device).
- Side effect to own: rapid synthetic MEDIA_PLAY on the *previous* build activated "Keep" on the Adult screen,
  marking ids 97/125/177/188 keep=1 (conservative; recorded in the ledger). No further media-key injection on
  screens with durable actions.

### Device verification (2026-11-21, APK 139)

- The now-playing bar **is** a D-pad surface: 6 Downs from the artist grid lands on shuffle, arrows walk the
  controls, Select toggles playback (time 1:13 -> 1:18). So P2.1's focusability already holds; what is missing is
  a short path and a large view (P2.2/P2.3).
- Media keys control music **from any screen**: MEDIA_PAUSE / MEDIA_PLAY were handled with the TV on Home
  (smoke telemetry `media-key Media Pause music=true`), and music resumed after a video session ended.
- Exit from video playback: **MEDIA_STOP exits in one key**; Back and the on-screen arrow do not, so the
  D-pad-only exit remains the hunt already in the ledger.

### Now-playing view shipped (2026-11-21, APK 147)

Select on the bar's title opens a full now-playing view: large title, elapsed/total with a progress
bar, shuffle/prev/play-pause/next/repeat on the D-pad, and an **Up next** list of the next 8 queue
tracks. Verified on the TV (`/tmp/m147-view.png`); the queue is no longer a separate dialog deep. The
remaining item in this phase is the shorter path to the bar (7 Downs from a full grid) and the
one-Left rail grammar.

## Phase 1 — One D-pad grammar (the two-Lefts problem)

- [x] **P1.1 (Red/Green)** Focus traversal: from any music content, one Left reaches the rail; widget test asserting
      the logical order (rail ← sidebar ← content) for the music screen.
- [ ] **P1.2** Same check for the other nested-sidebar screen (adult/see-all if applicable), so the grammar is uniform.

## Phase 2 — Now-playing surface

- [x] **P2.1 (Red/Green)** Make the bar focusable with a visible focus ring and Enter → now-playing overlay:
      art, title/artist/album, elapsed/remaining, progress, six controls reachable by arrows. Widget tests for
      focusability, the overlay opening, and Back restoring the same list row.
- [x] **P2.2** Queue view inside the overlay: "Up next", arrow navigation, Enter plays an entry, Select on the
      remove affordance removes it without reshuffling.
- [ ] **P2.3** Media-key regression: `tv_media_keys` still pauses/skips from list and overlay, and video still wins
      when a video session is active (unit test around the scope's priority rule).

## Phase 3 — Data hygiene

- [ ] **P3.1 (Red/Green)** Hide artists with zero tracks in the client; retire them in the music scan so the SPA
      agrees (server test + client test).
- [ ] **P3.2** Verify: artists grid has no "Unknown Artist · 0 songs" row on the device.

## Phase 4 — Device verification + close

- [ ] **P4.1** Re-measure the Phase 0 journey; every target in spec R5 met (presses recorded).
- [ ] **P4.2** Build/publish APK (N+1), install, re-assert Home; device frames of the now-playing view.
- [ ] **P4.3** Update `tracks.md`/`lessons-learned.md`; archive when the acceptance list is green.
