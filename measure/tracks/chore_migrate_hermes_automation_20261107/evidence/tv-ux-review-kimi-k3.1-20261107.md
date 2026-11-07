# TV UX review — Kimi K3.1 Pro (2026-11-07)

Independent 10-foot-UI review of the Mediarr TV client screenshots plus reference
TV UIs (Netflix, Roku, Peacock, Hulu, Prime, HBO Max). Verdict: the two-pane
detail direction is right, but playback failure has no recovery, the first
viewport prioritises decoration over the resume CTA, and typography/targets are
below 10-foot minimums. Priorities adopted:

- P0 focused Resume/Play above the fold (detail), actionable Retry/Back on
  playback failure, deterministic focus with full reveal, transport focus on
  Play/Pause.
- P1 Home budget (full Continue row + next-row peek), >=20px body / >=18px
  metadata / >=56px targets, remove bare "0" metadata, demote library
  management under Manage.
- P2 episode thumbnails, remaining-time labels, richer audio/subtitle panel.

Full review text retained in the session; key layout budget: 1064px content =
416px left + 24px gutter + 624px right at 1280x720 logical.

## Live defect session 2026-11-07 (measured over network ADB)

Fixed and verified on the X96Max:
- Resume restarted at 0:00 and corrupted the bookmark (600 s -> 32 s). mpv
  drops a seek issued before the file loads; resume now travels through
  Media(start:) AND an enforced seek after the first duration report.
  Device proof: playback overlay shows 10:00 / 22:45 after Resume.
- All 550 movies were unwatchable (HTTP 500): VariantBackfillService and the
  daily scan wrote Movie.path — the movie FOLDER — as a MediaFileVariant, and
  the resolver picked it. Fixed in both writers and the resolver; 120/120
  sampled movies now return 206.
- Episode list opened on S0 (specials) with only a missing episode, so Select
  fired a silent search. Default season is now the first with a file; the
  unexplained per-row magnifier is gone; Select on a missing row searches.
- Series detail was one tall column (episodes ~1000 px down a 720 px screen).
  Now two-pane with a focused Resume/Play CTA above the fold.
- Playback error was a dead end. Now Retry + Back.
- In-app updater offered "1.0.6 available" while running 1.0.6 and could
  downgrade: CLIENT_VERSION_CODE defaulted to 1. Now derived from the build
  number, strictly-newer only.
- App-wide playback session ownership + native stop before telemetry, so
  play -> back -> play cannot black-screen.

Owner requirement: log ALL failures, not just playback.
- Client: FlutterError.onError, PlatformDispatcher.onError, runZonedGuarded,
  Dio interceptor for every failed HTTP call, GoRouter errorBuilder with a
  recovery screen, explicit playback open/manifest/player errors; route
  tracking, fingerprint dedupe, 60/session cap, disk spool retried on start and
  every 2 min while the server is down.
- Server: POST/GET /api/client-errors (JSONL, 5 MB rotate, torn-line tolerant).
- Triage: DSH scheduled task every 30 min pulls new records into the session.

## Dedicated-box (kiosk) mode — 2026-11-07

The box now boots straight into Mediarr.
- MainActivity declares `android.intent.category.HOME` (priority 10); the
  stock launcher (`com.spocky.projengmenu`) is **not** removed or disabled.
- Applied with `adb shell cmd package set-home-activity
  com.mediarr.mediarr_client/.MainActivity` (returns Success).
- Rollback (no ADB-free path needed either): Settings → "Android home app"
  opens `android.settings.HOME_SETTINGS`; from a shell,
  `cmd package set-home-activity com.spocky.projengmenu/.ui.home.MainActivity`.
- `PopScope(canPop:false)` on the shell route so Back cannot quit the launcher.
- **Verified by reboot**: after `adb reboot` the TV came up in
  `com.mediarr.mediarr_client/.MainActivity` with no launcher step.

## First telemetry catches — 2026-11-07 21:00-21:15

Real failures captured without the owner reporting them:
- `player error: Failed to open .../api/stream/1094?type=episode` (Reacher S02E01)
- `player error: Failed to open .../api/stream/3?type=movie` (2001)
- `HTTP network GET /api/system/status :: connection failed`

Both stream URLs serve HTTP 206 from the host, so the client was not wrong:
the server journal at those exact minutes shows
`node-cron ... missed execution ... Possible blocking IO`, and
`subtitle-sync` runs 332-681 s. **Root cause: long server-side task work stalls
the event loop and starves HTTP responses.** Mitigation shipped: a failed open
is retried twice, 1.5 s apart, before the error screen (v1.1.2).
Remaining P0: move the multi-minute subtitle work off the request-critical path.

## P0 root cause found: the activity poll was saturating the server (2026-11-07 22:15-22:50)

The "Failed to open" playback errors and node-cron "missed execution" warnings
were not the media drive or libmpv. Measured with a new event-loop monitor plus
a Node CPU profile attached through the inspector:

