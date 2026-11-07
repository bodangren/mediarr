# Spec: Production SPA Runtime Recovery

## Problem

The built Mediarr SPA returned HTTP 200 for its document, JavaScript, and CSS, but rendered an
empty black page. A browser reproduction recorded `TypeError: Class extends value #<Object> is
not a constructor or null` before React mounted. The cause is `app/src/lib/api/schedulerApi.ts`
importing a runtime scheduler-status constant from `server/src/services/Scheduler.ts`; that service
imports Node-only `node-cron`, which Vite included in the browser bundle.

## Functional Requirements

### FR-1 — Browser-safe scheduler contract

The scheduler task-status type and its runtime values MUST live in a dependency-neutral contract
module. The server scheduler and browser API client MUST consume that module without the browser
importing `node-cron`, `Scheduler`, or another server-runtime module.

### FR-2 — Rendered production-page acceptance

The built SPA MUST load in a real browser without page errors and mount non-empty content into
`#root`. A transport-only 200 response is not acceptance.

### FR-3 — Existing scheduler API contract

The scheduler task schema MUST keep its closed status enum (`healthy`, `warning`, `error`,
`disabled`), and server scheduling behavior MUST remain unchanged.

## Non-Functional Requirements

- Keep the change bounded to the browser/server contract boundary and verification gate.
- The production browser smoke check must use the generated `app/dist` artifact and fail on a
  page error or an empty root.

## Acceptance Criteria

- [ ] A production build renders Mediarr content, not an empty black page, in a browser.
- [ ] Browser console/page-error capture contains no module-evaluation error.
- [ ] The browser bundle does not include `node-cron` or import `server/src/services/Scheduler`.
- [ ] Scheduler API unit/contract tests and the server typecheck pass.
- [ ] The new browser-render check is part of documented release verification.

## Out of Scope

- Changing scheduler behavior, cron expressions, or scheduler APIs.
- Populating the temporary Mediarr library used for TV acceptance.
- General visual redesign of the existing SPA.
