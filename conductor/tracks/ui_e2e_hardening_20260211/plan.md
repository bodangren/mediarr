# Implementation Plan: Track 7F - E2E Journeys & Quality Hardening

## Phase 1: Playwright Infrastructure and Desktop E2E Journeys
Set up Playwright for deterministic E2E testing and automate critical desktop journeys.

- [ ] Task: Configure Playwright test infrastructure.
  - [ ] Sub-task: Install Playwright and configure base project with browser setup, base URL, and test directory structure.
  - [ ] Sub-task: Configure test fixtures for database seeding (clean state per test), API server startup, and Next.js dev server startup.
  - [ ] Sub-task: Implement Playwright helpers for SSE event waiting (explicit event-based waits, not arbitrary timeouts) and API response interception.
- [ ] Task: Write Tests: Add desktop E2E journey for movie lifecycle.
  - [ ] Sub-task: Add journey: navigate to /add -> search movie -> select -> configure profile/monitoring -> add -> verify redirect to movie detail.
  - [ ] Sub-task: Continue journey: from movie detail -> search releases -> select candidate -> grab -> verify redirect to /queue -> verify torrent appears with downloading status.
- [ ] Task: Write Tests: Add desktop E2E journey for series lifecycle.
  - [ ] Sub-task: Add journey: add series -> verify wanted episodes appear at /wanted -> search release for episode -> grab -> verify queue entry.
  - [ ] Sub-task: Continue journey: verify queue progress updates via SSE -> verify import updates series detail.
- [ ] Task: Write Tests: Add desktop E2E journey for indexer management.
  - [ ] Sub-task: Add journey: navigate to /indexers -> create new indexer -> test connectivity -> verify health status -> edit settings -> delete indexer -> verify removal.
- [ ] Task: Write Tests: Add desktop E2E journey for subtitle workflow.
  - [ ] Sub-task: Add journey: navigate to /subtitles -> browse media -> select variant -> search subtitles -> download candidate -> verify history entry.
- [ ] Task: Write Tests: Add desktop E2E journey for dashboard drill-down.
  - [ ] Sub-task: Add journey: load / (dashboard) -> verify metric card values match expected state -> click wanted card -> verify /wanted loads with correct filter -> navigate back -> verify dashboard state preserved.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Playwright Infrastructure and Desktop E2E Journeys' (Protocol in workflow.md)

## Phase 2: Mobile E2E Journeys and Accessibility Audit
Automate mobile journeys and run comprehensive accessibility audit.

- [ ] Task: Write Tests: Add mobile viewport (375px) E2E journey for movie add and search.
  - [ ] Sub-task: Add journey: at 375px viewport, navigate to /add -> search movie -> add with configuration -> verify mobile-friendly form and navigation.
- [ ] Task: Write Tests: Add mobile viewport E2E journey for queue monitoring.
  - [ ] Sub-task: Add journey: at 375px, navigate to /queue -> verify card/scroll layout -> verify pause/resume controls are accessible with adequate touch targets.
- [ ] Task: Write Tests: Add mobile viewport E2E journey for subtitle search.
  - [ ] Sub-task: Add journey: at 375px, navigate to /subtitles -> select variant -> search -> download -> verify usability.
- [ ] Task: Run axe-core accessibility audit on all pages.
  - [ ] Sub-task: Create Playwright test that navigates to each page (dashboard, library series list, library series detail, library movies list, library movie detail, wanted, queue, subtitles, activity, indexers, settings, add media) and runs axe-core scan.
  - [ ] Sub-task: Assert zero critical and serious violations per page. Document any moderate violations with resolution notes.
- [ ] Task: Verify keyboard navigation across all primary actions.
  - [ ] Sub-task: Add tests for: sidebar navigation via Tab/Enter, table sorting via keyboard, dialog open/close with Escape, form submission with Enter, queue controls via keyboard.
  - [ ] Sub-task: Add tests for focus trap in dialogs and focus restoration on close.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Mobile E2E Journeys and Accessibility Audit' (Protocol in workflow.md)

## Phase 3: Performance Validation and Final UX Consistency Pass
Validate performance budgets and ensure UX consistency across all surfaces.

- [ ] Task: Measure and assert performance budgets.
  - [ ] Sub-task: Configure test run to build app for production (`next build`) and start production server (`next start`) before measurement.
  - [ ] Sub-task: Add Playwright test measuring initial page load time on simulated Fast 3G network (assert < 3s for dashboard, library, wanted).
  - [ ] Sub-task: Add manual or automated check for list scroll performance with 100+ items (series list, movie list, activity timeline).
  - [ ] Sub-task: Add Playwright test measuring SSE-to-render latency on queue page with mock 50+ torrents (assert < 200ms from event to DOM update).
  - [ ] Sub-task: Document any identified performance bottlenecks with recommended optimizations.
- [ ] Task: Execute final UX consistency pass.
  - [ ] Sub-task: Verify all pages use standardized loading (skeleton), empty (illustration + message), and error (message + retry) components — no ad-hoc patterns.
  - [ ] Sub-task: Verify all optimistic mutations follow the established pattern (cache update, rollback, toast).
  - [ ] Sub-task: Verify all data tables use the shared data table component with consistent pagination, sorting, and filtering.
  - [ ] Sub-task: Verify mobile 375px viewport for every page: content is readable, touch targets >= 44x44px, no horizontal overflow.
- [ ] Task: Execute full quality gate suite and resolve regressions.
  - [ ] Sub-task: Run `CI=true npm test`, `npm run test:coverage`, app lint/type checks, and `npx playwright test`.
  - [ ] Sub-task: Resolve all regressions and rerun full gates to green.
  - [ ] Sub-task: Record quality gate results (coverage numbers, test counts, audit results) in the checkpoint note.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Performance Validation and Final UX Consistency Pass' (Protocol in workflow.md)
