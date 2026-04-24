## Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

### Architecture & Design

- (2026-04-24, feature_catalog_endpoint_caching) **In-memory caching with file watchers eliminates disk I/O from hot paths.** CatalogCache loads JSON at startup and watches for changes; routes serve from memory. For small static data, this is simpler than Redis and avoids process.cwd() path resolution issues by using __dirname-relative paths.

- (2026-04-24, chore_test_quality_strengthening) **DOM node identity (`toBe`) does not verify memoization.** Use render-count instrumentation with `React.memo`-wrapped spy components. Tests that count renders will catch when memoization fails — the table-memoization suite revealed components re-render despite `memo()` wrappers.
- (2026-04-24, chore_test_quality_strengthening) **Radix Dialog backdrop clicks need `userEvent`, not `fireEvent`.** The overlay's pointer-event detection requires full event simulation; `userEvent.click(overlay)` triggers `onOpenChange` correctly where `fireEvent.click` fails silently.
- (2026-04-24, chore_test_quality_strengthening) **Async component tests need `act()` wrappers for all state transitions.** FilesystemBrowser's `useEffect` + API calls cause act warnings unless renders and event fires are both wrapped. Pattern: `await act(async () => { render(...) })` followed by `await act(async () => { fireEvent.click(...) })`.
- (2026-03-30, chore_drizzle_migration) **Drizzle SQLite gotchas:** `integer()` has no `mode: "bigint"`; `onDelete` lowercase; `drizzle-kit generate` crashes on `0n` defaults (use `sql\`0\``).
- (2026-03-31, bug_corner_case_testing) **`if (!parsed)` guard prevents episode-to-movie fallback.** Track "no episode found" condition separately. Test private methods indirectly through public API.
- (2026-04-02, bug_seed_limit_import_guard) **Duplicate seed-limit checking creates race conditions.** Extract shared guard logic; apply in fastest path.
- (2026-04-03, bug_rss_pipeline_corner_cases) Season packs produce empty `episodeNumbers[]` — `parsed.episodeNumbers[0]` is `undefined`. Prisma ignores `undefined` in `where`. Use class-based mocks in `vi.mock()` factories — `vi.clearAllMocks()` clears implementations.
- (2026-04-03, bug_torrent_lifecycle_corner_cases) `removeTorrent` does NOT check import guard — only `checkSeedLimits` does. Manual removal is intentional user action.
- (2026-04-14, feature_indexer_discovery) **`vi.useFakeTimers()` breaks Promises with internal `setTimeout`** — tests using `vi.useFakeTimers()` combined with `AbortController` timeouts fail because the internal `setTimeout` never fires. Use `vi.useFakeTimers()` with `vi.advanceTimersByTime()` OR avoid fake timers for fetch-based services.
- (2026-04-04, bug_organize_services_corner_cases) **Missing field in DTOs is a silent bug.** Verify DTO construction copies source fields for naming tokens.
- (2026-04-04, bug_organize_rename_transaction_safety) **DB-before-fs rename pattern.** DB first, then fs rename. Rollback DB on fs failure. Don't mask original error.
- (2026-04-04, bug_import_post_import_corner_cases) **Per-item try/catch in for-loops.** Independent items must not abort the batch. `vi.mock` with `default` export requires `.default` access from dynamic import.
- (2026-04-04, bug_wantedsearch_comprehensive_corner_cases) **`autoSearchMovie` must validate release title + year** like `autoSearchEpisode`. Air-date guards must use consistent grace periods.
- (2026-04-05, bug_importmanager_comprehensive_corner_cases) **`findMovieMatch` must NOT fall back to title-only when year is present but unmatched.**
- (2026-04-04, bug_searchaggregation_comprehensive_corner_cases) **External service calls need try/catch with graceful degradation.** `toSearchCandidate` passes raw flags; normalization happens in `toScoringCandidate`.
- (2026-04-09, bug_appsettings_int_overflow) **SQLite datetime storage mismatch: INTEGER vs TEXT.** `strftime('%s','now')` gives Unix seconds, Prisma's `Date.now()` passes milliseconds. Store as TEXT ISO 8601 ("2026-04-09T00:00:00.000Z") for Prisma SQLite compatibility.
- (2026-04-09, chore_drizzle_migration) **Avoid static Bun-only imports in Node-compatible code paths.** `drizzle-orm/bun-sqlite` eagerly requires `bun:sqlite`; load Bun/Node adapters lazily via `createRequire` runtime detection.
- (2026-04-09, chore_drizzle_migration) **Bun + WebTorrent native addons can hard-crash on hosts missing libuv/N-API coverage.** Launch daemon with `bun --no-addons` to disable addon loading and allow graceful fallback manager startup.
- (2026-04-09, chore_form_standardization_completion) **Prisma-compat semantics matter for Drizzle test/runtime parity.** Ignore `undefined` `where` keys, support empty `upsert.update {}`, handle `{ increment: n }` updates, and apply nested relation `create` writes in `create()` paths.
- (2026-04-09, feature_playback_resume_sync) **Router-level Flutter widget tests must override every network-backed provider used by shell screens.** New top sections (like continue-watching) can trigger unmocked Dio calls and pending discovery timers unless explicitly overridden in `app_router_test.dart`.
- (2026-04-09, feature_notification_transports) **Treat `CI=true npm test` as the authoritative suite in this repo.** `bun test` is useful for spot checks but can hang/fail on Vitest-specific semantics; keep Bun-runner deviations explicit in track metadata.

