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
      `Activity`, `Calendar`), the active-pill weight rule, and the divider._ — 5756c88
- [x] Red: hero tests on the real `HomeScreen`. _Done: `test/features/home/home_screen_mockup_test.dart`
      pins the `FEATURED` eyebrow, `Play` when nothing is in progress, `Resume` when a
      continue-watching entry exists, `Details`, the runtime on the metadata line (`2h 16m` from
      136 min), and chips (`HD` from `1080p`, `4K` from `2160p`)._ — 5756c88
- [x] Red: Continue Watching card tests. _Done: `test/features/library/continue_watching_section_test.dart`
      keeps the progress-value assertions; `home_screen_test.dart` now pins the split labels `50%`
      and `Resume at 30:00` (FR-3) instead of the old combined line._ — 5756c88
- [x] Red: `See All >` test. _Done: `home_screen_mockup_test.dart` pins three `See All` links
      (Recently Added, Movies, TV Shows) and that the first one opens the `SeeAllScreen` grid.
      The test scrolls first: rows below the fold build lazily._ — 5756c88
- [x] Red: Search and Settings screen tests. _Done: `test/core/router/app_router_test.dart` pins
      `/search` and `/settings` routes and renders both through the shell (search field hint,
      `Change server` action)._ — 5756c88
- [x] Green: design tokens in `lib/core/theme/mediarr_theme.dart`. **Done 2026-11-09 (`85fa6a80`):** the
      deviation is closed — `MediarrColors.heroCtaGradient`, `heroCtaForeground` and
      `heroSecondarySurface` now own the mockup colours and `home_screen.dart` uses them. `flutter analyze
      lib` clean; 28 home tests green; device 1.3.59 before/after Home hero screenshots are byte-identical
      (MD5 `6a67ed20…`), proving no visual change. — 85fa6a8
- [x] Green: restyle the rail per FR-1. _Done: `lib/core/widgets/leanback_scaffold.dart` — five
      destinations, `Mediarr` branding and the `Server` affordance removed (`Change server` moved to
      Settings), selected pill retained, rail widened to 160. The D-pad shell-boundary contract is
      unchanged and still pinned by `home_screen_dpad_test.dart`._ — 5756c88
- [x] Green: minimal `SearchScreen` and `SettingsScreen` per FR-5 and FR-6, wired to the router.
      _Done: `lib/features/search/search_screen.dart` (autofocused field bound to its `FocusNode`,
      combined movie + series results grid, Select opens detail) and
      `lib/features/settings/settings_screen.dart` (server, `Change server` → `/discovery?switch=1`,
      client build) — both routes live in the shell. _ — 5756c88
- [x] Green: hero per FR-2. _Done: `lib/features/home/home_screen.dart` — `FEATURED` eyebrow, 48 px
      two-line title, metadata line (`year | type | runtime`) with quality chips, three-line synopsis,
      state-aware `Resume`/`Play` + `Details`. Featured-movie metadata comes from
      `heroMovieProvider` (`Movie.runtime`, `Movie.quality`, `Movie.fanartUrl`). Absent fields hide._ — 5756c88
- [x] Green: Continue Watching cards per FR-3 and Recently Added row per FR-4. _Done:
      `continue_watching_section.dart` (16:9 artwork, progress bar + percent at its right edge,
      title, `Resume at mm:ss`) and `home_screen.dart` `_LibraryPosterCard` (16:9 landscape card with
      a bottom title bar over a scrim)._ — 5756c88
- [x] Green: `See All >` per FR-4. _Done: `_RowSection` header action; Recently Added opens the new
      `lib/features/library/see_all_screen.dart` grid; Movies and TV Shows route to their grid
      screens._ — 5756c88
- [x] Green (unplanned, defect found while wiring the hero): `AsyncValue.value` rethrows a fetch
      error, so one failed metadata fetch crashed the home screen (reproduced in tests as a
      `DioException` thrown while building `HomeScreen`). Fixed with
      `lib/shared/utils/async_value_ext.dart` (`dataOrNull`); decorative data now degrades to absent.
      Applied to the hero, the rows, Search, and See All. — 5756c88
- [x] Gate: `flutter analyze` zero issues; `flutter test` green — 324 passed. The Phase 4c strict
      D-pad suites still pass unchanged (reachability assertions intact). — 5756c88
