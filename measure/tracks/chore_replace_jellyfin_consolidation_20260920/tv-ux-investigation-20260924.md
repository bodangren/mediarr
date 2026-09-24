# TV Client UI/UX Investigation — 2026-09-24

Owner request: "The design UI/UX of the TV client is awful and not navigable. Please investigate."

Target: `clients/mediarr-client/` (Flutter), Android TV build on `192.168.10.62`.
Related track: `chore_replace_jellyfin_consolidation_20260920`, Phase 4b (FR-11).

---

## 1. Method

I used four evidence sources. I state each finding with its source.

1. **Source review** of all 54 Dart files in `lib/`, plus the Flutter SDK
   (`focus_traversal.dart`, `scrollable.dart`, `editable_text.dart`, `focus_scope.dart`).
2. **Measured focus traces** on the real screens. I added
   `clients/mediarr-client/test/investigation/focus_trace_probe_test.dart`, which mounts the
   production `HomeScreen` and `MoviesScreen`, sends D-pad key events, and prints the focus node
   after each press. Run it with
   `flutter test test/investigation/focus_trace_probe_test.dart -r expanded`.
3. **Frame forensics** on the 69 device screenshots in `/tmp/opencode/`, by MD5 hash.
4. **Visual review** of the frames that Phase 4b cites as verification.

## 2. Verdict

The owner's report is correct, and the cause is specific. Four invisible focus stops intercept the
D-pad and then trap it. On Home, **no content item is reachable with the remote at all**. On Movies
and Series, one Left press strands focus on an invisible node and Down stops working.

This is not a taste problem first. It is a navigation defect with visible layout defects on top.
Fix order: navigation (F1-F4), then controls (F5-F8), then presentation (F11-F16).

Phase 4b is marked `[x]` in `plan.md`, but two of its claims are contradicted by measurement and
three cite evidence that does not show the claimed state. Section 5 lists the corrections.

---

## 3. Findings

Severity: **Critical** blocks use of the client with a remote. **High** breaks a control or the
trust in the record. **Medium** degrades the presentation.

### Critical

**F1. Home: invisible row stops capture every Down press. No content item is reachable.**
- Evidence: focus trace, Appendix A, trace 1.
- Mechanism: `HomeScreen` wraps each row in a bare `Focus` widget that owns a `FocusNode`
  (`home_screen.dart:131-138`, `290-293`). A bare `Focus` node defaults to
  `canRequestFocus: true`, `skipTraversal: false`, so it is a real stop. It renders no focus cue.
- Measured: Down 1 → `HomeScreen.continueWatching.row`. Down 2 → `HomeScreen.recent.row`.
  Down 3 → `HomeScreen.movies.row`. Down 4 → `HomeScreen.series.row`. No poster, no card.
- Effect: the user presses Down and sees nothing move. This is the reported "not navigable".

**F2. Home: focus traps on the last row. OK and Right do nothing.**
- Evidence: focus trace, Appendix A, traces 1 and 3.
- Mechanism: the row wrapper rect contains its children, so directional traversal cannot descend
  into the row. From `HomeScreen.series.row`, no node lies below its bottom edge. The wrapper has
  no `onSelect` handler.
- Measured: Down 5 to Down 9 stay on `HomeScreen.series.row`. `select` changes nothing.
  `right` changes nothing.
- Effect: the remote appears dead. The user cannot open anything and cannot leave the row.

**F3. Movies and Series: `NetflixScaffold.root` intercepts Left and then blocks Down.**
- Evidence: focus trace, Appendix A, trace 4.
- Mechanism: `NetflixScaffold` creates `_rootFocusNode` (`netflix_scaffold.dart:56`) and attaches it
  to a `Focus` widget (`:87-89`). The comment states that it does not autofocus the root node, but
  the node stays traversable and actionless.
- Measured: `left 1` from the search field → `NetflixScaffold.root`, rect 1159 x 720.
  Then `down 1` to `down 4` stay on `NetflixScaffold.root`.
- Effect: one Left press strands focus on an invisible node that covers the whole screen. Down dies.

**F4. No scroll-into-view. Lazy lists drop focus out of sight.**
- Evidence: frame `d5_poster_focused.png` shows no focused item and a clipped ring fragment at the
  top edge. Source: zero `ensureVisible` calls in `lib/`.
