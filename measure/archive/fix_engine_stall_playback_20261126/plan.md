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

- [x] Task: Gate: reload the engine and install the new APK (build/publish/install/launcher), then
      prove the failing operation works while a sweep runs. Evidence: engine reloaded 06:51 (health
      200, new PID 3232684); APK **1.3.96 / 154** published (59.6 MB) and installed
      (`versionCode=154`), HOME re-asserted to `com.mediarr.mediarr_client/.MainActivity`. Live: the
      gate logged `folder-import: deferred while subtitle-sidecar-register is running a heavy
      maintenance pass.` (06:53) and `youtube-download: deferred while subtitle-sync …` (07:00) —
      four deferrals in twelve minutes — and the exact stream the TV could not open returned
      **206 in 78 ms / 10 ms / 7 ms** while `subtitle-sidecar-register` was mid-sweep (803 ms stall
      logged the same second). Deviation: no scripted TV playback was triggered at 07:00 to avoid
      waking the house; the failing operation (the range request) is the proven surface and the
      client retry is installed on the device. — 5ab0bbc
- [x] Task: Record the incident and fix in `device-20261107/friction-ledger.jsonl`, update
      `measure/tracks.md`, and archive the track. Ledger entry written (playback-open journey, 3
      printed presses, 240 s); mark advanced to `2026-11-25T22:29:36.863Z`; registry entry archived
      with the live numbers; folder moved to `measure/archive/fix_engine_stall_playback_20261126/`. — d9877d1
