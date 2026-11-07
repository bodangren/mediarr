# Test Strategy — Flutter Media Detail Page

> Tech Lead notes for `feature_flutter_media_detail_20260508`. Companion to `plan.md` / `spec.md`.
> Authoritative gates: `flutter test` (Flutter side) and `CI=true npm test` (root SPA+server, must stay green).

## 1. Build-Graph Findings That Shaped This Strategy

`graph.db` fresh (mtime today, 7494 nodes). The graph indexes only TS — the Flutter client is excluded — so it was used for cross-side reference, not direct call-graph tracing.

- `search MovieDetail` / `SeriesDetail` → SPA-side `MovieDetailPage.tsx`, `SeriesDetailPage.tsx`, `MovieDetailHeader.tsx`. These are the **product-parity reference** for what the Flutter screens must surface (synopsis/cast/file-info/episode actions).
- `inspect interface:MovieDetail` (`app/src/types/movie.ts:90`) → 0 outgoing edges; the contract is shape-only and lives behind `routeMap.movieDetail` / `routeMap.seriesDetail`. Phase 1's "audit response shape" step is verified against these TS interfaces, not regenerated.
- `GET /api/movies/:id` is ambiguous (server route + MSW handler). Phase 1 audits the **server route** as the source of truth; the MSW handler is SPA-only and irrelevant to the Flutter client.
- File-system probe (graph excludes Flutter): `lib/features/library/movie_detail_screen.dart` (412 lines) and `series_detail_screen.dart` (622 lines) **already exist** but have **no test files**, and `library_screen.dart:152-173` already pushes them via `Navigator.of(context).push(MaterialPageRoute(...))` passing the **fully-loaded `Movie` / `Series` object** — not via go_router `:id` paths. This collides with plan Phase 1's "navigate with `movieId`" wording (see §4 Guardrails).

## 2. Testing Pyramid Per Phase

| Phase | Unit | Widget | Integration | Manual / Live |
|---|---|---|---|---|
| 1 Audit + nav contract | response-shape parsers | nav harness (LibraryScreen → push) | — | — |
| 2 Shared components | small pure widgets | each component in isolation | — | — |
| 3 Movie Detail | — | full screen w/ provider overrides | — | — |
| 4 Series Detail | season selector logic | full screen + nested episode list | — | — |
| 5 Verification | — | — | full `flutter test` | smoke on real daemon |

Bias: **widget tests dominate**. Pure unit tests only where logic detaches cleanly (season grouping, response-shape adapters). No new server tests — server endpoints are reused and already covered by existing `CI=true npm test`.

## 3. Shared Test Fixtures & Mocks

Place under `clients/mediarr-client/test/support/` (new):
- `fixtures/movie_fixtures.dart` — `movieWithFile`, `movieMissing`, `movieMonitoredOnly`.
- `fixtures/series_fixtures.dart` — `seriesTwoSeasons` with nested seasons/episodes mirroring `getSeriesDetail` shape.
- `fakes/fake_api_client.dart` — extend the `MediarrApiClient` notifier; **implement every public method** as `throw UnimplementedError` and override only what the test needs. (See lessons-learned 2026-04-17 — `implements` mocks break on every API surface change; use a single base fake instead of per-test mocktail mocks.)
- Reuse `mediarrDarkTheme` + `ProviderScope.overrides` pattern from `library_screen_test.dart`.

## 4. Architecture Guardrails

