# Core Integrity — Data Layer, Type Safety, and Repository Unification

> **Track type:** chore
> **Created:** 2026-06-10
> **Spec mode:** classic (FR list)

## Overview

The Mediarr server is built on top of `DatabaseClient` (`server/src/db/drizzleClient.ts`), a 1292-line Prisma-style in-memory emulator that loads entire tables into JavaScript and filters them in JS. While it enabled the Prisma→Drizzle migration to land, it is now the single largest scalability blocker and must be replaced with native Drizzle SQL queries.

In parallel, `server/src/types/modelTypes.ts` re-exports all major model aliases as `any`, the repository layer is fragmented into `MediaRepository` + `SeriesRepository` + `MovieRepository`, and several integration bugs (Torznab search types, ImportManager season-pack mapping, scheduler persistence, path-traversal in rescan endpoints) need to be remediated so the system can scale beyond a few hundred media items.

The completed `chore_close_drizzle_migration_20260607` track explicitly deferred the `modelTypes.ts` `any` shims to "a dedicated follow-up track" (see `measure/tech-debt.md`, 2026-06-07 row). This track is that follow-up, extended to cover the full data-layer integrity story.

## Functional Requirements

### Phase 1 — Data Layer Foundation (Strangler-Fig)

- **FR-1.1** Expose native Drizzle query access (a public `drizzle` getter on `DatabaseClient` returning the underlying `drizzle(this.sqlite, { schema })` instance) without breaking existing call sites.
- **FR-1.2** Add a parity-test harness that runs the same query against the in-memory shim and native Drizzle, asserting identical row sets for at least 5 high-traffic repository methods.
- **FR-1.3** Migrate `MediaRepository.upsertMovie` to native Drizzle.
- **FR-1.4** Migrate `MediaRepository.upsertSeries` + `upsertSeasonsAndEpisodes` to native Drizzle (single `db.transaction((tx) => …)`).
- **FR-1.5** Migrate `IndexerRepository` to native Drizzle.
- **FR-1.6** Migrate `SubtitleVariantRepository` to native Drizzle.
- **FR-1.7** Migrate the remaining repositories (AppSettings, Blocklist, Collection, CustomFormat, DownloadClient, ImportList, Notification, Playback, QualityProfile, Torrent, ActivityEvent, IndexerHealth) to native Drizzle, with per-repo parity tests.
- **FR-1.8** Once all repositories are native, remove the in-memory shim's `findMany` / `findUnique` / `findFirst` / `update` / `create` / `createMany` / `upsert` / `delete` / `deleteMany` / `updateMany` paths, keeping only `$transaction` and `runRaw` shims if still needed. The constructor must throw if any code still references the removed delegates.

### Phase 2 — Type Safety Restoration

- **FR-2.1** Replace each `any` alias in `server/src/types/modelTypes.ts` (Media, Series, Season, Episode, Movie, MediaFileVariant, VariantMissingSubtitle, VariantAudioTrack, VariantSubtitleTrack, WantedSubtitle, SubtitleHistory, QualityProfile, Collection, ImportList, ImportListExclusion, CustomFilter, CustomFormat, CustomFormatScore, QualityDefinition, Indexer, Proxy, IndexerCategory, IndexerRelease, Category, Torrent, TorrentPeer, AppSettings, PlaybackProgress, IndexerHealthSnapshot, ActivityEvent, Notification, DownloadClient, Blocklist) with `typeof schema.<table>.$inferSelect` from `db/schema.ts`.
- **FR-2.2** Cascade the type fix to the 35 importing files (17 server repos, 14 services, 4 transport files, plus route files) until `tsc --noEmit -p server/tsconfig.json` is green.
- **FR-2.3** Remove the `Prisma` namespace and `PrismaJson*` types from `modelTypes.ts`; if `PrismaJsonValue` is still referenced, move it to `server/src/types/json.ts` with its own justification.
- **FR-2.4** Add an ESLint rule (`no-restricted-syntax` or `no-restricted-imports`) that prevents any future `any` model alias from being added to `modelTypes.ts`. Document the rule in `measure/code_styleguides/typescript.md`.

### Phase 3 — Repository & Service Consolidation

- **FR-3.1** Migrate `SeriesRepository.bulkUpdate`, `findByIds`, `getDistinctRootFolders` into `MediaRepository` as `bulkUpdateSeries`, `findSeriesByIds`, `getDistinctSeriesRootFolders`.
- **FR-3.2** Migrate `MovieRepository.bulkUpdate`, `findByIds`, `getDistinctRootFolders` into `MediaRepository` as `bulkUpdateMovies`, `findMoviesByIds`, `getDistinctMovieRootFolders`.
- **FR-3.3** Update `seriesRoutes.ts` (lines 906, 914) and `movieRoutes.ts` (lines 609, 617) to use `MediaRepository` exclusively.
- **FR-3.4** Delete `server/src/repositories/SeriesRepository.ts` and `server/src/repositories/MovieRepository.ts`.
- **FR-3.5** Delete the orphan `server/src/services/SeriesService.ts` (6-line alias `extends MediaService`, 0 importers).
- **FR-3.6** Delete the orphan `server/src/services/EpisodeService.ts` (33 lines using `this.prisma: any`, 0 importers). Migrate `getEpisodesBySeries` / `setMonitored` / `setSeasonMonitored` calls into the appropriate service or `MediaRepository`.
- **FR-3.7** Delete the orphan `app/src/components/shell/ShellLayout.tsx` (9 lines, 0 imports).
- **FR-3.8** Add a regression test that asserts no orphan-alias files exist in `repositories/` or `services/` (files that only re-export a class extending another with no methods added).

