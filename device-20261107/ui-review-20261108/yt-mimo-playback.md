# MiMo 2.6 — YouTube TV playback (small-youtube-tv-playback.jpg)

**Verdict:** With the transport overlay hidden, the screen is a bare video frame — zero viewer orientation (no title, channel, progress, or time) and no affordance telling a 10-foot viewer that remote input does anything.

**Problems & fixes**
1. **No persistent orientation at all.** Nothing identifies what's playing. Fix: keep a slim auto-hiding top bar (title + channel avatar/name) for ~3s on start and on any remote input.
2. **No progress/duration cue.** Viewer can't tell position or length without guessing a key. Fix: show a thin scrubber with elapsed/total time whenever the overlay appears; seek feedback inline.
3. **Overlay reveal is undiscoverable.** No hint that OK/center or Back wakes controls. Fix: on play start show a one-time toast ("Press OK for controls"), and respond to any D-pad event by waking the overlay, auto-hiding after 3–5s idle.

**Priorities**
- **P0:** Always know what's playing — title + channel on overlay wake and playback start.
- **P1:** Progress bar with elapsed/total time; overlay wakes on any remote keypress, auto-hides on idle.
- **P2:** One-time control hint toast and seek-position preview thumbnails.
