# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

---

## Active Tracks — Execution Order

> Reconciled 2026-07-26. The previous ordering note (2026-06-12 test-runner regression) named
> `chore_test_infrastructure_hardening_20260612` as critical path; that track was archived the
> same day it was written, so the note had been stale for six weeks and is removed.
>
> **Verified gate state at reconciliation:** root suite `CI=true npx vitest run server/src tests`
> → 309 files / 2547 passed / 11 skipped / 0 failures. SPA `CI=true npm test --workspace=app`
> → 204 files / 1960 passed / 0 failures. `npm run build --workspace=app` → exit 0.
> `npx tsc -p server/tsconfig.json --noEmit` → 0 diagnostics.
>
> Eleven tracks were closed on 2026-07-26 (see Recently Completed). Seven of them held ~106
> tasks that upstream work had already satisfied — the registry, not the code, was the blocker.

1. - [~] **Track: Home Network Deployment Hardening** *Phases: 6 | Link: [./tracks/chore_home_network_deployment_hardening_20260712/](./tracks/chore_home_network_deployment_hardening_20260712/)* — 19/20 tasks done. **Blocker (a) is CLOSED (2026-07-28, `730a09ae`) — the mechanism is file-descriptor exhaustion, which three prior sessions had recorded as *excluded*.** Rollup defaults `maxParallelFileOps` to **1000**; a buildah `RUN` layer allows **1024**. Measured peak demand of the SPA build, with the limit raised to 65536 so the reading is not clipped: **1029 fds uncapped — five over the limit** (1000 queue slots + ~29 baseline) versus **156** with the cap. That five-descriptor overshoot is the entire intermittency, and it explains every symptom at once: a different module named each run (whichever `open` loses), the 118–143 module band, 13 consecutive greens followed by 3 failures in 4, and clean runs under `podman run`/on host where the limit is 1048576. **Two errors kept the exclusion alive:** the limit had only ever been measured under `podman run` (1048576) and on the host (1048576) — neither is the namespace a build layer runs in (verified: buildah `RUN` 1024) — and, more fundamentally, only the *limit* was ever measured, never the build's *demand*. **Reproduced deterministically on the host in 40s with no container at all:** `ulimit -n 1024` with the cap removed fails with `[commonjs--resolver] … EMFILE: too many open files`, the first observation of `EMFILE` for this defect — rollup surfaces the same exhaustion as `Rollup failed to resolve import` depending on which `open` loses, so the error *text* was never its identity. Fixed portably in `app/vite.config.ts` (`maxParallelFileOps: 128`) rather than with `--ulimit nofile=`, since a rootless container cannot raise its own limit; guarded by `tests/spa-build-file-parallelism.test.js`, which asserts a *bound with headroom* rather than pinning 128. Gates: `npm run test:clean-image` 3/3 with the no-cache image build at exit 0, 3028 modules and zero Rollup-family occurrences; `tests/` 106 files / 544 passed; server typecheck 0 diagnostics; SPA build exit 0 with an unchanged artifact hash. *Discipline note:* the first control run at `ulimit -n 1024` **passed** — recorded, not discarded, because it is the same 5-fd coin flip that produced the 2026-07-27 retraction; the conclusion rests on the demand measurement, not on build outcomes. **Blocker (b) stands:** Docker Engine + physical Android/LAN playback verification is human-gated because this host's `docker` is Podman 4.9.3.
2. - [~] **Track: Database Migration and Data Preservation Strategy** *Phases: 5 | Link: [./tracks/database_migration_strategy_20260713/](./tracks/database_migration_strategy_20260713/)* — 21/25 tasks done; the 4 open are per-phase *User Manual Verification* steps, which are human-gated. Delivered `server/src/db/migrationRunner.ts`, wired into `startApi()` and the container entrypoint, plus `docs/migration-runbook.md`. **Found and fixed the actual mechanism behind the "existing data lost" tech-debt row:** drizzle-orm applies all pending migrations in one transaction, SQLite ignores `PRAGMA foreign_keys` inside a transaction, and `DROP TABLE Series` during the `0001` table rebuild cascade-deletes every `Season` and `Episode` row **while committing successfully**. Proven by a Red test (`Season: 1 -> 0, Episode: 1 -> 0`), now green.
3. - [~] **Track: Flutter Media Detail Page** *Phases: 5 | Link: [./tracks/feature_flutter_media_detail_20260508/](./tracks/feature_flutter_media_detail_20260508/)* — 33/35 tasks done. The "commit and push of ~76 local commits" task **was stale**: `main` is level with `origin/main`, so that backlog no longer exists. **The claim that "no agent-executable work remains" was wrong** — preparing the movie-detail smoke protocol found that the **Delete action was a silent no-op** (`onPressed: () {}`, with a false comment claiming the server had no DELETE endpoint; `DELETE /api/movies/:id` has existed all along), and the widget test that supposedly covered it never asserted any API call, so it passed green against the placeholder. Both are now fixed and genuinely covered. Only on-device visual confirmation remains human-gated.

4. - [ ] **Track: Jellyfin-Compatible Server Surface** *Phases: 7 | Link: [./tracks/feature_jellyfin_server_surface_20260729/](./tracks/feature_jellyfin_server_surface_20260729/)* — **Pending; the only agent-executable track on the board.** Promoted from the 2026-07-26 candidate list (recorded there as the largest-effort, highest-differentiation idea of the batch) at the owner's request 2026-07-29. Goal: a stock Jellyfin app on the owner's smart TV discovers Mediarr over LAN with no typed address, browses, direct-plays with seeking, and shares resume/watched state with the SPA. Scope confirmed with the owner: full browse + play + resume/watched — **not** discovery-only, and **not** the sister project's full ~45-endpoint parity. Transcoding, WebSocket push, multi-user, and real authentication are out (the trusted-LAN/no-auth scope from `workflow.md` stands). **Source-verified before the acceptance criteria were fixed** (per the 2026-07-26 `measure_process` row): Range/206 streaming already exists (`playbackRoutes.ts:57`), as do resume storage (`schema.ts:560`), `getContinueWatching`, `POST /api/playback/progress`, and `network_mode: host`. So resume/watched is an **adapter over existing storage**, not new persistence; the genuinely new parts are the endpoint surface and a UDP responder. **`DiscoveryService` cannot be extended for this** — Bonjour *publishes* mDNS records, while Jellyfin discovery requires *listening* on raw UDP 7359 for `"Who is JellyfinServer?"` and replying; it needs a sibling service. Host networking is mandatory because UDP broadcast does not cross a NAT bridge. Prior art: the owner's running Python server `thaidub-serve.service` (`/media/daniel-bo/320GB/serve.py`, 1643 LOC, ~45 endpoints, `uvicorn` on `0.0.0.0:8096`) is a known-good implementation **against this exact TV** — consult it when a client misbehaves. That service owns port 8096, so it is **stopped for testing only, never disabled**; restore with `systemctl --user start thaidub-serve.service`. Phase 0 replaces the assumed endpoint list with a **request log of what the TV actually calls**.

## Post-v1.0 / Deferred

> Deferred as part of the v1.0 release cut (2026-06-07); `release_v1_cut_20260607` is now
> archived. Low runtime risk or blocked on prerequisites. Revisit after v1.0 ships.

