# Spec: Daily Cleanup — 2026-04-02

## Problem Statement

Per the autonomous protocol, the first track each calendar day must be a chore focused on cleanup of the previous day's work. Yesterday's work (`bug_mediasearch_corner_cases_20260401`) and the earlier `chore_cleanup_uncommitted_work_20260401` left uncommitted artifacts:

1. **Staged deletions of already-archived track folders** — `bug_mediasearch_corner_cases_20260401/` and `chore_cleanup_uncommitted_work_20260401/` were moved to `measure/archive/` but git still tracks the source deletions.
2. **`.env` file modified** — must not be committed (contains secrets).
3. **A stale artifact file** — `measure/archive/cardigann_runtime_parity_20260223/artifacts/final-phase5-compatibility-matrix.json` has uncommitted changes.

Additionally, the directive's subsystem #4 ("any other subsystem surfaced by test failures") should be evaluated — the test suite has 1 pre-existing failure in `tests/import-manager.test.js` that should be investigated for fix-or-exclude.

## Acceptance Criteria

- All uncommitted deletions are committed (excluding `.env`).
- The pre-existing `tests/import-manager.test.js` failure is either fixed or the test is excluded in vitest config.
- Full test suite passes (195+ server tests green; legacy test excluded or fixed).
- No `.env` changes committed.

## Subsystem Scope

- `measure/` — archive hygiene
- `vitest.config.ts` — test exclusion if needed
- `tests/import-manager.test.js` — legacy test investigation
