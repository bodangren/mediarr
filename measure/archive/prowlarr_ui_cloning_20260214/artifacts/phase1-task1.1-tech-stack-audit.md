# Phase 1 Task 1.1 - Tech Stack Audit

Date: 2026-02-14
Track: `prowlarr_ui_cloning_20260214`

## Next.js + App Router

- Frontend workspace uses Next.js with App Router in `app/src/app/`.
- Confirmed route groups and layouts are present, including shell routing in `app/src/app/(shell)/layout.tsx`.
- Current Next.js version is `16.1.6` (`app/package.json`), while the plan text references Next.js 15.

Conclusion: App Router requirement is satisfied; version reference in plan is outdated and should be treated as "Next.js 15+".

## TypeScript Configuration

- Root and frontend TypeScript are enabled with strict checks.
- `app/tsconfig.json` has `strict: true`, `isolatedModules: true`, and typed path aliases (`@/*`).
- Vitest test suites run TypeScript tests in both root and app workspaces.

Conclusion: TypeScript baseline is healthy for Prowlarr UI cloning.

## Tailwind CSS Setup

- Tailwind v4 is configured via `@tailwindcss/postcss` in `app/postcss.config.mjs`.
- Global stylesheet imports Tailwind (`app/src/app/globals.css`).
- Existing shell and page components already use utility classes.

Conclusion: Tailwind setup is present and functional.

## Infrastructure Gaps

1. Plan assumes Redux + persistence middleware, but app currently uses `@tanstack/react-query` and provider composition (`app/src/components/providers/AppProviders.tsx`).
2. Prowlarr parity requires high-density data tables, modal stacks, and bulk actions; shared primitives exist but are incomplete versus spec breadth.
3. Navigation map does not yet expose full Prowlarr route surface (indexer stats/history/system/settings subsections are partial).
4. No dedicated parity matrix exists yet for "already implemented in other cloned app" reuse decisions.

## Recommended Direction

1. Keep Next.js App Router + React Query architecture (do not back-migrate to Redux unless a blocker appears).
2. Build a Prowlarr parity matrix artifact in Phase 1/2 and explicitly map reusable primitives from current monolith surfaces.
3. Implement missing route/page shells first, then progressively wire data and actions to existing API SDK modules.