- Mechanism: `Scrollable.ensureVisible` is manual. The SDK `scrollable.dart` has no focus handling,
  so nothing scrolls a newly focused child into view. `GridView.builder` and `ListView.separated`
  build children lazily, so an off-screen item may hold no node at all.
- Effect: focus moves to items the user cannot see. The focus cue vanishes between presses.

### High

**F5. The Movies and Series search boxes accept no text.**
- Evidence: focus trace, Appendix A, trace 5. Typing `matrix` leaves the controller empty.
- Mechanism: the `FocusNode` is bound to a wrapper `Focus`, not to the `TextField`
  (`movies_screen.dart:70-72`, `series_screen.dart:70-72`). Measured owner widget of the focused
  node is `Focus`. `EditableText._handleFocusChanged` opens the input connection only when its own
  node holds focus, so the input method never attaches.
- Effect: the search field is a dead control on both library screens.

**F6. Recently Added posters are focusable but have no action.**
- Evidence: `home_screen.dart:566-572`. `_LibraryPosterCard` passes an empty `onSelect` closure.
  `_RecentlyAddedRow` passes no callback. The comment claims that activation is wired at the parent.
  That claim is false.
- Effect: OK on these posters does nothing. Focus stops on dead items.

**F7. The TV client has no Settings and no Search route. Five screens are dead code.**
- Evidence: `app_router.dart:53-102` registers discovery, home, movies, series, playback only.
  Unreachable: `library_screen.dart`, `activity_screen.dart`, `calendar_screen.dart`,
  `search_screen.dart`, `settings_screen.dart`, `queue_item_detail_sheet.dart`,
  `quality_upgrade_sheet.dart`. `MediaGrid`, `LibraryItemCard`, and `FocusableCard` serve only those
  screens. Seven test files still cover them.
- Effect: the user cannot change the server or configure anything on the TV. The suite reports green
  for screens the user cannot open.

**F8. Continue Watching cards have no artwork and a weak focus cue.**
- Evidence: `continue_watching_section.dart:82-141`. The card is `InkWell` + `Ink` with text and a
  progress bar, and no image. Frames `d1_home.png` and `d5_poster_focused.png` show black boxes.
  `InkWell` focus is a faint overlay on a dark surface.
- Effect: the first row on Home is a row of black rectangles.

**F9. The D-pad tests exercise a re-implemented mock. They cannot fail for F1 to F4.**
- Evidence: `home_screen_dpad_test.dart:174-264` defines `_DpadHomeProbe`, which rebuilds the
  layout with `_ProbeHero`, `_ProbeSectionLabel`, and `_ProbePoster`. It never mounts `HomeScreen`.
  Assertions are weak: `expect(find.text('Inception'), findsWidgets)`, and activation is checked
  inside `if (activated != null)` (`:114`), so a miss still passes. The second test asserts only
  that no exception is thrown.
- Effect: 368 green tests and a red TV. The tests state a contract ("Down reaches a poster") that
  production does not meet, and they pass anyway.

**F10. The Phase 4b verification record contains false and mismatched evidence.**
- Evidence: Appendix B, plus visual review.
  1. `p5_movies_grid.png` is cited as "Movies grid shows The Matrix poster with accent focus ring".
     The frame shows the TV **AppInstaller** dialog "Choose device to scan apks", not our client.
     Its three byte-identical siblings carry the same content.
  2. Eight frames named `p5_movies_focused`, `p5_after_back`, `p5_movies_grid_final`, `p6`, and
     four more are byte-identical (MD5 `19a9bd69…`). Their names claim different states.
  3. `d3_rail_movies.png` and `d4_recently_focused.png` are byte-identical. So are
     `r23_rail_movies.png` and `r24_movies_screen.png`.
  4. `p5e_movies_grid.png` is cited as current, but it shows a violet thin ring, one tile, and a
     missing poster. The current code draws a white ring and a 1.10 scale. The frame is an older
     build (before commit `807158ec`).
- Effect: `plan.md` marks Phase 4b `[x]` on evidence that does not support the claims. A task marked
  "verified on device" can hide unimplemented work.

### Medium

**F11. The Home hero crops a portrait poster as a landscape backdrop.**
- Evidence: `home_screen.dart:339-347` falls back to `lib.posterUrl` with a comment that says so.
  `media_hero.dart:43` loads with `Image.network` and no placeholder.
- Effect: frame `d1_home.png` shows a garish crop. Frame `d6_focus_poster.png` shows an empty hero
  band with a gray placeholder icon.

