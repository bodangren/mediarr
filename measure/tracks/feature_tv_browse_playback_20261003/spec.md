# Spec: TV Client Browse Density, Episode Focus, Autoplay, Collections

- **Track ID:** `feature_tv_browse_playback_20261003`
- **Owner:** smart-TV Flutter client (`clients/mediarr-client/`)
- **Date:** 2026-10-03
- **Status:** specced, awaiting Phase 1 implementation
- **Predecessor tracks:** `feature_tv_home_redesign_20260924` (Phase 1-4),
  `chore_replace_jellyfin_consolidation_20260920` (Phase 4c D-pad repair)

## Problem statement (owner report, 2026-10-03)

The TV client is "okayish" but has two blocking browse defects and two
missing capabilities:

1. **Movie grid is unusable.** Roughly three to four large posters fit in
   one row, and only one row is on screen.
2. **Episodes cannot be reached.** On a series, Down from the season chips
   skips every episode and lands on the bottom action buttons. No episode can
   be selected with the remote.
3. **No next-episode autoplay.** The owner wants Netflix-style auto-advance.
4. **No collections browsing.** Collections exist on the server and in the web
   UI, but the TV client cannot show them.

## Measured evidence (2026-10-03)

All numbers below are measured, not estimated.

### Device metrics

```
adb shell wm size    -> Physical size: 1920x1080
adb shell wm density -> Physical density: 240
```

Device pixel ratio is therefore **1.5**, so the app viewport is
**1280x720 logical px**. The rail is **160** logical px wide
(`leanback_scaffold.dart:268`), leaving **1119** logical px of content width.

### FR-1: grid density

Measured with a temporary probe test that laid out the real `MoviesScreen`
and `SeriesScreen` inside the real `LeanbackScaffold` at 1920x1080 / dpr 1.5:

```
MOVIES GRID size=Size(1119.0, 407.4)
MOVIES POSTER count=4
  POSTER at (185,313) 250x431
  POSTER at (459,313) 250x431
  POSTER at (733,313) 250x431
  POSTER at (1006,313) 250x431
SERIES GRID size=Size(1119.0, 407.4)   (identical)
SERIES POSTER count=4
```

Findings:

- The grid viewport is **1119 x 407.4** logical px.
- `SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 280)`
  (`movies_screen.dart:134`, `series_screen.dart:134`) resolves to
  **4 columns of 250 x 431** logical px (375 x 646 physical px per poster).
- **Exactly one row is visible.** The tile height (431) exceeds the grid
  viewport height (407.4), so the row is also clipped at the bottom and the
  second row is entirely off-screen.
- The remaining vertical budget is consumed above the grid: search header
  **100** logical px and Continue Watching **213** logical px (30 % of the
  720 px screen).
- Two full rows of posters cannot fit in 407 px unless a poster is at most
  `(407 - spacing) / 2 = 195` logical px tall. Reaching a comfortable 6x2
  therefore requires giving the grid vertical space back.

### FR-2: episode focus

Driving the real `SeriesDetailScreen` with the D-pad at device metrics, using
`test/support/focus_probe.dart`:

```
ENTRY   -> "Back"
DOWN 1  -> "S1 7/7"              (season chip)
DOWN 2  -> "Search All Missing"   (bottom ActionBar; all 7 episodes skipped)
DOWN 3  -> "Search All Missing"   (stuck)
... DOWN 8 -> "Search All Missing"
```

Root cause: `_EpisodeRow` (`episode_list.dart:182`) renders **no focusable
node**. Only the two small icons at the far right of each row (play at x≈1000,
search at x≈1050) are focus stops. Directional focus from a season chip has no
episode node to land on, so Flutter's geometric search picks the ActionBar
below, which spans the full width. Further Down presses cannot leave it
because it is the last focusable node in the column.

This is the same defect class as `F3` in
`chore_replace_jellyfin_consolidation_20260920/tv-ux-investigation-20260924.md`:
a control with no traversal stop of its own, reached only by geometry.

### FR-3 and FR-4: what already exists

Verified before speccing, so this track builds on proven foundations:

- `PlaybackScreen` already accepts a `nextEpisode` callback
  (`playback_screen.dart:49`) and renders a `Next Episode` button
  (`playback_screen.dart:811`) and a skip-next transport button
  (`playback_screen.dart:507`), but **no caller ever passes it**:
  `openFullscreenPlayback` (`playback_navigation.dart:15`) has no such
  parameter and `app_router.dart:109` does not forward one. The capability is
  present and dead.
