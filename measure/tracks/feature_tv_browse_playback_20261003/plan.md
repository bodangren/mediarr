# Plan: TV Client Browse Density, Episode Focus, Autoplay, Collections

> Contract-first + TDD per `measure/workflow.md`. Spec: `./spec.md`.
> Gates per phase: `flutter analyze` zero issues, `flutter test` green.
> All layout claims are measured at the device viewport: 1920x1080 physical,
> density 240, device pixel ratio 1.5, so **1280x720 logical**, rail 160.

## Phase 0: Specced (2026-10-03)

- [x] Measure the real grid geometry instead of estimating it. Probe test in
      the device viewport: Movies and Series grid viewport is
      **1119 x 407.4** logical px, **4 columns of 250 x 431**, **one row**
      visible and clipped. `Continue Watching` costs 213 px, the header 100 px.
- [x] Reproduce the episode focus defect. D-pad trace on the real
      `SeriesDetailScreen`: Down 1 lands on the `S1` chip, Down 2 jumps to
      `Search All Missing`, Down 3-8 stay stuck. Root cause: `_EpisodeRow`
      renders no traversal stop, so only the two right-hand icons are focusable.
- [x] Verify what already exists before speccing. `PlaybackScreen.nextEpisode`
      is dead code (no caller). Collections are complete server-side and in the
      SPA; the TV client has zero collection code. No server work needed.
- [x] Record that the live DB and LAN server are unreachable for verification.
- [x] Owner decisions on 2026-10-03: drop Continue Watching from Movies/Series,
      15 s Up Next countdown with a persistent toggle, collections entered from
      the Movies screen.
- [x] Write `spec.md`.

## Phase 1: Browse grid density (FR-1) [checkpoint: c232098]

- [x] Red: grid density contract on the real screens. New
      `test/features/library/poster_grid_density_test.dart` measures
      `MoviesScreen` and `SeriesScreen` in the device viewport and asserts 6
      columns, tile size within 5 % of the contract, and at least 2 rows
      completely inside the grid viewport. **Red confirmed as real assertion
      failures, not a compile error:** `MoviesScreen shows 4 posters in the
      first row; the contract is 6`, same for Series, plus
      `ContinueWatchingSection` still found on Movies.
- [x] Red: Continue Watching is not on the browse screens, and still is on
      Home. Assert the section is absent on Movies and Series and present on
      Home, so the removal cannot silently take the feature away everywhere.
- [x] Green: one shared grid definition. New
      `lib/features/library/poster_grid.dart` exports the spacing, the aspect
      ratio, `posterColumnCountFor(crossAxisExtent)`, and
      `posterGridDelegateFor(crossAxisExtent)`.
- [x] Green: apply the shared delegate to `MoviesScreen` and `SeriesScreen`
      and remove `ContinueWatchingSection` from both. Compact the search header
      from 100 to 72 px so two rows keep vertical headroom.
- [x] Green: reuse the same delegate in `SeeAllScreen` and `SearchScreen` so
      browse density cannot drift.
- [x] Gate: `flutter analyze` clean; `flutter test` green — **349 passed**
      (baseline 345, +4 new).

### Phase 1 measured result (device viewport, not estimated)

| Property | Before | After |
|---|---|---|
| Grid cross-axis extent | 1071 logical | 1071 logical |
| Columns | 4 | **6** |
| Tile size | 250 x 431 logical (375 x 646 physical) | **165 x 285 logical (248 x 427 physical)** |
| Grid viewport height | 407.4 logical | **648 logical** |
| Complete rows visible | 1, and clipped | **2** |
| Posters per glance | 4 | **12** |

- [x] **Corrected measurement, recorded because the first constant was wrong.**
      The first Green attempt set the tile width to 173 and the test still
      failed at 5 columns. The constant had been derived from the 1119 px
      *content* width, but the delegate receives the *grid extent*, which
      excludes the grid's own 24 px padding on each side: 1280 - 160 rail
      - 1 divider - 48 padding = **1071**. Six tiles of 165 plus five 16 px
      gaps fill 1070 of it exactly. The constant and the comment now carry the
      real derivation, and the unit test asserts the count at 1071.
