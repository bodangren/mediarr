# Session verification matrix (2026-11-09 19:35)

## Suites
| Suite | Result |
|---|---|
| Server | **302 files / 2,839 tests passed**, 11 skipped |
| Flutter client | **472 tests passed** |
| SPA | **full suite exit 0** (742 s) |

## Device (TV 1.3.60 / code 84)
- Episode resume: stored 600 s → Home "Resume at 10:00" → playback continued (row 653 s), test row removed.
- Music: playback + now-playing bar; force-stop → "Continue listening · Back in Black — at 0:44".
- Watched parity: TV grids/detail chips, Mark Watched from movie detail (DB-verified), SPA movie/series detail.
- Subtitle coverage screen (per-item reasons), YouTube full library + queue line, hero tokens
  (before/after screenshots MD5-identical), Back=HUD / Stop=exit verified.
- **Extracted embedded Chinese subtitle renders on TV** (movie 19 screenshot with Chinese text).

## Background pipelines (live)
```
subtitle extraction: 59 reclaimed · 19 attempt-capped (16 capped) · 271 actionable queued
subtitle sync:       300 tried / 291 ok / 6 gave_up / 1,272 remaining
                     3h rate 36.7/h → ETA ~35 h; candidates 1,572 (fed by extraction)
YouTube queue:       316 available · 316 pending · 19 retrying · 4 weekly retry · 1 quarantined
                     measured 1.5/h → ETA ~9 days (CPU-bound, no hardware encoder)
storage:             82 % used · ~655 GB free of 3.6 TB · DB 84 MB
```

## Engine / interface performance (measured this session)
- `/api/system/stats` 10.93 s → 0.020 s; movies/series lists 0.94/0.78 s → 0.11/0.12 s.
- `/api/system/events` 8.31 s → 0.012 s; type filter ~8 s → 0.27–0.59 s.
- SPA bundle 1.98 MB → 544 KB on the wire (gzip, browser-timing verified).
- Heaviest JSON API 2,006,693 B → 187,553 B (gzip); TV cold start 0.79–0.83 s.

## Owner-gated inputs (unchanged)
Subtitle provider key · convert-vs-redownload of 169 traditional files · harness cutover window/reboot ·
weekly music picks list · TMDB key · YouTube encode ceiling.
