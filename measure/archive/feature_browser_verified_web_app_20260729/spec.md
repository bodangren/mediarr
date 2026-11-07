# Spec: Browser-Verified Web Application

## Problem

Mediarr had 3,022 green tests but the shipped SPA crashed before React mounted. Existing app tests
use jsdom, MemoryRouter, mocked API clients, and component replacements; connectivity E2E is an
HTTP/Dart harness. None proves that the actual browser, static-serving path, daemon, database, or
filesystem work together.

## Functional Requirements

### FR-1 — Disposable browser acceptance environment

The test harness MUST boot the real Mediarr daemon against an isolated migrated SQLite database and
isolated filesystem. It MUST seed representative movies, series, episodes, media variants,
subtitles, activity, queue state, scheduler history, and collections without touching a developer's
or deployment's data.

### FR-2 — Route and shell acceptance

Every production route in `App.tsx` MUST be browser-visited at desktop and mobile widths through
the built `app/dist` and real static-serving path. Each visit MUST prove meaningful content,
deep-link reload, no browser page/console errors, no failed internal requests, and no horizontal
overflow.

### FR-3 — Durable user workflows

Browser acceptance MUST cover setup, browse/detail, library monitoring, settings CRUD, scheduler
controls, queue/history actions, collection operations, subtitles, backup/system operations, and
their persisted state after a hard reload. External providers may be deterministic local fakes, but
the browser, daemon, database, SSE, and filesystem MUST be real.

### FR-4 — Acquisition and recovery

The browser suite MUST cover metadata search through add/grab/queue/import/library update using
local deterministic provider fakes, plus error/recovery paths including provider failure, SSE
reconnect, invalid input, failed mutation, and daemon restart.

### FR-5 — Browser performance and usability

The suite MUST measure production-browser navigation and interaction timing with seeded data,
assert mobile layout/no horizontal overflow, keyboard/focus behavior, and automated accessibility
violations. Performance evidence must be recorded as measured values with explicit thresholds.

## Acceptance Criteria

- [ ] No production route is accepted solely from a jsdom or mocked-client test.
- [ ] Critical read/write flows are visibly successful and durable after browser reload.
- [ ] The production browser suite runs from one documented command against disposable data.
- [ ] Browser failure artifacts include console/network errors and screenshots/traces where relevant.
- [ ] Every claimed performance assertion is derived from a browser measurement, not a build result.

## Out of Scope

- Validating third-party metadata, indexer, torrent, or subtitle providers on the public internet.
- Physical-TV direct-play acceptance, which remains separately tracked.
- Mutating a user's configured Mediarr database or media library.