- [x] **Second defect found and fixed on the way.** The narrower tile exposed
      a real overflow in `PosterCard`: the metadata row (year + quality badge +
      status dot) overflowed by **22 px** at a 174 px tile, which
      `movies_screen_test.dart` caught as a `RenderFlex overflowed` assertion.
      The year now takes the slack through `Expanded` with ellipsis and the
      badge is capped at 72 px, so a long quality profile name cannot overflow.
      Card type scaled to the denser tile (title 22 to 20, year 18 to 15,
      badge 14 to 12).
- [x] One D-pad suite needed updating because the path it walked is gone:
      `library_dpad_test.dart` asserted `grid -> Continue Watching -> search
      field`. It now asserts `grid -> search field`, keeping the reachability
      assertions intact (`expectSearchOwnsFocus` still checks the field owns
      its node and shows a cue). The Home D-pad suites, which do walk
      Continue Watching, are unchanged and green.

## Phase 2: Episode focus (FR-2) [checkpoint: 4b5c6ba]

- [x] Red: D-pad episode walk on the real `SeriesDetailScreen`. New
      `test/features/library/episode_focus_test.dart` (7 tests) drives the real
      screen at the device viewport. **Red confirmed with 6 failures**, e.g.
      `Down from the season chips must reach episode 1; it landed on
      "Search All Missing"`, `Select on an episode without a file must search
      for it, not do nothing`.
- [x] Red: Select on an episode row plays it; Select on a row without a file
      searches for it.
- [x] Green: the whole episode row is one focusable control with the shared
      focus cue; the per-episode search stays reachable with Right; the play
      glyph became an affordance only (`ExcludeFocus`), so one row is one stop.
- [x] Green: the D-pad walk over the list is deterministic and owned by
      `EpisodeList`: Down chips -> row 1 -> ... -> last row -> host exit; Up
      mirrors it; Right walks the chips and then reaches a row's search control;
      Left returns from the search control to its row. `Left` from the chip
      block is deliberately left to the shell so the rail stays reachable.
- [x] Green: `SeriesDetailScreen` owns the two remaining hops: Down from the
      header enters the first chip, and Down past the last episode focuses the
      **first** action-bar button.
- [x] Green: Select plays when the file exists and searches when it does not.
      The old code passed a play callback that silently did nothing for a
      missing episode.
- [x] Gate: `flutter analyze` clean; `flutter test` green — **356 passed**
      (baseline 349, +7 new).

### Phase 2 measured result (real `SeriesDetailScreen`, device viewport)

```
entry  -> node=FocusableAction                  cue=true  "Back"
down 1 -> node=EpisodeList.chip                 cue=true  "S1 3/3"
down 2 -> node=EpisodeList.row                  cue=true  "1 S1E1 Bluray-1080p"
down 3 -> node=EpisodeList.row                  cue=true  "2 S1E2 Bluray-1080p"
down 4 -> node=EpisodeList.row                  cue=true  "3 S1E3 Bluray-1080p"
down 5 -> node=SeriesDetail.actionBar.first     cue=true  "Search All Missing"
down 6 -> node=SeriesDetail.actionBar.first     cue=true  "Search All Missing"  (last stop)
up 1   -> node=EpisodeList.row                  cue=true  "3 S1E3"
up 2   -> node=EpisodeList.row                  cue=true  "2 S1E2"
right  -> node=EpisodeList.rowSearch            cue=true
left   -> node=EpisodeList.row                  cue=true  "2 S1E2"
```

`Delete Series` is never a stop in the walk, and `cue=true` on every stop means
every stop renders a visible focus cue (`focusIsInteractive()`).

- [x] **Three framework findings, each measured rather than assumed, all
      recorded because each one silently broke the fix:**
      1. **Numeric traversal orders were not enough.** A probe over every focus
         node showed the orders were attached correctly (`Search All Missing`
         100000, `Delete Series` 100001), yet Down still landed on Delete: the
         episode rows span x 189..1252, and the button nearest a row's centre
         is Delete. So the last hop is delegated to the host instead of left to
         geometry. Removing the inner `FocusTraversalGroup` from `EpisodeList`
         was also necessary, because an inner group scopes traversal to itself.
      2. **`ChoiceChip` ignores `requestFocus()` on an external node.** Driving
         the chip's own `focusNode` did nothing
         (`requestFocus` returned, `hasPrimaryFocus=false`) and focus fell
         through to the rail's `Home`. The chip is now the visual only, wrapped
         in a `FocusableAction` that owns focus.
      3. **`ExcludeFocus` cannot wrap the focusable.** It also sets
         `descendantsAreFocusable: false`, which rejected the wrapper's own
         focus request (`hasPrimaryFocus=false`). Only the chip itself is
         excluded, so there is still one focus cue and not two.