- [x] **Track: MSW Mock Coverage for Backend Routes** *(deferred — merge candidate)* *Link: [./archive/chore_msw_mock_coverage_20260526/](./archive/chore_msw_mock_coverage_20260526/)* — Archived 2026-06-13. S1–S6 complete and GREEN: 265/265 MSW handler tests pass across 6 suites; setup.ts MSW lifecycle hook wired with `onUnhandledRequest: 'error'`; tech-debt.md row marked Resolved. Full suite has pre-existing failures only (no MSW handler failures).
- [x] **Track: Import List UI Test Coverage** *Link: [./archive/chore_import_list_ui_tests_20260526/](./archive/chore_import_list_ui_tests_20260526/)* — Originally deferred for post-v1.0 at low runtime risk; completed and archived after the release cut with component/integration coverage for all five import-list surfaces.
- [x] **Track: Frontend Component Test Coverage Gaps** *Link: [./archive/chore_frontend_component_test_gaps_20260526/](./archive/chore_frontend_component_test_gaps_20260526/)* — Originally deferred for post-v1.0; completed and archived after the release cut with targeted coverage for the high-impact SPA components.
- [x] **Track: Indexer Health Monitoring & Auto-Disable** *Link: [./archive/indexer_health_monitoring_20260509/](./archive/indexer_health_monitoring_20260509/)* — Originally cut to post-v1.0; completed and archived with health persistence, automatic disablement, SSE notification, and settings controls.
- [x] **Track: Server Service Test Coverage — Runtime-Critical** *Link: [./archive/chore_untested_server_services_20260526/](./archive/chore_untested_server_services_20260526/)* — The runtime-critical half was completed; the deferred remainder is represented by the lower-risk service-coverage tracks below.
- [x] **Track: Subtitle Services Test Coverage** *Phases: 6 | Link: [./archive/subtitle_services_test_coverage_20260707/](./archive/subtitle_services_test_coverage_20260707/)* — Completed and archived 2026-07-26. All three services at **100% branch coverage** (51 → 56 tests). Note: the test files already existed when the track was written; the real work was gap-closing (`SubtitleRequirementEngine` 89.13% → 100%, `SubtitleProviderFactory` 90.9% → 100%, `SubtitleNamingService` already 100%). No production bugs found; no source files changed.
- [x] **Track: Filter Service Test Coverage** *Phases: 6 | Link: [./archive/filter_service_test_coverage_20260707/](./archive/filter_service_test_coverage_20260707/)* — Completed and archived 2026-07-26. `FilterService.ts` raised **68.48% → 100% branch coverage** (26 → 64 tests); the largest genuine coverage gap in this batch. **Spec drift recorded:** the spec demanded quality/language/size/custom-format filter paths, but `FilterService` evaluates *series and indexer conditions* (protocol/enabled/capability/priority/tag; monitored/network/genre/tag/rating/status) plus `validateConditionsGroup`. The spec described a service that does not exist. No production bugs found.
- [x] **Track: Settings and TV Search Service Test Coverage** *Phases: 6 | Link: [./archive/settings_and_tvsearch_test_coverage_20260707/](./archive/settings_and_tvsearch_test_coverage_20260707/)* — Completed and archived 2026-07-26. `SettingsService.test.ts` 7 → 20 tests. **Two spec defects recorded rather than papered over:** (a) `TvSearchService` does not exist — deleted as an orphan alias in `chore_test_infrastructure_hardening_20260612` (commit `037418f`); its responsibilities live in `MediaSearchService` (`searchEpisode`, `searchAllIndexers`, `searchWithTimeout`), already covered. Spec amended with a dated note. (b) `SettingsService.ts` is a zero-branch pass-through to `AppSettingsRepository`, so its "≥80% branch coverage" criterion was unfalsifiable; the real branch surface (`AppSettingsRepository.ts`, 582 LOC, ~34 branch points) is now logged in tech-debt.
> The duplicate "Database Migration and Data Preservation Strategy" row that sat here was removed
> on 2026-07-27. The track was promoted to Active (position 2) on 2026-07-26 but its deferred entry
> was left behind, so one track appeared twice in the registry with two different statuses.

## Superseded (2026-06-07)

- [s] **Track: Remove Prisma $executeRawUnsafe Shim** → folded into [chore_close_drizzle_migration_20260607](./archive/remove_prisma_shim_20260508/) *(archived; Phase 1 audit work carried forward)*
- [s] **Track: Prisma Naming Residue Cleanup** → folded into [chore_close_drizzle_migration_20260607](./archive/chore_prisma_naming_cleanup_20260526/) *(archived)*

## Recently Completed (archived)

### 2026-07-28 — Remaining Server Service Test Coverage

> Root suite `CI=true npx vitest run server/src tests` → **exit 0**, 318 files passed / 1 skipped,
> 2886 passed / 14 skipped (baseline 313 / 2711 — net +5 files, +175 tests).
> `npx tsc -p server/tsconfig.json --noEmit` → 0 diagnostics.

- [x] **Track: Remaining Server Service Test Coverage** *Phases: 6 | Link: [./archive/chore_remaining_server_service_coverage_20260728/](./archive/chore_remaining_server_service_coverage_20260728/)* — Closed the last server-service coverage row, but **the row measured the wrong thing and is amended rather than marked Resolved**. "Has a sibling `.test.ts`" is a filename check, not a coverage claim: a measured baseline taken *before* writing any tests showed `DataDirectoryInitializer` already at **90%** branch via a non-sibling file, and `WantedService` at **100% only because it contains zero branches** — the `SettingsService` unfalsifiable-target problem again. Neither was a real gap. Delivered: `ProbeMetadataParser` 75.51%→**100%**, `LibraryScanner` 71.42%→**100%**, `MetadataProvider` 60.22%→**94.31%** (residual branches provably unreachable, documented not chased), `ActivityEventEmitter` 0%→**100%**; six-service aggregate **100% stmt/func/line, 97.71% branch**. **`MetadataGenerator` was deleted, not covered** — dead production code with no callers; the owner's concern that this would cost artwork was verified false three ways (posters are remote TMDB URLs rendered straight from the CDN, `downloadPoster` never ran, and its `.nfo` path was duplicated by `Organizer.colocateMovieMetadata`). Spec corrections: it listed 8 services and 63 LOC for `ReleaseParserProvider`, which the parser track had already closed at 266 LOC and 73 tests. **Three findings recorded rather than fixed** — the **live** `LibraryScanner` defect (one unreadable subdirectory rejects an entire scan, and because the walk collects all paths before parsing any, *nothing* is linked; pinned by characterisation tests), `MetadataProvider` computing `tmdbCollectionId` then dropping it on every mapping path, and local metadata-sidecar generation being unimplemented rather than merely unwired (`Organizer.colocateMovieMetadata` is also never called).

### 2026-07-28 — AI Release Parser Lockdown

> Root suite `CI=true npx vitest run server/src tests` → **exit 0**, 312 files passed / 1 skipped,
> 2710 passed / 14 skipped, 0 failures. `npx tsc -p server/tsconfig.json --noEmit` → 0 diagnostics.
> `ReleaseParserProvider.ts` 100% branch; `ReleaseParser.ts` 80.95% branch.

- [x] **Track: AI Release Parser Lockdown** *Phases: 6 | Link: [./archive/bug_ai_release_parser_lockdown_20260728/](./archive/bug_ai_release_parser_lockdown_20260728/)* — **The AI release parser had never worked in its shipped configuration**, and two independent defects were fixed. (1) The default model measured **77–88s per call** against `parse()`'s 15s and `parseBatch()`'s 20s abort deadlines, so every call aborted, `parse()` returned the regex fallback and `parseBatch()` returned `[]` — silently, with nothing in the logs. (2) `MediaSearchService.ts:580` zipped `parseBatch` results onto releases **by array position**, so a truncated response (reproduced live at 7-of-8 and 6-of-8) shifted every later parse onto the wrong release, and `relevanceScore` feeds auto-grab at `totalScore >= 50` — a mis-attributed parse could trigger an automatic download of the wrong thing. Delivered: a 48-entry golden set; **index-based batch attribution** (model echoes a 1-based index; missing/duplicate/out-of-range/fractional indices are discarded, never guessed) with the `MediaSearchService` guard mutation-verified — 9 tests fail under a reintroduced positional zip; configurable deadlines; bounded concurrency (4) replacing the serial queue that stalled a 25-release search ≈20 min; `temperature: 0` pinned at all three call sites; and a `title` rule added to `BATCH_PROMPT`, which the benchmark caught scoring **0/46 → 97.9%**. **FR-4 was amended mid-track:** the shipped pin was rejected on longevity grounds and replaced by the `openrouter/pareto-code` router with `min_coding_score` escalation on retry, plus loud degradation (`parser:degraded` over SSE, warning at ≥60% of deadline). Closed the `ReleaseParserProvider` tech-debt row with 73 tests at 100% branch. **Four findings recorded rather than fixed** (all open in `tech-debt.md`): the unrotated `OPENROUTER_API_KEY` (**High — operator action, still outstanding**), router cost/latency variance (12.9× across the dial), `regexFallback` misclassifying `S01-S09` as a season pack — which can hide a complete-series release from auto-grab, pinned by a characterisation test — and `title` accuracy at 91.7%.

### 2026-07-26 — Registry Reconciliation Batch (11 tracks)

> Root suite 309 files / 2547 passed / 11 skipped / 0 failures. SPA 204 files / 1960 passed.
> App build exit 0. Server strict typecheck 0 diagnostics. +56 tests added, 0 production bugs
> found, 0 source files changed. Seven of these eleven tracks required no code work at all —
> their failures had already been fixed upstream and only the registry was stale.

