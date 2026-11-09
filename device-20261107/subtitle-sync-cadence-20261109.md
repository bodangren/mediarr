# Subtitle realignment cadence: 30 → 15 minutes (2026-11-09)

## Why
After fixing the two waste bugs (`aff2692d` per-candidate ledger save, `4ca574df` aligned-output hash),
`aligned 5` now means **+5 ledger entries** (verified 15:30 cycle: 144 → 149). The remaining constraint is
opportunity: the task only ran twice an hour, so at most 10 candidates/hour could be aligned while the
backlog is 1,363 sidecars (measured 3.83/h ≈ 15 days).

## Decision
Run the bounded cycle every 15 minutes instead of every 30. Each cycle still processes at most 5
candidates; it is deterministic and idempotent, and the ledger is saved per candidate.

## Capacity check (before changing)
```
load average: 1.36 (1 min) / 2.33 (5 min) on 4 threads
node-MainThread 12.9% CPU
```
A cycle costs ~2–3.5 min of mostly-ffsubsync CPU; at 4 cycles/hour that is roughly 20 % of one thread,
leaving room for the YouTube transcoder and playback streaming.

## Verification
`GET /api/scheduler/tasks`: `subtitle-sync` now has `cronExpression: "*/15 * * * *"`, next run 15 min away,
status healthy after restart. The next measured windows will show whether the rate roughly doubles; the
report's coverage card and `/api/subtitles/sync/status` (perHour/etaHours) track it automatically.