- [x] One test-harness trap worth recording: after Select routes to
      `PlaybackScreen`, `pumpAndSettle` never returns, because the fake player
      never reports `playing`, the status stays `loading`, and the buffering
      spinner animates forever. The suite uses a bounded `pressOnce` for that
      step. `playbackServiceProvider` is overridden with `FakeMediaPlayer` for
      the same reason `playback_overlay_test.dart` does it.

## Phase 3: Next-episode autoplay (FR-3) [checkpoint: c79d29b]

- [x] Red: queue construction test plus autoplay tests on the real
      `PlaybackScreen` with `FakeMediaPlayer`. **Red confirmed as a compile
      failure on the missing capability**: `No named parameter with the name
      'queue'`. Before this phase the `nextEpisode` callback, the
      `Next Episode` button, and the skip-next transport button all existed and
      no caller ever passed one, so nothing could advance.
- [x] Red: queue construction (season order, empty remainder, unknown episode),
      Up Next card with a 15 s countdown, no start before expiry, start on
      expiry, a key press cancels, `Play now`, `Cancel` returns to the completed
      overlay, the toggle off stops everything, a movie never advances, and
      skip-next presence.
- [x] Green: `PlaybackQueueItem`, `buildEpisodeQueue`, and the persisted
      preference in the new `lib/features/playback/playback_queue.dart`.
- [x] Green: the queue travels through `openFullscreenPlayback` and the
      `/playback` route extra. `readPlaybackQueueFromExtra` parses defensively
      and drops malformed entries, so a stale route disables autoplay instead
      of crashing playback.
- [x] Green: `_UpNextCard` with countdown, `Play now`, and `Cancel`; the advance
      stays inside the route and re-fetches the manifest so subtitles and
      resume resolve for the new episode.
- [x] Green: the existing skip-next transport button and the completed overlay
      `Next Episode` button now drive the real queue item.
- [x] Green: `Autoplay next episode` on Settings, default on, persisted with
      `shared_preferences`.
- [x] Gate: `flutter analyze` clean; `flutter test` green — **374 passed**
      (baseline 356, +18 new).

### Phase 3 findings

- [x] **A real fail-open bug, caught by the test for the toggle.** The screen
      read the preference at completion time with
      `ref.read(provider).dataOrNull ?? true`, so while the provider was still
      loading it read as **enabled**. A viewer who had turned autoplay off would
      still have been advanced. The preference is now read once at start and the
      check fails **closed** while the value is unknown
      (`_autoplayEnabled == true`).
- [x] The countdown never traps the viewer: any key press cancels it and leaves
      the card up with `Play now` and `Cancel`, which the tests pin.
- [x] Movies are excluded from autoplay by an explicit `mediaType` check rather
      than by convention.

## Phase 4: Collections browsing (FR-4) [checkpoint: pending]

- [x] Red: models, screens, and entry point. New
      `test/features/library/collections_screen_test.dart` (9 tests).
- [x] Red: model parsing with a missing optional field.
- [x] Red: the collection grid renders name and `moviesInLibrary`, uses the
      shared density, and the empty library reads as a state.
- [x] Red: the detail screen renders the collection's movies and marks one that
      is not in the library.
- [x] Red: the Movies screen offers a Collections action reachable on the D-pad,
      and the rail still holds exactly five destinations.
- [x] Green: `MediaCollection` and `CollectionMovie` models.
- [x] Green: `getCollections` and `getCollectionMovies` on `MediarrApiClient`,
      plus `FakeMediarrApiClient` overrides.
- [x] Green: `CollectionsScreen` and `CollectionDetailScreen` on the shared grid
      delegate, with entry focus on the first tile and an empty state.
- [x] Green: `Collections` action in the Movies header. Select opens
      `CollectionsScreen`; Select there opens the collection's movie grid.
- [x] Gate: `flutter analyze` clean; `flutter test` green — **384 passed**
      (baseline 374, +10 new).

### Phase 4 findings

