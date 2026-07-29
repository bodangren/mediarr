# Plan: Browser-Verified Web Application

## Phase 1: Disposable Acceptance Harness

- [x] Create a daemon launcher with isolated database/config/media roots and deterministic seed
  fixtures for movie, series, episode, playable variant, subtitle, activity, queue, collection,
  scheduler, and settings state.
- [x] Add a browser-runner foundation that starts the real daemon/static server, captures browser
  page/console/network failures, screenshots/traces on failure, and cleans every disposable root.
- [x] Commit: `test(browser): boot seeded disposable Mediarr acceptance environment`

Phase 1 evidence: `npm run test:browser` built 2,989 modules and passed the disposable real-daemon
Chromium acceptance test in 48.5 seconds on 2026-07-29. The direct rerun passed in 44.3 seconds;
the focused strict type check and `git diff --check` also passed. The harness intentionally uses
the daemon's working `tsx server/src/main.ts` start path. `bun --no-addons server/src/main.ts` is
an independently exposed release blocker because it disables better-sqlite3 before the daemon can bind.

## Phase 2: Production Route Matrix

- [~] Visit every `App.tsx` route at desktop and mobile widths; assert a meaningful route landmark,
  deep-link reload, no overflow, and no client/internal-request failure.
- [ ] Add route-specific fixtures for all empty/non-empty states needed by the matrix.
- [~] Restore the notifications API and UI CRUD/test path required for the settings route to satisfy
  the clean-network and durable-workflow gates; this is a prerequisite exposed by the matrix, not
  an optional enhancement.
- [ ] Commit: `test(browser): cover production SPA route matrix`

## Phase 3: Durable Core Workflows

- [ ] Cover setup, movies/TV/collections, wanted/calendar, activity queue/history, and all settings
  CRUD/toggle flows with visible confirmation, API/DB evidence, and hard-reload persistence.
- [ ] Cover subtitles, scheduler controls, backup/system operations, and safe destructive flows in
  the disposable environment.
- [ ] Commit: `test(browser): prove durable core web workflows`

## Phase 4: Acquisition, Recovery, and Performance

- [ ] Use deterministic local fakes to prove search → add → grab → queue/SSE → import → library
  lifecycle and failure/recovery paths.
- [ ] Add measured browser performance, accessibility, mobile, keyboard/focus, and reconnect gates.
- [ ] Commit: `test(browser): enforce browser workflow resilience and performance`

## Phase 5: Release Acceptance

- [ ] Run the complete browser suite, full regression, and an independent live-browser walkthrough.
- [ ] Record exact coverage boundaries and archive only if browser evidence covers every in-scope
  production route and workflow.
