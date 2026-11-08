# TV Player Overlay Review — `adult-tv-player-overlay.jpg`

**Verdict:** Functional 10-foot transport controls, but a raw filename title and a seek-bar-blocking volume panel make it read like a debug build, not a TV player.

## Problems & fixes

1. **Title shows the raw filename `001 [1c6d5a2b].mp4`.** Fix: resolve parsed metadata (e.g. `Show · S01E001`) as the headline, demote the filename to a truncated subtitle; fall back to the name only when lookup fails, never show hash brackets.
2. **Right-side floating panel (bell/mute, vertical slider, gear) overlaps the seek track just above `27:49`, and splits into two disconnected cards.** Fix: merge into one card anchored above the transport row so the seek bar stays unobstructed; swap the bell glyph for a speaker/mute icon and print a numeric `65%` so level is readable at 10 feet.
3. **Transport row is asymmetric and focus is invisible.** The purple pause has a focus ring, but `CC` floats far from `+10s`. Fix: center one evenly spaced group (−10s / pause / +10s / CC), give every item a D-pad highlight plus text labels ("Rewind 10s"), and add remaining time (`-27:39`) beside `27:49`.

## Priority

- **P0:** Panel no longer covers the seek bar; D-pad focus visible on all controls.
- **P1:** Metadata title instead of `001 [1c6d5a2b].mp4`; speaker icon + `65%` readout.
- **P2:** Remaining-time label, `-27:39`; tooltip/rename the ambiguous `Sync` chip.
