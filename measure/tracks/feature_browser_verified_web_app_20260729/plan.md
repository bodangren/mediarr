# Plan: Browser-Verified Web Application

## Phase 1: Real-Browser Acceptance Boundary

- [x] Create a daemon launcher with isolated database/config/media roots and deterministic seed
  fixtures for movie, series, episode, playable variant, subtitle, activity, queue, collection,
  scheduler, and settings state.
- [~] Replace Browser Harness as an acceptance authority with Kimi WebBridge sessions against the
  connected real browser; record live URLs, rendered state, network failures, and screenshots.
- [ ] Retire or reclassify Browser Harness assertions so they cannot be cited as browser or
  performance acceptance evidence.

Historical note: prior Playwright/Browser Harness runs are explicitly not browser or performance
acceptance evidence. They must be replaced by Kimi WebBridge verification in the connected browser.
The daemon's working `tsx server/src/main.ts` start path remains relevant to the isolated interface;
`bun --no-addons server/src/main.ts` cannot load better-sqlite3 before binding, while the root
command falls back to `tsx` and the container already uses `tsx`.

Kimi evidence on 2026-07-29 (isolated interface only, not a completion claim): after correcting the
disposable database's invalid `/data` settings to writable temporary paths, Kimi loaded the rebuilt
daemon at `http://127.0.0.1:5174`. It rendered Dashboard, Movies (the existing Matrix record),
Wanted (the Matrix missing-item row), and Collections (a clean empty state). On
`/settings/notifications`, Kimi opened the real provider modal, saved a local-only configuration,
and confirmed it remained visible after browser reload. ThaiDub remained active on 8096 throughout.

## Phase 2: Production Route Matrix

- [~] Visit every `App.tsx` route in Kimi WebBridge at desktop and mobile widths; assert a
  meaningful route landmark, deep-link reload, no overflow, and no client/internal-request failure.
- [ ] Add route-specific fixtures for all empty/non-empty states needed by the matrix.
- [x] Restore validated notification list/create/update/delete/test Fastify routes over the existing
  encrypted Notification repository and real production transport registry.
- [x] Wire the Notifications settings page to durable add/edit/enable/test/delete controls, including
  explicit provider/test failures and truthful Slack/Pushover support.
- [x] Prove the notification contract with server route tests, API/UI tests, and a seeded real-daemon
  browser visit that rejects console and internal-request failures.

Notification prerequisite evidence: 17 focused Fastify/transport tests and 6 focused app API/UI
tests pass. Strict app and server TypeScript, the production app build, and `git diff --check` pass.
No Browser Harness result may be used as evidence that the connected browser can use Notifications;
that requires a Kimi WebBridge walkthrough.

- [ ] Commit: `test(browser): cover production SPA route matrix`

## Phase 3: Durable Core Workflows

- [x] Prove the Notifications create → reload → in-app confirm delete → reload workflow through
  Kimi WebBridge against the isolated real daemon; this uses an accessible app modal rather than a
  native browser prompt.
- [ ] Cover setup, movies/TV/collections, wanted/calendar, activity queue/history, and all settings
  CRUD/toggle flows with visible confirmation, API/DB evidence, and hard-reload persistence.
- [ ] Cover subtitles, scheduler controls, backup/system operations, and safe destructive flows in
  the disposable environment.
- [ ] Commit: `test(browser): prove durable core web workflows`

## Phase 4: Acquisition, Recovery, and Performance

- [x] Serve SPA HTML with mandatory revalidation and content-hashed Vite assets with immutable
  caching; Kimi normal navigation must load the current bundle after an isolated daemon refresh.
- [ ] Use deterministic local fakes to prove search → add → grab → queue/SSE → import → library
  lifecycle and failure/recovery paths.
- [ ] Add measured browser performance, accessibility, mobile, keyboard/focus, and reconnect gates.
- [ ] Commit: `test(browser): enforce browser workflow resilience and performance`

## Phase 5: Release Acceptance

- [ ] Run the complete browser suite, full regression, and an independent live-browser walkthrough.
- [ ] Record exact coverage boundaries and archive only if browser evidence covers every in-scope
  production route and workflow.
