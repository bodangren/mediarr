# Subtitle realignment now walks viewing priority (2026-11-09)

Workstream 1's rule — background passes walk **viewing priority, not insertion order** — was true for the
wanted/bilingual cycles but not for the realignment pass, which walked movies-then-episodes in DB order and
therefore re-scanned ~135 already-done sidecars before reaching new work.

## Change
- `orderCandidatesByRecentPlayback(candidates, recentVideoPaths)` (pure, 2 tests) puts candidates whose
  video appears in the recent `PlaybackProgress` window first, preserving order inside both groups.
- The candidate builder now loads recent playback rows (300) and maps them to video paths.

## Measured effect (15:45 cycle, 15-min cadence)
```
before (15:30, 30-min cadence): scanned 141, aligned 5, skipped 135
after  (15:45, 15-min cadence): scanned  21, aligned 5, skipped  15
ledger 149 -> 154 (+5); status: 154 tried / 151 ok / 1,358 remaining
measured rate 4.04/h, etaHours 336 (was 3.83/h / 356 h at 149)
```
The cycle now reaches new work almost immediately, and the doubled cadence plus ordering keeps the
measured rate climbing. Server suite after the change: **301 files / 2,830 tests passed**.
