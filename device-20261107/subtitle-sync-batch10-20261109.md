# Subtitle realignment: 10 candidates per 15-minute cycle (2026-11-09)

With the ledger/hash waste bugs fixed and candidates priority-ordered, a 5-candidate cycle scanned only
~21–31 sidecars and finished quickly. Raised the per-cycle cap to **10** (same 15-minute cadence).

## Measured (16:00 cycle, first with limit 10)
```
journal: Subtitle sync cycle: scanned 31, aligned 10, skipped 20, failed 0
duration: started 16:00:00, completed 16:02:46 (~2.7 min)
ledger: 154 -> 164 (+10 exactly)
status: 164 tried / 161 ok / 3 gave_up / 1,348 remaining · 4.38/h (24 h window) · etaHours 309
```
The 24 h rate still includes the slower earlier period and will climb as the 10-per-cycle windows
accumulate; the directly measured throughput is now **10 aligned per cycle** with cycles finishing well
inside their 15-minute slot, so progress is no longer bottlenecked by the schedule.

Host load after the change stayed low; the next cycles will confirm the sustained rate in the status card.
