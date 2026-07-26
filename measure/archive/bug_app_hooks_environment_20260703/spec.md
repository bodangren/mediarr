# Spec: Fix App Hooks/Test-Environment Test Failures

## Problem
Environment-specific or hook-level tests fail:

- `useTouchGestures.test.ts` — right swipe gesture detection
- `useMediaQuery.test.ts` — multiple media query instances
- `ActivityQueuePage.test.tsx` — `setSpeedLimits` bulk action (may be unrelated to EventSource fix)
- `CalendarPage.test.tsx` — calendar item rendering and date/search button behavior

## Goal
Fix hook-level and environment-sensitive tests without regressing runtime behavior.

## Acceptance Criteria
- [ ] All listed files green
- [ ] `cd app && bun run test -- <affected-files>` passes
- [ ] Root `CI=true npm test` shows no new failures

## Scope
Hooks and environment-sensitive page tests.
