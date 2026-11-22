# Spec — Stop the nightly ASR batch from starving the server

Triage 2026-11-23 02:26 (from the TV client log): three `Health check failed: server unreachable`
records while the nightly subtitle job ran. The engine journal at the same second shows
`[event-loop] stalled 259406 ms (max 259406 ms, jobs 'subtitle-sync', 'bilingual-subs', …)` — the
event loop was starved for **4 min 19 s**, so HTTP health checks timed out and the TV showed the server
as down (and playback would have died the same way).

## Root cause
`subs-asr-english.py` starts faster-whisper with no CPU bound on a **4-core** machine: the model runs
all cores at 100 % (plus memory pressure), starving the Node engine. Nothing in the pipeline lowers its
priority — the batch runs `nohup … &` at default nice 0, i.e. it competes with the server.

## Requirements
1. The ASR model is created with a bounded `cpu_threads` (default 2 of 4 cores, `ASR_THREADS` override).
2. The ASR process and the batch runner run at `nice 19` (and `ionice -c 3` for the ASR child where
   available), so the engine always wins.
3. Behaviour, output paths and resumability are unchanged.

## Acceptance
- `--help` and `--dry-run` still work; both scripts compile.
- New ASR run shows ≤ `ASR_THREADS` busy threads and the measured engine event-loop stall during it is
  far below the 259 s incident (target: no stall above 2 s), leaving headroom for health checks.
- Ledger entry with the incident and the fix.
