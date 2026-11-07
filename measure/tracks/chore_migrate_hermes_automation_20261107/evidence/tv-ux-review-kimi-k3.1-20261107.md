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
