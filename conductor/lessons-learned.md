## Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

### Architecture & Design
<!-- Decisions made that future tracks should be aware of -->

- (YYYY-MM-DD, track_id) Example: Chose X over Y because of Z constraint
- (2026-03-10, refactor_search_release_date_ui_cleanup) Movie model has no single `releaseDate` field — uses `inCinemas`, `physicalRelease`, `digitalRelease`; use the earliest non-null date as the effective release date guard.
- (2026-03-10, refactor_search_release_date_ui_cleanup) All new system pages must use `RouteScaffold` primitive. Future code review should verify this from the start.
- (2026-03-10, feature_notification_dispatch) When extracting shared logic, `sendSingleNotification` exported from service is consumed by both routes (test) and service (dispatch) — prevents divergence. Pattern: extract to service, import into routes, never duplicate.
- (2026-03-10, feature_notification_dispatch) `NotificationRepository.findAllEnabled()` was already implemented but unused. Before building new infrastructure always check repositories for ready-made helpers.

- (2026-03-10, feature_system_health) `vi.hoisted()` is required for mock variables referenced inside `vi.mock()` factories — plain `const mockFn = vi.fn()` at the module top level causes "Cannot access before initialization" when Vitest hoists the mock call.
- (2026-03-10, feature_system_health) `fs.statfs()` is available on Bun and Node ≥ 18; cast through `(fs as any).statfs` if TypeScript does not expose the type in the target lib.

### Recurring Gotchas
<!-- Problems encountered repeatedly; save future tracks from the same pain -->

- (YYYY-MM-DD, track_id) Example: Always check for null before accessing config values
- (2026-03-10, refactor_search_release_date_ui_cleanup) Write tool requires the file to have been Read in the current tool-use session, not just in a prior turn. Always read before editing.

### Patterns That Worked Well
<!-- Approaches worth repeating -->

- (YYYY-MM-DD, track_id) Example: Writing acceptance criteria before implementation caught scope creep early

### Planning Improvements
<!-- Notes on where estimates were wrong and why -->

- (YYYY-MM-DD, track_id) Example: Underestimated integration testing time by 2x