- No server work is needed for autoplay. The client already holds the complete
  ordered episode list from `GET /api/series/:id` (season and episode order
  arrive in `Series.seasons` / `Season.episodes`), so the play queue is
  computed client-side.
- Collections are fully implemented server-side and in the web UI:
  `GET /api/collections` and `GET /api/collections/:id` return name, overview,
  poster, backdrop, `movieCount`, `moviesInLibrary`, and the movie list
  (`collectionRoutes.ts:12`, `:68`), and the SPA has `CollectionsPage`,
  `CollectionDetailPage`, `CollectionGrid`, `CollectionCard`, and
  `EditCollectionModal`. The TV client contains **zero** occurrences of
  "collection" (`grep -ri collection clients/mediarr-client/lib` -> no
  matches). FR-4 is therefore a pure client-side gap, not a data problem.

## Functional requirements

### FR-1: Browse grid shows 6 columns and at least 2 full rows

- `MoviesScreen` and `SeriesScreen` must lay out the poster grid with **6
  columns** at the TV viewport (1280x720 logical, rail present), with a tile
  aspect of 0.58, and **at least two complete rows visible without
  scrolling**.
- The grid delegate must be **one shared definition** used by `MoviesScreen`,
  `SeriesScreen`, `SeeAllScreen`, `SearchScreen`, and the new collections
  screens, so density cannot drift between browse surfaces again.
- The column count is computed from the available cross-axis extent, not
  hard-coded, so non-TV form factors (Linux and macOS desktop windows) stay
  usable.
- `Continue Watching` is removed from `MoviesScreen` and `SeriesScreen`. It
  remains on `HomeScreen`, where the owner approved it as part of the
  2026-09-24 mockup. Rationale: it costs 213 of 720 logical px on a screen
  where the poster grid is the primary content, and a two-row grid cannot fit
  without that space. Owner decision 2026-10-03.
- The search header is compacted so the grid keeps vertical headroom.

**Acceptance (measured, not asserted by eye):**

| Property | Value at 1280x720 logical with rail |
|---|---|
| Columns | 6 |
| Tile size | approx. 173 x 298 logical (260 x 447 physical) |
| Full rows visible | >= 2 |
| Poster on screen per glance | >= 12 |

### FR-2: Down from the season chips walks the episodes

- Each episode row is **one focusable control** with a visible focus cue. The
  cue must satisfy the existing `focusIsInteractive()` probe.
- Down from the last season chip lands on **episode 1**; further Down presses
  walk episodes in order; Down past the last episode reaches the series
  `ActionBar`.
- Focus order must be **explicit**, not geometric: season chips and episode
  rows carry numeric traversal orders (chips first, then rows).
- Select on an episode row **plays** it when the file exists, and **searches**
  for it when it does not. Today `SeriesDetailScreen` passes an `onPlayEpisode`
  that silently does nothing for a missing episode
  (`series_detail_screen.dart:215`), so a missing episode looks broken.
- The per-episode search control stays reachable with Right, as a secondary
  stop inside the row.

**Acceptance:** a test that presses Down 10 times from the chip block records
focus on episodes 1..n in order, then the ActionBar, and asserts every stop is
visible (`focusIsInteractive()`).

### FR-3: Netflix-style next-episode autoplay

- Autoplay applies to **episodes only**. A finished movie never auto-advances.
- Starting an episode from `SeriesDetailScreen` builds the play queue from the
  already-loaded series detail: the remaining episodes of the current season
  ordered by episode number, then the following seasons in order. The queue is
  passed through `openFullscreenPlayback` and the `/playback` route extra.
- When an episode reaches `PlaybackStatus.completed` and a next item exists,
  the screen shows an **Up Next** card: next episode title, artwork when
  available, a **15 second** countdown, and `Play now` / `Cancel` controls.
- On countdown expiry, or on `Play now`, the next episode starts **inside the
  same route** with no return to the browse screen, and progress for the
  finished episode is reported first.
- Any D-pad press during the countdown **cancels** the countdown and leaves
  the Up Next card on screen, so no automatic start happens without a fresh
  decision. This is the safety rule: autoplay must never trap the viewer.
- `Cancel` leaves the completed overlay, which exposes `Replay`,
  `Next Episode`, and `Back`.
- The transport overlay shows a working skip-next control when a next item
  exists (the control already exists and is dead today).
- A `Settings` toggle, `Autoplay next episode`, defaults to **on** and
  persists with `shared_preferences` (already a dependency, already used for
  the server URL in `connection_provider.dart:37`).
