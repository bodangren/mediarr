# Spec — Home "Next up" (series-level in-progress row)

Owner request 2026-11-22: *"on the home page, there should be an 'In progress' or 'Next up' section which
lists all the partially watched series and shows the next episode up in the series. Listed from most
recently watched first."*

## Problem
The Home screen's **Continue Watching** row shows individual partially watched *episodes*, so the owner has
to open each series to find where they are up to. There is no series-level answer to "what should I watch
next?" ordered by recent activity.

## Requirements
1. **Engine endpoint** `GET /api/playback/next-up?limit=N` returning, for every series with at least one
   watched episode and at least one unwatched episode that has a file:
   `seriesId`, `title`, `posterUrl`, `backdropUrl`, `year`, `watchedCount`, `totalCount`,
   `nextEpisode {episodeId, seasonNumber, episodeNumber, title}`, `lastWatchedAt`.
2. **Ordering**: most recently watched first (`lastWatchedAt` desc); ties by title.
3. **Next episode rule**: first unwatched episode in season/episode order; an episode with progress but
   not finished (0 < position, not watched) is the next up. Only episodes with a file count.
4. **SPA Home**: a "Next up" section rendering the series posters with `SxxEyy · <episode title>` and
   `<watched>/<total> watched`, clicking opens the series detail.
5. **TV Home**: the same section as a poster row, d-pad reachable, Select opens the series detail.
6. Empty state: the section is absent when no series is in progress.

## Acceptance
- Pure planner tests cover skip-fully-watched, first-unwatched, partial-episode, and recency ordering.
- Route test asserts the payload shape and the limit.
- Device: the TV Home shows the row ordered by recency; SPA Home shows the same items.