### Patterns That Worked Well

- (2026-03-16, feature_ai_parsing) AI client guard (`if (!API_KEY) return null`) + TDD fallback = graceful degradation to regex.
- (2026-03-11, feature_system_routes_coverage) TDD on routes: export proxy state object; reset in `beforeEach`.
- (2026-04-05, bug_pipeline_integration_corner_cases) **Integration tests across service boundaries catch data-flow bugs.** Use event-emitter mocks with manual `emit()` + microtask flush.
- (2026-04-05, bug_customformat_scoring_corner_cases) `scoreCandidateUnified` casts to ReleaseCandidate. Callers must pass full candidate objects with all fields.
- (2026-04-08, chore_form_standardization_completion) **useFieldArray return value is NOT stable** — do NOT put `dynamicFieldArray` from `useFieldArray` in useEffect dependency arrays; causes infinite loops. Only put primitive dependencies like `selectedPreset`.
- (2026-04-08, chore_form_standardization_completion) **Don't use explicit `id` on Radix SelectTrigger inside FormField** — FormLabel's `htmlFor` is auto-generated (e.g., `_r_xx-form-item`), conflicting with explicit `id="edit-indexer-protocol"`. NumberInput needs explicit id since it's not a Radix component.
- (2026-04-09, chore_form_standardization_completion) **FormField + Radix Select/Input label association:** Use plain `<label htmlFor="id">` with explicit `id` on input, NOT FormField wrapper. FormField's `ControllerRenderProps` lacks `id` property, so `htmlFor` auto-generates mismatched IDs. Use plain labels for simple fields; reserve FormField for complex cases requiring validation display.
- (2026-04-09, chore_form_standardization_completion) **`form.formState.isValid` starts false despite valid defaultValues** — use computed `canSave` from actual form values instead of `isValid` to enable save button. `isValid` only updates after validation runs, not on form reset.
- (2026-04-12, feature_indexer_discovery) **Indexer catalog `isConfigured` check uses case-insensitive name matching.** Settings fields vary by configContract: Cardigann uses `definitionId`, Torznab/Newznab use `url`/`host` + `apiKey`.
- (2026-04-15, feature_flutter_search_add) **Flutter widget tests with FutureProvider require ProviderScope overrides.** Use `searchResultsProvider.overrideWith((ref) async => [...])` pattern to control async state.
- (2026-04-16, feature_flutter_search_add) **`StateProvider.overrideWith` factory returns the state directly** — use `overrideWith((ref) => 'value')`, NOT `ref.state = 'value'; return 'value';`. The `ref` inside override is an `OverrideRef`, not a `StateProviderRef`.
- (2026-04-16, feature_flutter_search_add) **LeanbackScaffold nav indices shift when nav order changes** — Search added at index 0 shifts Movies/Series/Settings to 1/2/3. Update test expectations to match current `_destinations` order.
- (2026-04-16, feature_flutter_search_add) **Mocking `MediarrApiClient` requires all interface methods** — `implements MediarrApiClient` demands every method signature match exactly. Use correct param names (`positionSeconds`, `durationSeconds`, `userId: String?`) and return types (`Future<bool>` for `connect`).
- (2026-04-17, feature_flutter_activity_queue) **Flutter nav index shifts when adding destinations** — LeanbackScaffold `_destinations` order change requires updating all `selectedIndex` test expectations. Activity added at index 0 shifts Search/Movies/Series/Settings.
- (2026-04-17, feature_flutter_activity_queue) **Flutter mock class must implement ALL interface methods** — Adding new methods to `MediarrApiClient` breaks any `_MockMediarrApiClient` that uses `implements`. Must add empty implementations for `getTorrents`, `getActivity`, `pauseTorrent`, `resumeTorrent`, `removeTorrent`.
- (2026-04-23, bug_manual_test_player_client_findings) **Quality profile ID resolution must not assume ID 1 exists.** Always validate requested ID against database and fall back to first available profile. Prevents FK constraint failures when adding media.
- (2026-04-23, bug_manual_test_player_client_findings) **SSE event contracts need explicit documentation.** Server and client must agree on event names (e.g., 'torrent:stats' not 'torrent:progress'). Add regression tests to prevent drift.
- (2026-04-23, bug_manual_test_player_client_findings) **Player-first navigation requires explicit product decision.** Admin surfaces (Activity, Search) should not be default routes. Home/Continue Watching should be the primary entry point for a media player client.
- (2026-04-24, feature_flutter_continue_watching) **Server endpoints should support range parameters for calendar views.** Extending `/api/dashboard/upcoming` with `range=month&year=&month=` avoids client-side filtering and reduces API calls. Keep default behavior backward-compatible.
- (2026-04-24, feature_flutter_continue_watching) **Custom calendar grids are simpler than TableCalendar for leanback UIs.** Focus ring + D-pad navigation work better with FocusableActionDetector on custom cells than third-party packages.

(End of file - total 59 lines)
