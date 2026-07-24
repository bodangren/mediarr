# Review Report: Mediarr Server Structure and Test Integrity

## Summary

The server currently type-checks and its server-only Vitest corpus is green, but
those gates materially overstate production correctness. This audit confirmed
three critical data/runtime defects, twelve high-severity correctness or
implementation gaps, multiple fabricated operational APIs, and several tests
that explicitly lock defective behavior in place.

The review covered all 367 files under `server/src`, all 288 server-relevant test
files (178 colocated and 110 root tests), the production composition root,
route/service/repository/database/filesystem/indexer/torrent/subtitle/scheduler
subsystems, the SPA callers needed to prove API contract failures, and a fresh
repo-graph scan.

Application fixes were intentionally not made in this discovery track.

## Verification Checks

- **Plan Compliance:** Pass. The review stayed within the discovery and
  remediation-routing scope in `spec.md`.
- **Style Compliance:** Fail. `eslint src` reports 1,565 errors across server
  source and tests; see `verification.md`.
- **New Tests:** N/A. This is a review-only track.
- **Coverage:** Fail. Server coverage is 60.62% statements, 51.05% branches,
  62.93% functions, and 61.43% lines. `main.ts` and import-list services are at
  0%; 27 API endpoints lack direct behavioral coverage.
- **Test Results:** Server-only suite passes 178 files / 1,739 tests with 11
  skipped. The root suite fails 1 of 2,273 tests (284 files pass, 1 fails) on
  the Docker workspace-install invariant. Confirmed false and self-fulfilling
  assertions are included in the green count.
- **Browser Verification:** Skipped. No frontend behavior was changed; SPA
  callers were read only where needed to prove server contract drift.
- **Network Verification:** Skipped. Live Cardigann suites are environment-gated
  and remain 11 skipped tests in the default suite.
- **Visual Verification:** Skipped. No visual surface changed.
- **Graph Caller Check:** Pass with findings. All 35 route registrars are called
  by `createApiServer`; disconnected services and route-map omissions are
  documented below.

## Critical Findings

### C1. Non-Docker update installation can overwrite the Bun/Node runtime

- **Evidence:** `server/src/services/UpdateService.ts:199-214` defaults
  `currentExecutablePath` to `process.execPath`; `server/src/main.ts:182-186`
  supplies no override; `UpdateService.ts:330-387` copies the staged release
  over that executable. The install endpoint is reachable through
  `server/src/api/routes/updatesRoutes.ts:177-201`.
- **Impact:** The application is launched through Bun/tsx. A non-Docker update
  can replace the language runtime itself with a release asset and render the
  installation unusable.
- **False confidence:** `UpdateService.test.ts:219-245` injects a safe temporary
  executable path and never exercises the production default. Asset selection
  can also fall back to the first arbitrary release asset
  (`UpdateService.ts:477-533`) and checksum verification is optional
  (`UpdateService.ts:655-659`).
- **Remediation:** Disable non-Docker installation until a real application
  artifact/install layout exists; require exact platform/architecture matching,
  mandatory checksums, atomic replacement, and rollback.

### C2. Import logic reverses the move/hard-link contract and fails cross-volume
imports

- **Evidence:** `server/src/services/ImportManager.ts:234-235,306-307,403-412,
  471-479` sets `move` from `isSameVolume`. `server/src/services/Organizer.ts:
  24-32` defines `move: false` as hard-link/preserve-source for seeding and
  `move: true` only when the source is already inside the media tree.
  Cross-volume hard-link failure falls back to `rename`, which also fails with
  `EXDEV` (`Organizer.ts:54-65,97-108`). `mediaUtils.ts:27-34` treats a
  not-yet-created destination as a different volume.
- **Impact:** Ordinary same-volume completed torrents are moved away from their
  payload and stop seeding. Cross-volume imports fail instead of copying.
- **False confidence:** `ImportManager.test.ts:5-9,145-187` expects the reversed
  `{move: true}` behavior; `Organizer.test.ts:79-94` expects failed links to use
  `rename`.
- **Remediation:** Replace the boolean with an explicit import strategy, retain
  same-volume seeding through hard links, and use copy-plus-verified-cleanup
  across volumes.

### C3. Production “transactions” are not atomic

- **Evidence:** `server/src/repositories/MediaRepository.ts:214-301,325-342,
  364-381` passes async callbacks with `await` to better-sqlite3 Drizzle
  transactions. Runtime reproduction showed two inserts remained committed
  after the callback awaited and then threw. `server/src/db/drizzleClient.ts:
  549-565` implements array `$transaction` as `Promise.all`; it is used as an
  atomic multi-episode update by `SeriesMonitoringService.ts:237-246`.
- **Impact:** Partial season, episode, metadata, and monitoring writes survive
  failures, corrupting logical consistency.
