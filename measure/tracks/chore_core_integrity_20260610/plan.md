# Core Integrity — Implementation Plan

> **Workflow:** TDD (Red → Green → Refactor) with Contract-First sub-task ordering; checkpoint after every phase.
> **Migration strategy:** Strangler-fig — `this.db` (native Drizzle) is exposed alongside the shim, and repositories migrate one at a time with parity tests.

## Phase 1: Data Layer Foundation (Strangler-Fig)

_Spec ref: spec.md#phase-1-data-layer-foundation_

_Blast radius: `drizzleClient.ts` (44 importers), `MediaRepository` (5 callers: `main.ts`, `MediaRepository.upsert.test.ts`, `MediaRepository.upsertSeasonsAndEpisodes.test.ts`, `api/types.ts`, `services/importLists/ImportListSyncService.ts`), `SubtitleVariantRepository` (5+ service consumers), `AppSettingsRepository` (the most-imported repo per `build-graph stats`)._

- [x] **Task 1.1: Expose native Drizzle on DatabaseClient** `[5575c10]`
  - [x] Add a public `get drizzle()` getter on `DatabaseClient` that returns the underlying `drizzle(this.sqlite, { schema })` instance (already constructed in the constructor; just expose it).
  - [x] Document the migration path in `server/src/db/drizzleClient.ts` JSDoc.
  - [x] Do NOT remove the Prisma-style delegates yet.
- [x] **Task 1.2: Add parity-test harness** `[bcf7443]`
  - [x] Create `server/src/db/__tests__/drizzleParity.test.ts` with a helper `expectShimAndNativeEqual(model: ModelName, args: QueryArgs)` that runs the same query against the shim and `this.db.select().from(table)` and asserts identical row sets.
  - [x] Cover at least 5 high-traffic methods: `media.findMany({ where: { mediaType: 'MOVIE' }})`, `indexer.findMany({ orderBy: { priority: 'asc' }})`, `mediaFileVariant.findMany({ where: { movieId: 1 }})`, `episode.findMany({ where: { seriesId: 1 }})`, `mediaFileVariant.count()`.
- [x] **Task 1.3: Migrate MediaRepository.upsertMovie to native Drizzle** `[f3fb41a]`
  - [x] Update `MediaRepository` constructor to accept the drizzle instance.
  - [x] Replace `this.prisma.media.upsert` and `this.prisma.movie.upsert` with `db.insert(media).values(…).onConflictDoUpdate({ target: [media.mediaType, media.tmdbId], set: … }).returning()` chained with the same for the `movies` table.
  - [x] Verify the existing test (`MediaRepository.upsert.test.ts`) passes against the new implementation.
- [x] **Task 1.4: Migrate MediaRepository.upsertSeries + upsertSeasonsAndEpisodes** `[f3fb41a]`
  - [x] Replace the `media.upsert` + `series.upsert` + nested `seasons.create` + `episodes.create` paths with a single `db.transaction((tx) => …)` block.
  - [x] Use `onConflictDoUpdate` keyed on the natural unique constraints (`[mediaType, tmdbId]` for media, `[tvdbId]` for series, `[seriesId, seasonNumber]` for seasons, `[tvdbId]` for episodes).
  - [x] Verify `MediaRepository.upsertSeasonsAndEpisodes.test.ts` passes.
- [x] **Task 1.5: Migrate IndexerRepository** `[pending]`
  - [x] Replace the 4-5 `this.prisma.indexer.*` methods with native Drizzle.
  - [x] Add a parity test for indexer CRUD (create, findUnique, update, delete).
- [ ] **Task 1.6: Migrate SubtitleVariantRepository**
  - [ ] Replace the 5+ `this.prisma.mediaFileVariant.*` and related methods (5 entity types in this repo).
  - [ ] Verify existing tests (`bug_variant_subtitle_test_coverage_20260526` follow-ups) still pass.
- [ ] **Task 1.7: Migrate remaining repositories**
  - [ ] AppSettings, Blocklist, Collection, CustomFormat, DownloadClient, ImportList, Notification, Playback, QualityProfile, Torrent, ActivityEvent, IndexerHealth.
  - [ ] Per-repo, write a parity test before migrating.
- [ ] **Task 1.8: Strip the in-memory shim**
  - [ ] Remove `findMany` / `findUnique` / `findFirst` / `update` / `create` / `createMany` / `upsert` / `delete` / `deleteMany` / `updateMany` from the shim.
  - [ ] Keep only `$transaction`, `runRaw`, and the `drizzle` getter.
  - [ ] Add a throw in the constructor if any code still references the removed delegates (catch the regression at startup).
  - [ ] Final smoke test: full `CI=true bun run test --run` green; 1,000-row stress test on `IndexerRepository.findMany` completes in <100ms (per NFR-5).
- [ ] **Task: Measure - User Manual Verification 'Phase 1: Data Layer Foundation' (Protocol in workflow.md)**

## Phase 2: Type Safety Restoration

_Spec ref: spec.md#phase-2-type-safety-restoration_

