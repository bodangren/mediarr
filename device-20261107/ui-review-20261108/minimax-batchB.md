# Minimax Batch B — UI review (TV overlay + Adult library SPA)

**Verdict:** Both work but are under-specified — the TV overlay is not D-pad operable (2px seek line, no hit target, right end under the settings panel), and the Adult grid is raw filenames without artwork.

## 1. `adult-tv-player-overlay.jpg` (1280×720, TV transport)

**P0 — Seek bar unusable with a D-pad, and overlapped.** A ~2px white line spans all 1280px with a 14px blue dot at `00:10`; it runs *under* the white settings panel (gear on the line at x=1238, y=486), and elapsed, buffered and remaining look identical from `00:10` to `27:49`. Fix: 8px track, 28px thumb, dim the unplayed part, show buffered range, inset the bar before the panel, echo focused time at the thumb.

**P1 — Right panel unlabelled; the "mute" is a bell.** The top icon is a notification *bell*, not mute — the transport has no mute control. The teal vertical slider has no caption or value; the music-note icon is unexplained. Fix: caption the slider (`Volume 40%`), use a speaker/mute glyph, move the panel off the scrub zone.

**P1 — Title bar shows a raw ingest filename.** Header reads `001 [1c6d5a2b].mp4` — a hash artefact, not a title. Fix: show resolved metadata, filename as fallback.

**P2** — Chrome inconsistent: `CC` is a filled white chip (reads "on") while `-10`/`+10` are bare icons; the focused pause has a double ring.

## 2. `adult-library-spa.jpg` (measures 1280×668, not 1366 wide)

**P0 — No artwork, raw filenames as titles.** Eight tiles read `001 [1c6d5a2b].mp4`, `001 [acc305fb].mp4`… each an empty box with a `—` line and a `Needs review` badge. Fix: poster/thumb or filmstrip placeholder; cleaned title first, filename second.

**P1 — Two collections flattened into one grid.** It promises "its own root and review bucket", yet the 8 `Needs review` items share a grid with Wanted titles (`Best Asian Babes Blowjobs Compilation`, `3 Hole Patrol 1080p`). Fix: split into labelled `Needs review (8)` / `Library (196)`; make `196 items · 8 need review` a filter.

**P1 — Unlabelled toggle beside `Wanted`.** A white pill switch floats on the Wanted row with no caption or on/off text — guesswork on a privacy page. Fix: caption it (`Show wanted list`), add track/knob contrast.

**P2** — Titles truncate (`Asian College Girls Elle Lee, Gia Dibella, Lulu Chu Get Fucked…`), the last row is clipped with no scroll cue, and `Adult` marks active with a 3px bullet.

**Priorities**

- **P0** — TV seek bar hit target + panel overlap; SPA artwork and titles.
- **P1** — TV panel labels + a real mute; SPA review/library split; label the Wanted toggle.
- **P2** — TV button chrome; SPA truncation, scroll, nav state.