- [x] **Track: Clear Server Strict Typecheck Debt** *Phases: 3 | Link: [./archive/chore_server_strict_typecheck_20260713/](./archive/chore_server_strict_typecheck_20260713/)* — Phase 3 release verification closed: root suite green and `tsc --noEmit` at zero diagnostics, re-verified *after* the same day's 56 new tests. Strict server typecheck is now a real release gate, not a known exception.
- [x] **Track: Filter Service Test Coverage** — `FilterService.ts` 68.48% → **100%** branch (26 → 64 tests). Spec drift recorded: spec described filter categories the service does not implement.
- [x] **Track: Subtitle Services Test Coverage** — all three services at **100%** branch (51 → 56 tests). No source changes.
- [x] **Track: Settings and TV Search Service Test Coverage** — `SettingsService` 7 → 20 tests; `TvSearchService` confirmed deleted (commit `037418f`) and the requirement formally retired; vacuous coverage target documented.
- [x] **Track: Complete App Regression Suite** *Link: [./archive/bug_app_regression_suite_completion_20260713/](./archive/bug_app_regression_suite_completion_20260713/)* — Release gate green: 204/204 files, 1960/1960 tests, `npm run build --workspace=app` exit 0.
- [x] **Track: Fix App Search API Drift Test Failures** *Link: [./archive/bug_app_search_api_drift_20260703/](./archive/bug_app_search_api_drift_20260703/)* — Resolved upstream; verified green. The open `pageSize` decision is settled: production uses **100**, matching test expectations (`SeriesInteractiveSearchModal.tsx:20`, `MovieInteractiveSearchModal.tsx:74`); it was 500 at the 2026-07-13 check. Spec correction: `CalendarPage`/`MoviePosterView`/`SeriesOverviewView` tests were claimed non-existent but do exist (moved directories) and pass.
- [x] **Track: Fix App Path Validation UI Test Failures** *Link: [./archive/bug_app_path_validation_ui_20260703/](./archive/bug_app_path_validation_ui_20260703/)* — Resolved upstream; verified green (15/15, 8/8, 5/5, plus FilesystemBrowser 17/17).
- [x] **Track: Fix App View/Card Component Prop Drift Test Failures** *Link: [./archive/bug_app_view_card_props_20260703/](./archive/bug_app_view_card_props_20260703/)* — Resolved upstream; verified green (10/10, 9/9, 12/12).
- [x] **Track: Fix App Settings Routes API Drift Test Failures** *Link: [./archive/bug_app_settings_routes_drift_20260703/](./archive/bug_app_settings_routes_drift_20260703/)* — Resolved upstream; verified green (32/32, with the 5 originally-named tests confirmed by name via verbose reporter).
- [x] **Track: Fix App Dynamic Form Drift Test Failures** *Link: [./archive/bug_app_dynamic_form_drift_20260703/](./archive/bug_app_dynamic_form_drift_20260703/)* — Resolved upstream; verified green across all six named files.
- [x] **Track: Fix App Hooks/Test-Environment Test Failures** *Link: [./archive/bug_app_hooks_environment_20260703/](./archive/bug_app_hooks_environment_20260703/)* — Resolved upstream; verified green (8/8, 6/6, 14/14, 14/14).

### Candidate Tracks — Sister-Project Idea Scan (2026-07-26, not yet specced)

> Mined from the Python media daemon at `/media/daniel-bo/320GB/`. Claims were re-verified
> against Mediarr's source before listing; ideas that turned out to already exist (TMDB metadata
> resolution, ffprobe audio-language detection) and ideas incompatible with Mediarr's
> torrent/indexer architecture (HLS/DASH acquisition, iframe-chain traversal, JS deobfuscation)
> were rejected rather than recorded.

- [ ] **Candidate: Trailer Acquisition via TMDB** — **Verified missing**: zero occurrences of `trailer` in `server/src`. Query TMDB `/tv/{id}/videos` and `/movie/{id}/videos`, pick the best official trailer, download alongside the media. Low cost — the TMDB integration already exists (`main.ts`, `releaseRoutes.ts`, `importRoutes.ts`). Enriches SPA and Flutter detail pages.
- [s] **Candidate: Jellyfin-Compatible Server Surface** → **PROMOTED 2026-07-29** to [feature_jellyfin_server_surface_20260729](./tracks/feature_jellyfin_server_surface_20260729/) (active list, position 4). Kept as a record of where the idea came from; do not plan against this entry.
- [ ] **Candidate: Incremental Library Self-Healing** — **Partial gap, needs validation**: Mediarr has `ExistingLibraryScanner`, `LibraryScanService`, and `Organizer`, but these are import-time. The sister project re-probes *existing* on-disk files each scan and corrects naming, metadata sidecars, and audio-language flags in place. Valuable for users migrating messy libraries from Sonarr/Radarr. Validate the true gap before speccing.
- [ ] **Track: Trailer Acquisition via TMDB** *Phases: 5 | Link: [./tracks/feature_trailer_acquisition_tmdb_20260729/](./tracks/feature_trailer_acquisition_tmdb_20260729/)* — Specced 2026-07-29 from the Trailer Acquisition candidate above. Query TMDB `/movie/{id}/videos` and `/tv/{id}/videos` via the existing `MetadataProvider` integration, deterministically select the best official trailer, persist it on the media record, and expose it on detail API responses for the SPA and Flutter clients. Claims re-verified against source at spec time (zero `trailer` in `server/src`).



