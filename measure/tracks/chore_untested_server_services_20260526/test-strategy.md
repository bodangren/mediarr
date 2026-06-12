# Test Strategy — chore_untested_server_services_20260526

**Scope (post-2026-06-07 restructure):** S1 Scheduler, S3 EpisodeService, S4 SeriesService,
S6 MediaSearchService base. S2/S5/S7–S10 are DEFERRED — out of strategy.

## 0. Build-graph findings that shaped this strategy

Run `build-graph stats ./graph.db` (graph.db mtime today, 7,310 nodes, 10,725 edges).

- **`callers` returns 0 importers for `Scheduler`, `EpisodeService`, `SeriesService`.** All four
  classes are tagged `exported` but the graph records no outgoing or `imports` edges from other
  modules. That is consistent with `MediaSearchService.ts` (file is the 9th-most-imported file
  with 26 imports — corner-case tests exist but no caller cluster shows up via the class symbol
  because callers import the file/value, not the class name). **Implication:** mocks must isolate
  the service under test from real DI; we cannot lean on integration callers as a free signal.
- **`build-graph inspect EpisodeService` and `inspect SeriesService` resolve to graph-stale rows.**
  `git log --diff-filter=D` shows commit `92224c3` (2026-06-10) deleted both files when
  consolidating into `MediaService` (`SeriesService` was a 6-line empty alias; `EpisodeService`
  collapsed to `MediaService.setEpisodeMonitored`). Live tree confirms: `ls server/src/services/
  Episode*.ts Series*.ts` shows no plain `EpisodeService.ts` / `SeriesService.ts` — only
  `SeriesMonitoringService.ts` and `SeriesOrganizeService.ts`. **`MediaService.test.ts` already
  exists (292 lines).** S3 and S4 as written in `plan.md` target deleted symbols.
- **`Scheduler.ts` reality (lines 1–243) differs from the spec.** It exports a generic
  `schedule(name, cronExpression, callback)` plus `scheduleActivityCleanup`,
  `scheduleWantedSearch`, `scheduleSubtitleWantedSearch`, `scheduleLibraryScan`,
  `scheduleTargetedSubtitleSearch`. There is no aggregate `start()` registering exactly five
  named jobs and no single `stop()`; teardown is `stop(name)` and `stopAll()`. Tests must assert
  the **actual** API.
- **MediaSearchService already has 10 sibling test files** (`cornerCases`, `customFormat`,
  `enrichment`, `grabRelease`, `phase1–4`, `publicApi`, `searchAllIndexers`). S6 must avoid
  duplicating coverage; the new `*.base.test.ts` is a thin smoke around constructor wiring +
  cross-method invariants only.

## 1. Pyramid guidance per phase

All four phases are **pure unit tests** (Vitest, mocked deps). No integration or e2e tier — the
existing route suites already exercise wiring; this track closes the unit-tier gap noted in
`tech-debt.md` ("30 server services untested"). Target ≥80% line coverage on each in-scope
source file.

## 2. Shared fixtures / mocks

- **Mock pattern:** `vi.hoisted()` + `vi.mock(...)` + `vi.fn().mockImplementation()`, copied from
  `bug_variant_subtitle_test_coverage` lessons (2026-06-07). Mock only methods the service
  actually invokes; never re-mock the whole 20+-method repo surface.
- **Drizzle naming:** use `createDbMock` / `makeDb` (post-Prisma rename, 2026-06-08); never
  `createPrismaMock`.
- **node-cron:** `vi.mock('node-cron', () => ({ schedule: vi.fn(...), validate: vi.fn() }))`
  returning a `ScheduledTask` stub with `start`, `stop`, `getStatus`. Capture calls via the spy.
- **MediaSearchService:** reuse the indexer/torrent mock shape from the existing
  `MediaSearchService.searchAllIndexers.test.ts` (same DI: indexer registry + TorrentManager).
- **MediaService (S3/S4 replacement):** if S3/S4 are re-pointed at `MediaService`, reuse
  `MediaService.test.ts`'s `prisma: any` + optional `ActivityEventEmitter` constructor pattern.

## 3. Cross-phase edge cases & dependencies

- **Time:** Scheduler tests must use `vi.useFakeTimers()` only when triggering callbacks
  manually; do not advance real cron timers.
- **Error propagation:** every phase has a "repository/dependency throws" case. Assert
  `rejects.toThrow` for async paths and that Scheduler swallows + logs (does not crash).
- **Empty-input invariants:** S4 `bulkUpdate([])`, S6 `searchAllIndexers` with zero indexers,
  S1 `stop(unknownName)` should not throw.
- **No file-system, no network:** all fixtures in-memory; do not import `fs`, `node:net`, real
  `node-cron` schedules.
- **Vitest isolation gotcha (lessons 2026-06-12):** if any new file mocks the same module a
  sibling test mocks with a different factory, run per-file in CI to avoid 5s timeouts.

