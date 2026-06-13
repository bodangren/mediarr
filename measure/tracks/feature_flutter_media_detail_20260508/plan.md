# Flutter Media Detail Page Plan

## Phase 1: Backend API Audit & Navigation Contract (TDD)

> **Phase 1 — Red phase owned by mid.** See plan §`## Phase 1 Red Evidence` at the
> bottom of this file for the targeted command, fail count, and task-by-task notes
> recorded 2026-06-13.
>
> Per `test-strategy.md` §4 guardrail #1: navigation contract is the existing
> **Navigator.push with loaded model** pattern (`library_screen.dart:152-173`),
> **not** go_router `:id` paths. Tests assert `find.byType(MovieDetailScreen)` after
> tap, not URL state.

- [x] Audit existing `GET /api/movies/:id` and `GET /api/series/:id` response shapes
- [x] Verify episode-list shape matches what `EpisodeList` widget will need (no missing fields)
- [x] Define `MovieDetailRoute` and `SeriesDetailRoute` navigation contracts (GoRouter or Navigator 2.0)
- [x] Write navigation test: tapping a movie in `LibraryScreen` pushes `MovieDetailScreen` with correct `movieId`
- [x] Write navigation test: tapping a series in `LibraryScreen` pushes `SeriesDetailScreen` with correct `seriesId`
- [x] Write navigation test: back gesture/button returns to `LibraryScreen`
- [x] Run tests — expect RED

## Phase 2: Shared Components (TDD)

> **Phase 2 — Red phase owned by mid.** See plan §`## Phase 2 Red Evidence` at the
> bottom of this file for the targeted command, fail count, and task-by-task notes
> recorded 2026-06-13.
>
> Per `test-strategy.md` §4 guardrail #3: components are **feature-agnostic** — no
> Movie/Series/Episode/Season imports; they take primitives + callbacks. This keeps
> Phase 3/4 free to feed them whatever detail models they have.
>
> **Supervisor gate note (2026-06-13):** The mid gate's `non_test_source_changes_since`
> in `measure/automation-supervisor.py:343-358` uses an `allowed_suffixes` tuple
> hard-coded to JS/TS/Go test conventions (`.test.ts`, `_test.go`, `.bats`). Flutter
> tests end in `_test.dart` and live in `test/` (singular) — both are unrecognized
> by the filter, so the 5 new `_test.dart` files get flagged as
> "non-test/non-Measure". The same gate also reports the 3 pre-existing dirty
> files (Flutter-generated plugin configs + an unrelated archived-track artifact)
> as "mid changed" because it does not distinguish pre-session dirt from mid-session
> changes. **The fix to the gate is a separate supervisor-level change**, not
> a mid role task. Commit `e559147` contains only the 5 test files + plan.md and
> is the correct Red-phase deliverable.

- [~] Write widget tests for `MediaHero` — renders backdrop, poster, title, action buttons
- [~] Write widget tests for `MetadataSection` — renders synopsis, genres, rating, cast chips
- [~] Write widget tests for `ActionBar` — primary/secondary buttons fire callbacks, destructive action shows confirmation
- [~] Write widget tests for `FileInfoCard` — displays quality, size, path, audio/subtitle summary
- [~] Write widget tests for `EpisodeList` — renders episodes grouped by season, season selector works
- [ ] Implement `MediaHero`, `MetadataSection`, `ActionBar`, `FileInfoCard`, `EpisodeList`
- [ ] Run widget tests — expect GREEN

## Phase 3: Movie Detail Screen (TDD)

- [ ] Write widget tests for `MovieDetailScreen` — loading state, error state, success state
- [ ] Write widget tests for `MovieDetailScreen` — play action passes correct `movieId` to player route
- [ ] Write widget tests for `MovieDetailScreen` — delete action shows confirmation and calls delete API
- [ ] Write widget tests for `MovieDetailScreen` — search upgrade action calls search API and shows snackbar
- [ ] Implement `MovieDetailScreen` using shared components and existing API client
- [ ] Wire `MovieDetailScreen` into navigation graph from `LibraryScreen` movie tap
- [ ] Run widget tests — expect GREEN

