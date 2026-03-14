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
| 2026-03-14 | chore_fix_failing_tests_20260314 | Legacy tests in `app_src_backup/**` are currently disabled | Medium | Open | 300+ legacy tests excluded in vitest.config.ts; need audit for deletion or restoration |
| 2026-03-14 | chore_fix_failing_tests_20260314 | notificationRoutes not registered in createApiServer | High | Resolved | Was a stale/incorrect entry — routes were already registered at line 175 of createApiServer.ts; all 1030 tests pass |
| 2026-03-14 | chore_shadcn_setup_20260314 | `table-memoization.test.tsx` does not actually verify memoization | High | Open | Current assertions only check DOM presence/node reuse after rerender; replace with render-count instrumentation |
| 2026-03-14 | chore_shadcn_setup_20260314 | `modal.test.tsx` claims backdrop-close coverage but only clicks the header close button | High | Open | Add a real outside-click test against the Radix dialog overlay/content boundary |
| 2026-03-14 | chore_shadcn_setup_20260314 | `FilesystemBrowser.test.tsx` passes with `act(...)` warnings and weak selection assertions | Medium | Open | Await async navigation/load state cleanly; assert exact onSelect(path) value |
| 2026-03-14 | chore_shadcn_setup_20260314 | `VirtualTable.test.tsx` mocks virtualization so heavily that it no longer tests real windowing behavior | Medium | Open | Replace stub with harness that preserves scroll/range behavior |
| 2026-03-14 | chore_shadcn_setup_20260314 | `FileBrowser.test.tsx` uses static fixtures instead of real parent-driven path updates | Medium | Open | Build stateful harness; assert real nested navigation paths |
| 2026-03-14 | chore_shadcn_setup_20260314 | Several primitives smoke tests only assert text presence, miss variant contracts | Medium | Open | Strengthen core-primitives.test.tsx to verify alert/status/label/progress variant mapping |
| 2026-03-15 | chore_server_module_alignment_20260315 | `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` disabled to clear noise | Medium | Open | These are valuable strictness settings that should be re-enabled once the codebase is cleaned up; each setting adds ~50-90 errors that need targeted fixes |