- **False confidence:** `MediaRepository.upsertSeasonsAndEpisodes.test.ts:63`
  replaces transactions with a mock that awaits the callback.
  `SeriesMonitoringService.test.ts:44` codifies the `Promise.all` behavior.
- **Remediation:** Use synchronous better-sqlite3 transaction callbacks or a
  transaction API that genuinely supports async work; add rollback tests
  against the installed SQLite/Drizzle runtime.

## High Findings

### H1. Backup APIs are contract-incompatible, partly fabricated, and WAL-unsafe

- **Evidence:** `BackupService.ts:4-10` returns `{id:string,filePath,createdAt}`;
  `backupRoutes.ts:78-95` returns it raw, while
  `app/src/lib/api/backupApi.ts:8-15,27-34` requires
  `{id:number,path,created}`. `backupRoutes.ts:28-63` seeds fake 2024 backups and
  schedule; restore is a timestamp-only response (`:159-173`), download returns
  a token URL with no corresponding route (`:176-191`), and scheduling is
  memory-only (`:112-157`). `BackupService.ts:29-40` uses plain `copyFile`
  while SQLite runs WAL mode (`drizzleClient.ts:499-504`).
- **Impact:** The current SPA cannot parse real list/create responses. Restore,
  download, and scheduling do not fulfill their contracts. Database copies can
  omit uncheckpointed WAL pages.
- **Remediation:** Define one shared backup schema, implement real restore and
  download endpoints, persist schedules, and use SQLite's backup/checkpoint
  mechanism.

### H2. Logs APIs expose fabricated data and do not control the real log buffer

- **Evidence:** `main.ts:128-130,445-451` wires `globalLogBuffer`, but
  `logsRoutes.ts:71-85` returns its paginated object from an endpoint whose SPA
  contract expects an array (`app/src/lib/api/logsApi.ts:5-17,50-60`).
  Detail/delete/clear/download/raw operate on hard-coded 2024 fixtures
  (`logsRoutes.ts:13-60,92-215`).
- **Impact:** Operational evidence shown to users is fabricated and management
  controls do not affect actual logs.
- **Remediation:** Remove fixtures from production routes and make all
  operations use one persisted/buffered log source with a shared response
  contract.

### H3. Task history, queue, and system events are fake or disconnected

- **Evidence:** `systemRoutes.ts:49-195` seeds fixture tasks/history/events.
  With the real scheduler, only scheduled-list and run-now use it
  (`:379-479`); queued/history/events remain module-local state
  (`:396-451,560-667`). Fallback execution randomly chooses success/failure
  (`:481-539`). Real persisted scheduler history exists under
  `schedulerRoutes.ts:132-162`, while the SPA still consumes `/api/tasks/*`
  (`app/src/lib/api/routeMap.ts:132-141`).
- **Impact:** Users can see old fabricated history and events unrelated to
  actual jobs; run-now activity never appears in these views.
- **Remediation:** Delete the legacy fixture-backed route state and expose the
  real scheduler/history/event repositories through one API.

### H4. Cardigann RSS is unimplemented but reported healthy

- **Evidence:** `RssSyncService.ts:68-76` supports only Torznab and returns zero
  for Cardigann. The outer loop still counts it processed and records health
  success (`:45-62`). `IndexerFactory.ts:72-97,120-133` advertises RSS support.
- **Impact:** Cardigann indexers never provide automated RSS releases and no
  failure is surfaced.
- **False confidence:** `RssSyncService.test.ts:131-143` explicitly expects zero
  stored releases, a processed count, and health success.
- **Remediation:** Implement Cardigann RSS execution through the shared runtime,
  or report the capability unsupported and unhealthy until implemented.

### H5. RSS monitoring mishandles season packs and multi-episode releases

- **Evidence:** `RssMediaMonitor.ts:55-108` uses only
  `parsed.episodeNumbers[0]`. A season pack supplies `undefined`, which can match
  an arbitrary missing episode; a multi-episode release is skipped when its
  first episode exists even if later episodes are missing.
- **False confidence:** `RssMediaMonitor.cornerCases.test.ts:68-123` explicitly
  asserts both defective outcomes. `pipeline.integration.rss.test.ts:142-174`
  labels the behavior a known limitation and only proves it does not throw.
- **Remediation:** Model packs as episode sets, require complete matching, and
  link/grab against every applicable missing episode.

### H6. TMDB series import lists are no-ops that report additions

- **Evidence:** `TMDBListProvider.ts:74-81` and
  `TMDBPopularProvider.ts:109-117` emit series with `tmdbId` only.
  `ImportListSyncService.ts:119-123,163-194` requires `tvdbId` to check or add a
  series, yet `syncList` increments `result.added` unconditionally
  (`ImportListSyncService.ts:71-77`). The service also persists the shared root
  itself as each item's path (`:129-194`) instead of a title-specific folder.