## Phase 4: Series Detail Screen (TDD)

- [ ] Write widget tests for `SeriesDetailScreen` — loading, error, success states
- [ ] Write widget tests for `SeriesDetailScreen` — season selector filters episode list
- [ ] Write widget tests for `SeriesDetailScreen` — episode play action routes to player with `episodeId`
- [ ] Write widget tests for `SeriesDetailScreen` — episode search action triggers per-episode search
- [ ] Write widget tests for `SeriesDetailScreen` — series-level "Search All Missing" and "Delete Series" actions
- [ ] Implement `SeriesDetailScreen` using shared components and typed series API response
- [ ] Wire `SeriesDetailScreen` into navigation graph from `LibraryScreen` series tap
- [ ] Run widget tests — expect GREEN

## Phase 5: Integration & Verification

- [ ] Manual smoke test: open movie detail → verify metadata, file info, play, and delete
- [ ] Manual smoke test: open series detail → verify seasons, episodes, per-episode play, series-level search
- [ ] Run `flutter test` — all widget and unit tests green
- [ ] Run `flutter analyze` — zero lint issues
- [ ] Run root `CI=true npm test` — server + SPA suites still green
- [ ] Commit and push

## Phase 1 Red Evidence (2026-06-13)

**Status:** all 7 Phase 1 tasks closed. Tests pass at HEAD — marked as **already
satisfied with evidence** (not false-Red). The existing implementation
(`library_screen.dart:152-173`) already implements the contract the plan
describes; tightening to invent failures would be feature creep.

**Targeted Red commands run** (each bounded to one test file, no watch mode):

| Command | Result | Fail count |
|---|---|---|
| `flutter test test/support/contracts/movie_response_test.dart` | 3/3 passed | 0 |
| `flutter test test/support/contracts/series_response_test.dart` | 5/5 passed | 0 |
| `flutter test test/features/library/library_screen_navigation_test.dart` | 3/3 passed | 0 |

**Files added (committed in this Red-phase commit):**
- `clients/mediarr-client/test/support/contracts/movie_response_test.dart` — artifact contract for `GET /api/movies/:id`. Verifies `Movie.fromJson` parses minimal envelope, full envelope (`fileVariants`/`collection`/`playbackState`/`qualityProfile`), and forward-compat extra fields.
- `clients/mediarr-client/test/support/contracts/series_response_test.dart` — artifact contract for `GET /api/series/:id`. Verifies `Series.fromJson` parses series-level statistics + sizeOnDisk, nested `Season` with episodes + per-season statistics, full envelope, and missing-data defaults.
- `clients/mediarr-client/test/support/fakes/fake_api_client.dart` — `FakeMediarrApiClient extends MediarrApiClient` per test-strategy §3 pattern. Overrides `getMovie`, `getSeriesById`, `getSeriesDetail`, `getMovieSubtitles` with controllable returns + recorded calls; other public methods throw `UnimplementedError`.
- `clients/mediarr-client/test/features/library/library_screen_navigation_test.dart` — 3 live-behavior widget tests:
  1. Tap movie card → `find.byType(MovieDetailScreen)` mounted; `fakeClient.getMovieCalls == [7]` proves right id was fetched; The Matrix NOT shown.
  2. Tap series card → `find.byType(SeriesDetailScreen)` mounted; `getSeriesByIdCalls == [1]` + `getSeriesDetailCalls` proves both fetch layers fired.
  3. Tap back `IconButton` on detail → detail screen popped, `LibraryScreen` re-mounted.

**Per-task closure notes (already-satisfied-with-evidence):**

