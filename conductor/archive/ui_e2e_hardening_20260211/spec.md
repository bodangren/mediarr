# Specification: Track 7F - E2E Journeys & Quality Hardening

## Overview
This track closes the UI delivery loop with full end-to-end journey automation, accessibility audits, performance validation, and a final UX consistency pass across all implemented surfaces.

## Functional Requirements

### FR-1: Playwright E2E Desktop Journeys
Automate critical user journeys at desktop viewport (1280px+):
- **Movie lifecycle:** Add movie -> search releases -> grab release -> verify queue entry -> verify import updates library.
- **Series lifecycle:** Add series -> verify wanted episodes -> search release for episode -> grab -> verify queue progress -> verify import.
- **Indexer management:** Configure new indexer -> test connectivity -> verify health status -> edit settings -> delete.
- **Subtitle workflow:** Navigate to subtitle console -> select variant -> search subtitles -> download -> verify history entry.
- **Dashboard to drill-down:** Load dashboard -> verify metric values -> click wanted card -> verify wanted page loads with filter -> click back.

### FR-2: Playwright E2E Mobile Journeys
Automate critical user journeys at 375px mobile viewport:
- **Movie add and search:** Add movie flow at mobile viewport, verify navigation and form usability.
- **Queue monitoring:** Queue page at mobile, verify card/scroll layout, verify controls are accessible via touch targets.
- **Subtitle search/download:** Subtitle variant selection and search at mobile viewport.

### FR-3: Accessibility Audit
- Run axe-core automated audit on every implemented page (dashboard, library list/detail, wanted, queue, subtitles, activity, indexers, settings, add media).
- Target: zero critical or serious violations. Moderate violations documented with resolution plan.
- Verify keyboard navigation for all primary actions: navigation, table sorting, dialog open/close, form submission, queue controls.
- Verify focus management: opening a dialog traps focus, closing returns focus to trigger element.

### FR-4: Performance Validation
- Measure and assert performance budgets (MUST be measured against a **production build**, not dev server):
  - **Initial page load:** < 3s on simulated Fast 3G (using Playwright network throttling).
  - **List scroll performance:** 100-item series/movie list maintains 60fps scroll (verify via browser performance API or visual inspection).
  - **SSE update latency:** < 200ms from event emission to render update on queue page with 50+ torrents.
- Identify and document any performance bottlenecks for future optimization.

### FR-5: UX Consistency Pass
- Verify all pages use the standardized loading (skeleton), empty (illustration + message), and error (message + retry) patterns from 7C.
- Verify all optimistic mutations follow the same pattern: immediate cache update, rollback on error, toast on failure.
- Verify all data tables use the shared data table component with consistent pagination, sorting, and filtering.
- Verify mobile responsive behavior at 375px for every page.
- Verify touch targets meet minimum 44x44px on mobile for all interactive elements.

## Non-Functional Requirements
- **CI Integration:** All Playwright tests must be runnable in CI with `npx playwright test`. Mobile and desktop suites can be parallelized.
- **Stability:** E2E tests must be deterministic. No flaky tests — use explicit waits for SSE events and API responses, never arbitrary timeouts.
- **Auditability:** Accessibility audit results and performance measurements are recorded in the quality gate checkpoint.

## Acceptance Criteria
- [ ] Desktop Playwright journeys pass for movie lifecycle, series lifecycle, indexer management, subtitle workflow, and dashboard drill-down.
- [ ] Mobile Playwright journeys pass for movie add, queue monitoring, and subtitle search at 375px viewport.
- [ ] axe-core audit reports zero critical/serious accessibility violations across all pages.
- [ ] Keyboard navigation works for all primary actions without mouse dependency.
- [ ] Performance budgets met: < 3s initial load (Fast 3G), 60fps list scroll, < 200ms SSE-to-render latency.
- [ ] All pages verified for consistent loading/empty/error states, optimistic mutations, and data table patterns.
- [ ] Mobile 375px verified for every page with adequate touch targets.
- [ ] Full quality-gate suite passes: `CI=true npm test`, `npm run test:coverage`, lint/type checks, and Playwright suite.

## Out of Scope
- DLNA/local playback server behavior (Track 8).
- External notification channels.
