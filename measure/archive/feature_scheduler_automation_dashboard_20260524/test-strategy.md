# Test Strategy: Scheduler & Automation Dashboard

## 1. Testing Pyramid Per Phase

| Phase | Unit | Integration | E2E/Smoke |
|---|---|---|---|
| 1 — Backend schema + API | Drizzle column shape, cron validation, history pagination, route handler error mapping | Fastify `inject()` against in-memory SQLite for each new route | — |
| 2 — Shared UI components | Pure render of `TaskStatusBadge` variants, `CronIntervalPicker` preset/custom branches | `TaskSchedulerTable`/`TaskHistoryPanel` with MSW-backed query client | — |
| 3 — Automation page | Hook-level state (TanStack Query keys, optimistic update reducer) | Full page mount with MSW + MemoryRouter; assert sidebar wiring | — |
| 4 — Scheduler service integration | `triggerTask()`, hot-reload, retention pruning unit tests with mocked `node-cron` | Round-trip: PUT interval → next-tick reschedule, POST trigger → history row | — |
| 5 — Verification | — | Re-run targeted suites | `CI=true npm test`, `npm run build`, `npm run typecheck`, two manual smoke flows from spec |

## 2. Shared Fixtures & Mocks

- Reuse `vi.mock('node-cron', ...)` pattern from `Scheduler.test.ts:18` and `Scheduler.meta.test.ts:5`. Add a single `tests/fixtures/cronMock.ts` exporting `installCronMock()` that returns the captured callback so trigger/hot-reload tests share one harness.
- Reuse in-memory SQLite bootstrap from `server/src/db/__tests__/` (Drizzle `migrate()` against `:memory:`). Add `tests/fixtures/taskExecutionsFactory.ts` for status/timestamp permutations.
- Frontend: extend MSW handlers in `app/src/lib/msw/handlers/` with a new `scheduler.ts` mirroring the `settings.ts` pattern; surface a `seedSchedulerHistory(rows)` helper for component + integration tests.
- React component tests: reuse the `renderWithProviders` helper used in `SettingsIndexersPage.test.tsx`; do **not** invent a new wrapper.

## 3. Cross-Phase Edge Cases & Dependencies

- **Cron validation parity**: backend uses `node-cron`'s `validate()` (`Scheduler.ts:1`); `CronIntervalPicker` must validate via the same library or a shared util — add a contract test that feeds the same expression set to both and asserts identical accept/reject (Phase 1 ↔ Phase 2 dependency).
- **Status enum drift**: history `status` field, `TaskStatusBadge` variants, and history filter query param must derive from one TS union (declare in `server/src/services/Scheduler.ts` types and re-export through `app/src/lib/api/`). Add a type-only test asserting exhaustiveness.
- **Hot-reload semantics**: PUT `/interval` must call `Scheduler.reschedule(name, expr)` without restart. Edge cases: invalid cron (reject, no mutation), same expression (no-op), job not found (404). Phase 1 + Phase 4 share these.
- **Retention vs. history**: retention pruning (last 100) must not race with concurrent insert in trigger flow. Test with synchronous transaction.
- **Optimistic update rollback** on PUT failure (Phase 3) and confirmation-toast flow on manual trigger (Phase 3 ↔ Phase 4).
- **Timezone**: `startedAt`/`completedAt` stored UTC ISO; UI renders local. Component test asserts no double-conversion.

## 4. Architecture Guardrails

- Monolith: no new IPC or service split. `taskExecutions` lives in the existing Drizzle `schema.ts` alongside `activity`; do not create a sibling DB.
- Routes live under existing `server/src/api/routes/` (new `schedulerRoutes.ts`), registered in `routes/index.ts`. No Next.js patterns.
- React SPA only: page goes in `app/src/pages/settings/` (mirrors `SettingsIndexersPage.tsx`); router wiring updates the same Settings sidebar.
- API client lives in `app/src/lib/api/` (mirrors `settingsApi.ts`); no direct `fetch` in components.
- Flutter client (`clients/mediarr-client/`) is **out of scope**; do not edit Kotlin TV client.

## 5. Per-Phase Test Approach Notes

- **Phase 1**: Schema test asserts column types + NOT NULL on `taskName`/`startedAt`/`status`; migration test runs `migrate()` then `PRAGMA table_info`. Route tests cover 200/202/400/404/422 paths and pagination cursor stability under inserts.
- **Phase 2**: Snapshot the badge color tokens against Tailwind theme constants (no string literals duplicated). `CronIntervalPicker` table-driven: preset clicks, `*/15 * * * *` accept, `99 99` reject.
- **Phase 3**: Use MSW to simulate latency on PUT to verify optimistic-update + rollback. Assert sidebar entry under "Automation" via `screen.getByRole('link', { name: /automation/i })`.
- **Phase 4**: Wrap each registered job with `recordExecution()` adapter; tests inject a fake clock (`vi.useFakeTimers()`) and the cron mock to invoke the callback synchronously.
- **Phase 5**: Manual smokes from spec; full-suite gates below.

