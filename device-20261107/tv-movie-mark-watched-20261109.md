# TV movie detail: Mark Watched / Mark Unwatched (2026-11-09)

The movie grid's context menu could mark a movie watched, but the movie detail screen only offered
Play / Search Upgrades / Delete.

- `MovieDetailScreen` now has a **Mark Watched** action that becomes **Mark Unwatched** when the chip
  says watched; it calls `POST /api/playback/:id/watched?type=movie`, updates the chip optimistically
  and shows a confirmation snackbar (failure is surfaced, not swallowed silently).
- Widget test: pressing Mark Watched records `(movie, 7, true)` and flips the chip/action.

## Device verification (1.3.54 / code 78)
Opened *12 Angry Men* (no playback state) → **Mark Watched** → chip **✓ Watched** appeared, button became
**Mark Unwatched**, snackbar “Marked as watched”; database row confirmed `mediaId=1 MOVIE isWatched=1`.
Then Mark Unwatched and deleted the test row, restoring the movie to its original no-state.
Evidence: `tv-movie-detail-mark-watched-before-20261109.png`, `tv-movie-detail-marked-watched-20261109.png`.
