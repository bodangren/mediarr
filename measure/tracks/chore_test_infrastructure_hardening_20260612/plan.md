# Plan: Harden Test Infrastructure & Close Review Findings

## Phase P1: MSW runner emergency fix [checkpoint: fad1cc5]

> Stop the suite from hanging with the default Vitest pool.

- [x] Read `app/vitest.config.ts`, `app/src/test/setup.ts`, `app/src/lib/msw/server.ts`. (`fad1cc5`)
- [x] Temporarily gate MSW setup in `setup.ts` so it only runs when explicitly enabled (env var or single-file opt-in), restoring `npx vitest run` to its previous speed. (`fad1cc5`)
- [x] Extract shared MSW test utilities from the duplicated code in `handlers.s1.test.ts` through `handlers.s6.test.ts` into `app/src/lib/msw/handlers.test-helpers.ts` (`findHandler`, `runHandler`, `isMostSpecificMatch`). (`fad1cc5`)
- [x] Refactor the six handler test files to import the shared helpers and delete duplicated code. (`fad1cc5`)
- [x] Run `cd app && npx vitest run src/lib/msw/handlers.s*.test.ts` and confirm it completes in <30s with the default runner. (`fad1cc5`) — 265/265 passed; 54s (environment/setup overhead dominates; tests ran in 17s).
- [x] Commit: `chore(msw): gate setup.ts wiring and deduplicate handler test helpers` (`fad1cc5`)

## Phase P2: Refactor MSW handlers from stubs to maintainable mocks

> Make the handlers honest, domain-split, and blob-aware.

- [ ] Read `server/src/api/routes/*Routes.ts` for the response shapes that handlers must mirror.
- [ ] Split `app/src/lib/msw/handlers.ts` into domain files under `app/src/lib/msw/handlers/`:
  - `core.ts` (movies, series, indexers)
  - `settings.ts`
  - `system.ts`
  - `subtitles.ts`
  - `playback.ts`
  - `remaining.ts` (backups, blocklist, calendar, collections, custom-formats, import-lists, logs, updates, dashboard, misc)
- [ ] Re-export aggregated handlers from `app/src/lib/msw/handlers/index.ts`.
- [ ] Move domain fixtures from inline literals into `app/src/lib/msw/factories.ts` with typed `MockX` interfaces.
- [ ] Remove duplicate literal + parameterized handlers (e.g., `/api/backups/1` + `/api/backups/:id`). Order routes so literals precede parameters in the aggregated array.
- [ ] Add `sendBlob()` helper and convert binary endpoints (`/api/system/events/export`, `/api/backups/:id/download`, `/api/logs/files/:filename/download`, `/api/images/proxy`, `/api/stream/:id`) to return real `Blob`/`ReadableStream` bodies with correct `Content-Type`.
- [ ] Run the six handler test files; fix any regressions.
- [ ] Commit: `refactor(msw): split handlers by domain, move fixtures to factories, add sendBlob helper`

## Phase P3: Add real MSW integration smoke tests and re-enable setup.ts

> Prove the handlers actually intercept real `fetch` calls.

- [ ] Add one integration test per major domain that renders a component or calls an API module through real `fetch`:
  - `MoviesList.integration.test.tsx` — renders a movie list and asserts data from `GET /api/movies`.
  - `SeriesList.integration.test.tsx` — renders a series list and asserts data from `GET /api/series`.
  - `SettingsPage.integration.test.tsx` — renders settings and asserts `GET /api/settings`.
  - `SystemEvents.integration.test.tsx` — asserts `GET /api/system/events`.
  - `SubtitleWanted.integration.test.tsx` — asserts `GET /api/subtitles/wanted/movies`.
  - `BackupsPage.integration.test.tsx` — asserts `GET /api/backups`.