**F12. Detail screens show duplicate and meaningless metadata.**
- Evidence: `series_detail_screen.dart:171` sets `subtitle: series.year` and `:175` passes
  `year: series.year` again. Same in `movie_detail_screen.dart:159` and `:163`.
  `FileInfoCard` renders `0 B` for a zero size (`file_info_card.dart:92-101`) and is placed in the
  main column, so it reads as a chip.
- Effect: frame `d6_focus_poster.png` shows "2025", "2025", and "0 B".

**F13. Detail screens keep the sidebar rail and use an unbalanced layout.**
- Evidence: detail screens push on the shell navigator
  (`movie_detail_screen.dart:166-168`, `series_detail_screen.dart:164-166`), so `LeanbackScaffold`
  stays. Frame `d6_focus_poster.png` shows the rail, a back button squeezed into the top-left, a
  380 px empty hero band, and one episode row whose play and search icons sit about 1600 px from
  the title.
- Extra defect: `_playEpisode` builds the title from the database id
  (`series_detail_screen.dart:66`), so it reads "Episode 123" instead of "S09E09".

**F14. Four different focus cues are in use.**
- Evidence: `FocusableAction` poster and button variants, `FocusableCard` (only
  `search_screen.dart:213`), `InkWell` in Continue Watching, and Material `TextButton`,
  `ElevatedButton`, `IconButton`, and `ChoiceChip` on detail screens.
- Extra defects: `netflix_scaffold.dart:207-212` and `:234-239` both draw a white border, which
  reads as a double ring (visible in `d1_home.png`). `netflix_scaffold.dart:252-255` sets
  `AnimatedScale(scale: _isFocused ? 1.0 : 1.0)`, which is a no-op.

**F15. The focused scale overflows its slot and clips at viewport edges.**
- Evidence: `netflix_scaffold.dart:198-205` scales the container 1.10 with a transform. A transform
  does not change the layout size, so the card overlaps its neighbours and the glow clips at list
  edges. Frame `r21_movies_grid.png` shows a focused card cut at the bottom edge.

**F16. Type and icon scale is below TV size.**
- Evidence: `fontSize` histogram across `lib/`: 28 uses of 12 px, 23 of 14 px, 13 of 13 px,
  13 of 11 px, 4 of 9 px. Icons 16 to 20 px in `episode_list.dart` and the poster tiles
  (`home_screen.dart:673` width 160; `movies_screen.dart:136` `maxCrossAxisExtent: 180`).
- Effect: text is not readable from a couch. Netflix-style TV surfaces use 28 to 40 px titles and
  240 px or wider tiles.

---

## 4. What works

State this so the repair does not undo it.

- Left from the Home hero reaches the rail (trace 2). The rail is a usable escape route today.
- The hero Play button autofocuses on Home entry.
- The Movies grid focuses its first tile on entry (trace 4, `start`).
- Discovery host entry binds `_hostFocusNode` directly to the `TextField`, so it avoids F5.
- FR-6 default track selection and FR-7 subtitle nudge are unaffected by these findings.

---

## 5. Corrections to `plan.md`

Apply these before any new Phase 4b claim.

1. Reopen the D-pad focus framework task. Its claim "every screen operable with arrows + OK + Back"
   is contradicted by F1 to F3.
2. Reopen the Home screen task. Its claim "each row's first item is the focus anchor when reached
   via Down" is contradicted by F1.
3. Reopen the widget test task. Replace the mock tests (F9) with tests that mount the real screens.
4. Reopen the on-device D-pad task. Its cited frames are byte-identical (F10).
5. Replace every "Verified on device" citation with frames that show the claimed state. Record the
   MD5 of each cited frame in `plan.md`.
6. New requirement for all future verification tasks: do not mark a task done unless the cited
   artifact shows the claimed state. Name the artifact and its checksum.

---

## 6. Remediation proposal (Phase 4c)

Procedure order matters. Do steps 1 to 4 first, because they make the client operable.

1. **Red:** extend the probe to strict assertions. Assert that Down from hero Play lands on a
   content item. Assert that every Down press reaches a content item or a defined row edge.
   Assert that no focus stop is invisible. Assert that Left reaches the rail and Down from the
   content reaches the rail again.
2. **Green:** delete the bare `Focus` wrappers in `HomeScreen`, `MoviesScreen`, and `SeriesScreen`.
   Bind each `FocusNode` to the control it represents, or set `skipTraversal: true`.