- **Impact:** TMDB TV imports silently add nothing while reporting success; even
  corrected additions would organize multiple titles under the same root.
- **Coverage:** No behavioral test exercises either provider or the sync
  service.
- **Remediation:** Normalize provider identifiers, make add return a verified
  result, derive unique media paths, and test movie/series duplicates and
  failure accounting.

### H7. Wanted subtitle downloads can mark empty files successful and remain
stuck in SEARCHING

- **Evidence:** `VariantSubtitleFetchService.ts:65,123-164` converts missing
  content to `Buffer.alloc(0)`, writes it, creates history/track rows, sets
  DOWNLOADED, and emits success. There is no error-state catch.
- **Impact:** Zero-byte subtitle files are recorded as completed; provider,
  disk, or database failures leave the wanted item permanently SEARCHING.
- **False confidence:** `VariantSubtitleFetchService.test.ts:430-480` explicitly
  requires both defective outcomes.
- **Remediation:** Reject empty content before filesystem/DB mutation and use a
  failure-safe state transition with retryable error metadata.

### H8. Torrent completion fallback can move the shared incomplete root

- **Evidence:** `TorrentManager.ts:750-790` first renames the torrent child,
  then on any error blindly renames `currentPath` itself to the target
  (`:764-770`). Containment uses raw string-prefix matching (`:740-747`).
- **Impact:** If the child is missing or differently named, the fallback can
  move a directory containing other active torrents. Cross-volume completion
  also lacks a copy fallback, and similarly prefixed sibling paths are
  misclassified as contained.
- **False confidence:** `TorrentManager.test.ts:293-343` does not assert rename
  arguments and covers only total failure.
- **Remediation:** Resolve and verify path containment, move only the specific
  payload, and use verified cross-device copying.

### H9. Series import writes an invalid variant media type

- **Evidence:** `seriesRoutes.ts:1244` writes `mediaType: 'TV'`; the contract
  permits only `EPISODE | MOVIE` (`db/schema.ts:14,206`) and SQLite does not
  constrain the text column (`drizzle/0001_panoramic_mindworm.sql:69`).
  Inventory filters for `EPISODE` (`SubtitleVariantRepository.ts:301`).
- **Impact:** Imported series variants disappear from inventory and downstream
  subtitle flows.
- **False confidence:** `seriesRoutes.importRescan.test.ts:332` checks counts
  but not the repository create payload; its `any` mock masks the violation.
- **Remediation:** Persist `EPISODE`, enforce the enum at the DB boundary, and
  assert the full create payload.

### H10. Quality-profile “validation” silently substitutes unrelated IDs

- **Evidence:** `mediaRoutes.ts:281-300` replaces an invalid requested profile
  with the first profile and uses literal ID `1` when none exists.
- **Impact:** Media creation can silently use the wrong profile or fail a
  foreign key constraint instead of returning a validation error.
- **False confidence:** `manualTestFindings.regression.test.ts:157-204,235-250`
  never invokes production code; it asserts unused mocks or local constants.
- **Remediation:** Reject unknown IDs, require a configured default, and replace
  these regression tests with injected route calls.

### H11. Implemented variant backfill/inventory services are not production-wired

- **Evidence:** Repo-graph and import searches show
  `VariantBackfillService.ts` and `VariantInventoryIndexer.ts` are imported only
  by their tests; neither is constructed by `main.ts` or another composition
  root.
- **Impact:** Legacy media is not automatically backfilled and imported
  variants do not receive the implemented metadata/audio/embedded-subtitle
  indexing.
- **Remediation:** Compose the services into startup/import workflows with
  idempotency, lifecycle, and integration tests.

### H12. The embedded subtitle provider is an enabled no-op

- **Evidence:** `main.ts:287` registers `embedded` with `search()` always
  returning `[]` and `download()` returning its input. Provider testing treats
  a nonthrowing zero-result search as success (`subtitleRoutes.ts:332,437`).
  Manual download can turn missing content into `Buffer.alloc(0)`
  (`SubtitleInventoryApiService.ts:370`).
- **Impact:** The API advertises an enabled provider that cannot discover
  embedded subtitles and can produce empty files.
- **Remediation:** Wire the real inventory extraction path or mark the provider
  unavailable until it exists; never accept absent content as a download.

### H13. The route-map test is one-directional and omits 71 production routes

- **Evidence:** Runtime inspection found 221 production method/path pairs;
  `API_ROUTE_MAP` contains 150. `tests/api-route-map.test.ts:15` proves only that
  declared entries exist in Fastify, not that every Fastify route is declared.
- **Impact:** Scheduler, collections, import lists/import execution, dashboard,
  stats, filesystem, library scan, wanted media, organizer, indexer health,
  torrent bulk/priority, subtitle and settings endpoints can drift without the
  contract test failing.