- With the queue empty or the toggle off, completing an episode shows the
  completed overlay and never starts anything.

**Acceptance:** widget tests drive `completed` with a fake player and assert
(a) no auto-advance before the countdown expires, (b) advance on expiry,
(c) no advance after a key press, (d) no advance when the toggle is off, and
(e) advance continues into the next season.

### FR-4: Collections are browsable

- A `Collections` action in the `MoviesScreen` header opens a
  `CollectionsScreen` showing a poster grid of collections from
  `GET /api/collections` (name, poster, `moviesInLibrary` count).
- Select opens `CollectionDetailScreen`, a poster grid of that collection's
  movies from `GET /api/collections/:id`. Select opens the existing
  `MovieDetailScreen`.
- Both screens use the FR-1 shared grid delegate, so collections match the
  movie density.
- Entry is from the Movies header, which keeps the **five-item rail** from the
  owner-approved mockup unchanged.

**Deviation from the owner's accepted option, recorded:** the accepted answer
was "a Collections shelf row at the top of the Movies screen". A shelf row
costs about 200 logical px, which collides with the FR-1 requirement of two
full poster rows in the same viewport: both decisions cannot hold at once. The
entry point stays on the Movies screen, but as a header action that opens a
dedicated screen, which preserves both the 6x2 density and the unchanged rail.
Flagged to the owner on delivery.

- Empty state: `No collections yet` plus a hint that collections are created
  in the web UI, so an empty library reads as a state, not a failure.

## Data and API contract

No server change is required for FR-1, FR-2, or FR-3. FR-4 consumes existing
endpoints. New client models:

- `MediaCollection`: `id`, `name`, `overview`, `posterUrl`, `backdropUrl`,
  `movieCount`, `moviesInLibrary`.
- `CollectionMovie`: `id`, `title`, `year`, `posterUrl`, `inLibrary`,
  `quality`.

New client API methods on `MediarrApiClient`: `getCollections()` and
`getCollectionMovies(int collectionId)`.

## Non-goals

- Transcoding, streaming quality selection, or audio track defaults.
- Autoplay for movies.
- Creating or editing collections on the TV. The web UI owns that.
- Grouping collections as rows inside the Movies grid (see the FR-4
  deviation).
- Building a play queue when resuming an episode from `HomeScreen` Continue
  Watching or `MoviesScreen`. Recorded as a follow-up in `plan.md`; the resume
  path would need one extra `getSeriesDetail` call, and the owner's report did
  not cover it.
- Changing the rail, the hero, or the Home screen design.

## Risks and mitigations

- **Risk:** removing Continue Watching from Movies/Series is a visible feature
  removal. **Mitigation:** the owner accepted it on 2026-10-03 with the
  measured numbers in hand; it stays on Home, where the mockup puts it.
- **Risk:** the 6-column contract is measured at one viewport. **Mitigation:**
  the column count derives from the available width, and the acceptance test
  pins the TV viewport explicitly, including tile size and full-row count.
- **Risk:** autoplay starts playback the viewer did not ask for. **Mitigation:**
  any key press cancels the countdown; the Settings toggle persists; movies
  never advance.
- **Risk:** route `extra` is a `Map<String, dynamic>` and is not typed, so a
  queue can arrive malformed. **Mitigation:** the route parses defensively and
  falls back to an empty queue, which disables autoplay.
- **Risk:** a long season builds a long queue. **Mitigation:** the queue holds
  ids and labels only, not media objects.
- **Risk:** the live library may contain no collections, so FR-4 shows an empty
  state on the device. **Mitigation:** cannot be cleared by code. The live DB
  is at `/run/media/daniel-bo/4TB/mediarr-config/mediarr.db` and the
  development user gets permission denied; no server was reachable on the LAN
  during speccing (ports 5174, 8096, 8080, 3000, 5173 closed on 192.168.10.1,
  .60, .62). Recorded as an operator step in `plan.md`.
- **Risk:** existing D-pad suites pin the old grid and row shapes.
  **Mitigation:** update those suites inside the same change and keep their
  reachability assertions intact.

## Verification limits

- `flutter analyze` must report no issues and `flutter test` must be green at
  every phase gate.
- The TV device at `192.168.10.60:5555` is reachable over ADB, so a real
  device frame (F10 evidence, one frame plus its MD5 per step) is possible for
  each phase.
- Physical-TV perceptual sign-off is human-gated and stays with the owner.