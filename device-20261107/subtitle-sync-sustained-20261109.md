# Subtitle realignment: sustained 10-per-cycle confirmed (2026-11-09 16:30)

Two consecutive cycles with the batch-10 limit:
```
16:00 cycle: scanned 31, aligned 10, skipped 20  (finished 16:02:46, ~2.7 min)
16:15 cycle: scanned 41, aligned 10, skipped 30  (finished 16:27:07, ~12 min)
ledger: 154 -> 164 -> 174 (+20 in 30 minutes)
status: 174 tried / 171 ok / 3 gave_up / 1,338 remaining · 4.79/h (24 h window) · etaHours 280
```
Direct throughput is 20/hour at minimum, so the remaining 1,338 need roughly **1.5 days** of cycles rather
than 15. The 24 h `perHour` figure still contains the slow earlier period and will keep rising.

## Guard added
The 16:15 cycle took ~12 min, close to the 15-min slot. Added a `subtitleSyncCycleRunning` guard so an
overlapping tick logs `Subtitle sync cycle still running; skipping this tick` and returns instead of racing
on the JSON ledger. tsc clean; server restarted healthy.

## Third cycle + suite green (16:36)
```
16:36:20 journal: Subtitle sync cycle: scanned 63, aligned 10, skipped 52, failed 0
status: 186 tried / 183 ok / 3 gave_up / 1,326 remaining · 5.29/h · etaHours 251
ledger since 16:00: 154 -> 186 (+32 in ~40 min, three cycles of 10)
```
No `still running` skip has triggered yet (cycles take 2.7–12 min of the 15-minute slot). Full server
suite after the overlap guard: **301 files / 2,830 tests passed, 11 skipped**.
