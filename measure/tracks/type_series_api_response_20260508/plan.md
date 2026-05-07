# Typed getSeriesWithEpisodes API Response Plan

## Phase 1: Audit & Schema Design (TDD)

- [ ] Inventory every `as any` cast in `SeriesDetailPage.tsx` and child components
- [ ] Inventory the current Drizzle relational query in the series route handler (fields, nested selects, aliases)
- [ ] Document the exact runtime shape the frontend expects (season grouping, episode ordering, file/quality nesting)
- [ ] Design `SeriesWithEpisodesResponse` Zod schema with nested `seasons → episodes → mediaFiles → qualityProfile` contracts
- [ ] Write server-side contract test: given a seeded series with seasons/episodes/files, assert handler output matches Zod schema
- [ ] Write type-level regression test: assert `ComponentProps<typeof SeriesDetailPage>['series']` extends `z.infer<typeof SeriesWithEpisodesResponse>`
- [ ] Run tests — expect RED (schema does not yet exist, casts still present)

## Phase 2: Backend Contract Enforcement

- [ ] Implement `SeriesWithEpisodesResponse` Zod schema in server types (or shared package)
- [ ] Refactor series route handler to run Drizzle relational query, then `schema.parse()` before returning
- [ ] Add explicit `select` shapes in Drizzle query to guarantee the required nested structure
- [ ] Handle edge cases in schema: empty seasons, episodes without files, missing quality profiles
- [ ] Run server contract tests — expect GREEN

## Phase 3: Frontend Type Adoption (TDD)

- [ ] Write unit test for `getSeriesWithEpisodes` API helper — asserts fetch returns typed response and rejects on malformed payload
- [ ] Write component tests for `SeriesDetailPage` with typed mock props (no `as any` in test setup)
- [ ] Replace ad-hoc state type with `z.infer<typeof SeriesWithEpisodesResponse>`
- [ ] Remove `as any` casts from `SeriesDetailPage.tsx`
- [ ] Remove `as any` casts from `SeasonAccordion.tsx` / season list component
- [ ] Remove `as any` casts from `EpisodeRow.tsx` / episode row component
- [ ] Remove `as any` casts from any display utilities (episode number formatting, air-date formatting, etc.)
- [ ] Run component and unit tests — expect GREEN

## Phase 4: Integration & Regression

- [ ] Run `npm run typecheck --workspace=app` — zero errors
- [ ] Run `CI=true npm test` — full suite green (including server + app + any integration tests)
- [ ] Manual smoke test: open a series detail page with multiple seasons, expand seasons, verify episodes and file info render correctly
- [ ] Manual smoke test: open a series with no episodes (newly added) — ensure no runtime crashes
- [ ] Commit and push
