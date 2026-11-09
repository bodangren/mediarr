# Embedded-subtitle extraction: 10 per run (2026-11-09 19:45)

With the overlap guard in place and skip-checks dominating runtime, the batch was raised from 5 to 10.

```
19:40 run: extracted 10, skipped 4150 (missing/non-text rows), failed 0 — finished 19:43 (~3 min)
queue: 271 -> 261 actionable; ledger 88 -> 98 tracks (69 extracted / 29 capped-or-failed)
```
The run stays well inside its 10-minute slot (overlap guard would skip a tick if it overran), so the
recovery rate doubles to ~60 tracks/hour. Remaining actionable queue ~261 → roughly 4–5 hours of cycles;
capped rows (16) are excluded from that number, so it can actually reach zero.
