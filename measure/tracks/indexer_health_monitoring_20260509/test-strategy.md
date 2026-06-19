# Test Strategy: Indexer Health Monitoring and Auto-Disable

## 1. Build-Graph Findings (shape the strategy)
- `IndexerHealthRepository` already exists (`server/src/repositories/IndexerHealthRepository.ts`) with `getByIndexerId / recordSuccess / recordFailure`. The `IndexerHealthSnapshot` table is defined in `server/src/db/schema.ts:575` and wired through `drizzleClient.ts`. **No new repo class needed** — Phase 1 extends it (threshold field, `disable()` semantics, listing).
- Existing writers: `IndexerTester` (server/src/indexers/IndexerTester.ts:43-45) and `RssSyncService` already record success/failure. `MediaSearchService.searchAllIndexers` (line 463/865) calls `indexerRepository.findAllEnabled()` — auto-disable just needs to flip `indexers.enabled=false`; the search path will pick it up for free.
- Frontend already speaks the contract: `eventsApi.ts` defines `indexer:healthChanged`, `systemApi.ts` has `healthSnapshotSchema`, MSW `handlers/core.ts:398` returns `healthSnapshot` per indexer, `handlers/system.ts:85` already infers critical at `failureCount >= 3`. **No schema invention** — reuse these wire shapes.
- Reusable fake: `makeIndexerHealthRepo()` in `RssSyncService.test.ts:46`. Lift it to a shared helper in Phase 1 rather than re-fake per file. `BaseIndexer.searchUrl.test.ts` is the canonical pattern for indexer-side unit tests.

## 2. Architecture Guardrails
- **Monolith, no sync layer:** auto-disable mutates the existing `indexers.enabled` column via `IndexerRepository`. Do not introduce a parallel "disabled" flag in `IndexerHealthSnapshot`.
- **Drizzle only** for new queries (`this.drizzle…`); never `this.indexer.findMany`. Schema changes are additive (new nullable columns / threshold setting).
- **Threshold is config**, not a constant — read from `AppSettingsRepository` (existing) so tests can override without env vars.
- **SSE contract reuse:** emit `indexer:healthChanged` (already typed) when failureCount changes or auto-disable trips. No new event names.
- **UI:** shadcn Badge + Tooltip per `tech-stack.md`; no ad-hoc components. Manual re-enable goes through the existing `PATCH /indexers/:id` route, not a new "undisable" endpoint.

## 3. Testing Pyramid Per Phase
| Phase | Unit (most) | Integration (some) | E2E/Component (few) |
|---|---|---|---|
| 1 Health Service | `IndexerHealthRepository` extension; threshold reader | route handler + real Drizzle in-memory DB for `GET /indexers/:id/health` | — |
| 2 Auto-Disable | threshold detector (pure fn); `MediaSearchService` skip logic | tester→repo→indexerRepo flip; SSE event emitted | — |
| 3 UI | badge state mapper (pure); re-enable mutation hook | MSW handler for health endpoint | RTL: badge renders, tooltip shows history, click re-enables |
| 4 Verification | — | — | full root + app suite, typecheck |

## 4. Shared Fixtures / Mocks (build once, reuse)
- `server/test-utils/fakes/indexerHealthRepo.ts` — promote `makeIndexerHealthRepo` (artifact contract test: assert exported keys match `IndexerHealthRepository` public surface so renames break the fake, not silently pass).
- `server/test-utils/fakes/indexerRepo.ts` — `findAllEnabled`, `update({enabled})` spies; share between Phase 2 search-skip tests and tester tests.
- `server/test-utils/db/inMemoryDrizzle.ts` — bun:sqlite `:memory:` + migrations runner for the **one** non-fake integration smoke per phase (see §7).
- `app/src/lib/msw/handlers/indexers.ts` — extend existing handler to flip `failureCount` per scenario; assert badge variants from a single fixture matrix.