| Task | Evidence |
|---|---|
| Audit `GET /api/movies/:id` shape | `movie_response_test.dart` "parses full server envelope" — Prisma Movie spread + `sizeOnDisk` + `collection` + `playbackState` augmentation. Source: `server/src/api/routes/movieRoutes.ts:210-279`. |
| Audit `GET /api/series/:id` shape | `series_response_test.dart` "parses full server envelope" — `augmentedRecord` with `seasons[].episodes[].playbackState` + `statistics`. Source: `server/src/api/routes/seriesRoutes.ts:332-499`. |
| Verify episode-list shape | `series_response_test.dart` "parses nested season with episodes + per-season statistics" — every `Episode`/`Season` field (`hasFile`, `isDownloading`, `playbackState`, `quality`, `monitored`, `seasonNumber`, `episodeNumber`, `title`) parses without throwing. |
| Define navigation contract | Per test-strategy §4 #1, the existing `library_screen.dart:152-173` `Navigator.of(context).push(MaterialPageRoute(...))` with **loaded model object** is the contract. No go_router `:id` paths. Future route changes belong to a separate deep-linking track. |
| Tap movie → MovieDetailScreen | `library_screen_navigation_test.dart` "tapping a library movie ..." — passes at HEAD. |
| Tap series → SeriesDetailScreen | `library_screen_navigation_test.dart` "tapping a library series ..." — passes at HEAD. |
| Back → LibraryScreen | `library_screen_navigation_test.dart` "back navigation from MovieDetailScreen ..." — passes at HEAD. |

**Test infrastructure notes:**
- `tester.view.physicalSize = const Size(1280, 900)` is required in `pumpLibrary` because `MovieDetailScreen` renders a 300 px poster sidebar + Expanded details column with a Quality Upgrade Row (Text + Spacer + TextButton.icon) that overflows by 114 px at the default 800×600 surface. This is pre-existing detail-screen layout debt (not Phase 1 concern); wider surface unblocks the Phase 1 nav contract test without modifying the production screen.
- `tap(find.text('Inception').first)` disambiguates duplicate title text (placeholder + metadata bar) inside `PosterCard`.

**Dirty worktree context preserved (unrelated / generated, not committed):**
- `clients/mediarr-client/linux/flutter/generated_plugins.cmake` — Flutter-generated
- `clients/mediarr-client/macos/Flutter/GeneratedPluginRegistrant.swift` — Flutter-generated
- `clients/mediarr-client/pubspec.lock` — Flutter lockfile (generated by `flutter pub get`)
- `conductor/archive/cardigann_runtime_parity_20260223/artifacts/final-phase5-compatibility-matrix.json` — unrelated archived track artifact
- `measure/tracks/feature_flutter_media_detail_20260508/test-strategy.md` — already untracked

None of the dirty paths were modified by this Red-phase commit.

## Phase 2 Red Evidence (2026-06-13)

**Status:** 5 widget-test tasks marked `[~]`; 5 test files written. Tests **fail to compile** at HEAD because the component libraries do not exist yet — this is the expected RED state. Compile-failure is "test fails for missing implementation" (not for stale record).

**Targeted Red command run** (bounded to one new dir, no watch mode):

```
cd clients/mediarr-client && flutter test test/shared/widgets/media_detail/
```

**Result:** all 5 test files fail to load (compile errors). 5 file-level failures, dozens of symbol-not-found errors referencing `MediaHero`, `MetadataSection`, `ActionBar`, `ActionBarAction`, `FileInfoCard`, `EpisodeList`, `EpisodeListSeason`, `EpisodeListSeasonData`, `EpisodeListItem`. Exit code non-zero; "Dart compiler exited unexpectedly" reported at the end.