3. **Green:** make `NetflixScaffold.root` non-traversable. Set `canRequestFocus: false` and
   `skipTraversal: true`, or remove the node.
4. **Green:** bind the search `FocusNode`s to the `TextField` `focusNode` parameter so the editable
   text owns focus and the input method attaches (F5).
5. **Green:** wire Recently Added activation to `_openLibraryItem` (F6).
6. **Green:** call `Scrollable.ensureVisible` on focus change in every row and grid. Keep focused
   items built (cache extent) so the cue stays visible (F4).
7. **Green:** one focus cue. Route every interactive control through `FocusableAction`. Remove
   `FocusableCard`, `InkWell` focus, and Material button focus variance on TV surfaces. Remove the
   double ring and the no-op `AnimatedScale` (F14).
8. **Green:** reserve layout space for the focused scale. Grow the slot instead of using a
   transform, so items do not overlap and the ring does not clip (F15).
9. **Green:** apply a TV type and tile scale. Titles 28 px or more, body 18 px or more, icons 28 px
   or more, posters 240 px or more wide (F16).
10. **Green:** give the hero a real backdrop (`fanartUrl`) and a designed gradient fallback. Load it
    with `CachedNetworkImage` and a placeholder (F11).
11. **Green:** single-source the detail metadata. Print the year once. Hide `FileInfoCard` when the
    size is zero. Build the playback title from season and episode numbers (F12, F13).
12. **Green:** push detail screens on the root navigator for a full-screen surface, or adapt the
    layout to the rail. Keep a large, focused back control (F13).
13. **Decision:** restore Settings and Search routes, or record the product decision to omit them.
    Delete the five dead screens or route them (F7).
14. **Red:** replace the mock D-pad tests with tests that mount the real screens (F9).
15. **Human gate:** run the client on `192.168.10.62` with the remote only. Capture one frame per
    step and record its MD5 in `plan.md` before you mark any task done (F10).

Gate for Phase 4c: `flutter analyze` zero issues, `flutter test` green, and the probe traces show
every content item reachable.

---

## Appendix A — measured focus traces

Command: `CI=true flutter test test/investigation/focus_trace_probe_test.dart -r expanded`.
Viewport 1280 x 720. Data: 1 continue-watching item, 2 recently-added items, 3 movies, 2 series.

**Trace 1 — Down x9 from hero Play (Home):**
```
start -> label=HomeScreen.hero.play widget=Focus
down 1 -> label=HomeScreen.continueWatching.row widget=Focus
down 2 -> label=HomeScreen.recent.row widget=Focus
down 3 -> label=HomeScreen.movies.row widget=Focus
down 4 -> label=HomeScreen.series.row widget=Focus
down 5 -> label=HomeScreen.series.row widget=Focus
down 6 -> label=HomeScreen.series.row widget=Focus
down 7 -> label=HomeScreen.series.row widget=Focus
down 8 -> label=HomeScreen.series.row widget=Focus
down 9 -> label=HomeScreen.series.row widget=Focus
```

**Trace 2 — Left x4, Up x2 from hero Play (Home):**
```
start -> label=HomeScreen.hero.play widget=Focus
left 1 -> label=rail.dest widget=Focus
left 2 -> label=rail.dest widget=Focus
left 3 -> label=rail.dest widget=Focus
left 4 -> label=rail.dest widget=Focus
up 1   -> label=rail.dest widget=Focus
up 2   -> label=rail.dest widget=Focus
```

**Trace 3 — Down x4, Select, Right, Select (Home):**
```
start  -> label=HomeScreen.hero.play widget=Focus
down 1 -> label=HomeScreen.continueWatching.row widget=Focus
down 2 -> label=HomeScreen.recent.row widget=Focus
down 3 -> label=HomeScreen.movies.row widget=Focus
down 4 -> label=HomeScreen.series.row widget=Focus
select -> label=HomeScreen.series.row widget=Focus   (no change, no action)
right 1-> label=HomeScreen.series.row widget=Focus   (no change)
select -> label=HomeScreen.series.row widget=Focus   (no change, no action)
```

