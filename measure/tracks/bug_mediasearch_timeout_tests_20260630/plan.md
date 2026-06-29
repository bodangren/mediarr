# Plan: Fix MediaSearchService Pre-existing Timeout Test Failures

## Phase 1: Diagnose and Reproduce (TDD — Red)

- [ ] Read `server/src/services/MediaSearchService.ts` and locate `searchWithTimeout`.
- [ ] Read the three failing test files and identify every `vi.useFakeTimers()` call.
- [ ] Write a minimal Red reproduction test that demonstrates the timeout failure when fake timers are active.
- [ ] Run the reproduction test and capture failure output.
- [ ] Commit: `test(mediasearch): add Red reproduction for fake-timer timeout failure`

## Phase 2: Design the Fix

- [ ] Choose between Option A (injectable timeout), Option B (system-time only), or Option C (clock abstraction) based on actual test needs.
- [ ] Update the spec.md with the chosen approach.
- [ ] Write failing tests for the new contract (e.g., `searchWithTimeout` accepts `timeoutMs`).
- [ ] Commit: `test(mediasearch): add Red tests for injectable timeout contract`

## Phase 3: Implement the Fix

- [ ] Refactor `MediaSearchService.searchWithTimeout` to support the chosen contract without changing runtime behavior.
- [ ] Update `MediaSearchService.enrichment.test.ts` to use the new pattern.
- [ ] Update `MediaSearchService.cornerCases.test.ts` to use the new pattern.
- [ ] Update `MediaSearchService.customFormat.test.ts` to use the new pattern.
- [ ] Run the three files together and verify green.
- [ ] Commit: `fix(mediasearch): make timeout tests deterministic with injectable timeout`

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
