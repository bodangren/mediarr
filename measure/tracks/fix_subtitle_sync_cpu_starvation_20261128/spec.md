# Spec — Stop subtitle alignment from starving the engine

## Incident (client-error triage, 2026-11-28 12:11 local / 04:11Z)

24 `severity: http` records from the TV (APK 155, route `/discovery`) in 33 seconds, six per
endpoint, all `receiveTimeout` after **30 s**: `GET /api/youtube/queue`, `/api/youtube/latest`,
`/api/youtube/videos`, `/api/music/artists`. The viewer's library screens could not load.

## Measured

- The engine was not down: it has been up since 2026-11-26 06:51 and `/api/health` answers in ~2 ms
  now. It was **unresponsive for minutes**: the scheduler watchdog logged
  `[event-loop] stalled 123843 ms` at 12:03:59 and **`392407 ms`** at 12:10:32, node-cron missed
  12:04–12:10, and the job responsible was `subtitle-sync`, which ran for **14–15 minutes**
  (`Scheduler job 'subtitle-sync' has been running for 14 minutes`, cycle finished 12:11:34 with
  `scanned 2812, aligned 2, skipped 2810`).
- The alignment child is `ffsubsync` ([FfsubsyncAligner.ts](server/src/services/FfsubsyncAligner.ts)):
  it is spawned with **default priority and no thread caps**, so numpy/OpenBLAS FFT work uses every
  core of the 8-thread laptop for the whole cycle. The event-loop monitor's timer, and every HTTP
  request, are then starved — that is the 392 s "stall", not a synchronous JS block.
- This is the second failure of the same family (2026-11-26: five overlapping sweeps, fixed with the
  `HeavyJobGate`). The gate stops jobs overlapping **each other**; it cannot stop a single job's
  child from saturating the CPU.
- The same cycle earlier was harmless only because 12:00–12:10 happened to be idle elsewhere; when
  the owner opened the TV library screens the requests timed out.

## Requirement

A background subtitle-alignment cycle may use spare CPU, but must never prevent the API from
answering: run the child at low priority, bound its thread usage, so the engine keeps serving
requests while alignment proceeds (slower, not louder).

## Design

- Extract `lowPriorityCommand()` (already in `YoutubeDownloadService`) to a shared module so both the
  YouTube children and ffsubsync run under `nice -n 19 ionice -c 3`.
- `FfsubsyncAligner` spawns through that command and passes single-thread BLAS/OpenMP env
  (`OMP_NUM_THREADS=1`, `OPENBLAS_NUM_THREADS=1`, `MKL_NUM_THREADS=1`, `NUMEXPR_NUM_THREADS=1`),
  with a `spawnImpl` seam for tests.
- Add a regression test asserting the command, priority wrapper and env; the existing cycle
  semantics (candidate budget, timeout, ledger) stay unchanged.

## Acceptance

- Red before green: the new aligner test fails on today's code because it spawns the bare binary with
  inherited env.
- `npx vitest run` on the touched suites green; `npx tsc -p server/tsconfig.json --noEmit` clean.
- Live: engine reloaded; the next `subtitle-sync` cycle logs no multi-second event-loop stall
  (monitor lines stay absent or sub-second) while alignment continues to complete.