- [x] **Track: Server Integrity Remediation** *Phases: 5 | Link: [./archive/bug_server_integrity_remediation_20260724/](./archive/bug_server_integrity_remediation_20260724/)* — Repaired or fail-closed all C1-C3, H1-H13, and M1-M5 findings; refreshed repo-graph; verified root 2,491 passed + 11 skipped, SPA 1,960 passed, and live Docker build green. Archived 2026-07-24.
- [x] **Track: Comprehensive Server Structure Integrity Audit** *Phases: 4 | Link: [./archive/chore_server_structure_integrity_audit_20260724/](./archive/chore_server_structure_integrity_audit_20260724/)* — Audited all 367 server files and 288 server-relevant tests with a fresh repo-graph, static gates, full/root test execution, and coverage. Confirmed 3 critical defects, 13 high findings, false tests, unimplemented behavior, and coverage gaps; remediation routing is documented in the archived report. Archived 2026-07-24.
- [x] **Track: OpenCode Coder Orchestrator Model Update** *Phase: 1 | Link: [./archive/chore_update_opencode_coder_orchestrator_20260710/](./archive/chore_update_opencode_coder_orchestrator_20260710/)* — update the global `coder-orchestrator` agent to `openai/gpt-5.6-terra` with `xhigh` reasoning and a sourced model description. Archived 2026-07-10.
- [x] **Track: Home Network Docker Deployment Readiness** *Phases: 1 | Link: [./archive/chore_home_network_docker_deployment_20260709/](./archive/chore_home_network_docker_deployment_20260709/)* — Repaired Docker deployment for Ubuntu LAN install: Vite SPA + Fastify/Bun monolith, env-controlled `/config` and `/data` bind mounts, UID/GID mapping, host networking for mDNS discovery, and updated README deployment docs. Verification: `docker compose config`, app typecheck/build, and image build green. Archived 2026-07-10.
- [x] **Track: App Pre-existing Failures — Typecheck & Triage** *Phases: 6 | Link: [./archive/chore_app_pre_existing_failures_20260630/](./archive/chore_app_pre_existing_failures_20260630/)* — Fixed 2 app typecheck errors (`schedulerApi.ts` enum typing, `TaskSchedulerTable` nullability), guarded `EventSource` in `ActivityQueuePage` (14/14 tests green), and removed brittle `table-memoization.test.tsx`. Reduced failure surface from ~133 failures across 34 files to 75 failures across 21 files, then split remaining work into 7 focused tracks. Archived 2026-07-03.
- [x] **Track: Fix MediaSearchService Pre-existing Timeout Test Failures** *Phases: 5 | Link: [./archive/bug_mediasearch_timeout_tests_20260630/](./archive/bug_mediasearch_timeout_tests_20260630/)* — Eliminated 7 pre-existing timeout failures in MediaSearchService sibling tests by adding an optional `timeoutMs` parameter to `searchAllIndexers`, switching `enrichment.test.ts` to `vi.useFakeTimers({ toFake: ['Date'] })`, and updating `cornerCases.test.ts` timeout assertions to use real timers with a short injected timeout. Full MediaSearchService suite: 87/87 tests green. Archived 2026-07-03.
- [x] **Track: Fix App Modal Close Behavior Test Failures** *Phases: 5 | Link: [./archive/bug_app_modal_close_behavior_20260703/](./archive/bug_app_modal_close_behavior_20260703/)* — Fixed Escape/backdrop/header close tests across `InteractiveSearchModal`, `MovieInteractiveSearchModal`, `SeriesInteractiveSearchModal`, `EditCollectionModal`, and `PageLayout` More menu by adding a window-level Escape listener, pluggable backdrop `data-testid`/`onClick`, and `MemoryRouter` test wrapper. 14/14 close tests green. Archived 2026-07-04.
- [x] **Track: Server Service Test Coverage — Runtime-Critical** *Stories: 4 (scoped from 10) | Link: [./archive/chore_untested_server_services_20260526/](./archive/chore_untested_server_services_20260526/)* — Covered Scheduler, SettingsService, consolidated Episode/Series via MediaService, and MediaSearchService; 136/143 targeted tests green, remaining 7 failures are pre-existing `vi.useFakeTimers` + `setTimeout` timeout issues in MediaSearchService sibling tests, documented in tech-debt.md. Archived 2026-06-30.
- [x] **Track: Frontend Component Test Coverage Gaps** *Phases: 5 | Link: [./archive/chore_frontend_component_test_gaps_20260526/](./archive/chore_frontend_component_test_gaps_20260526/)* — Added 71 component tests across 15 targets (movie modals, table primitives, search cells, providers, FilterDropdown, MetricCard); SPA build clean; tech-debt.md row marked Resolved. Archived 2026-06-30.
- [x] **Track: Import List UI Test Coverage** *Phases: 5 | Link: [./archive/chore_import_list_ui_tests_20260526/](./archive/chore_import_list_ui_tests_20260526/)* — Added 47 component/integration tests across ExclusionManager, ImportListList, ImportListModal, AddExclusionModal, and ImportListSettings; branch coverage >80% for 3/5 components; tech-debt.md row marked Resolved. Archived 2026-06-30.
- [x] **Track: Indexer Health Monitoring & Auto-Disable** *Phases: ~4 | Link: [./archive/indexer_health_monitoring_20260509/](./archive/indexer_health_monitoring_20260509/)* — Health check ping for Torznab/Newznab/Cardigann, SQLite health-status storage, consecutive-failure auto-disable with SSE event, re-enable button and history tooltip in settings; 79/79 track-surface tests green. Archived 2026-06-30.
- [x] **Track: Scheduler Persistence & Missed-Task Recovery** *Phases: 5 | Link: [./archive/scheduler_persistence_missed_task_recovery_20260613/](./archive/scheduler_persistence_missed_task_recovery_20260613/)* — Persists node-cron next-run timestamps via injected SchedulerStateRepository; recovers past-due missed tasks on startup with running-flag idempotency; exposes scheduler health metrics via /api/health and /api/system/status; 113 targeted persistence/adversarial/route tests green; resolves High scheduler restart tech-debt. Archived 2026-06-30.
- [x] **Track: Supervisor Acceptance Hardening** *Phases: 1 | Link: [./archive/chore_supervisor_acceptance_hardening_20260621/](./archive/chore_supervisor_acceptance_hardening_20260621/)* — Hardened Measure automation-supervisor closeout path: discovers active all-complete tracks, enforces UX audit per phase with blocking violations, adds Mediarr-specific scheduler route-parity and indexer-health wiring gates, retains final acceptance/closeout artifacts. Archived 2026-06-23.
- [x] **Track: v1.0 Release Cut — Define the Line** *Stories: 4 | Link: [./archive/release_v1_cut_20260607/](./archive/release_v1_cut_20260607/)* — Ratified v1.0 scope checklist, confirmed quality gates (full CI green, Flutter analyze green, app build clean), tagged and pushed v1.0.0, published post-v1.0 backlog. Archived 2026-06-20.
- [x] **Track: Harden Test Infrastructure & Close Review Findings** *Phases: 6 | Link: [./archive/chore_test_infrastructure_hardening_20260612/](./archive/chore_test_infrastructure_hardening_20260612/)* — MSW runner hang fixed with `pool: 'forks'` and integration smoke tests; handlers refactored into domain files with real Blob responses; Scheduler `nextRunAt` implemented for daily/`*/N`/`0 */H` crons; TvSearchService orphan alias deleted; orphan-alias guard fixed; Import List UI tests hardened with prop-injected search, branch-coverage tests, and 58 passing tests. Archived 2026-06-12.
- [x] **Track: Close Drizzle Migration (Shim Removal + Naming Residue)** *Stories: 7 | Link: [./archive/chore_close_drizzle_migration_20260607/](./archive/chore_close_drizzle_migration_20260607/)* — Consolidated `remove_prisma_shim` + `prisma_naming_cleanup`: removed `$executeRawUnsafe`/Bun-Node branching, deleted PrismaClient type shim, renamed Prisma mock helpers, dropped stale `OPENAI_API_KEY`. Archived 2026-06-08.
- [x] **Track: Variant Subtitle Subsystem Test Coverage** *Stories: 5 | Link: [./archive/bug_variant_subtitle_test_coverage_20260526/](./archive/bug_variant_subtitle_test_coverage_20260526/)* — 36 unit tests across the 5 variant-subtitle services (Backfill, InventoryIndexer, MissingSubtitle, SubtitleFetch, Wanted); closed the highest-risk untested subsystem. Archived 2026-06-07.
- [x] **Track: Custom Format Editor & Live Tester** *Phases: 5 | Link: [./archive/feature_custom_format_editor_20260507/](./archive/feature_custom_format_editor_20260507/)* — 13 backend route tests, FormatLiveTester component, dedicated settings page with search/clone/test panel
- [x] **Track: Release Scoring Breakdown Panel** *Phases: 5 | Link: [./archive/feature_release_scoring_breakdown_20260507/](./archive/feature_release_scoring_breakdown_20260507/)* — Backend breakdown storage, ScoreBreakdownPanel component, SeriesInteractiveSearchModal integration
- [x] **Track: SPA Subtitle Management Parity** *Phases: 5 | Link: [./archive/chore_spa_subtitle_management_20260507/](./archive/chore_spa_subtitle_management_20260507/)* — Subtitle inventory, search, download, and delete in the React SPA (Flutter parity)
- [x] **Track: Typed getSeriesWithEpisodes API Response** *Phases: 4 | Link: [./archive/type_series_api_response_20260508/](./archive/type_series_api_response_20260508/)* — Zod schema for series detail API, eliminate `as any` casts in SeriesDetailPage and children

---

- [x] **Track: Fix Catalog `isConfigured` Matching for Renamed Indexers** *Phases: 3 | Link: [./archive/bug_catalog_isconfigured_matching_20260507/](./archive/bug_catalog_isconfigured_matching_20260507/)* — 3 regression tests; Cardigann definitionId + Torznab/Newznab baseUrl matching with name fallback

- [x] **Track: Cleanup Uncommitted Work** *Phases: 2 | Link: [./archive/chore_cleanup_uncommitted_work_20260401/](./archive/chore_cleanup_uncommitted_work_20260401/)* — staged deleted track files, updated .gitignore

- [x] **Track: Organize Services Corner-Case Testing** *Phases: 5 | Link: [./archive/bug_organize_services_corner_cases_20260404/](./archive/bug_organize_services_corner_cases_20260404/)* — 67 tests; 1 bug fixed (missing absoluteEpisodeNumber)

- [x] **Track: SeriesMonitoringService Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_series_monitoring_corner_cases_20260402/](./archive/bug_series_monitoring_corner_cases_20260402/)* — 39 tests; no bugs found
- [x] **Track: MediaSearchService Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_mediasearch_corner_cases_20260401/](./archive/bug_mediasearch_corner_cases_20260401/)* — 19 tests; no bugs found

- [x] **Track: Daily Cleanup — Commit Stale Changes, Review Yesterday's Code** *Phases: 3 | Link: [./archive/chore_daily_cleanup_20260403/](./archive/chore_daily_cleanup_20260403/)* — committed stale deletions, fixed SeedingProtector import guard error handling

- [x] **Track: Daily Cleanup — Commit Stale Deletions, Verify Green Suite** *Phases: 2 | Link: [./archive/chore_daily_cleanup_20260404/](./archive/chore_daily_cleanup_20260404/)* — committed stale Apr 3 deletions; 1274 tests green

- [x] **Track: Daily Cleanup — Finish Stale Archives, Verify Green Suite** *Phases: 2 | Link: [./archive/chore_daily_cleanup_20260404b/](./archive/chore_daily_cleanup_20260404b/)* — moved stale track to archive; 1341 tests green; build clean

- [x] **Track: MediaService & MediaRepository Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_media_service_repo_corner_cases_20260404/](./archive/bug_media_service_repo_corner_cases_20260404/)* — 56 tests; no bugs found

- [x] **Track: ImportManager Post-Import Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_import_post_import_corner_cases_20260404/](./archive/bug_import_post_import_corner_cases_20260404/)* — 13 tests; 1 bug fixed (per-file try/catch)

- [x] **Track: SeriesOrganizeService applyRename Transaction Safety** *Phases: 4 | Link: [./archive/bug_organize_rename_transaction_safety_20260404/](./archive/bug_organize_rename_transaction_safety_20260404/)* — 79 tests; reordered DB-before-fs with rollback

- [x] **Track: Connectivity E2E Test Harness (podman compose)** *Phases: 2 | Link: [./archive/feature_connectivity_e2e_compose_20260412/](./archive/feature_connectivity_e2e_compose_20260412/)* — 6/6 assertions green: connect, movie library, series/episode, movie stream 206, episode stream 206, SSE round-trip

