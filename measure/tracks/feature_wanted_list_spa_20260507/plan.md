# Wanted List Dashboard (SPA) Plan

## Phase 1: Backend API Contract & Tests

- [ ] Audit existing `/api/wanted*` or `/api/missing*` endpoints for current surface
- [ ] Design `GET /api/wanted/movies` — paginated, filterable (status, profileId, monitored)
- [ ] Design `GET /api/wanted/episodes` — paginated, filterable (seriesId, season, status, monitored)
- [ ] Design `POST /api/wanted/search` — bulk auto-search by item IDs
- [ ] Write unit tests for wanted routes with mock database responses (server workspace)
- [ ] Run tests — expect RED (endpoints don't exist yet)

## Phase 2: Backend Implementation

- [ ] Implement `GET /api/wanted/movies` with Drizzle queries for missing + monitored movies
- [ ] Implement `GET /api/wanted/episodes` with Drizzle queries joining episodes → series
- [ ] Implement `POST /api/wanted/search` wiring to `WantedSearchService`
- [ ] Add query param validation (zod schema)
- [ ] Wire new routes into Fastify server
- [ ] Run server tests — expect GREEN

## Phase 3: Frontend Components (TDD)

- [ ] Write component tests for `WantedMoviesTable` — renders rows, sorting, pagination
- [ ] Write component tests for `WantedEpisodesTable` — grouping, expand/collapse
- [ ] Write component tests for `WantedFilterBar` — filter changes update query params
- [ ] Write component tests for `WantedSearchButton` — dispatches bulk search, shows loading
- [ ] Implement `WantedMoviesTable` with VirtualTable for performance
- [ ] Implement `WantedEpisodesTable` with season grouping
- [ ] Implement `WantedFilterBar` using existing shadcn Select + Input components
- [ ] Implement `WantedSearchButton` with optimistic state
- [ ] Run component tests — expect GREEN

## Phase 4: Page Integration & Routing

- [ ] Create `WantedPage.tsx` with Movies / Episodes tabs
- [ ] Add `/wanted` route to React Router
- [ ] Add sidebar navigation link with badge count (total missing)
- [ ] Wire TanStack Query hooks to new API endpoints
- [ ] Integrate existing interactive search modal for per-item manual search
- [ ] Write integration test: route mount → API call → render → filter → re-fetch
- [ ] Run integration tests — expect GREEN

## Phase 5: Polish & Verification

- [ ] Manual smoke test: load page, filter, sort, search single item, bulk search
- [ ] Verify responsive layout on mobile viewport
- [ ] Run `CI=true npm test` — full suite green
- [ ] Run `npm run build --workspace=app` — clean
- [ ] Commit and push