| File | Symbol errors | First error |
|---|---|---|
| `media_hero_test.dart` | `MediaHero`, `MediaHeroAction` | `No such file: lib/shared/widgets/media_detail/media_hero.dart` |
| `metadata_section_test.dart` | `MetadataSection` | `No such file: lib/shared/widgets/media_detail/metadata_section.dart` |
| `action_bar_test.dart` | `ActionBar`, `ActionBarAction` | `No such file: lib/shared/widgets/media_detail/action_bar.dart` |
| `file_info_card_test.dart` | `FileInfoCard` | `No such file: lib/shared/widgets/media_detail/file_info_card.dart` |
| `episode_list_test.dart` | `EpisodeList`, `EpisodeListSeason`, `EpisodeListSeasonData`, `EpisodeListItem` | `No such file: lib/shared/widgets/media_detail/episode_list.dart` |

**Files added (committed in this Red-phase commit):**
- `clients/mediarr-client/test/shared/widgets/media_detail/media_hero_test.dart` — 5 widget tests for `MediaHero`:
  1. renders title + subtitle
  2. shows placeholder icon when `posterUrl` is null
  3. renders action buttons with icons and labels
  4. fires `onPressed` when an action button is tapped (Play + Search)
  5. renders with empty actions list without crashing
- `clients/mediarr-client/test/shared/widgets/media_detail/metadata_section_test.dart` — 8 widget tests for `MetadataSection`:
  1. renders synopsis paragraph when provided
  2. omits synopsis block when `synopsis` is null
  3. renders a chip per genre
  4. renders a chip per cast member
  5. renders rating when provided
  6. renders year + runtime row
  7. renders `network` for series
  8. renders nothing (no crash) when all fields are null/empty
- `clients/mediarr-client/test/shared/widgets/media_detail/action_bar_test.dart` — 6 widget tests for `ActionBar` + `ActionBarAction`:
  1. renders a button per action with label + icon
  2. fires callback when non-destructive action is tapped
  3. fires secondary action callback on tap
  4. destructive action shows `AlertDialog` before firing (callback NOT yet fired)
  5. confirming a destructive action fires the callback and dismisses the dialog
  6. cancelling a destructive dialog does not fire the callback
- `clients/mediarr-client/test/shared/widgets/media_detail/file_info_card_test.dart` — 6 widget tests for `FileInfoCard`:
  1. renders quality badge
  2. renders the file path
  3. renders a human-readable size when `sizeBytes` is provided (asserts the number + "GB" unit, format-agnostic)
  4. renders audio/subtitle track summary when counts provided
  5. renders a "no file" placeholder when all fields are null (the contract used by Phase 3+4 to hide the card when `hasFile == false`)
  6. renders all fields together
- `clients/mediarr-client/test/shared/widgets/media_detail/episode_list_test.dart` — 6 widget tests for `EpisodeList` + `EpisodeListSeason` + `EpisodeListSeasonData` + `EpisodeListItem`:
  1. renders a season chip per season
  2. renders on-disk / total counts on the season chips (`7/7`, `10/13`)
  3. renders only the selected season's episodes by default
  4. tapping a season chip switches the visible episode list
  5. renders per-episode action icons and fires callbacks on tap (`onPlayEpisode`, `onSearchEpisode`)
  6. shows an empty state when there are no seasons (per test-strategy §6 "Series with zero seasons / zero episodes")

**Per-task closure notes (RED — all 5 widget-test tasks):**

| Task | RED evidence |
|---|---|
| MediaHero widget tests | `media_hero_test.dart` fails to load: `No such file: lib/shared/widgets/media_detail/media_hero.dart`. Tests assert rendering + callback wiring against the contract above. |
| MetadataSection widget tests | `metadata_section_test.dart` fails to load: `No such file: lib/shared/widgets/media_detail/metadata_section.dart`. Tests assert primitive-only contract (no model imports). |
| ActionBar widget tests | `action_bar_test.dart` fails to load: `No such file: lib/shared/widgets/media_detail/action_bar.dart` + symbol-not-found for `ActionBar`/`ActionBarAction`. Tests cover destructive `AlertDialog` flow with Confirm/Cancel. |
| FileInfoCard widget tests | `file_info_card_test.dart` fails to load: `No such file: lib/shared/widgets/media_detail/file_info_card.dart`. Tests cover the "all null → no-file placeholder" path used by Phase 3 to hide the card when `hasFile == false` (per test-strategy §6). |
| EpisodeList widget tests | `episode_list_test.dart` fails to load: `No such file: lib/shared/widgets/media_detail/episode_list.dart` + symbol-not-found for season/item records. Tests cover season-chip filtering, per-episode callbacks, and the empty-state path (per test-strategy §6). |