---

## Execution Order and Dependencies

### Completed Stack Modernisation (2026-03-14)
`chore_ui_foundation` → `chore_shadcn_setup` → `chore_app_decompose` → `chore_form_standardization` ✅ All archived

### Zero-Config Roadmap (Phases A–D)

**Phase A — Fix What's Broken** *(do first)*
`bug_flutter_mdns_discovery` → `chore_form_standardization_completion` → `feature_playback_resume_sync`

**Phase B — External Comms** *(after A)*
`feature_notification_transports` → `feature_auto_update`

**Phase C — Zero-Config Setup** *(after A + B)*
`feature_smart_defaults` → `feature_setup_wizard` → `feature_indexer_discovery`

**Phase D — Flutter Living Room** *(after A)*
`feature_flutter_search_add` → `feature_flutter_activity_queue` → `feature_flutter_continue_watching` + `feature_flutter_subtitle_quality`

**Parallel — Backend Performance** *(independent)*
`chore_drizzle_migration`

### Dependency Graph

```
Phase A:
  bug_flutter_mdns_discovery_20260330       (no deps — fix broken mDNS)
      |
  chore_form_standardization_completion_20260330  (no deps — finish form migration)
      |
  feature_playback_resume_sync_20260330      (needs working client from A1)

Phase B (after A):
  feature_notification_transports_20260330    (needs stable server from A)
      |
  feature_auto_update_20260330                (needs stable server from A + B1 for update notifications)

Phase C (after A + B):
  feature_smart_defaults_20260330             (needs stable server from A)
      |
  feature_setup_wizard_20260330               (needs smart defaults from C3)
      |
  feature_indexer_discovery_20260330          (needs setup wizard from C1)

Phase D (after A):
  feature_flutter_search_add_20260330         (needs working mDNS from A1)
      |
  feature_flutter_activity_queue_20260330     (needs search/nav structure from D1)
      |
  feature_flutter_continue_watching_20260330  (needs playback resume from A3 + nav from D1)
  feature_flutter_subtitle_quality_20260330   (needs search/add from D1)

Parallel:
  chore_drizzle_migration_20260314            (backend-only; independent)
```

---


- [x] **Track: WantedSearchService Comprehensive Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_wantedsearch_comprehensive_corner_cases_20260404c/](./archive/bug_wantedsearch_comprehensive_corner_cases_20260404c/)* — 77 tests; 3 bugs fixed (movie title validation, season completeness grace period, multi-episode regex capture)

- [x] **Track: SearchAggregationService Comprehensive Corner-Case Testing** *Phases: 5 | Link: [./archive/bug_searchaggregation_comprehensive_corner_cases_20260404d/](./archive/bug_searchaggregation_comprehensive_corner_cases_20260404d/)* — 42 tests; 1 bug fixed (AI batch parsing crash)

- [x] **Track: MovieOrganizeService {AudioChannels} Token Bug** *Phases: 4 | Link: [./archive/bug_audio_channels_token_20260404/](./archive/bug_audio_channels_token_20260404/)* — 39 tests; 1 bug fixed (wire audioChannels from variant audioTracks)

- [x] **Track: ImportManager Comprehensive Corner-Case Testing** *Phases: 6 | Link: [./archive/bug_importmanager_comprehensive_corner_cases_20260405/](./archive/bug_importmanager_comprehensive_corner_cases_20260405/)* — 20 tests; 1 bug fixed (movie year mismatch fallback)

- [x] **Track: Pipeline Integration Corner-Case Testing** *Phases: 6 | Link: [./archive/bug_pipeline_integration_corner_cases_20260405/](./archive/bug_pipeline_integration_corner_cases_20260405/)* — 25 tests; no bugs found; all integration handoffs verified

- [x] **Track: CustomFormatScoringEngine Comprehensive Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_customformat_scoring_corner_cases_20260405/](./archive/bug_customformat_scoring_corner_cases_20260405/)* — 72 tests; no bugs found; all condition types, negation, and unified scoring verified

### Phase B: External Comms
- [x] **Track: Real Auto-Update System** *Phases: 4 | Link: [./archive/feature_auto_update_20260330/](./archive/feature_auto_update_20260330/)* — real release-check/download/install flow shipped; daily scheduler wired; full `CI=true npm test` green (224 files / 1664 tests)

### Phase C: Zero-Config Setup
- [x] **Track: Setup Wizard & First-Run** *Phases: 2 | Link: [./archive/feature_setup_wizard_20260330/](./archive/feature_setup_wizard_20260330/)* — setup detection API, 5-step wizard, Just Work zero-config mode, route guard; 1672 tests green; SPA build clean
- [x] **Track: Indexer Auto-Discovery** *Phases: 4 | Link: [./archive/feature_indexer_discovery_20260330/](./archive/feature_indexer_discovery_20260330/)* — curated catalog with one-click add; LAN Prowlarr/Jackett detection with import banner; 9 new SPA tests; app build clean
- [x] **Track: Smart Defaults Engine** *Phases: 3 | Link: [./archive/feature_smart_defaults_20260330/](./archive/feature_smart_defaults_20260330/)* — built-in WebTorrent auto-config, naming patterns (movie + series), scheduler intervals (RSS 15min, wanted search 60min), wanted languages (en); idempotent; 18 E2E tests; full CI green (1723 tests)

### Phase D: Flutter Living Room
- [x] **Track: Flutter Search & Add Media** *Phases: 3 | Link: [./archive/feature_flutter_search_add_20260330/](./archive/feature_flutter_search_add_20260330/)* — SearchScreen with poster grid, SearchResultDetailSheet with releases/grab/add-to-library; 165 Flutter tests green; root CI green (230 files / 1738 tests)
- [x] **Track: Flutter Activity & Queue** *Phases: 3 | Link: [./archive/feature_flutter_activity_queue_20260330/](./archive/feature_flutter_activity_queue_20260330/)* — Activity & Queue screens with torrent management; SSE real-time updates; 183 tests green
- [x] **Track: Manual Test Findings and Player-First Client Debugging** *Phases: 4 | Link: [./archive/bug_manual_test_player_client_findings_20260417/](./archive/bug_manual_test_player_client_findings_20260417/)* — movie search empty (not a bug - works), TV add FK failure (fixed with resolveQualityProfileId), Flutter discovery (documented limitation), SSE event-name drift (already aligned), player-first UX decision (approved)
- [x] **Track: Flutter Continue Watching & Calendar** *Phases: 2 | Link: [./archive/feature_flutter_continue_watching_20260330/](./archive/feature_flutter_continue_watching_20260330/)* — HomeScreen with Continue Watching, Recently Added, Upcoming sections; CalendarScreen with monthly grid, dot indicators, day detail sheet; 1746 tests green
- [x] **Track: Flutter Subtitle & Quality Control** *Phases: 2 | Link: [./archive/feature_flutter_subtitle_quality_20260330/](./archive/feature_flutter_subtitle_quality_20260330/)* — subtitle management with search/download, quality upgrade with release grab; Phase D complete

- [x] **Track: Lint Debt Reduction** *Phases: 5 | Link: [./archive/chore_lint_debt_reduction_20260424/](./archive/chore_lint_debt_reduction_20260424/)* — zero lint errors, 14 exhaustivedeps warnings remain; typecheck + build clean; 216 test files green

- [x] **Track: Indexer Catalog Endpoint Caching** *Phases: 3 | Link: [./archive/feature_catalog_endpoint_caching_20260424/](./archive/feature_catalog_endpoint_caching_20260424/)* — CatalogCache with startup load, file watcher, manual reload endpoint

- [x] **Track: Test Quality Strengthening** *Phases: 5 | Link: [./archive/chore_test_quality_strengthening_20260424/](./archive/chore_test_quality_strengthening_20260424/)* — 3/5 suites strengthened (table-memoization render counts, modal backdrop-close with userEvent, FilesystemBrowser async + breadcrumb nav); VirtualTable and FileBrowser deferred (require component refactor)

### Parallel: Backend Performance
- [x] **Track: Drizzle ORM Migration** *Phases: 4 | Link: [./archive/chore_drizzle_migration_20260314/](./archive/chore_drizzle_migration_20260314/)* — Drizzle-backed runtime complete; Bun startup stabilized via `--no-addons`; 116 files / 1158 tests passed

---

## Archived Tracks

- [x] **Track: Server Service Test Coverage — Runtime-Critical** *Stories: 4 (scoped from 10) | Link: [./archive/chore_untested_server_services_20260526/](./archive/chore_untested_server_services_20260526/)* — Covered Scheduler, SettingsService, consolidated Episode/Series via MediaService, and MediaSearchService. Archived 2026-06-30.

