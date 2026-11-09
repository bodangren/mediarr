# Subtitle sync status now reports a measured rate and ETA (2026-11-09)

`summarizeSyncState` counts `syncedAt` entries inside a 24 h window, so the background pass states its own
measured pace instead of a theoretical "5 per 30 min".

Live:
```
attempted 139 · ok 136 · gaveUp 3 · recentAligned 86 (24 h) · perHour 3.58
candidates 1512 · remaining 1373 · etaHours 384  (~16 days)
```
The report's Subtitle-coverage card now appends `sync pass 139/1512 (3.6/h → ~16 d left)`, so the owner
sees both coverage and the alignment backlog in one place.

Tests: `summarizeSyncState` recent-window/rate cases added; 9 sync tests green.
