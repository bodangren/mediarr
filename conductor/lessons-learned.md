## Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

### Architecture & Design

- (2026-03-14, code-review) **Inquiry vs. Directive Mandate:** NEVER modify the codebase during an Inquiry phase. Directives for implementation must be explicitly issued by the user.
- (2026-03-10, refactor_search_release_date_ui_cleanup) Movie model has no single `releaseDate` — uses `inCinemas`, `physicalRelease`, `digitalRelease`; use earliest non-null as guard.
- (2026-03-10, feature_android_push_notifications) Create `ApiEventHub` BEFORE services that need it in `main.ts` — avoids circular dependency.
- (2026-03-10, feature_system_health) `vi.hoisted()` required for mock variables inside `vi.mock()` factories.

### Recurring Gotchas

- (2026-03-15, chore_server_module_alignment) For tsx/transpiler servers, use `"module": "preserve"` + `"moduleResolution": "bundler"` — NOT `module:nodenext`.
- (2026-03-15, chore_server_module_alignment) Vitest mocks must match import style: named imports need named mock exports, not `default:`.
- (2026-03-15, bug_torrent_manager_corner_cases) `vi.fn()` with constructor: use `vi.fn(function() { return impl; })` not arrow function. `vi.resetAllMocks()` in `afterEach` + `beforeEach` to restore hoisted defaults.
- (2026-03-16, bug_autosearch_all_corner_cases) Fire-and-forget with `setTimeout` needs `vi.useFakeTimers()` + microtask flushes. Background loops need `isRunning` guard + `finally` reset.
- (2026-03-16, bug_series_routes_import_rescan) `prisma.X.upsert` — always include owning FK in **update** clause too. Batch import paths must never early-return; failed++ per item.
- (2026-03-18, feature_ai_release_parser) **READ AND FOLLOW THE SPEC. When the spec says replace X with Y, that means X is gone.**
- (2026-03-30, chore_drizzle_migration) **Drizzle SQLite gotchas:** `integer()` has no `mode: "bigint"`; `onDelete` lowercase; `drizzle-kit generate` crashes on `0n` defaults (use `sql\`0\``).
- (2026-03-31, bug_corner_case_testing) **`if (!parsed)` guard prevents episode-to-movie fallback.** Track "no episode found" condition separately. Test private methods indirectly through public API.
- (2026-04-02, bug_seed_limit_import_guard) **Duplicate seed-limit checking creates race conditions.** Extract shared guard logic; apply in fastest path.
- (2026-04-03, bug_rss_pipeline_corner_cases) Season packs produce empty `episodeNumbers[]` — `parsed.episodeNumbers[0]` is `undefined`. Prisma ignores `undefined` in `where`. Use class-based mocks in `vi.mock()` factories — `vi.clearAllMocks()` clears implementations.
- (2026-04-03, bug_torrent_lifecycle_corner_cases) `removeTorrent` does NOT check import guard — only `checkSeedLimits` does. Manual removal is intentional user action.
- (2026-04-04, bug_organize_services_corner_cases) **Missing field in DTOs is a silent bug.** Verify DTO construction copies source fields for naming tokens.
- (2026-04-04, bug_organize_rename_transaction_safety) **DB-before-fs rename pattern.** DB first, then fs rename. Rollback DB on fs failure. Don't mask original error.
- (2026-04-04, bug_import_post_import_corner_cases) **Per-item try/catch in for-loops.** Independent items must not abort the batch. `vi.mock` with `default` export requires `.default` access from dynamic import.
- (2026-04-04, bug_wantedsearch_comprehensive_corner_cases) **`autoSearchMovie` must validate release title + year** like `autoSearchEpisode`. Air-date guards must use consistent grace periods.
- (2026-04-05, bug_importmanager_comprehensive_corner_cases) **`findMovieMatch` must NOT fall back to title-only when year is present but unmatched.**
- (2026-04-04, bug_searchaggregation_comprehensive_corner_cases) **External service calls need try/catch with graceful degradation.** `toSearchCandidate` passes raw flags; normalization happens in `toScoringCandidate`.

### Patterns That Worked Well

- (2026-04-01, bug_mediasearch_corner_cases) `deduplicateByInfoHash` uses `customFormatScore` (includes Levenshtein confidence). Tests must use identical titles to isolate seeders/size ranking.
- (2026-03-16, feature_ai_parsing) AI client guard (`if (!API_KEY) return null`) + TDD fallback = graceful degradation to regex.
- (2026-03-11, feature_system_routes_coverage) TDD on routes: export proxy state object; reset in `beforeEach`.
- (2026-04-05, bug_pipeline_integration_corner_cases) **Integration tests across service boundaries catch data-flow bugs.** Use event-emitter mocks with manual `emit()` + microtask flush.
- (2026-04-05, bug_customformat_scoring_corner_cases) `scoreCandidateUnified` casts to ReleaseCandidate. Callers must pass full candidate objects with all fields.