- [x] **Track: Frontend Component Test Coverage Gaps** *Phases: 5 | Link: [./archive/chore_frontend_component_test_gaps_20260526/](./archive/chore_frontend_component_test_gaps_20260526/)* — 71 component tests across 15 targets; SPA build clean. Archived 2026-06-30.

- [x] **Track: Import List UI Test Coverage** *Phases: 5 | Link: [./archive/chore_import_list_ui_tests_20260526/](./archive/chore_import_list_ui_tests_20260526/)* — 47 component/integration tests across import-list UI. Archived 2026-06-30.

- [x] **Track: Indexer Health Monitoring & Auto-Disable** *Phases: ~4 | Link: [./archive/indexer_health_monitoring_20260509/](./archive/indexer_health_monitoring_20260509/)* — Health ping, auto-disable, SSE event, settings UI badge/re-enable. Archived 2026-06-30.

- [x] **Track: Automation Supervisor Workflow Hardening** *Phases: 1 | Link: [./archive/chore_automation_supervisor_workflow_hardening_20260619/](./archive/chore_automation_supervisor_workflow_hardening_20260619/)* — Versioned audit JSON schema, deterministic UX auto routing, retry/escalation guidance, strict closeout preflight, and post-archive artifact cleanup. Archived 2026-06-19.

- [x] **Track: Scheduler Persistence & Missed-Task Recovery** *Phases: 5 | Link: [./archive/scheduler_persistence_missed_task_recovery_20260613/](./archive/scheduler_persistence_missed_task_recovery_20260613/)* — Persists node-cron next-run timestamps to AppSettings; recovers missed tasks on startup; exposes health metrics; 113 targeted tests green. Archived 2026-06-30.

- [x] **Track: Automation Supervisor Audit Pipeline** *Phases: 2 | Link: [./archive/chore_automation_supervisor_audit_pipeline_20260607/](./archive/chore_automation_supervisor_audit_pipeline_20260607/)* — Added independent acceptance, adversarial testing, multimodal UI/UX, and mandatory closeout roles

- [x] **Track: Real Auto-Update System** *Phases: 4 | Link: [./archive/feature_auto_update_20260330/](./archive/feature_auto_update_20260330/)* — real release-check/download/install flow shipped; daily scheduler wired; full `CI=true npm test` green (224 files / 1664 tests)

- [x] **Track: Notification Transport Layer** *Phases: 4 | Link: [./archive/feature_notification_transports_20260330/](./archive/feature_notification_transports_20260330/)* — webhook/discord/telegram/gotify/email transports implemented with registry + dispatch wiring; full root CI green (223 files / 1653 tests)

- [x] **Track: Playback Resume & Continue Watching** *Phases: 4 | Link: [./archive/feature_playback_resume_sync_20260330/](./archive/feature_playback_resume_sync_20260330/)* — server continue-watching endpoint shipped, Flutter + SPA resume widgets integrated, app build + full Flutter suite + root CI (`npm test`) green

- [x] **Track: Form Standardization Completion** *Phases: 3 | Link: [./archive/chore_form_standardization_completion_20260330/](./archive/chore_form_standardization_completion_20260330/)* — modal form migration finished; dead form-compat removed; legacy Prisma-era suites rewritten for Drizzle; full CI green (216 files / 1625 tests)

- [x] **Track: AppSettings INT Overflow Bug Fix** *Phases: 4 | Link: [./archive/bug_appsettings_int_overflow_20260409/](./archive/bug_appsettings_int_overflow_20260409/)* — migration created; server starts without P2023; 1158 tests green

- [x] **Track: Corner-Case Testing Directive Complete** *Phases: 1 | Link: [./archive/chore_corner_case_testing_complete_20260406/](./archive/chore_corner_case_testing_complete_20260406/)* — directive formally closed; 1625 tests green; 7 bugs fixed across all priority subsystems

- [x] **Track: LibraryScanService Comprehensive Corner-Case Testing** *Phases: 5 | Link: [./archive/bug_libraryscan_corner_cases_20260405/](./archive/bug_libraryscan_corner_cases_20260405/)* — 34 tests; no bugs found

- [x] **Track: Daily Cleanup — Commit Stale Archives, Verify Green Suite** *Phases: 4 | Link: [./archive/chore_daily_cleanup_20260405/](./archive/chore_daily_cleanup_20260405/)* — 1474 tests green; build clean

- [x] **Track: Fix TorrentManager Seed-Limit Import Guard** *Phases: 4 | Link: [./archive/bug_seed_limit_import_guard_20260402/](./archive/bug_seed_limit_import_guard_20260402/)* — extracted shared importGuard.ts; 10 new tests; TorrentManager + SeedingProtector both guarded
- [x] **Track: TorrentManager Lifecycle & importGuard Corner-Case Testing** *Phases: 5 | Link: [./archive/bug_torrent_lifecycle_corner_cases_20260403/](./archive/bug_torrent_lifecycle_corner_cases_20260403/)* — 12 importGuard tests, 10 removeTorrent tests, 12 syncStats tests, 5 queued-torrent tests; no bugs found
- [x] **Track: RssMediaMonitor + RssSyncService Corner-Case Testing** *Phases: 4 | Link: [./archive/bug_rss_pipeline_corner_cases_20260403/](./archive/bug_rss_pipeline_corner_cases_20260403/)* — 32 tests; no bugs found; RSS pipeline solid
- [x] **Track: Daily Cleanup — Stage Deletions, Verify Green Suite** *Phases: 3 | Link: [./archive/chore_daily_cleanup_20260402/](./archive/chore_daily_cleanup_20260402/)* — excluded redundant legacy test; 195 passed, 0 failures
- [x] **Track: Local LLM Gateway Routing** *Phases: 3 | Link: [./archive/feature_local_llm_gateway_20260401/](./archive/feature_local_llm_gateway_20260401/)* — ReleaseParser now prefers `AI_GATEWAY_BASE_URL` + model envs, falls back to OpenRouter, then regex-only parsing
- [x] **Track: Measure Housekeeping Cleanup** *Phases: 3 | Link: [./archive/chore_conductor_housekeeping_20260401/](./archive/chore_conductor_housekeeping_20260401/)* — cleaned recent archive-plan residue and trimmed `lessons-learned.md` to 40 lines
- [x] **Track: Fix ImportManager Episode-to-Movie Fallback Bug** *Phases: 3 | Link: [./archive/chore_fix_import_manager_fallback_20260401/](./archive/chore_fix_import_manager_fallback_20260401/)* — fixed `if (!parsed)` → `if (!episodeImported)`; 7 slow-path tests
- [x] **Track: Cleanup Uncommitted Work** *Phases: 3 | Link: [./archive/chore_cleanup_uncommitted_work_20260401/](./archive/chore_cleanup_uncommitted_work_20260401/)* — 3 commits; reverted .env secrets, removed junk, committed form migration + Flutter fixes

