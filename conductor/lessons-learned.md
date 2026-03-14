## Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

### Architecture & Design

- (2026-03-14, code-review) **Inquiry vs. Directive Mandate:** NEVER modify the codebase during an Inquiry phase (e.g., /code-review). Directives for implementation must be explicitly issued by the user. Unauthorized "fixes" contaminate the research phase, bloat the context, and invalidate the review report.
- (2026-03-10, refactor_search_release_date_ui_cleanup) Movie model has no single `releaseDate` — uses `inCinemas`, `physicalRelease`, `digitalRelease`; use earliest non-null as guard.
- (2026-03-10, refactor_search_release_date_ui_cleanup) All new system pages must use `RouteScaffold`. Verify from the start in code review.
- (2026-03-10, feature_android_push_notifications) Create `ApiEventHub` BEFORE services that need it in `main.ts` — avoids circular dependency.
- (2026-03-10, feature_android_push_notifications) Android SSE: plain OkHttp streaming (no `okhttp-sse`); `DisposableEffect` (not `LaunchedEffect`) for lifecycle management.
- (2026-03-11, refactor_security_code_quality) `$executeRawUnsafe(sql, ...values)` for parameterized raw SQL. Always `parseDate()` for query-param dates. Guard enum casts with `Set.has()`.
- (2026-03-10, feature_system_health) `vi.hoisted()` required for mock variables inside `vi.mock()` factories.

### Recurring Gotchas

- (2026-03-10, refactor_search_release_date_ui_cleanup) Write tool requires the file to have been Read in the current session before editing.
- (2026-03-11, bug_episode_matching_corner_cases) `autoSearchEpisode` must validate candidates via `Parser.parse()` — filter by `seasonNumber` + `episodeNumbers.includes(requested)` BEFORE grabbing.
- (2026-03-11, bug_episode_matching_corner_cases) `isSingleSeasonPack`: check S01-S05 range patterns FIRST; `\bS\d{1,2}\b` matches the first number in a range giving false positives. `Season.N` needs `[.\s]*` not `\s*`.
- (2026-03-12, chore_import_cleanup) When fixing a null-guard bug in one path, check all sibling paths for the same pattern (ImportManager had identical fall-through in both episode and movie paths).
- (2026-03-12, bug_seeding_protector_grab_corner_cases) Services that remove resources must check whether downstream work completed first (query `episode.path`/`movie.path` before `removeTorrent`).
- (2026-03-12, bug_seeding_protector_grab_corner_cases) URL normalisation in `grabRelease` can produce a falsy URL even when `magnetUrl` is non-null (HTTPS URL). Always post-normalisation guard before the expensive downstream call.
- (2026-03-13, chore_seeding_protector_wiring) After adding a service, verify it is wired in `main.ts` — a never-instantiated service is dead code regardless of test coverage.
- (2026-03-13, bug_wanted_series_pack_corner_cases) Replace `if (result) return` with a flag variable so post-processing blocks after the conditional always execute.
- (2026-03-13, bug_wanted_series_pack_corner_cases) To intercept a sibling method call in tests, use `vi.spyOn(service, 'methodName').mockResolvedValue(...)`.
- (2026-03-13, bug_import_manager_corner_cases) Before a for-loop over a possibly-empty collection, guard with `if (items.length === 0)` and emit a failure event — zero iterations are silent no-ops.
- (2026-03-13, bug_import_manager_corner_cases) Use `vi.mocked(fn).mockResolvedValueOnce(...)` to override a `vi.mock()` factory for a single test without `afterEach` cleanup.
- (2026-03-13, bug_search_aggregation_corner_cases) Validation guards that must NOT emit failure events must be placed **before** the `try/catch` block — a guard throw inside try is caught, re-wrapped with a misleading "handoff failed" prefix, and triggers a spurious failure event.
- (2026-03-13, bug_search_aggregation_corner_cases) String matching for timeout detection: `"timed out"` (two words) ≠ `"timeout"` (one word). Include all natural phrasings in the predicate or the category silently degrades to 'error'.
- (2026-03-13, bug_rss_media_monitor_corner_cases) Services that grab torrents must pass `episodeId`/`movieId` to `addTorrent` — omitting them breaks the ImportManager fast-path for all RSS-triggered downloads. Audit every `addTorrent` call to confirm media context is forwarded.
- (2026-03-13, bug_rss_media_monitor_corner_cases) Scoring confidence: `CustomFormatScoringEngine.confidenceScore` = 100 whenever the release title INCLUDES the movie/series title. To test below-threshold score, use a movie title unrelated to the release title rather than relying on quality markers alone.
- (2026-03-13, bug_autosearch_wrong_series_episode) Candidate filters must check ALL dimensions: `autoSearchEpisode` needed season+episode+series-title. Adding only season+episode left a gap — a different show's S01E01 passed the filter and got grabbed. Apply `titlesMatch()` as the third guard.
- (2026-03-13, bug_autosearch_wrong_series_episode) `autoSearchMovie` core paths (not-found, no-releases, below-threshold, successful-grab, search-error) had zero tests; add smoke tests for every early-exit path to prevent silent regressions.

- (2026-03-14, chore_shadcn_setup) Radix `Tooltip` **requires** `TooltipProvider` as an ancestor — wire it in `AppProviders` at app root and use a `renderWithTooltip()` helper in tests for all components that contain a `Tooltip`.
- (2026-03-15, chore_server_module_alignment) For tsx/transpiler-based servers, use `"module": "preserve"` + `"moduleResolution": "bundler"` in tsconfig — NOT `module:nodenext`. The latter requires `.js` extensions on all relative imports (622 TS2835 errors) and conflicts with `type:commonjs` in package.json. `bundler` mode works with ESM-syntax source without enforcing file extensions.
- (2026-03-15, chore_server_module_alignment) Vitest mocks must match the import style in the source: if source uses named imports (`import { validate } from 'node-cron'`), the mock must export `{ validate: ... }` — NOT `{ default: { validate: ... } }`. Changing from default to named imports breaks any test that mocks via `default:`.
- (2026-03-15, chore_server_module_alignment) When filtering arrays to narrow type (e.g., `(string|number)[] → number[]`), verify that strings in the array are intentional — filtering them out may break behavior that relies on them (Cardigann string category IDs). Widen the target type instead of filtering when strings are valid.

### Patterns That Worked Well

- (2026-03-11, feature_system_routes_coverage) TDD on routes with in-memory state: export a proxy state object; reset it in `beforeEach`. Filter-predicate bugs only surface with coverage — write tests first.
- (2026-03-11, feature_system_events_ui) Prefer `toContain` over `toEqual(exact-array)` for nav-item membership checks; exact-array assertions break when new items are added.