_Blast radius: `modelTypes.ts` (35 importers: 17 server repos, 14 services, 4 transport files, plus route files). Per `build-graph stats`, `modelTypes.ts` is the 6th-most-imported file in the codebase (35 imports)._

- [ ] **Task 2.1: Replace `any` aliases with Drizzle $inferSelect**
  - [ ] For each of the 33 model aliases in `modelTypes.ts`, replace `any` with `typeof schema.<table>.$inferSelect`.
  - [ ] Add explicit JSDoc to each: `/** Inferred from server/src/db/schema.ts via Drizzle \`$inferSelect\`. */`.
  - [ ] If the `findMany` return type needs to be `T[]` (vs `T | undefined`), document the optionality and where to add `.then()` calls.
- [ ] **Task 2.2: Cascade fix to importers**
  - [ ] For each of the 35 importing files, fix the resulting type errors (likely 1-3 per file).
  - [ ] Common fixes: handle `findUnique` returning `T | undefined`, replace `as any` with explicit type narrowing, add `?` to optional chain accesses.
  - [ ] Run `tsc --noEmit -p server/tsconfig.json` until it is green.
- [ ] **Task 2.3: Remove Prisma namespace**
  - [ ] Delete the `Prisma` namespace from `modelTypes.ts`.
  - [ ] If `PrismaJsonValue` is still needed, move it to `server/src/types/json.ts` and add JSDoc explaining why it is a separate type.
- [ ] **Task 2.4: Add lint guard**
  - [ ] Add an ESLint rule (`no-restricted-syntax` or `no-restricted-imports`) that prevents `modelTypes.ts` from exporting `any` aliases.
  - [ ] Document the rule in `measure/code_styleguides/typescript.md`.
- [ ] **Task: Measure - User Manual Verification 'Phase 2: Type Safety Restoration' (Protocol in workflow.md)**

## Phase 3: Repository & Service Consolidation

_Spec ref: spec.md#phase-3-repository-service-consolidation_

_Blast radius: `SeriesRepository` (1 importer: `seriesRoutes.ts`, 2 call sites at lines 906 and 914), `MovieRepository` (1 importer: `movieRoutes.ts`, 2 call sites at lines 609 and 617), `SeriesService` (0 importers), `EpisodeService` (0 importers), `ShellLayout` (0 importers)._

- [ ] **Task 3.1: Migrate SeriesRepository into MediaRepository**
  - [ ] Add `bulkUpdateSeries(seriesIds: number[], changes: BulkSeriesChanges): Promise<BulkUpdateResult>`.
  - [ ] Add `findSeriesByIds(ids: number[]): Promise<Series[]>`.
  - [ ] Add `getDistinctSeriesRootFolders(): Promise<string[]>`.
  - [ ] Port any `SeriesRepository` tests into `MediaRepository.test.ts`.
- [ ] **Task 3.2: Migrate MovieRepository into MediaRepository**
  - [ ] Add `bulkUpdateMovies(movieIds: number[], changes: BulkMovieChanges): Promise<BulkUpdateResult>`.
  - [ ] Add `findMoviesByIds(ids: number[]): Promise<Movie[]>`.
  - [ ] Add `getDistinctMovieRootFolders(): Promise<string[]>`.
- [ ] **Task 3.3: Update routes to use MediaRepository**
  - [ ] `seriesRoutes.ts` lines 906, 914: replace `new SeriesRepository(deps.prisma as any)` with `mediaRepo.bulkUpdateSeries(...)` and `mediaRepo.findSeriesByIds(...)`.
  - [ ] `movieRoutes.ts` lines 609, 617: same for `MovieRepository`.
- [ ] **Task 3.4: Delete redundant repository files**
  - [ ] `git rm server/src/repositories/SeriesRepository.ts`
  - [ ] `git rm server/src/repositories/MovieRepository.ts`
- [ ] **Task 3.5: Delete orphan SeriesService**
  - [ ] Audit: confirm 0 importers in `server/` and `app/` (via `build-graph search`).
  - [ ] `git rm server/src/services/SeriesService.ts`.
- [ ] **Task 3.6: Delete orphan EpisodeService**
  - [ ] Audit all usages of `EpisodeService` (currently 0 importers).
  - [ ] If any test uses it, port the test to the appropriate service.
  - [ ] `git rm server/src/services/EpisodeService.ts`.
- [ ] **Task 3.7: Delete orphan ShellLayout**
  - [ ] Confirm 0 imports in `app/src`.
  - [ ] `git rm app/src/components/shell/ShellLayout.tsx`.
- [ ] **Task 3.8: Add orphan-file regression test**
  - [ ] Create `tests/no-orphan-aliases.test.ts` that asserts no file in `repositories/` or `services/` only re-exports a class extending another with no methods added, and that `app/src/components/**` has no orphan files.
  - [ ] Wire it into the test runner (`bun test` discovery).
- [ ] **Task: Measure - User Manual Verification 'Phase 3: Repository & Service Consolidation' (Protocol in workflow.md)**

## Phase 4: Indexer & Import Hardening

_Spec ref: spec.md#phase-4-indexer-import-hardening_