- [x] **Track: Corner-Case Testing — WantedSearch + ImportManager** *Phases: 4 | Link: [./archive/bug_corner_case_testing_wantedsearch_import_20260331/](./archive/bug_corner_case_testing_wantedsearch_import_20260331/)* — 19 tests; 1 bug found (ImportManager episode-to-movie fallback)
- [x] **Track: Flutter mDNS Discovery Fix** *Phases: 2 | Link: [./archive/bug_flutter_mdns_discovery_20260330/](./archive/bug_flutter_mdns_discovery_20260330/)* — mDNS resolve(), provider defaults, playback tests all fixed
- [x] **Track: Form Standardization (superseded)** *Phases: 2 | Link: [./archive/chore_form_standardization_20260314/](./archive/chore_form_standardization_20260314/)* — Phase 1 complete; Phase 2 superseded by `chore_form_standardization_completion_20260330`
- [x] **Track: OpenRouter AI Provider Migration** *Phases: 4 | Link: [./archive/chore_openrouter_migration_20260329/](./archive/chore_openrouter_migration_20260329/)*
- [x] **Track: Flutter Cross-Platform Client** *Phases: 5 | Link: [./archive/feature_flutter_client_20260328/](./archive/feature_flutter_client_20260328/)*
- [x] **Track: AI Release Parser — Batch Search Scoring & Import Matching** *Phases: 4 | Link: [./archive/feature_ai_release_parser_20260316/](./archive/feature_ai_release_parser_20260316/)*
- [x] **Track: AI-Powered Filename Parsing** *Phases: 4 | Link: [./archive/feature_ai_parsing_20260316/](./archive/feature_ai_parsing_20260316/)*
- [x] **Track: App.tsx Decomposition** *Phases: 3 | Link: [./archive/chore_app_decompose_20260314/](./archive/chore_app_decompose_20260314/)*
- [x] **Track: seriesRoutes import/apply & rescan corner cases** *Phases: 3 | Link: [./archive/bug_series_routes_import_rescan_20260316/](./archive/bug_series_routes_import_rescan_20260316/)*
- [x] **Track: WantedSearchService.autoSearchAll Concurrent-Execution Guard** *Phases: 4 | Link: [./archive/bug_autosearch_all_corner_cases_20260316/](./archive/bug_autosearch_all_corner_cases_20260316/)*
- [x] **Track: Organizer Test Coverage** *Phases: 4 | Link: [./archive/chore_organizer_coverage_20260316/](./archive/chore_organizer_coverage_20260316/)*
- [x] **Track: TorrentManager Corner Cases** *Phases: 4 | Link: [./archive/bug_torrent_manager_corner_cases_20260315/](./archive/bug_torrent_manager_corner_cases_20260315/)*
- [x] **Track: Cleanup Pending Changes from Prior Work** *Phases: 3 | Link: [./archive/chore_cleanup_pending_changes_20260315/](./archive/chore_cleanup_pending_changes_20260315/)*
- [x] **Track: Server Package/Module Alignment** *Phases: 4 | Link: [./archive/chore_server_module_alignment_20260315/](./archive/chore_server_module_alignment_20260315/)*
- [x] **Track: shadcn/ui Installation & Primitive Migration** *Phases: 4 | Link: [./archive/chore_shadcn_setup_20260314/](./archive/chore_shadcn_setup_20260314/)*
- [x] **Track: UI Foundation Cleanup** *Phases: 3 | Link: [./archive/chore_ui_foundation_20260314/](./archive/chore_ui_foundation_20260314/)*
- [x] **Track: Fix Failing Tests** *Phases: 2 | Link: [./archive/chore_fix_failing_tests_20260314/](./archive/chore_fix_failing_tests_20260314/)*
- [x] **Track: WantedSearchService — wrong-series episode grab + autoSearchMovie coverage** *Phases: 4 | Link: [./archive/bug_autosearch_wrong_series_episode_20260313/](./archive/bug_autosearch_wrong_series_episode_20260313/)*
- [x] **Track: RssMediaMonitor corner cases — missing episodeId/movieId in addTorrent & coverage** *Phases: 4 | Link: [./archive/bug_rss_media_monitor_corner_cases_20260313/](./archive/bug_rss_media_monitor_corner_cases_20260313/)*
- [x] **Track: MediaSearchService Corner Cases — Grab Error Propagation, grabReleaseByGuid, Indexer Resilience** *Phases: 4 | Link: [./archive/bug_search_aggregation_corner_cases_20260313/](./archive/bug_search_aggregation_corner_cases_20260313/)*
- [x] **Track: ImportManager corner cases — empty-directory + no-root-folder IMPORT_FAILED** *Phases: 4 | Link: [./archive/bug_import_manager_corner_cases_20260313/](./archive/bug_import_manager_corner_cases_20260313/)*
- [x] **Track: WantedSearchService autoSearchSeries Corner Cases** *Phases: 2 | Link: [./archive/bug_wanted_series_pack_corner_cases_20260313/](./archive/bug_wanted_series_pack_corner_cases_20260313/)*
- [x] **Track: Wire SeedingProtector into main.ts runtime** *Phases: 1 | Link: [./archive/chore_seeding_protector_wiring_20260313/](./archive/chore_seeding_protector_wiring_20260313/)*
- [x] **Track: SeedingProtector & grabRelease Corner Cases** *Phases: 2 | Link: [./archive/bug_seeding_protector_grab_corner_cases_20260312/](./archive/bug_seeding_protector_grab_corner_cases_20260312/)*
- [x] **Track: ImportManager Cleanup — Linked-Movie-Null Fix & Code Quality** *Phases: 3 | Link: [./archive/chore_import_cleanup_20260312/](./archive/chore_import_cleanup_20260312/)*
- [x] **Track: Episode Matching Corner Cases — Wrong Grab & Pack Detection** *Phases: 4 | Link: [./archive/bug_episode_matching_corner_cases_20260311/](./archive/bug_episode_matching_corner_cases_20260311/)*
- [x] **Track: System Events Log UI** *Phases: 2 | Link: [./archive/feature_system_events_ui_20260311/](./archive/feature_system_events_ui_20260311/)*
- [x] **Track: System Routes Test Coverage & Dynamic Disk Space from AppSettings** *Phases: 2 | Link: [./archive/feature_system_routes_coverage_20260311/](./archive/feature_system_routes_coverage_20260311/)*
- [x] **Track: Security Hardening & Code Quality Refactor** *Phases: 3 | Link: [./archive/refactor_security_code_quality_20260311/](./archive/refactor_security_code_quality_20260311/)*
- [x] **Track: Server-to-Android Push Notification System** *Phases: 3 | Link: [./archive/feature_android_push_notifications_20260310/](./archive/feature_android_push_notifications_20260310/)*
- [x] **Track: Real System Health & Disk Space Monitoring** *Phases: 3 | Link: [./archive/feature_system_health_20260310/](./archive/feature_system_health_20260310/)*
- [x] **Track: Notification Event Dispatch Service** *Phases: 3 | Link: [./archive/feature_notification_dispatch_20260310/](./archive/feature_notification_dispatch_20260310/)*
- [x] **Track: Search Release-Date Guard & System UI Consistency Refactor** *Phases: 4 | Link: [./archive/refactor_search_release_date_ui_cleanup_20260310/](./archive/refactor_search_release_date_ui_cleanup_20260310/)*
- [x] **Track: System Pages Completion** *Phases: 3 | Link: [./archive/system-pages-completion_20260309/](./archive/system-pages-completion_20260309/)*
- [x] **Track: Library Scan & Import Fix** *Phases: 3 | Link: [./archive/library_scan_import_fix_20260308/](./archive/library_scan_import_fix_20260308/)*
- [x] **Track: Subtitle UI Reporting & Targeted Search** *Phases: 3 | Link: [./archive/subtitle_ui_reporting_20260308/](./archive/subtitle_ui_reporting_20260308/)*
- [x] **Track: Subtitle Code Deduplication & Performance Refactor** *Phases: 3 | Link: [./archive/refactor_subtitle_dedup_20260309/](./archive/refactor_subtitle_dedup_20260309/)*
- [x] **Track: Library Statistics & Analytics Dashboard** *Phases: 3 | Link: [./archive/stats-analytics-dashboard_20260309/](./archive/stats-analytics-dashboard_20260309/)*
- [x] **Track: System Administration Pages** *Phases: 3 | Link: [./archive/system_admin_pages_20260308/](./archive/system_admin_pages_20260308/)*
- [x] **Track: Automated Search and Download** *Phases: 4 | Link: [./archive/automated_search_download_20260303/](./archive/automated_search_download_20260303/)*
- [x] **Track: Backend Deduplication & Security Hardening** *Phases: 3 | Link: [./archive/refactor_dedup_security_20260308/](./archive/refactor_dedup_security_20260308/)*
- [x] **Track: Android TV Client** *Phases: 7 | Link: [./archive/android_tv_client_20260304/](./archive/android_tv_client_20260304/)*
- [x] **Track: Subtitle Inventory Disk Import Recovery** *Phases: 2 | Link: [./archive/subtitle_inventory_disk_import_recovery_20260307/](./archive/subtitle_inventory_disk_import_recovery_20260307/)*
- [x] **Track: Streaming Settings Panel & DB-backed Configuration** *Phases: 3 | Link: [./archive/streaming_settings_panel_20260305/](./archive/streaming_settings_panel_20260305/)*
- [x] **Track: Streaming Server & Discovery** *Phases: 3 | Link: [./archive/streaming_server_20260304/](./archive/streaming_server_20260304/)*
- [x] **Track: Subtitle Management** *Phases: 5 | Link: [./archive/subtitle_management_20260303/](./archive/subtitle_management_20260303/)*
- [x] **Track: Queue Mass Actions + Action Tooltips** *Phases: 1 | Link: [./archive/queue_mass_actions_tooltips_20260304/](./archive/queue_mass_actions_tooltips_20260304/)*
- [x] **Track: Existing Library Import** *Phases: 4 | Link: [./archive/existing_library_import_20260301/](./archive/existing_library_import_20260301/)*
- [x] **Track: Collections** *Phases: 4 | Link: [./archive/collections_20260301/](./archive/collections_20260301/)*
- [x] **Track: Manual Search, Queue Monitoring & Quality Profile Enhancements** *Phases: 5 | Link: [./archive/manual_search_queue_20260228/](./archive/manual_search_queue_20260228/)*
- [x] **Track: Vite Frontend Parity Recovery** *Phases: 5 | Link: [./archive/vite_parity_recovery_20260226/](./archive/vite_parity_recovery_20260226/)*
- [x] **Track: Library Visibility & Dashboard** *Phases: 3 | Link: [./archive/library_visibility_20260301/](./archive/library_visibility_20260301/)*
- [x] **Track: Import Pipeline & Root Folder Settings** *Phases: 4 | Link: [./archive/import_pipeline_20260228/](./archive/import_pipeline_20260228/)*
- [x] **Track: Media Detail Pages & Library Enrichment** *Phases: 4 | Link: [./archive/media_detail_pages_20260228/](./archive/media_detail_pages_20260228/)*
- [x] **Track: Search and Add to Wanted** *Phases: 3 | Link: [./archive/search_add_wanted_20260227/](./archive/search_add_wanted_20260227/)*
- [x] **Track: Monolith Unification Refactor** *Phases: 3 | Link: [./archive/monolith_unification_refactor_20260226/](./archive/monolith_unification_refactor_20260226/)*
- [x] **Track: Sonarr Feature Parity** *Phases: 5 | Link: [./archive/sonarr_parity_20260217/](./archive/sonarr_parity_20260217/)*
- [x] **Track: Foundation** *Link: [./archive/foundation_20260210/](./archive/foundation_20260210/)*
- [x] **Track: Indexer Engine** *Link: [./archive/indexer_engine_20260210/](./archive/indexer_engine_20260210/)*
- [x] **Track: Torrent Engine** *Link: [./archive/torrent_engine_20260211/](./archive/torrent_engine_20260211/)*
- [x] **Track: Movie Management** *Link: [./archive/movie_management_20260211/](./archive/movie_management_20260211/)*
- [x] **Track: TV Management** *Link: [./archive/tv_management_20260211/](./archive/tv_management_20260211/)*
- [x] **Track: Subtitle & Audio Engine** *Link: [./archive/subtitle_audio_engine_20260211/](./archive/subtitle_audio_engine_20260211/)*
- [x] **Track: Docker Volumes** *Link: [./archive/docker_volumes_20260211/](./archive/docker_volumes_20260211/)*
- [x] **Track: UI Platform Prerequisites** *Link: [./archive/ui_platform_prereqs_20260211/](./archive/ui_platform_prereqs_20260211/)*
- [x] **Track: UI Core Operations** *Link: [./archive/ui_core_operations_20260211/](./archive/ui_core_operations_20260211/)*
- [x] **Track: UI API Surface Contracts** *Link: [./archive/ui_api_surface_contracts_20260211/](./archive/ui_api_surface_contracts_20260211/)*
- [x] **Track: Unified UI Dashboard (superseded)** *Link: [./archive/unified_ui_dashboard_20260211_superseded/](./archive/unified_ui_dashboard_20260211_superseded/)*
- [x] **Track: Clone Parity Gap Investigation** *Link: [./archive/clone_parity_gap_investigation_20260212/](./archive/clone_parity_gap_investigation_20260212/)*
- [x] **Track: Sonarr UI Cloning** *Phases: 14 | Link: [./archive/sonarr_ui_cloning_20260214/](./archive/sonarr_ui_cloning_20260214/)*
- [x] **Track: Bazarr UI Cloning** *Phases: 13 | Link: [./archive/bazarr_ui_cloning_20260214/](./archive/bazarr_ui_cloning_20260214/)*
- [x] **Track: Prowlarr UI Cloning** *Phases: 10 | Link: [./archive/prowlarr_ui_cloning_20260214/](./archive/prowlarr_ui_cloning_20260214/)*
- [x] **Track: Prowlarr Feature Parity** *Phases: 3 | Link: [./archive/prowlarr_parity_20260217/](./archive/prowlarr_parity_20260217/)*
- [x] **Track: Cardigann Runtime Parity (Monolith-Native)** *Phases: 5 | Link: [./archive/cardigann_runtime_parity_20260223/](./archive/cardigann_runtime_parity_20260223/)*
- [x] **Track: UI Stub Closure & Deduplication** *Phases: 5 | Link: [./archive/ui_stub_closure_20260217/](./archive/ui_stub_closure_20260217/)*
- [x] **Track: Fix Core Parity Wiring** *Phases: 4 | Link: [./archive/fix_core_parity_wiring_20260212/](./archive/fix_core_parity_wiring_20260212/)*
- [x] **Track: Radarr UI Cloning** *Phases: 11 | Link: [./archive/radarr_ui_cloning_20260214/](./archive/radarr_ui_cloning_20260214/)*

