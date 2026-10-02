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

## Phase 1: Browse grid density (FR-1) [checkpoint: pending]

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

## Phase 2: Episode focus (FR-2)

- [ ] Red: D-pad episode walk on the real `SeriesDetailScreen`. Down from the
      chip block reaches episode 1, walks episodes in order, reaches the
      `ActionBar` after the last episode, and every stop is interactive. Fails
      today: Down 2 already lands on `Search All Missing`.
- [ ] Red: Select on an episode row plays it; Select on a row without a file
      searches for it. The second assertion fails today because
      `onPlayEpisode` silently does nothing when `hasFile` is false.
- [ ] Green: make the whole episode row one focusable control with the shared
      focus cue; keep the per-episode search as a secondary stop reached with
      Right.
- [ ] Green: explicit traversal order. Season chips and episode rows carry
      numeric orders (chips first, rows after); `ActionBar` takes the order
      after the last row. Order must not depend on geometry.
- [ ] Green: wire Select to play-or-search in `SeriesDetailScreen`.
- [ ] Gate: `flutter analyze` clean; `flutter test` green, including the
      existing `library_dpad_test.dart` and `home_screen_dpad_test.dart`
      reachability suites, which must stay green unchanged.
- [ ] Checkpoint commit.

## Phase 3: Next-episode autoplay (FR-3)

- [ ] Red: queue construction test. Starting an episode in season 1 builds a
      queue of the remaining season 1 episodes in order, then season 2, and the
      last episode of the last season has an empty remainder.
- [ ] Red: autoplay tests on the real `PlaybackScreen` with the existing
      `FakeMediaPlayer`: on `completed` with a next item the Up Next card shows
      a 15 s countdown; nothing starts before expiry; expiry starts the next
      episode in the same route; a D-pad press during the countdown cancels
      it; the toggle off never starts anything; a movie never starts anything.
- [ ] Green: `PlaybackQueueItem` model and queue construction from the loaded
      series detail.
- [ ] Green: pass the queue through `openFullscreenPlayback` and the
      `/playback` route extra; parse defensively and fall back to an empty
      queue.
- [ ] Green: Up Next card with countdown, `Play now`, and `Cancel`; advance
      in-route without popping; report the finished episode's progress first.
- [ ] Green: wire the existing skip-next transport button and the completed
      overlay `Next Episode` button to the real next item.
- [ ] Green: `Autoplay next episode` toggle on Settings, default on, persisted
      with `shared_preferences`.
- [ ] Gate: `flutter analyze` clean; `flutter test` green.
- [ ] Checkpoint commit.

## Phase 4: Collections browsing (FR-4)

- [ ] Red: API tests for `getCollections` and `getCollectionMovies`, including
      the envelope unwrap and an empty list.
- [ ] Red: widget tests for `CollectionsScreen` and `CollectionDetailScreen`:
      the collection grid renders name and `moviesInLibrary`; Select opens the
      detail screen; the detail grid renders the collection's movies; Select
      opens `MovieDetailScreen`; the empty state reads as a state, not an error.
- [ ] Red: a collections action exists in the `MoviesScreen` header and reaches
      the collections screen with the D-pad, with the rail unchanged at five
      destinations.
- [ ] Green: `MediaCollection` and `CollectionMovie` models.
- [ ] Green: `getCollections` and `getCollectionMovies` on `MediarrApiClient`.
- [ ] Green: `CollectionsScreen` and `CollectionDetailScreen` on the shared
      grid delegate, with the empty state.
- [ ] Green: `Collections` action in the Movies header plus the route.
- [ ] Gate: `flutter analyze` clean; `flutter test` green.
- [ ] Checkpoint commit.

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