- [x] Device evidence (F10): one home-screen frame of the new build with its MD5. _Done:
      `device-20260924/home-mockup-build.png`, MD5 `d0dca803c6cdb51b630d522040b71af3`, captured
      2026-09-24 on `192.168.10.60:5555` after `am start` (foreground confirmed as
      `com.mediarr.mediarr_client/.MainActivity`). The frame shows the claim: five rail items (Home
      with the selected pill, Movies, Series, Search, Settings), the `FEATURED` eyebrow, the title,
      the `S09E09` metadata line, `Resume` + `Details`, and the 16:9 Continue Watching cards. Chips
      are hidden because the episode hero exposes no quality field (the FR-2 rule). Build recipe:
      `JAVA_HOME=/home/daniel-bo/.local/jdk17 flutter build apk --release
      --android-skip-build-dependency-validation` (97.7 MB fat APK)._ — b8b41d9
- [x] Commit: `feat(client): mockup home screen with rail, hero, and continue-watching cards`. — 5756c88

## Phase 2: Player repair (FR-7 to FR-9) [checkpoint: 4ef2dad]

> **SHIPPED 2026-09-25.** FR-7, FR-8, and FR-9 are complete. Gates: `flutter analyze` — no issues;
> `flutter test` — 334 passed, 0 failed.

- [x] Red: overlay tests. _Done: `test/features/playback/playback_overlay_test.dart` (3 tests) —
      hide runs 4 s after input with no `playing` status ever reported, every input restarts the
      window, any input reveals a hidden overlay._ — ced2739
- [x] Red: overlay D-pad tests. _Done: same file (3 tests) — the walk reaches 6+ distinct controls
      across the top bar, transport row, and nudge row; Select activates the focused control (Back
      exits playback); Left/Right seek (+10 s recorded on the player) while the overlay is hidden._ — ced2739
- [x] Red: subtitle tests. `api_client_test.dart` verifies manifest parsing and backward-compatible
      empty lists. `playback_screen_fr_widgets_test.dart` verifies absolute URL resolution and picker
      display. `playback_service_test.dart` verifies external track delivery and Chinese selection. — 23189c5
- [x] Green: status mapping and hide window. _Done: `media_player.dart` reports the real play state
      when `buffering: false` arrives (the old code dropped it and the status stuck); the hide timer
      (`playback_service.dart`) is unconditional and every transport action restarts it via
      `_touchOverlay()`. `PlaybackState.overlayVisible` now defaults to `false` — the old `true`
      default made playback start flap visible→hidden→visible and parked focus on the key handler._ — ced2739
- [x] Green: overlay visibility drives rendering and hit-testing. _Done: the conditional render
      stands; the hard-coded `AnimatedOpacity(opacity: 1.0)` is gone._ — ced2739
- [x] Green: `FocusTraversalGroup` on the transport overlay; arrows walk its controls. _Done — plus
      two focus defects found and fixed on the way: (a) `PlaybackScreen.root` was a full-screen
      traversable focus stop, so directional focus landed on it instead of the controls (the F3
      class of defect from `tv-ux-investigation-20260924.md`); it is now a key anchor with
      `skipTraversal: true` and takes focus back only when the overlay hides. (b) Flutter's `Slider`
      consumes all four arrows for value adjustment and trapped D-pad focus; the seek bar is now
      pointer-only (`ExcludeFocus`), and `IconButton` (a second focus stop inside `FocusableAction`)
      is excluded too. Seeking with the remote is the hidden-overlay Left/Right path (±10 s)._ — ced2739
- [x] Green: subtitle plumbing. The Flutter DTO reads server subtitle fields. The screen resolves
      subtitle URLs. `MediaKitMediaPlayer` registers stable external IDs and loads files with
      `SubtitleTrack.uri(...)`. The picker lists them, and FR-6 selects Chinese Simplified. — 23189c5
- [x] Gate (FR-7 to FR-9): `flutter analyze` clean; `flutter test` green — 334 passed. — 4ef2dad
- [x] Commit: `fix(player): overlay auto-hide and d-pad control walk` — `ced27394`. — ced2739
- [x] Commit: `fix(player): external subtitle delivery and Chinese default selection` — `23189c5c`. — 23189c5

## Phase 3: Device check [checkpoint: b707a55]

- [x] Build and install the fat APK on `192.168.10.60:5555`. Build:
      `JAVA_HOME=/home/daniel-bo/.local/jdk17 flutter build apk --release
      --android-skip-build-dependency-validation` — 97.8 MB; install succeeded. — 375f77c
