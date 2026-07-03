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

Option A (chosen): Expose an optional `timeoutMs` parameter on `searchAllIndexers` (defaulting to the existing `INDEXER_TIMEOUT_MS` constant) and pass it through to the existing `searchWithTimeout` method. Tests that need deterministic timeout behavior can inject a short timeout and run with real timers, eliminating the need for `vi.useFakeTimers()` to control the timeout path.

For the enrichment tests that still need to pin `Date.now()` for age-hour assertions, switch from `vi.useFakeTimers()` to `vi.useFakeTimers({ toFake: ['Date'] })`. This keeps `Date` mocked while leaving `setTimeout`/`setInterval` real, so `searchWithTimeout` can resolve normally.

The public API remains backward-compatible: `searchAllIndexers(params)` behaves exactly as before; `searchAllIndexers(params, timeoutMs)` is an additive optional parameter.

Options B and C were considered but rejected:
- Option B (`vi.setSystemTime()` only) still requires fake timers for date control and does not make the timeout deterministic.
- Option C (clock abstraction) adds unnecessary complexity for a single timeout boundary when an injectable timeout value already solves the problem.

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
