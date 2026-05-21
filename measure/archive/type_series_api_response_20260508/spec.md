# Typed getSeriesWithEpisodes API Response

## Overview

Eliminate `as any` casts in `SeriesDetailPage` and related components by introducing a strict, validated TypeScript contract for the `GET /api/series/:id` (getSeriesWithEpisodes) endpoint. This is the last significant source of type-unsafety in the SPA detail views and directly impacts developer velocity and runtime correctness.

## Problem Statement

The `SeriesDetailPage` component and its children currently rely on `as any` to coerce the API response into the shape they expect. This masks drift between the backend query (Drizzle relational) and frontend consumption, blocks strict TypeScript checks, and has already caused subtle UI bugs (missing episode fields, incorrect season grouping). The recent Drizzle migration cleaned up modal-level casts; the series detail surface is the remaining high-risk area.

## Solution

### Backend Contract
- Define a `SeriesWithEpisodesResponse` schema using Zod that mirrors exactly what the frontend needs
- Refactor the series route handler to validate the Drizzle relational output against this schema before returning it
- Ensure nested relations (seasons → episodes → files → quality) are typed through the full depth

### Frontend Contract
- Replace the ad-hoc `any`-typed state in `SeriesDetailPage` with the generated `SeriesWithEpisodesResponse` type
- Remove all `as any` casts in:
  - `SeriesDetailPage.tsx`
  - `SeasonAccordion.tsx` (or equivalent season list component)
  - `EpisodeRow.tsx` (or equivalent episode row component)
  - Any utility functions that transform episode data for display
- Add a lightweight API client helper (`getSeriesWithEpisodes`) that returns the typed response

### Type Safety Guarantees
- If the backend query changes shape, the Zod parse should fail at runtime and TypeScript should fail at build time
- No `as any`, `as unknown`, or `@ts-expect-error` workarounds remain in the series detail surface

## Acceptance Criteria

- [ ] Zod schema `SeriesWithEpisodesResponse` defined in shared types (or server + generated types)
- [ ] Backend route validates Drizzle output against schema before returning JSON
- [ ] `SeriesDetailPage` consumes the typed response with zero `as any` casts
- [ ] All child components (`SeasonAccordion`, `EpisodeRow`, etc.) use strict types derived from the schema
- [ ] A type-only regression test asserts the frontend component props match the API response shape
- [ ] `npm run typecheck --workspace=app` passes with no errors
- [ ] `CI=true npm test` full suite green

## Out of Scope

- Refactoring other detail pages (MovieDetailPage is already typed)
- Changing the Drizzle schema itself (this is a type-contract track, not a DB migration)
- New UI features (the page looks the same; it just type-checks correctly)
