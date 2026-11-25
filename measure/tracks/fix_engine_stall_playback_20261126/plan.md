# Keep playback openable when maintenance jobs pile up — Plan

Spec: `spec.md`.

## Phase 1 — Single-flight heavy maintenance jobs [checkpoint: 5ab0bbc]

- [x] Task: Write the failing `HeavyJobGate` tests — a second job cannot enter while the first holds
      the gate; the gate reopens when the owner leaves; `runExclusiveHeavyJob` skips and logs when
      held and releases even when the body throws. Red confirmed: the module did not exist. — 5ab0bbc
- [x] Task: Implement `HeavyJobGate` + `runExclusiveHeavyJob` and wire them around the heavy
      scheduler jobs in `serviceContainer.ts`. Ten jobs gated; `library-scan` uses the separate
      `scheduleLibraryScan` path (daily 02:00, single pass) and stays outside the gate. — 5ab0bbc
- [x] Task: Measure — User Manual Verification 'Phase 1': run the gate suite and server tsc.
      Evidence: `HeavyJobGate.test.ts` 5/5, `Scheduler.test.ts` 22/22, `npx tsc -p
      server/tsconfig.json --noEmit` clean. — 5ab0bbc

## Phase 2 — Patient stream open on the client [checkpoint: 5ab0bbc]

- [x] Task: Write the failing Flutter test — the retry budget must survive repeated open errors past
      the old three-attempt limit. Red confirmed against `defaultMaxOpenRetries`/`openRetryBackoff`,
      which did not exist; the widget-level timer assertion was replaced by the pure policy tests
      because flutter_test's fake zone never fires the service's arming timer. — 5ab0bbc
- [x] Task: Implement exponential open-retry in `PlaybackService` (`retryDelay * 2^attempt`, capped
      15 s, `maxOpenRetries = 6`). — 5ab0bbc
- [x] Task: Measure — User Manual Verification 'Phase 2': `flutter test --no-pub` on
      `playback_service_test.dart` **40/40 passed**; `flutter analyze --no-pub` **No issues found**. — 5ab0bbc

## Phase 3 — Ship and close

- [ ] Task: Gate: reload the engine and install the new APK (build/publish/install/launcher), then
      prove the TV plays a YouTube episode while a maintenance sweep runs.
- [ ] Task: Record the incident and fix in `device-20261107/friction-ledger.jsonl`, update
      `measure/tracks.md`, and archive the track.