### Phase 4 — Indexer & Import Hardening

- **FR-4.1** Fix `BaseIndexer.buildSearchUrl` to use `t=movie` for movie searches and `t=tvsearch` for TV searches, propagating `tmdbid` / `tvdbid` / `imdbid` parameters to the URL when present. The current diagnostic comment at `server/src/indexers/BaseIndexer.ts:108` ("always using t=search, ignoring tmdbid") must be removed.
- **FR-4.2** Add a regression test asserting that movie queries produce `t=movie&tmdbid=…` and TV queries produce `t=tvsearch&tvdbid=…` (or `imdbid=…`).
- **FR-4.3** Fix `ImportManager` to map multi-file torrents to a single season pack correctly. Audit `ImportManager.ts:182` (`for (const filePath of files)`) and verify the loop handles `files.length > 1` season-pack releases without dropping files. Add a per-file try/catch so a single bad file does not abort the whole torrent.
- **FR-4.4** Add at least 3 corner-case tests for season packs: multi-file `S01E01-E10`, single-file `S01E01`, season pack with `extras` directory.

### Phase 5 — Scheduler & Security Hardening

- **FR-5.1** Add filesystem path validation helper `server/src/api/utils/pathValidation.ts` exporting `isPathWithinRoots(path: string, rootFolders: string[]): boolean`. Use Node's `path.resolve` and `path.relative` to compare normalized absolute paths.
- **FR-5.2** Apply validation to `seriesRoutes.ts` `/rescan` and `/import/scan` endpoints: the `path` parameter must be an absolute path contained within one of the configured root folders (from `AppSettings.rootFolders`). Reject with 400 on traversal.
- **FR-5.3** Add regression tests asserting `path=../../etc/passwd` and other traversal payloads are rejected.
- **FR-5.4** Add a `| High | Open` entry to `measure/tech-debt.md`: `Scheduler.ts` uses in-memory `node-cron` with no persistence or "run missed tasks" logic — out of scope for this track.
- **FR-5.5** Per `measure/workflow.md` "Security Scope Decision (2026-03-05)", zero-auth and trusted-LAN deployment remain in scope. Do NOT add API key checks.

## Non-Functional Requirements

- **NFR-1** Test coverage remains ≥80% for all migrated repos (existing test files are the parity baseline).
- **NFR-2** No new lint errors (`eslint` clean across both `server/` and `app/`).
- **NFR-3** Server typecheck (`tsc --noEmit -p server/tsconfig.json`) green; app typecheck green.
- **NFR-4** `build-graph update ./graph.db <changed-files>` is run at the end of every phase so the graph stays fresh.
- **NFR-5** No new dependencies; the work is exclusively on existing code.

## Acceptance Criteria

- `server/src/types/modelTypes.ts` exports only `typeof schema.<table>.$inferSelect` aliases; the `Prisma` namespace is gone.
- `SeriesRepository.ts`, `MovieRepository.ts`, `SeriesService.ts`, `EpisodeService.ts`, `ShellLayout.tsx` are deleted from the working tree.
- `DatabaseClient` no longer has `findMany` / `findUnique` / `findFirst` / `update` / `create` / `upsert` / `delete` (etc.) methods that load full tables into memory.
- Full `CI=true bun run test --run` is green at the end of every phase.
- `cd app && npm run build` succeeds at the end of every phase.
- A 1,000-row stress test against a representative repository (e.g., `IndexerRepository.findMany` with a `where: { enabled: true }` filter) completes in <100ms (currently scales with JS array length, not SQL).

## Out of Scope

- Adding real authentication — explicitly out of scope per `measure/workflow.md` "Security Scope Decision (2026-03-05)".
- Adding scheduler persistence (recorded as a separate tech-debt follow-up in FR-5.4).
- Any product feature work; this is purely an integrity refactor.

## Related Tech Debt

- `measure/tech-debt.md` (2026-06-07, `chore_close_drizzle_migration_20260607`): `modelTypes.ts` aliases are all `any` — this track resolves that entry.
- `measure/tech-debt.md` (2026-03-30, `chore_drizzle_migration_20260314`): `db recreated from scratch` — this track does not address the data-loss risk but builds on the recreated schema.
