# Spec: Vite Frontend Parity Recovery

## Overview

Mediarr completed migration from Next.js to a Vite-powered React SPA served by the backend daemon, but the frontend is not currently shippable. The app workspace build (`npm run build --workspace=app`) fails with broad pre-existing migration/type issues (missing matcher typings, router typing mismatches, Vite type version drift), and parity gaps remain between expected *arr user flows and current Mediarr behavior.

This track restores a workable frontend baseline by first stabilizing build/type integrity, then closing high-impact parity gaps required for daily use in the monolith.

## Functional Requirements

### FR-1: Build and Typecheck Stability
- `npm run build --workspace=app` must complete successfully on a clean checkout.
- Existing migration-induced type failures must be resolved without disabling strict type checks globally.
- Missing matcher typings and unresolved module/type declarations must be explicitly corrected.

### FR-2: Router Typing and Navigation Contract Alignment
- Remove/replace legacy route assumptions that no longer apply after Next.js removal.
- React Router route definitions, params, and navigation calls must be type-safe and consistent.
- Broken route typing patterns that block build should be replaced with shared typed helpers where needed.

### FR-3: Vite Tooling Type Coherence
- Resolve Vite ecosystem type mismatches (core `vite`, plugin typings, and related compiler expectations).
- Ensure app tsconfig and workspace package versions are coherent for build and test tooling.
- Prevent regression by adding a deterministic type/build gate for the app workspace.

### FR-4: Parity Gap Inventory and Prioritization
- Produce a concrete parity matrix for current frontend gaps against Sonarr/Radarr/Bazarr/Prowlarr-equivalent flows in the unified monolith.
- Categorize gaps as `Critical for workable app`, `Important`, or `Deferred`.
- The plan must implement all `Critical` items in this track.

### FR-5: Critical UX/API Parity Closure
- Close critical gaps in route screens and data wiring needed for core operations:
  - Library browsing and details
  - Search and grab flows
  - Unified settings accessibility
- Remove or replace user-facing stubs/blockers in critical paths with functioning implementations.

### FR-6: Backend-Served SPA Production Path Validation
- Validate production path where backend serves built Vite assets.
- Ensure client-side routes resolve correctly when deep-linked through backend static hosting.
- Ensure frontend-to-backend API communication remains functional in both dev proxy and production serve modes.

## Non-Functional Requirements

- New/changed frontend modules in this track target >=80% coverage where practical.
- No new `any`-based escape hatches in touched app code unless justified inline and tracked.
- Lint, typecheck, and build commands must run non-interactively in CI-compatible mode.

## Acceptance Criteria

1. `npm run build --workspace=app` passes without manual patching.
2. Known build blockers (matcher typings, router typing mismatches, Vite type version mismatch) are resolved.
3. A documented parity matrix exists and clearly marks critical vs deferred items.
4. All critical parity gaps listed for this track are implemented and validated.
5. Backend-served SPA path works for direct navigation to representative app routes.
6. Automated checks for app lint/type/build are green.

## Out of Scope

- Net-new product features not required to restore a workable frontend baseline.
- Backend domain rewrites unrelated to frontend build/parity blockers.
- Authentication/authorization system introduction.