**Trace 4 — Up x3, Left x3, Down x4 (Movies):**
```
start  -> label=FocusableAction widget=Focus          (grid tile, 171.8 x 286.4)
up 1   -> label=(unnamed) widget=Focus                (continue-watching card, 320 x 150)
up 2   -> label=MoviesScreen.search widget=Focus      (280 x 48)
up 3   -> label=MoviesScreen.search widget=Focus      (no change)
left 1 -> label=NetflixScaffold.root widget=Focus     (1159 x 720, invisible)
left 2 -> label=rail.dest widget=Focus
left 3 -> label=rail.dest widget=Focus
down 1 -> label=NetflixScaffold.root widget=Focus     (stuck)
down 2 -> label=NetflixScaffold.root widget=Focus     (stuck)
down 3 -> label=NetflixScaffold.root widget=Focus     (stuck)
down 4 -> label=NetflixScaffold.root widget=Focus     (stuck)
```

**Trace 5 — typing into the Movies search box:**
```
focus before typing -> label=MoviesScreen.search widget=Focus
widget that owns the focused node -> Focus
search controller text after typing "matrix": ""
```

## Appendix B — device frame integrity map (MD5, `/tmp/opencode/`)

69 frames, 8 MD5 groups with duplicates.

| MD5 (prefix) | Frames | Claimed states |
|--------------|--------|----------------|
| `19a9bd69` | 8 frames: `p5_after_back`, `p5a_rail_movies`, `p5b_movies_focus`, `p5_focus_movies`, `p5_movies_a`, `p5_movies_focused`, `p5_movies_grid_final`, `p6` | back, rail, grid, focused |
| `7706db99` | 4 frames: `p5_movies_grid`, `p5_movies_grid2`, `p5b_movies_grid`, `p5c_movies` | movies grid (content is the TV AppInstaller) |
| `eabea160` | 3 frames: `r12_movies_screen`, `r15_movies`, `r18_movies_screen` | three "movies screen" states |
| `bdab3809` | 3 frames: `p2d`, `p4_dpad_before`, `p4_home_after_connect` | host entry, D-pad before, home |
| `2637c52b` | 3 frames: `r1_home`, `r22_clean_start`, `r25_hero_top` | three "home" states |
| `5eb53784` | 2 frames: `d3_rail_movies`, `d4_recently_focused` | rail and "recently focused" |
| `8ff355c3` | 2 frames: `r4_after_down`, `r6_dpad_after` | two D-pad results |
| `0a993b0d`, `22f3f952`, `5ffa3d0d`, `5613205a`, `7a021509` | 2 frames each | named as different states |

Conclusion: input produced no visible change across most captured pairs. Treat every Phase 4b
"verified on device" citation as unverified until a new frame shows the claimed state.

---

## Addendum 2026-09-24 — result of the Phase 4c implementation

Steps 1 to 14 are implemented. The implementation produced one new critical finding and one
correction to this report.

**F17 (Critical, new): the rail is unreachable from the content in the production router shell.**
The strict tests mount the real `GoRouter` shape, and Left from the Home hero did not reach the
rail there, unlike in the simplified probe tree of section 1. Cause: every routed page is wrapped
in a `ModalRoute` `FocusScope` (`_ModalScopeState`), and
`DirectionalFocusTraversalPolicyMixin` only searches the focused node `enclosingScope`. The
measured scope held exactly the 12 page nodes and none of the 3 rail nodes.
Fix: `LeanbackScaffold` now owns the shell boundary. Left at a row's left edge opens the rail and
focuses the current destination. Right on the rail returns to the item the user came from. Left
and Right at the other row edges do nothing.

**Correction to section 4 ("What works"):** the claim "Left from the Home hero reaches the rail"
is withdrawn. It was true only outside the router. F17 replaces it.

**Harness lesson:** the first probe mounted `LeanbackScaffold` directly and reported a behaviour
that production does not have. A finding from a simplified tree is a hypothesis until the
production composition reproduces it.

### Result

- `test/features/home/home_screen_dpad_test.dart` now mounts the real `HomeScreen` (7 tests). The
  `_DpadHomeProbe` mock is deleted.
- `test/features/library/library_dpad_test.dart` is new (7 tests) for `MoviesScreen` and
  `SeriesScreen`.
- Both suites assert `expectVisibleFocus` after every key press: focus must sit on a control that
  renders a focus cue.
- Gates: `flutter analyze` clean, `flutter test` 320 passed.
- Step 13 decision: the rail stays at Home / Movies / Series (owner-approved strip). Admin
  surfaces stay out (player-first). The five unreachable screens and three dead widgets are
  deleted. A "Server" affordance in the rail opens Discovery (`?switch=1`) so the user can change
  server.
- Remaining: step 15, the human-gated remote-only check on `192.168.10.62`.