- [x] Verify external Chinese subtitle rendering. The owner saw the subtitles on the TV and reported
      that the text is too small. Frame `device-20260925/step-29-playback-5s.png`, MD5
      `25a38bb3d02ee84f425d71ce6b67802f`, shows Chinese and English text during playback. — 375f77c
- [x] Finish the remote-only check on `192.168.10.60:5555`. **Done 2026-11-09 (`b707a55a`):** on 1.3.58,
      Back twice only toggles the overlay (video keeps playing, matching the owner's 2026-11-08
      Back=HUD decision), and Stop exits to the detail page with playback genuinely stopped (position
      104/5768 persisted and unchanged after 3 s; test row deleted). The 2026-09-25 "Back returns to Home
      without a confirmed stop" finding is superseded by that later decision. Transport-control sizing and
      the revised-mockup judgement remain part of the owner's perceptual sign-off below. — b707a55
- [ ] Perceptual remote-only sign-off. Human-gated. The owner holds this judgement.

## Phase 4: TV usability follow-up (FR-10 to FR-14)

> Added 2026-09-25 after the owner reviewed the Phase 3 TV run. The owner's revised home image is
> the visual authority. The owner chose stop-on-exit behavior. FR-11, FR-12, and FR-13 were
> implemented 2026-09-25 (uncommitted until this checkpoint). FR-10 and FR-14 were reopened the
> same day after the owner measured the subtitle text at "half the size it needs to be" and found
> the hero unlike the mockup; both had wrong-knob root causes, now fixed.

- [x] Red: tests for subtitle size, transport control size, route-exit stop, remote media keys, and
      home layout at 1920×1080. _Done: `playback_screen_fr_widgets_test.dart` pins the TV
      transport sizes (rewind/captions 56, play/pause 96, nudge text 20) and the FR-10 subtitle
      configuration; `playback_overlay_test.dart` pins the remote media keys; the new
      `playback_lifecycle_test.dart` pins stop-on-exit; `home_screen_mockup_test.dart` pins the
      four-card + Recently Added budget at 1920×1080, the hero backdrop contract, the episode-hero
      meta line, and equal hero pills; `continue_watching_section_test.dart` pins the four-card
      row fill._ — eeb9e0e
- [x] Green: increase the subtitle font size for external and embedded tracks. _Root cause (found
      2026-09-25): the first attempt set libmpv `sub-font-size` (112), but `media_kit_video` draws
      the cue text in Flutter through its `SubtitleView` (`subtitle_view.dart`), so the property
      never reached the visible text. Worse, `SubtitleView` scales its 32 px default style by
      `sqrt(surfaceArea / 1920x1080)` computed in LOGICAL pixels: on the TV (1920x1080 at density
      240 = 1280x720 logical) that factor is exactly 2/3, so the cue rendered at 32 physical px.
      Fixed: `playback_screen.dart` passes `kPlaybackSubtitleViewConfiguration`
      (`tvSubtitleTextStyle`, 44 logical px = 66 physical px at the TV's 1.5 ratio — double the
      measured size — with `TextScaler.noScaling` so no panel size can halve it again). The libmpv
      `sub-font-size` plumbing stays for native render paths; the device frame is the proof._ — eeb9e0e
- [x] Green: enlarge the bottom transport buttons, their focus targets, and subtitle-nudge
      controls. _Done earlier in this phase: icons 56/96, nudge text 20, pinned by
      `playback_screen_fr_widgets_test.dart`._ — eeb9e0e
- [x] Green: stop the player when the playback route exits. Keep Stop, Back, and route disposal
      safe. _Done: `PlaybackScreen.dispose` requests a stop when no explicit Stop ran first;
      `_exitPlayback` stops, reports progress, then pops. Pinned by `playback_lifecycle_test.dart`._ — eeb9e0e
- [x] Green: map Play, Pause, and Play/Pause remote media keys to the active player. Ignore them
      after the route exits. _Done: `mediaPlay`/`mediaPause`/`mediaPlayPause`/`mediaStop` map to
      `playMedia`/`pauseMedia`/`togglePlayPause`/`_exitPlayback` with the overlay woken; the route
      is the only listener, so nothing survives exit._ — eeb9e0e