- [x] **Track: Visual Refresh — Define Unique Identity** *Phases: 2 | Link: [./archive/visual_refresh_20260425/](./archive/visual_refresh_20260425/)* — Near-Zero Tesla theme; DESIGN.md lint passed; 232 test files green

- [x] **Track: Legacy Test Audit** *Phases: 3 | Link: [./archive/legacy_test_audit_20260426/](./archive/legacy_test_audit_20260426/)* — Deleted 340 obsolete backup tests; 1800 tests green; no regressions

- [x] **Track: TypeScript Strictness Re-enablement** *Phases: 3 | Link: [./archive/typescript_strictness_20260426/](./archive/typescript_strictness_20260426/)* — Re-enabled exactOptionalPropertyTypes and noUncheckedIndexedAccess; fixed 853 server errors + 381 app errors; 1800 tests green; 0 tsc errors

- [x] **Track: WebTorrent Download Management UI** *Phases: 3 | Link: [./archive/webtorrent_download_management_20260503/](./archive/webtorrent_download_management_20260503/)* — Backend torrent routes (25 tests), enhanced ActivityQueuePage with sort/filter/search/SSE/priority, app build clean, 1800 tests green

- [x] **Track: Dashboard Statistics & Analytics** *Phases: 3 | Link: [./archive/dashboard_statistics_20260503/](./archive/dashboard_statistics_20260503/)* — statistics dashboard with library composition charts, download metrics, system health monitoring; 17 tests green (15 backend + 2 integration)

- [x] **Track: Flutter Home & Library Browsing Screen** *Phases: 5 | Link: [./archive/feature_flutter_home_screen_20260502/](./archive/feature_flutter_home_screen_20260502/)* — LibraryScreen with Movies/TV tabs, sort controls, getLibrary integration; 9 server tests green; app typecheck clean

- [x] **Track: Catalog Indexer API Key Validation Guard** *Phases: 4 | Link: [./archive/chore_catalog_apikey_validation_20260502/](./archive/chore_catalog_apikey_validation_20260502/)* — server validation guard with 422 response; frontend inline inputs already handle UX; 11 catalog route tests pass

- [x] **Track: WebTorrent Native Addon Resolution** *Phases: 3 | Link: [./archive/webtorrent_addon_resolution_20260426/](./archive/webtorrent_addon_resolution_20260426/)* — patched `node-datachannel` to handle `ERR_DLOPEN_DISABLED`; WebTorrent now operates in TCP-only mode without falling back to stub manager; 224 test files passed

- [x] **Track: Flutter Player-First Navigation & Shell Default Route** *Phases: 2 | Link: [./archive/flutter_player_first_navigation_20260506/](./archive/flutter_player_first_navigation_20260506/)* — Library added to nav before Activity; default route already /home; compilation fixes for library_screen + quality_upgrade_sheet; viewport fixes for widget tests

- [x] **Track: Backend Drizzle Migration Cleanup & Type Safety** *Phases: 3 | Link: [./archive/drizzle_cleanup_type_safety_20260506/](./archive/drizzle_cleanup_type_safety_20260506/)* — prismaClient.ts → drizzleClient.ts + DatabaseClient rename; removed $executeRawUnsafe/$queryRaw shims; fixed seedSmartDefaults JSON round-trip; removed as any casts from AddIndexerModal/EditIndexerModal/AddProfileModal; 1802 tests green; app typecheck clean

- [x] **Track: Legacy Code & Test Infrastructure Cleanup** *Phases: 3 | Link: [./archive/legacy_test_cleanup_20260506/](./archive/legacy_test_cleanup_20260506/)* — Deleted app_src_backup/ + import-manager.test.js; strengthened core-primitives.test.tsx variant class assertions; documented VirtualTable mock acceptance; 1802 tests green

- [x] **Track: Wanted List Dashboard (SPA)** *Phases: 5 | Link: [./archive/feature_wanted_list_spa_20260507/](./archive/feature_wanted_list_spa_20260507/)* — Backend `GET /api/movies/missing` + `GET /api/episodes/missing` with pagination; WantedPage with Movies/Episodes tabs, search, monitored toggle, pagination; 15 component tests green; app build clean

- [x] **Track: Shared Type Contracts (Server ↔ App)** *Stories: 6 + remediation | Link: [./archive/chore_type_contract_sharing_20260526/](./archive/chore_type_contract_sharing_20260526/)* — Shared contracts extracted and post-review app type/build/lint failures remediated; fresh build-graph scan verified contract files; root CI only blocked by missing local reference repos