- `ActivityEventRepository.query()` selected **every id** of the production
  `ActivityEvent` table (248,160 rows) just to call `.length`.
- `/api/activity` was polled **once per second**, and `ActivityEvent` had no
  index on `occurredAt`, so each poll also sorted the whole table.
- better-sqlite3 is synchronous, so this ran on the main thread: **86 % CPU,
  400-1200 ms lag on nearly every 500 ms sample, a 24 s boot stall**, 27
  queries/s. Every HTTP request (including `/api/stream`), node-cron timer and
  playback open was starved.

Fixes: `COUNT(*)` instead of materialising ids; `ActivityEvent_occurredAt_idx`
(client + migration runner); activity poll 1 s -> 5 s. Plus stall telemetry in
`/api/health` (`eventLoop`), opt-in `DEBUG_SQL=1` query logging, stale-RUNNING
recovery in the Scheduler, `variantsSkipped` resilience in subtitle automation,
and a scoped/budgeted bilingual scan with an in-flight guard.

**After:** CPU 0.1-10 %, lag 0-1 ms, 1 stall (boot) in 708 samples.
Device proof: Reacher S02E01 - ATM now plays (00:06 / 55:41) — the exact stream
that produced "player error: Failed to open .../stream/1094" at 21:00.

Remaining: the ~26 s stall at process start (migrations + variant backfill on a
cold USB drive) still blocks the first requests after a restart.

## Boot stall fixed: 33.6 s → 1.5 s (2026-11-08)

`/api/health` reported a 24.9 s event-loop stall at every restart. Boot-phase
timing placed it inside `container.initialize()` (30.9 s), and the cause was
`VariantBackfillService`: a `findFirst` per movie (550) and per episode (2971)
— about 3,500 synchronous better-sqlite3 queries against a cold USB drive.

Rewritten to one `findMany` per media type into an in-memory key set, with an
early return when a type has no rows. Measured after:

| Phase | Before | After |
|---|---|---|
| database connected | 200 ms | 52 ms |
| json repair | 2,471 ms | 175 ms |
| services initialized | **30,901 ms** | **1,513 ms** |
| api listening | ~33.6 s | **1.7 s** |

Event-loop `maxLagMs` at boot: 24,878 ms -> 953 ms; stalls 1/133 after.
Tests: VariantBackfillService now asserts one query per media type.

## SPA audit after the setup-gating fix (2026-11-08)

The web UI became reachable for the first time this session (it had been
redirecting every route to /setup because zero indexers were configured). Tour:

- **Fixed:** dashboard "Recently Added" filtered the last 20 activity events for
  import types, so it read "No recent activity." on a 550-movie library. Now it
  reads the library itself (movies + series by `added`), links each row to its
  detail page, and explains the empty state.
- **Fixed:** the Wanted row's Monitored toggle was `bg-accent-success
  text-text-primary` — the monochrome theme's accent is white, so it rendered
  as a blank white pill. Now `text-text-inverse`, with a regression test.
- **Verified healthy:** Movies list (posters, subtitle badges, sizes), series
  list, dashboard continue-watching (41% Reacher / 9% Sopranos), provider status.
- Movies posters only looked blank in one capture because lazy loading had not
  resolved; `document.images` confirmed 500x751 natural sizes.

## The library was silently ignoring 26 of 54 TV folders (2026-11-08)

`/data/TV` held 54 series folders; the database knew 28. The daily `library-scan`
task ran at 02:00, reported SUCCESS after **14.7 minutes**, and changed nothing:
`LibraryScanService.scanEpisodes` only validates paths of episodes that already
exist, and counts unregistered files without creating rows ("we can't
auto-match episodes without metadata"). Every TV folder added after the last
manual import was invisible forever — movies and shows the owner had already
downloaded (How I Met Your Mother S1-S9, For All Mankind S2-S3, Archer S4,
Monarch, Weeds, …) simply never appeared in the client.

Fix: new `TvFolderImportService` + scheduled task `tv-folder-import` (02:40
daily). For each series folder with no database row it runs the same
scanner → metadata match → bulk-import pipeline the web UI's "Import Existing"
uses, with `renameFiles: false` (it links paths, never moves files).

**Result on the live library:** series 28 → 42, episodes with files 2,028,
`stream` returns 206 for an imported HIMYM episode.

**A hard lesson, kept in the code:** the first run imported 18 folders and 8 of
them were the *wrong show* — `MatchFolder` derives its search title from
filenames, so "Mr. Robot" matched "PONY.MOV", "Weeds (2005)" matched
"Kumamiko - Girl Meets Bear", "American Dad!" matched "The Pilot". The wrong
imports were rolled back (backup `mediarr.db.bak-before-tvimport-rollback-20261108`)
and the service now searches by *folder name* and accepts a candidate only when
the normalised titles agree (`isConfidentSeriesMatch`), so ambiguous folders are
reported as `unmatched` instead of guessed. Re-run: 8 imported, 1 honest
unmatched ("Special Ops: Lioness"), 0 wrong.