- **Remediation:** Compare both sets bidirectionally and document explicit
  exclusions for truly internal routes.

## Medium Findings

### M1. Media deletion suppresses partial cleanup failures

- **Evidence:** `MediaService.ts:114-143` performs multiple non-transactional
  child/parent deletes and suppresses parent-delete and `fs.rm` failures.
- **Impact:** The API can report success after partial DB deletion or orphaned
  filesystem content, while the retry target is already gone.
- **Remediation:** Define an atomic/retryable deletion workflow and surface
  cleanup failures.

### M2. Several tests are vacuous, permissive, or mislabeled

- `manualTestFindings.regression.test.ts:209-229` compares a local event literal
  to itself or manually publishes the event it then observes.
- `filesystemRoutes.test.ts:144-159` is named “rejects path traversal” but
  accepts 200, 403, or 404.
- `tests/gemini-track9-phase4-test-audit.test.ts:34-37` computes high-mock files,
  discards the result, scans only top-level tests, and asserts merely that some
  test file exists.
- Twelve route tests accept any status `>= 400`, allowing handler crashes to
  satisfy tests named for specific validation errors.
- Five `pipeline.integration.*` suites fabricate nearly every boundary and are
  orchestration unit tests, not end-to-end pipeline evidence.

### M3. Material route and subsystem coverage is absent

- Repo-graph found 184 production TypeScript files; 46 have no direct indexed
  test importer.
- Twenty-seven endpoints lack direct behavioral coverage: blocklist (4), import
  lists/providers/exclusions (11), bulk import (4), quality profiles (6), image
  proxy (1), and library scan (1).
- Eight route modules have no direct test importer:
  `blocklistRoutes`, `eventsRoutes`, `imageRoutes`, `importListRoutes`,
  `importRoutes`, `libraryRoutes`, `qualityProfileRoutes`, and test-only
  `testRoutes`.
- Live Cardigann suites remain gated behind `CARDIGANN_LIVE_TESTS=true` and
  contribute 11 default skips.

### M4. Server quality gates are misconfigured or red

- `server/package.json:8` defines `test` as an always-failing placeholder even
  though tests exist.
- Root Vitest excludes six `tests/closeDrizzleMigration*` files
  (`vitest.config.ts:13`).
- Server lint reports 1,565 errors: 456 in 61 production files and 1,109 in 96
  test files. The dominant rules are 1,427 explicit `any` and 108 unused
  variables.
- Generated `.js`, maps, and declarations are tracked beside server smoke
  TypeScript files because emission has no isolated output directory.
- The complete `npm test` gate fails
  `tests/clean-workspace-invariant.test.js:201`: the Dockerfile lacks every
  documented deterministic workspace-install/build pattern. This contradicts
  the adjacent no-cache Docker build test, which passed during the same run;
  the invariant and current build strategy need to be reconciled rather than
  selecting whichever green result is convenient.

### M5. Graceful cache watcher shutdown is incomplete

- `main.ts:412` starts `CatalogCache.watch()`, but shutdown does not call the
  available `unwatch()`.
- Signal-based process exit hides the leak in normal daemon operation, but
  embedded/reusable server lifecycles retain the watcher.

## Structural Results

- Fresh graph: **20,615 nodes / 26,462 edges / 928 files**.
- Server subset: **3,607 nodes / 367 files**, including 1,453 functions and 214
  literal route nodes.
- Server edges: 8,358 calls, 1,271 imports, and 902 parameter-flow edges.
- All 35 `register*Routes` functions have call edges from `createApiServer`.
- No scan errors, missing files, stale symbols, duplicate nodes, or server
  orphan edges were found.
- Graph-wide `unauditedSymbols` output is scanner noise dominated by route and
  field nodes; it was not misreported as application defects.
- Method-call resolution is incomplete, so zero-caller methods were manually
  verified before being classified as disconnected.

## Remediation Routing

The findings should be implemented in four ordered Measure tracks:

1. **Runtime data-integrity repair:** C1-C3, H1, H8, and M1. Disable unsafe
   updater/import actions first, then repair transaction and backup semantics.
2. **Operational API truthfulness:** H1-H3. Remove production fixtures and
   consolidate real backup/log/scheduler/event contracts.
3. **Automation completeness:** H4-H7 and H9-H12. Repair RSS, import lists,
   variants, subtitle state, and embedded-provider wiring.
4. **Server contract and test hardening:** H10, H13, and M2-M5. Replace false
   tests, make route coverage bidirectional, restore lint/test scripts, and add
   missing behavioral coverage.

Existing active tracks cover narrow settings/filter/subtitle coverage or
database migration preservation; none owns the critical updater, import
strategy, transaction, fabricated operational API, or import-list defects.
Creating those remediation tracks is intentionally left to the next
implementation/planning request rather than silently expanding this review.