- [x] **A real regression the new entry point caused, caught by the pre-existing
      FR-1 D-pad suite.** Adding the Collections action made the header Row have
      three children. Left to geometry, Up from a poster tile stopped resolving
      to the header at all and landed on the rail, so the **search field became
      unreachable** from the movies grid. The Up hop is now driven explicitly by
      `MoviesScreen` (poster focus -> header first control), the same
      deterministic pattern as Phase 2, and `library_dpad_test.dart` was
      updated to `Up -> Collections -> Right -> search field` with its
      `expectSearchOwnsFocus` reachability assertion intact.
- [x] **A second overflow, caught by `movies_screen_test.dart`.** With three
      fixed-width header children the header Row overflowed by 4.3 px at the
      800 px default test width. The title is now `Flexible` with ellipsis and
      the search field shrinks on narrow viewports.
- [x] Two autofocus candidates on one screen (Back button and first tile) made
      entry focus a race, so the Back buttons no longer autofocus and entry
      focus belongs to the first tile, matching the library grids.
- [x] Entry-focus ownership and the rail contract are pinned by tests, not left
      to convention: the rail test asserts all five labels sit left of 160 px
      and that `Collections` sits right of it (content area).

## Phase 5: Build, device evidence, sign-off

- [ ] Build and install the fat APK on `192.168.10.60:5555`.
      `JAVA_HOME=/home/daniel-bo/.local/jdk17 flutter build apk --release
      --android-skip-build-dependency-validation`.
- [ ] Device frame per phase with its MD5 (F10 rule: one frame per step, and
      a byte-identical frame means the key press was dropped, so retry).
- [ ] Verify the grid on the TV: 6 columns, 2 full rows, no clipping.
- [ ] Verify the episode walk on the TV with the remote only: Down from the
      chips reaches episode 1, the focus cue is visible, Select plays.
- [ ] Verify autoplay on the TV: let an episode end, confirm the Up Next
      countdown appears and starts the next episode, then confirm a key press
      cancels it.
- [ ] Verify collections on the TV. **Operator step, may be empty:** the live
      DB is at `/run/media/daniel-bo/4TB/mediarr-config/mediarr.db` and the
      development user gets permission denied, so this track cannot confirm the
      live library holds collections. If the shelf is empty, create a
      collection in the web UI and re-check. Record the outcome here.
- [ ] Perceptual remote-only sign-off. Human-gated; the owner holds it.
- [ ] Final gate: `flutter analyze` clean, `flutter test` green, then archive
      the track per `measure/workflow.md`.

## Follow-ups recorded, not in this track

- [ ] Build a play queue when an episode is resumed from `HomeScreen` Continue
      Watching or the Movies screen, so autoplay also works on the resume path.
      Needs one extra `getSeriesDetail` call per resume.
- [ ] `MetadataProvider` computes `tmdbCollectionId` and then drops it
      (`measure/tech-debt.md`, 2026-07-28), so movie-to-collection membership
      never reaches a search-result consumer. Collections therefore exist only
      when created explicitly. Owner decision needed on whether search results
      should carry collections.
- [ ] `SeeAllScreen` and `SearchScreen` had their own density
      (`maxCrossAxisExtent: 220`). Phase 1 unifies them; a perceptual check on
      the desktop form factors is still open.

## Risk register

- **Risk:** removing Continue Watching from the browse screens reads as a
  feature loss. **Mitigation:** owner accepted it on 2026-10-03 with measured
  numbers; a test asserts it remains on Home.
- **Risk:** the 6-column contract only holds at one viewport. **Mitigation:**
  the count derives from the available width; the acceptance test pins the TV
  viewport with tile size and full-row count, not a column label.
- **Risk:** autoplay starts playback nobody asked for. **Mitigation:** any key
  press cancels the countdown; the toggle persists; movies never advance.
- **Risk:** untyped route `extra` arrives malformed. **Mitigation:** defensive
  parse, empty queue on any failure, which disables autoplay.
- **Risk:** existing D-pad suites pin the old grid and row shapes.
  **Mitigation:** update inside the same change, keep reachability assertions.
- **Risk (device):** the TV drops about 10 % of injected keys, which mimics
  "nothing happened". **Mitigation:** byte-identical MD5 means a dropped key;
  retry before recording a defect.