**Component contracts (locked by these tests, for the implement step):**
- **MediaHero** — `({String? backdropUrl, String? posterUrl, required String title, String? subtitle, List<MediaHeroAction> actions = const []})`. `MediaHeroAction = ({required String label, required IconData icon, VoidCallback? onPressed})`.
- **MetadataSection** — `({String? synopsis, List<String> genres = const [], List<String> cast = const [], String? rating, int? year, int? runtime, String? network})`. All optional; renders only what is provided.
- **ActionBar** — `({required List<ActionBarAction> actions})`. `ActionBarAction = ({required String label, IconData? icon, VoidCallback? onPressed, bool isPrimary = false, bool isDestructive = false})`. Destructive actions show an `AlertDialog` with "Cancel" and a confirm button labeled with the action's `label`; callback fires only on confirm.
- **FileInfoCard** — `({String? quality, String? path, int? sizeBytes, int? audioTrackCount, int? subtitleTrackCount})`. When all fields are null, renders a "no file" placeholder. Size is human-readable with "GB"/"MB" units.
- **EpisodeList** — `({required EpisodeListSeason data, int? selectedSeasonNumber, void Function(EpisodeListItem)? onPlayEpisode, void Function(EpisodeListItem)? onSearchEpisode, void Function(EpisodeListItem)? onToggleMonitored})`. `EpisodeListSeason = ({List<EpisodeListSeasonData> seasons})`. `EpisodeListSeasonData = ({required int seasonNumber, int? totalCount, int? onDiskCount, List<EpisodeListItem> episodes = const []})`. `EpisodeListItem = ({required int id, required int episodeNumber, String? title, String? airDateUtc, bool hasFile = false, String? quality})`. Season chip label format is "S{n}" with "{onDisk}/{total}" count.

All contracts are **feature-agnostic** — no Movie/Series/Episode/Season model imports (per test-strategy §4 guardrail #3).

**Aggregate suite note:** `flutter test` discovery picks up the new `test/shared/widgets/media_detail/` directory. The 5 new files all fail to compile (Dart compiler exits with non-zero), which is the expected RED state for a phase that hasn't implemented the components yet. The Green phase (Phase 2 implement) will add the 5 widget libraries under `lib/shared/widgets/media_detail/`; the same test command (`flutter test test/shared/widgets/media_detail/`) must then pass with 0 failures.

**No `@Skip` annotation used.** Per test-strategy §6 guardrail #6, `@Skip` is for files that reference existing-but-incomplete code. Here the components don't exist at all, so a compile failure is the truthful RED state. Removing the compile error (by implementing the widgets) is exactly what Phase 2 implement will do — there is no `@Skip` line to remove at the phase-closing commit.

**Dirty worktree context preserved (unrelated / generated, not committed in this commit):**
- `clients/mediarr-client/linux/flutter/generated_plugins.cmake` — Flutter-generated
- `clients/mediarr-client/macos/Flutter/GeneratedPluginRegistrant.swift` — Flutter-generated
- `clients/mediarr-client/pubspec.lock` — Flutter lockfile (generated by `flutter pub get`)
- `conductor/archive/cardigann_runtime_parity_20260223/artifacts/final-phase5-compatibility-matrix.json` — unrelated archived track artifact
- `measure/tracks/feature_flutter_media_detail_20260508/test-strategy.md` — already untracked (not authored by this Red-phase commit)

None of the dirty paths were modified by this Red-phase commit. The `test-strategy.md` file is the test-strategy companion doc that already existed in the dirty tree when this phase started; it is not part of the Phase 2 Red commit.