## 5. Cross-Phase Edge Cases & Dependencies
- **Threshold boundary:** N-1 failures must NOT disable; N must disable on the same call. Cover at Phase 2 unit level AND in the Phase 2 smoke that hits real Drizzle.
- **Race / re-enable:** manual re-enable must reset `failureCount` to 0 (not just flip `enabled`). Otherwise the next failure re-disables instantly.
- **Concurrent recordFailure** (parallel search): atomic `failureCount + 1` already in repo (line 76) — add a Phase 2 test that fires N concurrent `recordFailure` calls against the in-memory DB and asserts `failureCount === N`.
- **Disabled indexer in search**: `findAllEnabled` already filters; add a regression test in Phase 2 that fails if someone replaces it with `findAll`.
- **No-snapshot indexer:** `getByIndexerId` returns null → UI must render "unknown" badge, not crash. Phase 1 contract + Phase 3 component test.
- **Phase 3 depends on Phase 1 route shape**; do not start Phase 3 until the `healthSnapshotSchema` (already in `systemApi.ts`) is confirmed unchanged. If extended, MSW factory + Zod schema move together.

## 6. Per-Phase Test Approach Notes
- **Phase 1:** TDD the repo extensions with `makeIndexerHealthRepo` consumers in mind — keep method signatures stable. Add an **artifact contract test** that imports the public `IndexerHealthRepository` type and the fake and asserts structural compatibility (compile-time + runtime `Object.keys`).
- **Phase 2:** Pure threshold function first (`shouldAutoDisable(snapshot, threshold)`), then wire into `IndexerTester` / failure path. Live-behavior proof: one test using real `bun:sqlite :memory:` proving `enabled` flips to 0 in the actual table.
- **Phase 3:** Co-locate component tests next to component (RTL + MSW). Snapshot only the badge state matrix; no full-page snapshots.
- **Phase 4:** No new tests — gate only.

## 7. Live-Proof Plan (Red command + Green/closeout gate per phase)
> Fakes (`makeIndexerHealthRepo`, MSW handlers) cover plumbing only. **Every production gate below has a bounded non-fake proof** that exercises real Drizzle / real DOM / real route handler.

| Phase | Targeted Red Command (single failing test) | Green / Closeout Gate (live, bounded) |
|---|---|---|
| 1 | `bunx vitest run server/src/repositories/IndexerHealthRepository.test.ts -t "extends snapshot with threshold context"` | `bunx vitest run server/src/repositories/IndexerHealthRepository.test.ts server/src/api/routes/indexerRoutes.health.test.ts` — uses real `:memory:` Drizzle; **not** the fake repo. |
| 2 | `bunx vitest run server/src/services/IndexerAutoDisable.test.ts -t "disables indexer at threshold"` | `bunx vitest run server/src/indexers/IndexerTester.autoDisable.test.ts server/src/services/MediaSearchService.searchAllIndexers.test.ts` — real Drizzle smoke asserts `indexers.enabled=0` after N failures AND search omits it. |
| 3 | `cd app && bunx vitest run src/components/indexers/IndexerHealthBadge.test.tsx -t "renders critical badge at threshold"` | `cd app && bunx vitest run src/components/indexers/IndexerCatalogPanel.test.tsx src/components/indexers/IndexerHealthBadge.test.tsx` — RTL + MSW; click re-enable issues real `PATCH /indexers/:id` mock and asserts query invalidation. |
| 4 | n/a (verification only) | `bunx vitest run` (root) **and** `cd app && bun run test` **and** `cd app && bun run typecheck` — all green. |

**Command-construction proof for Phase 4:** the root vitest config (`vitest.config.ts`) excludes `app/src/**/*.test.{ts,tsx}` already, so root + app commands together cover the full surface without overlap. Verified by listing both configs in this strategy; do not add a single "all" alias that could silently exclude either project.

## 8. Intentionally-Red Files & Aggregate Discovery
- During Phase 1/2 each phase will land its **first failing test file before** implementation. To prevent aggregate suites in *later* phases from re-discovering an earlier still-`[~]` task as red:
  - Each red test file is owned by exactly one `[~]` plan task. The next phase MUST NOT start until that task flips to `[x]`.
  - If a phase needs to land partial work, gate the unfinished red test with `it.todo(...)` (NOT `.skip`, which silently passes) and reference the `[~]` task ID in a comment. `it.todo` shows in the report and forces resolution.
  - **Do NOT** add files to `vitest.config.ts` `exclude` to hide failures — the test-strategy reviewer must be able to grep for `it.todo` to find owed work.
- No pre-existing red tests in this repo today (root vitest excludes `app/src/**` cleanly; app suite is currently green per last review). Therefore no exclusions are inherited into this track.
