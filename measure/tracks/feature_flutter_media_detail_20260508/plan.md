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

- [ ] Write widget tests for `MediaHero` — renders backdrop, poster, title, action buttons
- [ ] Write widget tests for `MetadataSection` — renders synopsis, genres, rating, cast chips
- [ ] Write widget tests for `ActionBar` — primary/secondary buttons fire callbacks, destructive action shows confirmation
- [ ] Write widget tests for `FileInfoCard` — displays quality, size, path, audio/subtitle summary
- [ ] Write widget tests for `EpisodeList` — renders episodes grouped by season, season selector works
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