_Blast radius: `BaseIndexer` (used by all indexer implementations: Cardigann, Torznab, Newznab), `ImportManager` (used by `operationsRoutes`, `torrentRoutes`, `BulkImportService`)._

- [ ] **Task 4.1: Add category-type detection to BaseIndexer**
  - [ ] Add a method `private resolveTorznabType(query: SearchQuery): 'movie' | 'tvsearch' | 'search'` that inspects `query.mediaType` and `query.tmdbId` / `query.tvdbId`.
  - [ ] Refactor `buildSearchUrl` to use the resolved type and append the right `t=…` parameter.
  - [ ] Propagate `tmdbid` / `tvdbid` / `imdbid` to the URL when present.
  - [ ] Remove the diagnostic `console.log('[DIAG:buildSearchUrl] … always using t=search, ignoring tmdbid=%j' …)` comment from line 108.
- [ ] **Task 4.2: Add regression test for indexer URL building**
  - [ ] Create `server/src/indexers/BaseIndexer.searchUrl.test.ts` that asserts:
    - Movie query with `tmdbId: 123` → `t=movie&tmdbid=123` is in the URL.
    - TV query with `tvdbId: 456` → `t=tvsearch&tvdbid=456` is in the URL.
    - Generic query (no IDs) → `t=search&q=…` (back-compat fallback).
- [ ] **Task 4.3: Fix ImportManager N+1 / season-pack loop**
  - [ ] Audit `ImportManager.ts:182` (`for (const filePath of files)`) and surrounding code to understand the current mapping.
  - [ ] Refactor to map multi-file torrents to a single season pack record (or one episode per file, depending on intent) without dropping files.
  - [ ] Add a per-file try/catch around each `processFile` so one bad file does not abort the whole torrent.
- [ ] **Task 4.4: Add season-pack corner-case tests**
  - [ ] Multi-file `S01E01-E10`: assert all 10 episodes are created.
  - [ ] Single-file `S01E01`: assert 1 episode.
  - [ ] Season pack with `extras` directory: assert extras are not lost or imported as episodes.
- [ ] **Task: Measure - User Manual Verification 'Phase 4: Indexer & Import Hardening' (Protocol in workflow.md)**

## Phase 5: Scheduler & Security Hardening

_Spec ref: spec.md#phase-5-scheduler-security-hardening_

_Blast radius: `seriesRoutes.ts` (`/rescan` and `/import/scan` endpoints), `Scheduler.ts` (deferred — recorded as tech-debt follow-up)._

- [ ] **Task 5.1: Add path-traversal validation helper**
  - [ ] Create `server/src/api/utils/pathValidation.ts` with `isPathWithinRoots(path: string, rootFolders: string[]): boolean`.
  - [ ] Use Node's `path.resolve` and `path.relative` to compare normalized absolute paths.
  - [ ] Add a unit test for `../`, `\\..\\`, symlink-style, and absolute-outside-root payloads.
- [ ] **Task 5.2: Apply validation to series rescan**
  - [ ] In `seriesRoutes.ts` `/rescan` endpoint, validate the `path` parameter against the configured root folders; reject with 400 on traversal.
  - [ ] Add an integration test.
- [ ] **Task 5.3: Apply validation to series import/scan**
  - [ ] In `seriesRoutes.ts` `/import/scan` endpoint, same validation.
  - [ ] Add an integration test.
- [ ] **Task 5.4: Add tech-debt entry for scheduler persistence**
  - [ ] Add a `| High | Open` entry to `measure/tech-debt.md`: "Scheduler uses in-memory `node-cron` with no persistence or 'run missed tasks' logic; missed tasks on restart are lost. Out of scope for this track; reference `chore_core_integrity_20260610`."
- [ ] **Task: Measure - User Manual Verification 'Phase 5: Scheduler & Security Hardening' (Protocol in workflow.md)**

## Cross-Phase Quality Gates

Before every checkpoint:

- [ ] All new tests pass.
- [ ] `CI=true bun run test --run` is green.
- [ ] `cd app && npm run build` succeeds.
- [ ] Server `tsc --noEmit -p server/tsconfig.json` is green.
- [ ] No new lint errors (`bun run lint` or `npm run lint`).
- [ ] `build-graph update ./graph.db <changed-files>` is run; stats show fresh graph.
- [ ] Git note attached to checkpoint commit summarising the phase outcome.
- [ ] `plan.md` updated with checkpoint SHA per the Phase Completion Verification Protocol in `measure/workflow.md`.

## Estimated Tasks

- Phase 1: 9 tasks (1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8 + manual verification).
- Phase 2: 5 tasks (2.1, 2.2, 2.3, 2.4 + manual verification).
- Phase 3: 9 tasks (3.1–3.8 + manual verification).
- Phase 4: 5 tasks (4.1, 4.2, 4.3, 4.4 + manual verification).
- Phase 5: 5 tasks (5.1, 5.2, 5.3, 5.4 + manual verification).
- **Total: 33 top-level tasks (29 functional + 4 phase-completion verifications).**
