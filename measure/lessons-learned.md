## Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

### Architecture & Design

- (2026-04-24, feature_catalog_endpoint_caching) **In-memory caching with file watchers eliminates disk I/O from hot paths.** CatalogCache loads JSON at startup and watches for changes; routes serve from memory. For small static data, this is simpler than Redis and avoids process.cwd() path resolution issues by using __dirname-relative paths.
- (2026-04-24, chore_test_quality_strengthening) **DOM node identity (`toBe`) does not verify memoization.** Use render-count instrumentation with `React.memo`-wrapped spy components. Tests that count renders will catch when memoization fails.
- (2026-04-24, chore_test_quality_strengthening) **Radix Dialog backdrop clicks need `userEvent`, not `fireEvent`.** The overlay's pointer-event detection requires full event simulation; `userEvent.click(overlay)` triggers `onOpenChange` correctly where `fireEvent.click` fails silently.
- (2026-04-24, chore_test_quality_strengthening) **Async component tests need `act()` wrappers for all state transitions.** FilesystemBrowser's `useEffect` + API calls cause act warnings unless renders and event fires are both wrapped.
- (2026-04-24, chore_lint_debt_reduction) **File-level `eslint-disable` is acceptable for framework-level mismatches.** 10 files exported both components and helpers; disabling `react-refresh/only-export-components` per-file is safer than risky refactors. Prefer block-level disables for rule-of-thumb exceptions like `react-hooks/set-state-in-effect`.
- (2026-04-24, chore_lint_debt_reduction) **Auto-fix scripts must preserve multi-line declarations.** Initial Python script corrupted multi-line `const` statements by deleting only the first line. Always validate auto-fix output with `git diff` before committing.
- (2026-03-30, chore_drizzle_migration) **Drizzle SQLite gotchas:** `integer()` has no `mode: "bigint"`; `onDelete` lowercase; `drizzle-kit generate` crashes on `0n` defaults (use `sql\`0\``).
- (2026-04-09, chore_drizzle_migration) **Avoid static Bun-only imports in Node-compatible code paths.** `drizzle-orm/bun-sqlite` eagerly requires `bun:sqlite`; load Bun/Node adapters lazily via `createRequire` runtime detection.
- (2026-04-09, chore_drizzle_migration) **Bun + WebTorrent native addons can hard-crash on hosts missing libuv/N-API coverage.** Launch daemon with `bun --no-addons` to disable addon loading and allow graceful fallback manager startup.
- (2026-04-09, chore_form_standardization_completion) **Prisma-compat semantics matter for Drizzle test/runtime parity.** Ignore `undefined` `where` keys, support empty `upsert.update {}`, handle `{ increment: n }` updates, and apply nested relation `create` writes in `create()` paths.
- (2026-04-09, feature_playback_resume_sync) **Router-level Flutter widget tests must override every network-backed provider used by shell screens.** New top sections (like continue-watching) can trigger unmocked Dio calls and pending discovery timers unless explicitly overridden in `app_router_test.dart`.
- (2026-04-09, feature_notification_transports) **Treat `CI=true npm test` as the authoritative suite in this repo.** `bun test` is useful for spot checks but can hang/fail on Vitest-specific semantics; keep Bun-runner deviations explicit in track metadata.

### Patterns That Worked Well

- (2026-03-16, feature_ai_parsing) AI client guard (`if (!API_KEY) return null`) + TDD fallback = graceful degradation to regex.
- (2026-04-05, bug_pipeline_integration_corner_cases) **Integration tests across service boundaries catch data-flow bugs.** Use event-emitter mocks with manual `emit()` + microtask flush.
- (2026-04-08, chore_form_standardization_completion) **useFieldArray return value is NOT stable** — do NOT put `dynamicFieldArray` from `useFieldArray` in useEffect dependency arrays; causes infinite loops. Only put primitive dependencies like `selectedPreset`.
- (2026-04-08, chore_form_standardization_completion) **Don't use explicit `id` on Radix SelectTrigger inside FormField** — FormLabel's `htmlFor` is auto-generated, conflicting with explicit `id="edit-indexer-protocol"`. NumberInput needs explicit id since it's not a Radix component.
- (2026-04-08, chore_form_standardization_completion) **`form.formState.isValid` starts false despite valid defaultValues** — use computed `canSave` from actual form values instead of `isValid` to enable save button. `isValid` only updates after validation runs, not on form reset.
- (2026-04-12, feature_indexer_discovery) **Indexer catalog `isConfigured` check uses case-insensitive name matching.** Settings fields vary by configContract: Cardigann uses `definitionId`, Torznab/Newznab use `url`/`host` + `apiKey`.
- (2026-04-15, feature_flutter_search_add) **Flutter widget tests with FutureProvider require ProviderScope overrides.** Use `searchResultsProvider.overrideWith((ref) async => [...])` pattern to control async state.
- (2026-04-16, feature_flutter_search_add) **`StateProvider.overrideWith` factory returns the state directly** — use `overrideWith((ref) => 'value')`, NOT `ref.state = 'value'; return 'value';`. The `ref` inside override is an `OverrideRef`, not a `StateProviderRef`.
- (2026-04-16, feature_flutter_search_add) **LeanbackScaffold nav indices shift when nav order changes** — Search added at index 0 shifts Movies/Series/Settings to 1/2/3. Update test expectations to match current `_destinations` order.
- (2026-04-17, feature_flutter_activity_queue) **Flutter mock class must implement ALL interface methods** — Adding new methods to `MediarrApiClient` breaks any `_MockMediarrApiClient` that uses `implements`. Must add empty implementations for `getTorrents`, `getActivity`, `pauseTorrent`, `resumeTorrent`, `removeTorrent`.
- (2026-04-23, bug_manual_test_player_client_findings) **Quality profile ID resolution must not assume ID 1 exists.** Always validate requested ID against database and fall back to first available profile. Prevents FK constraint failures when adding media.
- (2026-04-23, bug_manual_test_player_client_findings) **SSE event contracts need explicit documentation.** Server and client must agree on event names (e.g., 'torrent:stats' not 'torrent:progress'). Add regression tests to prevent drift.
- (2026-04-23, bug_manual_test_player_client_findings) **Player-first navigation requires explicit product decision.** Admin surfaces (Activity, Search) should not be default routes. Home/Continue Watching should be the primary entry point for a media player client.
- (2026-04-24, feature_flutter_continue_watching) **Server endpoints should support range parameters for calendar views.** Extending `/api/dashboard/upcoming` with `range=month&year=&month=` avoids client-side filtering and reduces API calls. Keep default behavior backward-compatible.
- (2026-04-24, feature_flutter_continue_watching) **Custom calendar grids are simpler than TableCalendar for leanback UIs.** Focus ring + D-pad navigation work better with FocusableActionDetector on custom cells than third-party packages.
- (2026-04-25, visual_refresh) **A CSS variable bridge enables gradual theme migration without breaking existing components.** Mapping `--background`, `--primary`, etc. to new Near-Zero tokens lets shadcn components work immediately while explicit tokens (`text-text-primary`) are adopted incrementally.
