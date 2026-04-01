## Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or summarize resolved items when they no longer need to influence near-term planning.
>
> **Severity:** `Critical` | `High` | `Medium` | `Low`
> **Status:** `Open` | `Resolved`

| Date | Track | Item | Severity | Status | Notes |
|------|-------|------|----------|--------|-------|
| 2026-03-10 | feature_android_push_notifications_20260310 | Android POST_NOTIFICATIONS is declared but not runtime-requested | Low | Open | Add runtime permission request flow for Android 13+ (API 33+) devices |
| 2026-03-11 | feature_system_events_ui_20260311 | /system/events page lacks date-range picker and SSE real-time feed | Low | Open | Deferred to future tracks; filter by level/type sufficient for MVP |
| 2026-03-14 | codebase_review_20260314 | Server package/module mode was internally inconsistent (type:commonjs + module:nodenext + verbatimModuleSyntax) | High | Resolved | Fixed: switched to module:preserve + moduleResolution:bundler; exactOptionalPropertyTypes and noUncheckedIndexedAccess disabled; all 85 real type errors fixed; tsc --noEmit now exits clean (42cac83) |
| 2026-03-14 | chore_fix_failing_tests_20260314 | Legacy tests in `app_src_backup/**` and `tests/import-manager.test.js` are disabled | Medium | Open | 300+ legacy tests + 1 redundant import-manager test excluded in vitest.config.ts; need audit for deletion or restoration |
| 2026-03-14 | chore_fix_failing_tests_20260314 | notificationRoutes not registered in createApiServer | High | Resolved | Was a stale/incorrect entry — routes were already registered at line 175 of createApiServer.ts; all 1030 tests pass |
| 2026-03-14 | chore_shadcn_setup_20260314 | `table-memoization.test.tsx` does not actually verify memoization | High | Open | Current assertions only check DOM presence/node reuse after rerender; replace with render-count instrumentation |
| 2026-03-14 | chore_shadcn_setup_20260314 | `modal.test.tsx` claims backdrop-close coverage but only clicks the header close button | High | Open | Add a real outside-click test against the Radix dialog overlay/content boundary |
| 2026-03-14 | chore_shadcn_setup_20260314 | `FilesystemBrowser.test.tsx` passes with `act(...)` warnings and weak selection assertions | Medium | Open | Await async navigation/load state cleanly; assert exact onSelect(path) value |
| 2026-03-14 | chore_shadcn_setup_20260314 | `VirtualTable.test.tsx` mocks virtualization so heavily that it no longer tests real windowing behavior | Medium | Open | Replace stub with harness that preserves scroll/range behavior |
| 2026-03-14 | chore_shadcn_setup_20260314 | `FileBrowser.test.tsx` uses static fixtures instead of real parent-driven path updates | Medium | Open | Build stateful harness; assert real nested navigation paths |
| 2026-03-14 | chore_shadcn_setup_20260314 | Several primitives smoke tests only assert text presence, miss variant contracts | Medium | Open | Strengthen core-primitives.test.tsx to verify alert/status/label/progress variant mapping |
| 2026-03-15 | chore_server_module_alignment_20260315 | `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` disabled to clear noise | Medium | Open | These are valuable strictness settings that should be re-enabled once the codebase is cleaned up; each setting adds ~50-90 errors that need targeted fixes |
| 2026-03-16 | chore_organizer_coverage_20260316 | `Organizer.test.ts` had zero tests for `organizeFile` (primary episode import path) | High | Resolved | 12 tests added covering all code paths; vi.hoisted() mock pattern applied (ee125bd) |
| 2026-03-16 | feature_ai_parsing_20260316 | No response caching — every filename parse hits Z.AI | Low | Resolved | Superseded by feature_ai_release_parser — DeepSeek replaces GLM; batch call on search path eliminates per-item overhead |
| 2026-03-16 | feature_ai_release_parser_20260316 | AiParsingService (GLM/Z.AI) still wired in Parser.ts and FilenameParsingService | High | Resolved | Deleted in Phase 4 of feature_ai_release_parser track (b7cb236) |
| 2026-03-16 | bug_autosearch_all_corner_cases_20260316 | autoSearchAll had no concurrent-execution guard | High | Resolved | Added isRunning flag + finally-reset; 10 tests added (b4d90bb) |
| 2026-03-16 | bug_series_routes_import_rescan_20260316 | seriesRoutes rescan episode.upsert missing seriesId in update clause | High | Resolved | Added seriesId: id to update; 16 corner-case tests added (3a329c5) |
| 2026-03-29 | chore_openrouter_migration_20260329 | Old `OPENAI_API_KEY` still in `.env` — remove after migration is complete and smoke-tested | Low | Open | Cleanup in Phase 4 of OpenRouter migration track |
| 2026-03-30 | chore_drizzle_migration_20260314 | DB recreated from scratch — existing data lost | Medium | Open | Backup at `mediarr.db.prisma.bak`; production deployments will need migration strategy (journal-only or data migration script) |
| 2026-03-30 | chore_drizzle_migration_20260314 | `server/src/db/index.ts` uses `bun:sqlite` — no type declarations in tsx/tsc context | Low | Open | Works at runtime under Bun; add `declare module 'bun:sqlite'` shim if strict tsc needed before full Bun switch |
| 2026-03-30 | chore_drizzle_migration_20260314 | 18 of 20 repos still on Prisma; `main.ts` in mixed state during Phase 2 | High | Resolved | Phase 2 repo migrations reverted to restore green test suite (b44ed6c); track paused |
| 2026-03-31 | bug_corner_case_testing_20260331 | ImportManager parsed-episode fallback to movie path broken | High | Resolved | Replaced `if (!parsed)` with `if (!episodeImported)` flag; 7 slow-path tests pass (b67ebbf) |