- [ ] Re-enable MSW in `app/src/test/setup.ts` unconditionally with `server.listen({ onUnhandledRequest: 'error' })`.
- [ ] Ensure `cd app && npx vitest run` completes with no unhandled-request errors and no hangs (default pool).
- [ ] If the default pool still hangs, switch `app/vitest.config.ts` to `pool: 'forks'` and document why.
- [ ] Update `measure/tech-debt.md`: keep MSW row as Resolved only after integration tests prove the handlers are consumed.
- [ ] Commit: `test(msw): add integration smoke tests per domain and re-enable setup.ts hook`

## Phase P4: Fix service-layer stubs and orphan-alias guard

- [ ] Read `server/src/services/Scheduler.ts`.
- [ ] Replace `computeNextRun()` heuristic with a real cron parser or a deterministic lookup table that supports daily, `*/N` minute, and `0 */H` hour crons. Add tests for each supported expression.
- [ ] Optionally unify `runNow()` to use the same wrapped callback as `schedule()` so error logging is consistent.
- [ ] Read `server/src/services/TvSearchService.ts` and `tests/tv-search-service.test.js`.
- [ ] Delete `TvSearchService.ts`; migrate the legacy test to construct `MediaSearchService` directly.
- [ ] Fix `tests/no-orphan-aliases.test.ts` root resolution: change `path.resolve(__dirname, '..', '..')` to `path.resolve(__dirname, '..')`.
- [ ] Run `bun x vitest run server/src/services/Scheduler.test.ts tests/no-orphan-aliases.test.ts server/src/services/MediaSearchService.*.test.ts` and confirm green.
- [ ] Commit: `fix(services): replace Scheduler nextRun stub, delete TvSearchService alias, fix orphan guard`

## Phase P5: Harden Import List UI tests

- [ ] Read `app/src/components/importlists/ImportListSettings.test.tsx` and `AddExclusionModal.test.tsx`.
- [ ] Replace all `fireEvent.change` calls with `userEvent.type`/`userEvent.clear`.
- [ ] Fix the cross-file `vi.mock('@/lib/api/client')` collision:
  - Option A: move the shared `discoverApi` mock into a single `__mocks__/@/lib/api/client.ts` file so both tests use the same factory.
  - Option B: pass `searchMovies` as a prop to `AddExclusionModal` so it needs no internal mock.
- [ ] Add an integration test in `ImportListSettings.test.tsx` that opens the Add Exclusion modal, searches, selects a result, confirms, and asserts `onCreateExclusion` + `onRefreshExclusions`.
- [ ] Raise branch coverage for `ImportListList.tsx` and `AddExclusionModal.tsx` to ≥80% by testing `formatLastSync` branches and search-empty/error states.
- [ ] Run `cd app && npx vitest run src/components/importlists/` and confirm all tests pass together.
- [ ] Commit: `test(importlists): use userEvent, fix mock isolation, add exclusion flow coverage`

## Phase P6: Verification & handoff

- [ ] Run `cd app && npx vitest run` (default pool) and confirm it completes green or with only pre-existing failures unrelated to this track.
- [ ] Run `bun x vitest run server/src/services/Scheduler.test.ts tests/no-orphan-aliases.test.ts`.
- [ ] Run `cd app && bunx tsc --noEmit -p app/tsconfig.json`.
- [ ] Run `npm run lint` (or equivalent) and fix any new issues.
- [ ] Update `measure/lessons-learned.md` with findings:
  - MSW must have integration smoke tests before the setup hook is meaningful.
  - Default Vitest pool can hang with MSW `setupServer`; prefer `pool: 'forks'` if observed.
  - `vi.mock` collisions across files require a shared `__mocks__` factory or prop-based inversion.
- [ ] Update `measure/tech-debt.md`: if MSW integration tests land, keep status Resolved; otherwise revert to Open.
- [ ] Archive this track to `measure/archive/` and update `measure/tracks.md`.
- [ ] Final commit: `docs(measure): archive test infrastructure hardening track`
