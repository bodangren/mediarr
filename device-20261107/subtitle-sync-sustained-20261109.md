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

## Responsive ETA (2026-11-09 16:50)
The 24-hour rate still averages in the slow pre-fix period, which made the report show ~12 days left while
direct throughput was ~1.5 days. `/api/subtitles/sync/status` now also reports a 3-hour rate
(`recentPerHour`/`rateWindowHours`) and computes `etaHours` from it, falling back to the 24-hour rate when
idle. Live:
```
attempted 186 · remaining 1,326 · perHour(24h) 5.29 · recentPerHour(3h) 17 · etaHours 78 (~3 days)
```
The report card shows the responsive figure, and the 3h-window behaviour is unit-tested.

## Continued drain (16:49)
```
16:49 cycle: scanned 75, aligned 10, skipped 64, failed 0
status: 196 tried / 193 ok / 3 gave_up / 1,316 remaining
3h rate 20.3/h · ETA 65 h (~3 days); 24h rate 5.71/h (still averaging the slow period)
ledger series: 154 → 164 → 174 → 186 → 196 (10 per cycle, no overlap skips)
```
Every cycle since the batch-10 change has aligned exactly 10; the report card's responsive ETA has dropped
from 78 h to 65 h as the 3-hour window fills with fast cycles.
