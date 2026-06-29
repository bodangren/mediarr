# Spec: Fix MediaSearchService Pre-existing Timeout Test Failures

## Background

The MediaSearchService test suite has 7 pre-existing timeout failures that reproduce at HEAD since at least 2026-05-06:

- `server/src/services/MediaSearchService.enrichment.test.ts` — 3 failures
- `server/src/services/MediaSearchService.cornerCases.test.ts` — 2 failures
- `server/src/services/MediaSearchService.customFormat.test.ts` — 2 failures

Root cause: these tests call `vi.useFakeTimers()` to control time, but `MediaSearchService.searchWithTimeout` uses a real `setTimeout` with `INDEXER_TIMEOUT_MS = 30000`. Under Vitest's fake timers, the `setTimeout` callback never fires, so the tests hang until the 5000ms test timeout.

This is tracked in `measure/tech-debt.md` (2026-06-13, chore_untested_server_services_20260526).

## Acceptance Criteria

1. The three affected test files pass when run together in a single Vitest invocation.
2. The full root `npm test` suite no longer reports these 7 failures.
3. No production behavior change: `searchWithTimeout` still honors the configured `INDEXER_TIMEOUT_MS` at runtime.
4. All other MediaSearchService tests continue to pass.

## Proposed Approach

Option A (preferred): Refactor `searchWithTimeout` to accept an optional `timeoutMs` parameter and/or an abort signal, then update the tests to pass short deterministic timeouts instead of using fake timers.

Option B: Replace `vi.useFakeTimers()` with `vi.setSystemTime()` in tests that only need date control, leaving the timeout path to use real timers.

Option C: Inject a clock abstraction into `MediaSearchService` so tests can provide a fake timer that also drives the internal `setTimeout`.

The chosen approach must keep the public API surface backward-compatible.

## Out of Scope

- Refactoring other services' timer usage.
- Adding new production features.
- Fixing unrelated pre-existing test failures.

## Definition of Done

- [ ] Red reproduction test written and failing.
- [ ] Implementation changed to make tests pass.
- [ ] All MediaSearchService tests green in isolation and together.
- [ ] Root CI green gate passes (or at least these failures are gone).
- [ ] tech-debt.md updated to mark this item Resolved.
- [ ] lessons-learned.md updated with the fake-timer pattern.