1. **Do not introduce go_router `:id` paths for detail screens.** Existing navigation passes the loaded model object via `Navigator.push`. Phase 1's "navigation contract" task must reconcile to this reality: the contract is "tap → fetch → push with model"; tests assert `find.byType(MovieDetailScreen)` after tap, not URL state. If the team wants `/movies/:id` routes, that is a **separate track** (deep-linking) and out of scope here.
2. **No new API endpoints.** Plan Phase 1 step 1 is an audit — if a field is missing, file tech-debt and stub client-side, do not change the server in this track.
3. **Shared components live in `lib/shared/widgets/media_detail/`**, not under `features/library/`. Phase 2 components must be feature-agnostic (no Movie/Series imports — take primitives + callbacks).
4. **`ConsumerStatefulWidget` for any screen with async secondary loads** (subtitles, episodes) — confirmed pattern (lessons 2026-05-01).
5. **`pool: 'forks'` does not apply here** (that's Vitest); but the parallel Flutter analog is: never share a real `Dio` instance across tests — always override `apiClientProvider`.
6. **Aggregate suite hygiene:** `flutter test` discovers every `*_test.dart` under `test/`. Any new red file written ahead of its Green task must live behind a `[~]` task and be **explicitly skipped via `@Skip('Phase N — pending implementation')`** at the top of the file. `flutter test` honors `@Skip`; `flutter test --exclude-tags pending` is a fallback. Never leave an unskipped red file at phase boundary commit.

## 5. Per-Phase Test Approach Notes

- **Phase 1 — Contract & Nav.** Two artifact-contract tests (Movie/Series response-shape adapters parse a JSON fixture matching the server route) + three live behavior nav tests (tap library tile → `MovieDetailScreen` / `SeriesDetailScreen` mounted; system back pops). Use the existing fake `apiClientProvider` override; assert widget type, not URL.
- **Phase 2 — Shared Components.** Five widget files, each rendered standalone in `MaterialApp`. Render-state asserts only (text, images, callback wiring via `verify` on a `mocktail` callback). No Riverpod overrides needed for primitive components.
- **Phase 3 — MovieDetailScreen.** Loading/error/success via `Completer` trick (lessons 2026-04-09 router pattern). Action wiring uses fake `apiClientProvider` and asserts the fake recorded the call (`fake.deletedIds`, `fake.searchedIds`). Confirmation dialog: tap Delete → expect `AlertDialog` → tap Confirm → expect API call recorded.
- **Phase 4 — SeriesDetailScreen.** Reuse Phase 3 patterns. Season selector test: pump series with seasons [1,2], assert episodes for season 1 visible, tap season 2 chip, assert season 2 episodes visible. Per-episode actions tested with one episode then trusted by structure.
- **Phase 5 — Verification.** No new tests; gate-only.

## 6. Cross-Phase Edge Cases & Dependencies

- **Phase 2 → 3/4 dependency.** Shared components must land before Phase 3/4 implement steps. If 3/4 starts first, screens will inline duplicates that must be refactored — block Phase 3 implement until Phase 2 GREEN.
- **Movie with `hasFile: false`** must hide FileInfoCard, disable Play, keep Search visible (Phase 3 + Phase 2 `FileInfoCard` test).
- **Series with zero seasons / zero episodes** must show empty state, not crash (Phase 4 + Phase 2 `EpisodeList` test).
- **Subtitle inventory failure** must not fail the screen (lessons 2026-05-01) — Phase 3 covers via fake throwing on `getMovieSubtitles`.
- **Destructive confirmation race** — tap Delete twice rapidly should only fire one API call (Phase 3 widget test with `mocktail.verify(...).called(1)`).
- **Parallel API-typing track** (spec §Backend Integration) — if it lands mid-track, re-run `flutter analyze` after merge; no `dynamic` casts in new code.

## 7. Live-Proof Plan (Red command → Green/closeout gate)

Live-proof = exercises real Flutter widget runtime. Artifact/contract = parses JSON fixture against a TS interface shape — never substitutes for live proof.

| Phase | Targeted RED command | GREEN / closeout gate | Type |
|---|---|---|---|
| 1 | `flutter test test/features/library/library_screen_navigation_test.dart` | same → pass; **and** `flutter test test/support/contracts/movie_response_test.dart` (artifact contract) | Live (nav) + Artifact (shape) |
| 2 | `flutter test test/shared/widgets/media_detail/` (whole new dir) | same → pass | Live |
| 3 | `flutter test test/features/library/movie_detail_screen_test.dart` | same → pass | Live |
| 4 | `flutter test test/features/library/series_detail_screen_test.dart` | same → pass | Live |
| 5 | n/a | `flutter test` (full) **and** `flutter analyze` **and** `CI=true npm test` (root) all green; manual smoke per plan | Live (full suite) + Live (smoke) |

**Fake-harness boundary.** The `FakeMediarrApiClient` is runner plumbing: it lets us drive screens without Dio. The production gate it stands in for — "real screen renders against real provider graph" — is independently proved by the Phase 5 `flutter test` aggregate (no overrides applied at the harness level; each test still pins its own overrides) and by the manual smoke against a live daemon. There is no command path where a fake replaces an aggregate gate; if a test forgets an override, the real `apiClientProvider` performs Dio against `localhost` and the test fails fast (timeout, not silent pass) — verified by the existing `library_screen_test.dart` pattern that always overrides `libraryProvider`.

**Intentionally-red files.** Phases 2–4 will commit RED test files before their implement step. Each such file MUST start with `@Skip('Pending implementation — owned by task <task name> [~]')` and the owning task MUST be `[~]` until the GREEN run. The phase commit message must list every `@Skip` file added; the phase-closing commit must remove every `@Skip` it owns. `flutter test` aggregate at Phase 5 must report **0 skipped tests** owned by this track.
