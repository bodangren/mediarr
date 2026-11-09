# SPA series-detail episodes now show watched / resume state (2026-11-09)

The owner's original “no indication anything has been watched” complaint had been closed on the TV and
on the SPA movie/series *lists*, but the SPA **series detail** episode rows still only showed
Available/Missing.

- `episodeWatchChip()` turns the API's per-episode `playbackState` into the TV client's vocabulary:
  **✓ Watched** (green) or **▶ n%** (accent) and nothing for negligible progress (3 unit tests).
- `SeriesDetailPage` carries `playbackState` through the raw→view mapping and renders the chip next to
  Available/Missing.

## Browser verification
- *Lioness* S1E01 (23 % in progress) shows **▶ 23%**.
- *American Dad!* Season 1 shows **✓ Watched** on S01E01–E06 while S01E07 (unwatched) shows only
  Available — a clean per-episode distinction. Evidence: `spa-series-detail-watched-20261109.jpg`.
