# Keep playback openable when maintenance jobs pile up — Plan

Spec: `spec.md`.

## Phase 1 — Single-flight heavy maintenance jobs [checkpoint: TBD]

- [ ] Task: Write the failing `HeavyJobGate` tests — a second job cannot enter while the first holds
      the gate; the gate reopens when the owner leaves; `runExclusiveHeavyJob` skips and logs when
      held and releases even when the body throws.
- [ ] Task: Implement `HeavyJobGate` + `runExclusiveHeavyJob` and wire them around the heavy
      scheduler jobs in `serviceContainer.ts`.
- [ ] Task: Measure — User Manual Verification 'Phase 1': run the gate suite and server tsc.

## Phase 2 — Patient stream open on the client [checkpoint: TBD]

- [ ] Task: Write the failing Flutter test — with the default budget, repeated open errors keep
      retrying past the old 3-attempt limit and stop at the new bound.
- [ ] Task: Implement exponential open-retry in `PlaybackService` (`retryDelay * 2^attempt`, capped
      15 s, `maxOpenRetries = 6`).
- [ ] Task: Measure — User Manual Verification 'Phase 2': `flutter test --no-pub`,
      `flutter analyze --no-pub`.

## Phase 3 — Ship and close

- [ ] Task: Gate: reload the engine and install the new APK (build/publish/install/launcher), then
      prove the TV plays a YouTube episode while a maintenance sweep runs.
- [ ] Task: Record the incident and fix in `device-20261107/friction-ledger.jsonl`, update
      `measure/tracks.md`, and archive the track.
