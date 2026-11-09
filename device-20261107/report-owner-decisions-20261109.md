# Report: "Owner decisions needed" table verified in Chrome (2026-11-09)

Six gates, each with what to provide and the measured impact, rendered above the Known-open-items list:

| Gate | Needed | Unblocks |
|---|---|---|
| Subtitle provider key | provider API key in Settings → Subtitles | fetching missing subtitles; 790 items have neither language |
| Convert or re-download | decision on the 169 traditional-Chinese files | OpenCC conversion with dated backups (tool tested, dry-run only) |
| Harness cutover window | approved moment to stop this host and start `dsh-host.service` | live ledger/heartbeat/alerts/watchdog + reboot proof (session ends by design) |
| Weekly music picks | curated `/config/music-picks.json` (≤3/week) | weekly ingest run; contract + receipts already built |
| TMDB API key | valid key (current 401) | artwork backfill + trailer acquisition |
| YouTube encode ceiling | accept drain time or provide hardware encoder | ~316 pending at measured ~1.4/h ≈ 10 days; remux used when possible |

Screenshot: `report-owner-decisions-20261109.jpg`.
