# Spec — Keep playback openable when maintenance jobs pile up

## Incident (client-error triage, 2026-11-26 06:29 local / 22:29Z)

Three `severity: playback` records from the TV (APK 153, `/playback`):

```
player error: Failed to open http://192.168.10.65:5174/api/youtube/videos/1066/stream.
  attempt: 0, 1, 2   (clientTs 22:29:02, 22:29:09, 22:29:16)
```

The client's bounded open-retry (`maxOpenRetries = 2`, 1.5 s delay) gave up after three tries.

## Measured

- The media row was healthy: `YoutubeVideo` 1066 `AVAILABLE`, path on disk (406 MB mp4), and the route
  is a plain `createReadStream` with range support — nothing wrong with the file.
- The engine was **unresponsive during and after the attempts**: `GET /api/health` took **7.48 s** at
  06:32 while the loop stalled 250 ms–3 s repeatedly (max recorded stall **31.1 s**), and node-cron
  logged `missed execution` at 06:25, 06:27, 06:28. Health was back to 2 ms by 06:34.
- Cause is concurrency, not one job: at 06:23–06:33 `folder-import` (:23), `episode-thumbnails` (:24),
  `embedded-track-sweep` (:26), `youtube-download` (06:24–06:26, yt-dlp + merge) and
  `subtitle-sidecar-register` (:33) all ran in the same window, each spawning ffmpeg/ffprobe or
  walking the whole library.
- Stall maxima over the last 12 h, attributed by the engine's own watchdog: `youtube-download` 31.1 s,
  `folder-import` 31.1 s, `episode-thumbnails` 8.2 s, `subtitle-sidecar-register` 5.9 s,
  `library-scan` 5.9 s — 209/275/331 occurrences respectively.
- This is the same class the project already hit with ffmpeg thumbnail batches (lessons-learned:
  "batch work that spawns processes must yield" — 16.9 s stall, fixed with single-flight + yield).
  The maintenance jobs have no single-flight: they only check playback **before** starting.

## Requirement

Heavy maintenance jobs must not run concurrently: while one is in flight the others skip the cycle
(they are periodic sweeps, so a skipped cycle costs nothing) and the TV's stream-open must survive a
residual stall instead of dying after three quick tries.

## Design

- `HeavyJobGate` (new, `server/src/services/HeavyJobGate.ts`): one process-wide single-flight holder.
  `tryEnter(job)` fails when another job holds it; `leave(job)` releases only the owner.
- `runExclusiveHeavyJob(gate, job, run)` wraps a scheduler body: skip + log
  `"<job>: deferred while <owner> is running a heavy maintenance pass."` when the gate is held,
  always release in `finally`.
- Wire it around the heavy class in `serviceContainer.ts`: `youtube-download`, `folder-import`,
  `episode-thumbnails`, `embedded-track-sweep`, `subtitle-sidecar-register`, `adult-thumbnails`,
  `subtitle-extract`, `library-scan`, `adult-library-scan`, `music-scan`, `subtitle-sync`.
- Client (`clients/mediarr-client`): open-retry becomes exponential (`retryDelay * 2^attempt`, capped
  at 15 s) with `maxOpenRetries = 6`, so a transient engine stall of tens of seconds is ridden out
  instead of surfacing as a failure after ~3 s.

## Acceptance

- Red before green: a `HeavyJobGate` test proves a second job cannot enter while the first holds the
  gate and can after release; a Flutter test proves a slow server (repeated open errors) still ends
  in a retry past the old 3-attempt limit.
- `npx vitest run` (server) / `flutter test --no-pub` green; `npx tsc -p server/tsconfig.json --noEmit`
  and `flutter analyze --no-pub` clean.
- Live: engine reloaded; the log shows heavy jobs deferring to one another under load, and a TV
  stream opens while a sweep is running.
