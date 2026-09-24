# Plan: TV Home Screen Redesign + Player Repair

> Contract-first + TDD per `measure/workflow.md`. Spec: `./spec.md`.
> Gates per phase: `flutter analyze` zero issues, `flutter test` green.

## Phase 1: Home screen per the owner mockup (FR-1 to FR-6)

> **SHIPPED 2026-09-24.** Gates: `flutter analyze` — "No issues found!"; `flutter test` —
> 324 passed, 0 failed (baseline 320). Device frame of the new build remains open (below).

- [x] Red: rail tests. Five destinations in order (Home, Movies, Series, Search, Settings), pill
      cue on the focused item, D-pad Up and Down walk the rail, Select navigates, `Change server`
      is not in the rail. _Done: `test/core/widgets/leanback_scaffold_test.dart` (8 tests) pins the
      five-destination set in mockup order, the removed items (`Mediarr`, `Server`, `Library`,
      `Activity`, `Calendar`), the active-pill weight rule, and the divider._
- [x] Red: hero tests on the real `HomeScreen`. _Done: `test/features/home/home_screen_mockup_test.dart`
      pins the `FEATURED` eyebrow, `Play` when nothing is in progress, `Resume` when a
      continue-watching entry exists, `Details`, the runtime on the metadata line (`2h 16m` from
      136 min), and chips (`HD` from `1080p`, `4K` from `2160p`)._
- [x] Red: Continue Watching card tests. _Done: `test/features/library/continue_watching_section_test.dart`
      keeps the progress-value assertions; `home_screen_test.dart` now pins the split labels `50%`
      and `Resume at 30:00` (FR-3) instead of the old combined line._
- [x] Red: `See All >` test. _Done: `home_screen_mockup_test.dart` pins three `See All` links
      (Recently Added, Movies, TV Shows) and that the first one opens the `SeeAllScreen` grid.
      The test scrolls first: rows below the fold build lazily._
- [x] Red: Search and Settings screen tests. _Done: `test/core/router/app_router_test.dart` pins
      `/search` and `/settings` routes and renders both through the shell (search field hint,
      `Change server` action)._
- [~] Green: design tokens in `lib/core/theme/mediarr_theme.dart`. _Deviation recorded: the hero CTA
      gradient (`#7FB2FF` to `#4E8DF5`), the dark secondary pill (`#1B2430`), and the chip border are
      hero-specific literals at the call site. No shared token changed, so no other screen can
      regress. The mockup colors stay next to the markup that owns them._
- [x] Green: restyle the rail per FR-1. _Done: `lib/core/widgets/leanback_scaffold.dart` — five
      destinations, `Mediarr` branding and the `Server` affordance removed (`Change server` moved to
      Settings), selected pill retained, rail widened to 160. The D-pad shell-boundary contract is
      unchanged and still pinned by `home_screen_dpad_test.dart`._
- [x] Green: minimal `SearchScreen` and `SettingsScreen` per FR-5 and FR-6, wired to the router.
      _Done: `lib/features/search/search_screen.dart` (autofocused field bound to its `FocusNode`,
      combined movie + series results grid, Select opens detail) and
      `lib/features/settings/settings_screen.dart` (server, `Change server` → `/discovery?switch=1`,
      client build) — both routes live in the shell. _
- [x] Green: hero per FR-2. _Done: `lib/features/home/home_screen.dart` — `FEATURED` eyebrow, 48 px
      two-line title, metadata line (`year | type | runtime`) with quality chips, three-line synopsis,
      state-aware `Resume`/`Play` + `Details`. Featured-movie metadata comes from
      `heroMovieProvider` (`Movie.runtime`, `Movie.quality`, `Movie.fanartUrl`). Absent fields hide._
- [x] Green: Continue Watching cards per FR-3 and Recently Added row per FR-4. _Done:
      `continue_watching_section.dart` (16:9 artwork, progress bar + percent at its right edge,
      title, `Resume at mm:ss`) and `home_screen.dart` `_LibraryPosterCard` (16:9 landscape card with
      a bottom title bar over a scrim)._
- [x] Green: `See All >` per FR-4. _Done: `_RowSection` header action; Recently Added opens the new
      `lib/features/library/see_all_screen.dart` grid; Movies and TV Shows route to their grid
      screens._
- [x] Green (unplanned, defect found while wiring the hero): `AsyncValue.value` rethrows a fetch
      error, so one failed metadata fetch crashed the home screen (reproduced in tests as a
      `DioException` thrown while building `HomeScreen`). Fixed with
      `lib/shared/utils/async_value_ext.dart` (`dataOrNull`); decorative data now degrades to absent.
      Applied to the hero, the rows, Search, and See All.
- [x] Gate: `flutter analyze` zero issues; `flutter test` green — 324 passed. The Phase 4c strict
      D-pad suites still pass unchanged (reachability assertions intact).