## 4. Architecture guardrails

- **No production code edits.** This is a pure test-coverage track. If a service is untestable,
  log a tech-debt entry; do NOT refactor source.
- **Service-tier only.** Do not test repositories (separate tracks own them) and do not test
  route handlers (integration concern, explicitly out-of-scope per spec §"Out of Scope").
- **Authoritative runner = `CI=true npm test` (Vitest).** `bun test` is spot-check only
  (lessons 2026-04-09).
- **Skip project-wide `tsc` inside per-task attempts** (lessons 2026-06-07: ~108s blows past
  supervisor wall-clock). Reserve full typecheck for S11 closeout.
- **`vitest.config.js` is a stale build artifact** (`*.test.tsx` exclude) while `vitest.config.ts`
  excludes all `app/src/**/*.test.{ts,tsx,js,jsx}`. Server tests are unaffected, but do not edit
  the `.js` and assume it ships.

## 5. Per-phase test approach

- **S1 Scheduler:** Mock `node-cron`. Test `schedule()` (cron validation, dedupe by name, task
  start), per-job timing capture (`lastRunAt`, `lastDurationMs`), error-swallowing wrapper, and
  `stop(name)` + `stopAll()`. Drop the spec's "single `start()` registers 5 jobs" assertion —
  re-frame as: each `scheduleX(...)` helper produces one named job with the right cron string.
- **S3 EpisodeService / S4 SeriesService:** **BLOCKED — symbols deleted.** Tech Lead
  recommendation: re-scope both phases to add coverage for the consolidated callsites in
  `MediaService` (e.g., `setEpisodeMonitored`, bulk-series helpers) where `MediaService.test.ts`
  has gaps, OR mark S3/S4 RESOLVED and update `tech-debt.md` accordingly. Implementer must NOT
  create stub `EpisodeService.ts` / `SeriesService.ts` — that would resurrect the orphan-alias
  smell that `tests/no-orphan-aliases.test.ts` (added in 92224c3) actively forbids.
- **S6 MediaSearchService base:** Distinct filename
  `MediaSearchService.base.test.ts` (spec already requires "distinct from existing corner-case
  files"). Cover only the constructor wiring + the cross-cutting invariants not asserted by
  any of the 10 sibling files: aggregation order, scoring delegation, `grabRelease` →
  `TorrentManager.addTorrent` argument shape, indexer-timeout `Promise.allSettled` behaviour.
  Before writing, grep the 10 sibling files to avoid duplicate cases.

## 6. Live-proof plan (Red → Green per phase)

Distinguish **artifact/contract proofs** (a file exists, a string matches) from **live behavior
proofs** (vitest actually executes the assertion). All Green gates below are live behavior.

| Phase | Red command (must fail before code) | Green / closeout gate (live) |
|-------|-------------------------------------|------------------------------|
| S1 | `npx vitest run server/src/services/Scheduler.test.ts` (file absent → "No test files found", non-zero exit) | `npx vitest run server/src/services/Scheduler.test.ts` GREEN with ≥5 cases asserting cron-mock call args |
| S3 | **BLOCKED — see §5.** Proposed Red: `npx vitest run server/src/services/MediaService.episodeMonitored.test.ts` (or chosen replacement file) absent | Targeted vitest GREEN against `MediaService` |
| S4 | **BLOCKED — see §5.** Proposed Red: `npx vitest run server/src/services/MediaService.seriesBulk.test.ts` absent | Targeted vitest GREEN against `MediaService` |
| S6 | `npx vitest run server/src/services/MediaSearchService.base.test.ts` (file absent) | Same command GREEN; plus `npx vitest run server/src/services/MediaSearchService.*.test.ts` still GREEN (no regression in the 10 siblings) |
| S11 closeout | n/a | `CI=true npm test` GREEN end-to-end **and** `npm run typecheck` exits 0 |

**Fake-harness rule:** none of the gates above use a fake runner. Each Red command is the exact
`vitest run <single-file>` invocation. The S11 closeout `CI=true npm test` is the bounded
non-fake aggregate that proves no intentionally-red sibling sneaks in. There are currently
**no `*.skip` / `*.todo` red-baseline files** in `server/src/services/*.test.ts` (grep
verified) — so no quarantine list is needed. If implementer adds any during S1/S6, they must
either land in the same commit as their Green or be guarded by a still-`[~]` task in
`plan.md` and explicitly excluded from `CI=true npm test` via a `describe.skip` (not a config
exclude).

## 7. Handoff to Implementer

1. **Do not start S3 or S4 until plan is reconciled with the deleted-files reality.** Raise this
   to the supervisor; recommend re-pointing at `MediaService` or marking RESOLVED.
2. S1 and S6 are unblocked and may proceed in parallel.
3. After each phase, run the targeted Red command (must fail), implement, run the targeted
   Green command, commit per the per-phase commit message in `plan.md`. No project-wide tsc
   until S11.
