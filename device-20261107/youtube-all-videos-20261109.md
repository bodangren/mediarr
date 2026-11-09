# YouTube All videos + search/sort filter on the TV (1.3.70 / code 94)

From the Kimi YouTube review: the screen only showed channel rails over a fixed 500-cap list, with no
All-videos/search/sort/filter. Server now supports q/channel/watched/sort/offset/limit + total; the TV screen
adds:

- **All videos / Channels** toggle, **View** menu (Recently added · Newest published · Title A–Z ·
  All/Unwatched/Watched) and a debounced search field.
- All-videos mode is a 5-column grid of the queried page; counts show `x of total`.

Device-verified (1.3.70): All videos grid with 324 videos, Channels toggle, View menu and search field
(`tv-youtube-all-videos-grid-20261109.png`); View menu screenshot with the six options.
Widget test covers toggle/grid/search query; See-all test remains green.

Remaining YouTube phase: per-channel/filtered Play all (needs a YouTube playback queue; playback is
single-video today), retryable error states, watched/resume indicators in the grid.
