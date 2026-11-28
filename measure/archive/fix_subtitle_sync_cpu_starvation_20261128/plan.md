# Stop subtitle alignment from starving the engine — Plan

Spec: `spec.md`.

## Phase 1 — Low-priority, thread-capped alignment [checkpoint: 449b5fa]

- [x] Task: Write the failing `FfsubsyncAligner` test — the child is spawned through
      `nice -n 19 ionice -c 3`, carries the single-thread BLAS/OpenMP env, keeps the existing
      arguments, and still parses offset/scale (via an injected spawn seam). Red confirmed: 2
      tests failed (no spawn seam, bare binary). — 449b5fa
- [x] Task: Extract `lowPriorityCommand` to a shared module, use it for ffsubsync, and pass the
      thread-capping env. `LowPriorityCommand.ts` shared by the YouTube children too;
      `SINGLE_THREAD_FFT_ENV` (OMP/OpenBLAS/MKL/NUMEXPR = 1). — 449b5fa
- [x] Task: Measure — User Manual Verification 'Phase 1': run the touched server suites and tsc.
      Evidence: `FfsubsyncAligner.test.ts` 2/2 (red before the implementation), `SubtitleSyncService`
      + `YoutubeDownloadService` suites 29/29, `npx tsc -p server/tsconfig.json --noEmit` clean. — 449b5fa

## Phase 2 — Live proof and close

- [x] Task: Gate: reload the engine while the TV is idle and observe the next `subtitle-sync` cycle
      for event-loop stalls; record the measured max stall before/after. Evidence: engine reloaded
      12:35 with `449b5fa`; the 12:57 cycle ran on demand once playback stopped and a live
      `ffsubsync` child (1917 alignment) shows **nice=19** with `OMP_NUM_THREADS=1` /
      `OPENBLAS_NUM_THREADS=1`, using **11.6 % CPU** (single thread) at 2 m 11 s elapsed. The
      watchdog logged **zero `[event-loop] stalled` lines for the whole cycle window** (before the
      fix the same job produced 123.8 s and **392.4 s** stalls), `/api/health` answered in **2 ms**
      during alignment, and node-cron did not miss a minute. — 449b5fa
- [x] Task: Record the incident and fix in `device-20261107/friction-ledger.jsonl`, update
      `measure/tracks.md`, the triage ledger, and archive the track. Ledger entry added (console
      journey `engine-availability`), registry entry archived with the live numbers, folder moved to
      `measure/archive/fix_subtitle_sync_cpu_starvation_20261128/`. — ee2d927
