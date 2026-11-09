# Extraction state no longer lost to overlapping runs (2026-11-09)

## Symptom
After adding durable per-track state, the ledger sometimes did not grow by the five extractions a run
reported. The extraction job could overlap (a pass with 1,600+ skip-checks can take minutes), and each pass
loads the whole state file and rewrites it after every outcome — so the last writer won and the other run's
new entries vanished.

## Fix
`subtitleExtractRunning` guard: a tick that finds the previous pass still running logs
`Embedded subtitle extraction still running; skipping this tick` and returns. Each pass is now the only
writer for its duration.

## Verification
```
19:12 state: 63 tracks (47 extracted)
19:20 run: extracted 5, skipped 2252, failed 0
19:21 state: 70 tracks (54 extracted)   ← every reported extraction persisted
```
Server healthy after restart; next runs continue at 5 per 10-minute cycle with no lost entries.
