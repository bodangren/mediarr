## Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

### Architecture & Design
<!-- Decisions made that future tracks should be aware of -->

- (YYYY-MM-DD, track_id) Example: Chose X over Y because of Z constraint
- (2026-03-10, refactor_search_release_date_ui_cleanup) Movie model has no single `releaseDate` field — uses `inCinemas`, `physicalRelease`, `digitalRelease`; use the earliest non-null date as the effective release date guard.
- (2026-03-10, refactor_search_release_date_ui_cleanup) All new system pages must use `RouteScaffold` primitive. Future code review should verify this from the start.
- (2026-03-10, feature_android_push_notifications) When replacing an external dispatch mechanism with SSE, create the `ApiEventHub` BEFORE services that need it in `main.ts` and pass it explicitly — avoids circular dependency between service construction and server initialization.
- (2026-03-10, feature_android_push_notifications) Android SSE can be implemented with plain OkHttp streaming (no `okhttp-sse` artifact needed) — read the response body line-by-line and accumulate `event:` / `data:` fields between blank lines.
- (2026-03-10, feature_android_push_notifications) Use `DisposableEffect` (not `LaunchedEffect + remember`) to manage started/stopped resources in Compose when the key changes — `onDispose` cleanly stops the old resource before the new one starts.
- (2026-03-11, refactor_security_code_quality) `$executeRawUnsafe` accepts positional parameters as additional arguments — use `prisma.$executeRawUnsafe(sql, ...values)` to bind values even when column identifiers must remain in the SQL string.
- (2026-03-11, refactor_security_code_quality) Always use `parseDate()` from `routeUtils.ts` when converting query string values to Date — `new Date(invalidString)` silently creates `Invalid Date` which passes comparisons incorrectly.
- (2026-03-11, refactor_security_code_quality) Guard all enum casts from query params with an explicit membership check (`Set.has()`); bare `as EventLevel` casts let any string through and corrupt filter logic silently.

- (2026-03-10, feature_system_health) `vi.hoisted()` is required for mock variables referenced inside `vi.mock()` factories — plain `const mockFn = vi.fn()` at the module top level causes "Cannot access before initialization" when Vitest hoists the mock call.
- (2026-03-10, feature_system_health) `fs.statfs()` is available on Bun and Node ≥ 18; cast through `(fs as any).statfs` if TypeScript does not expose the type in the target lib.

### Recurring Gotchas
<!-- Problems encountered repeatedly; save future tracks from the same pain -->

- (YYYY-MM-DD, track_id) Example: Always check for null before accessing config values
- (2026-03-10, refactor_search_release_date_ui_cleanup) Write tool requires the file to have been Read in the current tool-use session, not just in a prior turn. Always read before editing.

### Patterns That Worked Well
<!-- Approaches worth repeating -->

- (YYYY-MM-DD, track_id) Example: Writing acceptance criteria before implementation caught scope creep early
- (2026-03-11, feature_system_routes_coverage) TDD on routes with in-memory module state: use exported `systemState` proxy object to reset state between tests in `beforeEach`. Pure filter-predicate bugs (like the clear-by-level logic) are only detectable with test coverage — write the tests first, let them fail, then fix.
- (2026-03-11, feature_system_routes_coverage) Conditional filter logic using sequential `if (condition) return keep` guards is fragile — use an explicit boolean predicate (`const matches = ...; return !matches`) for clarity and correctness.

- (2026-03-11, feature_system_events_ui) `vi.spyOn(document, 'createElement').mockImplementation` causes an infinite call-stack when the fallback calls `document.createElement()` — which is itself spied. Patch global `URL.createObjectURL`/`revokeObjectURL` directly instead; the anchor click is an implementation detail the test need not simulate.
- (2026-03-11, feature_system_events_ui) Navigation tests that use `toEqual(exact-array)` will break when a new nav item is added. Prefer `toContain` assertions for membership checks; reserve exact-array assertions only for ordering-sensitive tests.

- (2026-03-11, bug_episode_matching_corner_cases) `autoSearchEpisode` must validate returned releases via `Parser.parse()` before grabbing — indexers routinely return wrong episodes. Filter by `seasonNumber` + `episodeNumbers.includes(requested)` BEFORE selecting the best candidate.
- (2026-03-11, bug_episode_matching_corner_cases) `isSingleSeasonPack` must check for season-range patterns (S01-S05) FIRST — `\bS\d{1,2}\b` matches the first number in a range, giving false positives. Also, `Season.N` (dot-separated) needs `[.\s]*` not `\s*` between "Season" and digit.
- (2026-03-11, bug_episode_matching_corner_cases) `[-–]` character class in a JS regex with `[-]` first is a literal hyphen (not a range), but `[a–z]` where en-dash is between two chars COULD form a Unicode range. When in doubt, use `(?:-|–)` non-capturing group instead.
- (2026-03-11, bug_episode_matching_corner_cases) After an early-guard `if (!x) { ... continue; }` block, use a bare `{ }` block (not a redundant `if (x) { }`) for the success path — keeps structure flat and avoids unreachable-code lint warnings.
- (2026-03-12, chore_import_cleanup) When fixing a null-guard bug in one fast path (e.g. linked episode), always check sibling fast paths (linked movie) for the same pattern — the ImportManager had identical fall-through bugs in both the episode and movie linked-ID paths.
- (2026-03-12, bug_seeding_protector_grab_corner_cases) Services that remove/delete resources must check whether dependent downstream work completed before removing. `SeedingProtector` must query `episode.path`/`movie.path` via an injected Prisma interface before calling `removeTorrent`.
- (2026-03-12, bug_seeding_protector_grab_corner_cases) URL normalisation in `grabRelease` can produce a falsy URL even when the original `magnetUrl` is non-null (HTTPS URL, not a magnet: URI). Always add a post-normalisation guard that throws before the expensive downstream call.
- (2026-03-13, chore_seeding_protector_wiring) After adding a service with injected dependencies (e.g. Prisma), verify it is wired in `main.ts` before archiving the track — a service that is never instantiated is dead code regardless of test coverage.
- (2026-03-13, bug_wanted_series_pack_corner_cases) When a function has an early-return inside a conditional block, specials/post-processing blocks after that block are silently skipped. Replace `if (result) return` with a flag variable (`let packGrabbed = false; if (...) packGrabbed = true;`) so later blocks always execute.
- (2026-03-13, bug_wanted_series_pack_corner_cases) When testing service methods that call sibling methods on the same class, use `vi.spyOn(service, 'methodName').mockResolvedValue(...)` to intercept without mocking the full downstream dependency chain. This avoids having to set up Prisma mock returns for deeply nested includes.

### Planning Improvements
<!-- Notes on where estimates were wrong and why -->

- (YYYY-MM-DD, track_id) Example: Underestimated integration testing time by 2x
