# SPA movie detail shows watched / resume state (2026-11-09)

Completing interface parity: the SPA movie *list* showed watched badges, but the movie *detail* page
showed nothing. Episode rows now use one shared helper.

- `watchChip()` (renamed from `episodeWatchChip`, file `app/src/lib/watchState.ts`) maps
  `playbackState` to “✓ Watched” / “▶ n%”; 3 unit tests unchanged.
- `MovieDetailPage` carries `playbackState` from the detail API and renders the chip in the metadata
  row next to year/status/subtitles; `SeriesDetailPage` imports the shared helper.

## Browser verification
- `/library/movies/382` (*The Avengers*, 38 % in progress) shows **▶ 38%** in the header row.
- `/library/movies/552` (*50 First Dates*, watched) shows **✓ Watched**.
- Earlier: *Lioness* S1E01 **▶ 23%**, *American Dad!* S1 watched rows.
Evidence: `spa-movie-detail-progress-20261109.jpg`.
