# Report: storage card + live queue progress (2026-11-09)

The live snapshot gained a **Storage** card read from `/api/stats/system`:

**82% used · 657 GB free of 3.6 TB · DB 84 MB**

This is the operational early-warning the hands-off product needs: with 3,574 GB of media on a 3.6 TB
volume, the owner sees pressure before it becomes a failed download.

Browser-verified after reload (Chrome):
```
health:  status ok · scheduler 18 tasks · recovered-at-start 0 · event-loop max lag 1306 ms
storage: 82% used · 657 GB free of 3.6 TB · DB 84 MB
youtube: 303 available · 316 pending · 1 downloading · 35 retrying · 0 exhausted · 1 quarantined
library: 567 movies · 43 series · 4331 episodes · 3574 GB on disk
music:   12 artists · 16 albums · 217 tracks
adult:   197 items · 8 need review
```
Also visible: the YouTube queue is **moving** (303 available, 1 downloading, 35 retrying) — the split fields
(added earlier this session) show retrying vs exhausted correctly at 0 exhausted.