- [x] Green: match the revised home image. Fit four Continue Watching cards across the TV view and
      show the start of Recently Added at 1920×1080. Use landscape artwork for the full-width hero.
      _Root cause of the hero mismatch (found 2026-09-25): three contract-drift layers kept every
      landscape URL from reaching the banner — `Movie.fromJson` read `fanartUrl`, a field the
      server never sends (the row field is `backdropUrl`); `LibraryItem.fromJson` dropped
      `backdropUrl` although `mediaRoutes.ts:100` returns it; and episode heroes fetched nothing,
      because `heroMovieProvider` only resolves movies. The banner therefore fell back to a
      portrait poster tile on black, showed `S09E09` as its only metadata, and had no synopsis.
      Fixed: `Movie.backdropUrl`, `Series.backdropUrl`/`quality`, `LibraryItem.backdropUrl` now
      parse the real DTO fields; `heroSeriesProvider` resolves the series behind an episode hero;
      the meta line is `S09E09 | 2013 | 43m` (episode label, year, runtime from the played
      duration when no runtime field exists); the synopsis falls back movie -> series overview;
      the chips read the `qualityProfile` name; both actions are the shared `_HeroActionPill`
      (52 px, equal by construction); the title/meta/synopsis are 48/18/18 px; the hero band is
      48 % of the view (the mockup proportion). Four cards now exactly fill the row (the 320 px
      cap is gone) and the card art flexes over the text block, so no card can overflow._ — eeb9e0e
- [x] Gate: `flutter analyze` clean; `flutter test` green — 345 passed (baseline 339). — eeb9e0e
- [x] Build and install the fat APK. Repeat the TV check with one frame and MD5 per step (F10).
      _Done: `JAVA_HOME=/home/daniel-bo/.local/jdk17 flutter build apk --release
      --android-skip-build-dependency-validation` (97.8 MB), installed on `192.168.10.60:5555`.
      One refinement on the way: an `Any` quality profile no longer renders a false `SD` chip
      (the API profile name is a constraint, not a quality). Evidence frames in
      `device-20260925/`:
      `p4-01-home-hero.png` MD5 `c872db1122768a42df1a081fdf7e20ad` — the home hero at
      1920x1080 shows `FEATURED`, the 48 px title, the meta line `S09E09 | 2025 | 22m`
      (episode label, series year, runtime from the played duration), the series synopsis,
      no false chip, and equal `Resume`/`Details` pills (measured 76/78 px tall);
      `p4-01-home-hero-crop.png` MD5 `4052c6c6d4c6680a0b4a136601200537` (hero crop of the
      same frame);
      `p4-02-subtitle-cue.png` MD5 `d5731da57d4c359b29c980fdab5b3e5c` — a bilingual cue
      during playback; `p4-02-cue-compare.png` MD5 `f34e3e8f4c200cf3ff2b9063a9a712ea` —
      old vs new cue at identical scale (old em ~31-32 physical px, new em ~66 px = the
      designed 2x). The hero falls back to the poster tile because this library has no
      landscape art in the database: `POST /api/metadata/refresh` fails with TMDB
      `401 Invalid API key`, so `backdropUrl` never populates. The landscape-art path is
      implemented and pinned by tests; it lights up when the rows carry art (operator action
      recorded in `tech-debt.md`). Only the cited frames are kept in the repository; the full
      89-frame burst of the run stays on the workstation._ — 375f77c
- [x] Fix the spurious `resume seek did not take effect (enforceResume)` report found by client-error
      triage 2026-11-27: the TV (APK 154) reported target 162 s, actual 0, duration 0, `mediaId:
      null` — the screen was disposed (`resetForNewPlayback`) while `_enforceResume` was still waiting
      for the load signal, so it kept seeking a dead player and then reported a failure that never
      happened. Bind the enforcement to the play session that started it.  **Done
      `6fe5c1fa`:** `_enforceResume` captures the session mediaId, bails on `!mounted` or a changed
      mediaId (including after the 900 ms seek verification), and the new test disposes the session
      while enforcement waits and asserts no report; playback suite 196/196, analyze clean.

- [ ] Perceptual remote-only sign-off. Human-gated. The owner holds this judgement.

- [x] Ship the resume-guard fix to the TV: build **1.3.97 / 155**, publish it through
      `publish-client-update.sh`, install it on `192.168.10.60:5555`, and re-assert HOME with
      `tv-launcher-recover.sh` (adb install clears the preferred launcher). **Done:** built
      1.3.97/155 (59.9 MB), published (`mediarr-client-155.apk`, sha b2a7de5a7860), installed
      (`versionCode=155`, `versionName=1.3.97`), HOME re-asserted to
      `com.mediarr.mediarr_client/.MainActivity`. — 6fe5c1f

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