## 6. build-graph Findings That Shaped This Strategy

- `class:Scheduler` (`server/src/services/Scheduler.ts:30`) has **0 outgoing edges in the graph and 1 caller (`Scheduler.ts` itself)** — the wiring lives in `main.ts`/bootstrap, so blast radius for adding `triggerTask`/`reschedule` is small. Confirms Phase 4 can extend the class without sweeping caller updates.
- Three sibling test files already exist: `Scheduler.test.ts`, `Scheduler.meta.test.ts`, `Scheduler.subtitle.test.ts`. Strategy: add `Scheduler.trigger.test.ts` and `Scheduler.history.test.ts` alongside, reusing the same `vi.mock('node-cron')` recipe rather than inventing a new harness.
- `schedulerIntervals` schema is duplicated across `app/src/lib/settings-schema.ts` and `server/src/repositories/AppSettingsRepository.ts` — interval persistence already exists; this track adds **execution history + manual trigger**, not interval storage. Keeps Phase 1 schema additions minimal (one table).
- No existing `taskExecutions`, `TaskSchedulerTable`, `CronIntervalPicker`, `TaskHistoryPanel`, or `TaskStatusBadge` nodes — all net-new; no caller-update risk for those symbols.
- 385 `route` nodes, 1264 `field` nodes — patterns are mature; follow `categorySettingsRoutes.ts` shape for the new `schedulerRoutes.ts`.

## 7. Live-Proof Plan (Red command → Green/Closeout gate)

| Phase | Targeted Red command (proves new behavior fails) | Green/Closeout gate (proves it passes live) |
|---|---|---|
| 1 | `vitest run server/src/db/__tests__/taskExecutions.test.ts server/src/api/routes/schedulerRoutes.test.ts` | same command exits 0; then `vitest run server/src/api/routes` for sibling-route regression |
| 2 | `./node_modules/.bin/vitest run --config app/vitest.config.ts --root app app/src/components/scheduler` | same exits 0; visual sanity via `npm --workspace=app run build` |
| 3 | `vitest run --config app/vitest.config.ts app/src/pages/settings/AutomationSettingsPage.test.tsx app/src/lib/msw/integration/AutomationSettingsPage.integration.test.tsx` | same exits 0 |
| 4 | `vitest run server/src/services/Scheduler.trigger.test.ts server/src/services/Scheduler.history.test.ts` | same exits 0; plus `vitest run server/src/services/Scheduler` to confirm no existing-file regression |
| 5 | n/a (verification phase) | `CI=true npm test` exits 0, `npm run build` exits 0, `npm --workspace=app run typecheck` exits 0, both manual smoke flows pass |

### Artifact/contract vs. live-behavior tests

- **Contract/artifact**: Drizzle schema-shape test, status-enum exhaustiveness type test, cron-validation parity contract test, MSW handler shape mirroring `routeMap.ts`. These prove **structure**, not runtime.
- **Live-behavior**: Fastify `inject()` integration tests, MSW-backed page integration tests, scheduler trigger/hot-reload tests with the cron mock invoking the captured callback, and the Phase 5 manual smokes. These prove **runtime**.
- Fakes (`vi.mock('node-cron')`, MSW) are runner plumbing only. The `Scheduler.trigger.test.ts` Green gate is **bounded to the two new files** — it cannot accidentally pass by running the whole suite, because the targeted command names them explicitly. Phase 5's `CI=true npm test` is the single full-suite gate and runs only after targeted gates are green.

### Intentionally-red files & exclusion

- **None expected.** Vitest's default discovery (`*.test.ts`/`*.test.tsx`) will pick up new test files immediately. Plan tasks add tests **before** implementation within the same `[ ]` task pair, so no test file remains red across a commit boundary.
- Guardrail: if a phase must commit a red test (e.g., to share a fixture across PRs), the owning `[~]` task must (a) name the file in `plan.md`, (b) add it to `vitest.config.ts` `exclude` for that commit, and (c) remove the exclusion in the same task that turns it green. No reliance on aggregate-suite filtering to hide failures.
- Root `vitest.config.ts` already excludes `app/src/**/*.test.{ts,tsx}` from server runs and the app config scopes to `src/**`, so the front/back boundary is enforced — new files inherit this without action.
