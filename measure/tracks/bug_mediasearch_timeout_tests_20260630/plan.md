# Plan: Fix MediaSearchService Pre-existing Timeout Test Failures

## Phase 1: Diagnose and Reproduce (TDD — Red)

- [x] Read `server/src/services/MediaSearchService.ts` and locate `searchWithTimeout`.
- [x] Read the three failing test files and identify every `vi.useFakeTimers()` call.
- [x] Write a minimal Red reproduction test that demonstrates the timeout failure when fake timers are active.
- [x] Run the reproduction test and capture failure output.
- [~] Commit: `test(mediasearch): add Red reproduction for fake-timer timeout failure`

> **Red evidence (2026-07-03):** Added `server/src/services/MediaSearchService.timeout.repro.test.ts` with one test that uses `vi.useFakeTimers()` and a hanging indexer mock. The test fails with a 500ms Vitest timeout because the real `setTimeout` inside `searchWithTimeout` is frozen by Vitest's fake timers.
>
> Targeted Red command: `./node_modules/.bin/vitest run server/src/services/MediaSearchService.timeout.repro.test.ts` → **exit 1, Test Files 1 failed (1), Tests 1 failed (1)**. Failure: `Error: Test timed out in 500ms.`
>
> Identified `vi.useFakeTimers()` usage:
> - `server/src/services/MediaSearchService.enrichment.test.ts:6` — uses fake timers to pin `Date.now()` for age-hour computation.
> - The other two affected files (`cornerCases.test.ts`, `customFormat.test.ts`) do not themselves call `vi.useFakeTimers()`, but they fail when run together with files that leave fake timers active (see `measure/tech-debt.md` 2026-06-13 note).

## Phase 2: Design the Fix

- [x] Choose between Option A (injectable timeout), Option B (system-time only), or Option C (clock abstraction) based on actual test needs.
- [x] Update the spec.md with the chosen approach.
- [x] Write failing tests for the new contract (e.g., `searchAllIndexers` accepts `timeoutMs`).
- [~] Commit: `test(mediasearch): add Red tests for injectable timeout contract`

> **Design decision (2026-07-03):** Option A — expose an optional `timeoutMs` parameter on `searchAllIndexers` (default `INDEXER_TIMEOUT_MS`) and pass it to the existing `searchWithTimeout`. Tests inject short timeouts and run with real timers. Enrichment tests keep date mocking via `vi.useFakeTimers({ toFake: ['Date'] })` so `setTimeout` remains real.
>
> **Red contract test added to `MediaSearchService.timeout.repro.test.ts`:** `accepts an optional timeoutMs and times out a hanging indexer quickly`. It calls `service.searchAllIndexers({ query: 'test', type: 'movie' }, 10)` and expects a timeout within 1s. At HEAD the parameter is ignored and the test times out after 1s.
>
> Targeted Red command: `./node_modules/.bin/vitest run server/src/services/MediaSearchService.timeout.repro.test.ts` → **exit 1, Test Files 1 failed (1), Tests 2 failed (2)**.

## Phase 3: Implement the Fix

- [x] Refactor `MediaSearchService.searchWithTimeout` to support the chosen contract without changing runtime behavior.
- [x] Update `MediaSearchService.enrichment.test.ts` to use the new pattern.
- [x] Update `MediaSearchService.cornerCases.test.ts` to use the new pattern.
- [x] Update `MediaSearchService.customFormat.test.ts` to use the new pattern.
- [x] Run the three files together and verify green.
- [~] Commit: `fix(mediasearch): make timeout tests deterministic with injectable timeout`

> **Implementation (2026-07-03):**
> - `MediaSearchService.ts`: Added optional `timeoutMs` parameter to `searchAllIndexers(params, timeoutMs = INDEXER_TIMEOUT_MS)` and threaded it through both primary and IMDB-fallback `searchWithTimeout` calls. Production calls without the second argument still use `INDEXER_TIMEOUT_MS = 30000`.
> - `MediaSearchService.enrichment.test.ts`: Changed `vi.useFakeTimers()` to `vi.useFakeTimers({ toFake: ['Date'] })` so `Date.now()`/`setSystemTime` are mocked but `setTimeout` remains real.
> - `MediaSearchService.cornerCases.test.ts`: Timeout resilience test now passes `timeoutMs: 10` and uses a truly hanging indexer mock, so the test exercises the real timeout path instead of a mock-thrown timeout error.
> - `MediaSearchService.customFormat.test.ts`: No source change needed (it never used fake timers), verified green.
>
> **Green evidence:**
> - Targeted command (3 affected files + contract test): `./node_modules/.bin/vitest run server/src/services/MediaSearchService.enrichment.test.ts server/src/services/MediaSearchService.cornerCases.test.ts server/src/services/MediaSearchService.customFormat.test.ts server/src/services/MediaSearchService.timeout.repro.test.ts` → **exit 0, Test Files 4 passed (4), Tests 19 passed (19)**.
> - Full MediaSearchService suite: `./node_modules/.bin/vitest run server/src/services/MediaSearchService` → **exit 0, Test Files 11 passed (11), Tests 87 passed (87)**.

## Phase 4: Regression & CI Verification

- [ ] Run all 10 MediaSearchService test files together.
- [ ] Run root `CI=true npm test` and confirm the 7 timeout failures are gone.
- [ ] Verify no new failures were introduced.
- [ ] Commit: `test(mediasearch): verify all MediaSearchService tests green`

## Phase 5: Documentation & Closeout

- [ ] Update `measure/tech-debt.md` to mark the MediaSearchService timeout item Resolved.
- [ ] Add a concise lesson to `measure/lessons-learned.md` about fake timers + real setTimeout.
- [ ] Update this plan.md with final evidence.
- [ ] Commit: `docs(measure): close out mediasearch timeout test track`
