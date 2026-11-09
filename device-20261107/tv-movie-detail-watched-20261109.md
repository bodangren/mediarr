# TV movie detail: watched/resume chip (2026-11-09)

The TV movie *poster grid* had ✓ badges, but the movie *detail* screen had no watched indication at all
(`grep isWatched movie_detail_screen.dart` = 0 before this change).

- `MovieDetailScreen` fetches the movie's playback manifest on load and renders a chip above the action
  bar: **✓ Watched** (green) or **▶ 38% · 5:00** (violet), i.e. position in both % and clock. A failed
  lookup is swallowed so the screen never blocks.
- 3 widget tests (resume chip, watched chip, no chip without state) — 14 tests in the file green.

## Device verification (1.3.53 / code 77)
Movies grid shows ✓ on the watched posters (50 First Dates, The Accountant, …). Opening 50 First Dates
shows **✓ Watched** directly above Play, with real backdrop art in the hero — which also proves the
Continue Watching/backdrop server fix reaches the living room.
Evidence: `tv-movies-grid-watched-badges-20261109.png`, `tv-movie-detail-watched-20261109.png`.