- [x] Device evidence (F10): one home-screen frame of the new build with its MD5. _Done:
      `device-20260924/home-mockup-build.png`, MD5 `d0dca803c6cdb51b630d522040b71af3`, captured
      2026-09-24 on `192.168.10.60:5555` after `am start` (foreground confirmed as
      `com.mediarr.mediarr_client/.MainActivity`). The frame shows the claim: five rail items (Home
      with the selected pill, Movies, Series, Search, Settings), the `FEATURED` eyebrow, the title,
      the `S09E09` metadata line, `Resume` + `Details`, and the 16:9 Continue Watching cards. Chips
      are hidden because the episode hero exposes no quality field (the FR-2 rule). Build recipe:
      `JAVA_HOME=/home/daniel-bo/.local/jdk17 flutter build apk --release
      --android-skip-build-dependency-validation` (97.7 MB fat APK)._
- [x] Commit: `feat(client): mockup home screen with rail, hero, and continue-watching cards`.

## Phase 2: Player repair (FR-7 to FR-9)

> **FR-7 + FR-8 SHIPPED 2026-09-24.** Gates: `flutter analyze` — "No issues found!"; `flutter test`
> — 330 passed, 0 failed (baseline 324). **FR-9 (subtitles) remains open.**

- [x] Red: overlay tests. _Done: `test/features/playback/playback_overlay_test.dart` (3 tests) —
      hide runs 4 s after input with no `playing` status ever reported, every input restarts the
      window, any input reveals a hidden overlay._
- [x] Red: overlay D-pad tests. _Done: same file (3 tests) — the walk reaches 6+ distinct controls
      across the top bar, transport row, and nudge row; Select activates the focused control (Back
      exits playback); Left/Right seek (+10 s recorded on the player) while the overlay is hidden._
- [ ] Red: subtitle tests. External subtitle tracks arrive in `PlaybackManifest`, reach the player as
      `SubtitleTrack.uri(...)`, appear in the picker, and FR-6 auto-select picks Chinese Simplified.
- [x] Green: status mapping and hide window. _Done: `media_player.dart` reports the real play state
      when `buffering: false` arrives (the old code dropped it and the status stuck); the hide timer
      (`playback_service.dart`) is unconditional and every transport action restarts it via
      `_touchOverlay()`. `PlaybackState.overlayVisible` now defaults to `false` — the old `true`
      default made playback start flap visible→hidden→visible and parked focus on the key handler._
- [x] Green: overlay visibility drives rendering and hit-testing. _Done: the conditional render
      stands; the hard-coded `AnimatedOpacity(opacity: 1.0)` is gone._
- [x] Green: `FocusTraversalGroup` on the transport overlay; arrows walk its controls. _Done — plus
      two focus defects found and fixed on the way: (a) `PlaybackScreen.root` was a full-screen
      traversable focus stop, so directional focus landed on it instead of the controls (the F3
      class of defect from `tv-ux-investigation-20260924.md`); it is now a key anchor with
      `skipTraversal: true` and takes focus back only when the overlay hides. (b) Flutter's `Slider`
      consumes all four arrows for value adjustment and trapped D-pad focus; the seek bar is now
      pointer-only (`ExcludeFocus`), and `IconButton` (a second focus stop inside `FocusableAction`)
      is excluded too. Seeking with the remote is the hidden-overlay Left/Right path (±10 s)._
- [ ] Green: subtitle plumbing. Server tracks in the manifest DTO, client model, and
      `MediaKitMediaPlayer` external track attach; FR-6 selection covers them.
- [x] Gate (FR-7 + FR-8): `flutter analyze` zero issues; `flutter test` green — 330 passed.
- [ ] Commit: `fix(player): overlay auto-hide and d-pad control walk`. _Done: see git log._
- [ ] Commit: `fix(player): external subtitle delivery and Chinese default selection` (FR-9).

## Phase 3: Device check

- [ ] Remote-only run on `192.168.10.60:5555`. One frame per step with MD5 in this plan (F10).
- [ ] Perceptual remote-only sign-off. Human-gated. The owner holds this judgement.

## Risk register

- **Risk:** the strict Phase 4c D-pad suites assert the old hero and row shapes. **Mitigation:**
  update those suites inside the same change and keep their reachability assertions intact. *(Met:
  only the label assertion changed; reachability assertions untouched and green.)*
- **Risk:** the box drops about 10 % of injected keys, which fakes "nothing happened". **Mitigation:**
  detect a dropped key by byte-identical MD5 and retry (F10 evidence rule).
- **Risk:** manifest schema change breaks the running server. **Mitigation:** additive fields only;
  old clients ignore them.
- **Risk:** media_kit rejects an external subtitle URL shape. **Mitigation:** the Red test pins the
  attach call; the device check proves rendering.
- **Risk (found in Phase 1):** lazy row building means a widget test can miss controls below the
  fold and assert a false "missing" state. **Mitigation:** scroll before counting row-level
  controls (recorded in `home_screen_mockup_test.dart`).
