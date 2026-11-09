# Session closeout — 2026-11-09

## State
- **TV: 1.3.71 / code 95** installed on X96Max (192.168.10.60:5555). Server healthy; tree clean (only the
  other session's `dsh-plugins` working copy is dirty and untouched).
- **Suites:** server 305 files / 2,850 tests · Flutter 485 tests (last full run 2026-11-09 23:3x).
- **Report**: http://127.0.0.1:5174/reports/features.html (auto-refresh, open in Chrome) — includes the TV UX
  overhaul status section and owner-decisions table.
- **Measure**: active track `chore_migrate_hermes_automation_20261107` (B2c in progress); TV UX track
  `feature_tv_ux_overhaul_20261109` phases 1–4 partially complete with checkpoints/SHAs; `measure_verify`
  clean at last check.

## Delivered this session
- Subtitle pipeline: states saved per candidate, aligned-output hashing, viewing-priority ordering, 15-min
  cadence, 10/cycle (ledger ~4→40/h), responsive 3h-rate ETA; **embedded Chinese extraction completed**
  (288 reclaimed, queue 0, 58 capped); traditional→simplified conversion (183 files, dated backups) with a
  6-hourly job; audit reports 0 traditional.
- Collections backfilled (112 collections / 196 movies) with daily job.
- Music: server search/metadata + total, Songs Play all/Shuffle all/search, shuffle + repeat off/all/one,
  queue dialog, listening heartbeat endpoint; 1.3.71 on device.
- Movies: server query search/sort/monitored filter + View menu, focused Retry, Clear view, Resume · N% vs
  Start over with post-playback refresh, Collections visible.
- Series: Play all / Play next, resume by recent activity, next-unwatched CTA, hero dead Play fixed.
- YouTube: server search/watched/sort/paging + total; TV All videos/Channels, search, View menu, 5-column grid.
- Six Kimi K3.1 UX reviews committed in `automation/reviews/`.
- TMDB key verified; performance work already in place (stats 20 ms, lists ~8×, events 12 ms, gzip).

## Remaining, in order
1. **Adult PIN/unlock gate** (privacy P0): in-screen gate, expiry/background relock, route lock; then adult
   sections/sort/filter/play-all.
2. Home/Search: ranked result sections, D-pad keyboard/search entry, retryable rails and focus restoration.
3. YouTube per-channel/filtered Play all (requires a YouTube playback queue; playback is single-video today).
4. Series specials/missing-file semantics, season watched toggles, missing-episodes actionable state.
5. Track closeout: full suites, report, archive `feature_tv_ux_overhaul_20261109`; automation track B2c/B3/B4/
   B5/B9 cutover.

## Owner actions (blocked inputs)
- **Subtitle provider key** (settings → subtitles): fetch the 790 items with neither language; 169
  traditional already resolved.
- **YouTube cookies**: sign in to YouTube in Chrome (or supply cookies.txt) — unblocks weekly music picks &
  the queue's bot-checked videos.
- **Harness cutover window**: authorized; not executed because it ends this session mid-track. Run
  `DSH_HOST_CUTOVER=1 bash automation/scripts/install-dsh-host.sh` when ready to hand the brain to systemd.
