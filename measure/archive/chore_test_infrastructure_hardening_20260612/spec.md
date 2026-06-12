# Spec: Harden Test Infrastructure & Close Review Findings

## Overview

A review of commits from the past 24 hours found serious quality gaps in three tracks that shipped test infrastructure:

1. **MSW Mock Coverage** (`chore_msw_mock_coverage_20260526`) — 205+ handlers were added and MSW was wired into `app/src/test/setup.ts`, but the wiring breaks the default Vitest runner, handlers are static stubs, and no real integration tests consume them.
2. **Server Service Test Coverage** (`chore_untested_server_services_20260526`) — `Scheduler.computeNextRun()` is a naive stub, the `TvSearchService` orphan alias still exists, and the guard meant to catch orphan aliases is broken.
3. **Import List UI Tests** (`chore_import_list_ui_tests_20260526`) — uses `fireEvent` against project convention, suffers cross-file `vi.mock` timeouts, and has below-target branch coverage.

This track closes all of those findings.

## Problem Statement

The app test suite is currently unreliable:

- `cd app && npx vitest run` hangs with the default pool after the MSW setup hook was added.
- MSW handlers in `app/src/lib/msw/handlers.ts` are 1,625 lines of inline static stubs with duplicated literal/parameterized routes and no real consumers.
- `Scheduler.ts` reports `nextRunAt: null` for daily crons (the most common case) because `computeNextRun()` only handles two simple patterns.
- `TvSearchService.ts` is a 6-line orphan alias that should have been deleted.
- `tests/no-orphan-aliases.test.ts` scans the wrong directory and therefore never catches orphan aliases.
- Import List UI tests mix `fireEvent` and `userEvent`, time out when run together, and miss integration coverage for the add-exclusion flow.

## Acceptance Criteria

```gherkin
Given the MSW setup hook is present in app/src/test/setup.ts
When I run cd app && npx vitest run
Then the suite completes without hanging and without unhandled-request errors

Given a frontend component makes a real fetch to GET /api/movies
When MSW is active
Then the MSW handler intercepts the request and returns deterministic mock data

Given GET /api/system/events/export is called
When the handler responds
Then the response has Content-Disposition: attachment and a Blob body

Given a daily cron expression "0 3 * * *"
When Scheduler.listJobsMeta() is called
Then nextRunAt is a valid ISO timestamp

Given the project has an orphan-alias service file
When tests/no-orphan-aliases.test.ts runs
Then the file is flagged as an offender

Given ImportListSettings and AddExclusionModal tests run in the same batch
When npx vitest run src/components/importlists/ executes
Then all tests pass without 5s timeouts
```

## Out of Scope

- Adding new production features.
- Rewriting the Import List feature’s API contract or UI design.
- Full E2E browser tests.
- Fixing pre-existing test failures unrelated to the reviewed commits (e.g., TorrentManager BigInt, BulkImportService drizzle mock).

## Stories

### P1: MSW runner emergency fix
As a **developer**, I want the default Vitest runner to finish quickly so that local and CI test runs are usable.

### P2: Refactor MSW handlers from stubs to maintainable mocks
As a **developer**, I want domain-split handlers with shared fixtures and helpers so that the MSW layer is maintainable.

### P3: Add real MSW integration smoke tests and re-enable setup.ts
As a **developer**, I want at least one integration test per major domain so that the MSW setup hook is actually exercised.

### P4: Fix service-layer stubs and orphan-alias guard
As a **developer**, I want `Scheduler` to compute real next-run times and orphan aliases to be detected so that the service layer is honest.

### P5: Harden Import List UI tests
As a **developer**, I want Import List UI tests to follow project conventions, avoid cross-file mock collisions, and cover the add-exclusion flow.

### P6: Verification & handoff
As a **maintainer**, I want the full suite, typecheck, and lint to pass before archiving the track.
