# Stop subtitle alignment from starving the engine — Plan

Spec: `spec.md`.

## Phase 1 — Low-priority, thread-capped alignment [checkpoint: TBD]

- [ ] Task: Write the failing `FfsubsyncAligner` test — the child is spawned through
      `nice -n 19 ionice -c 3`, carries the single-thread BLAS/OpenMP env, keeps the existing
      arguments, and still parses offset/scale (via an injected spawn seam).
- [ ] Task: Extract `lowPriorityCommand` to a shared module, use it for ffsubsync, and pass the
      thread-capping env.
- [ ] Task: Measure — User Manual Verification 'Phase 1': run the touched server suites and tsc.

## Phase 2 — Live proof and close

- [ ] Task: Gate: reload the engine while the TV is idle and observe the next `subtitle-sync` cycle
      for event-loop stalls; record the measured max stall before/after.
- [ ] Task: Record the incident and fix in `device-20261107/friction-ledger.jsonl`, update
      `measure/tracks.md`, the triage ledger, and archive the track.
