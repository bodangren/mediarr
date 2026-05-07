# Wanted List Dashboard (SPA) Plan

## Phase 1: Backend API Contract & Tests

- [x] Audit existing `/api/wanted*` or `/api/missing*` endpoints for current surface
- [x] Design `GET /api/movies/missing` — paginated, filterable (monitored)
- [x] Design `GET /api/episodes/missing` — paginated, filterable (seriesId, season, monitored)
- [x] Design `POST /api/wanted/search-all` — already exists for bulk auto-search
- [x] Write unit tests for missing routes with mock database responses (server workspace)
- [x] Run tests — RED (endpoints don't exist yet)

## Phase 2: Backend Implementation

- [x] Implement `GET /api/movies/missing` with Prisma queries for missing movies
- [x] Implement `GET /api/episodes/missing` with Prisma queries joining episodes → series
- [x] Use existing `POST /api/wanted/search-all` for bulk auto-search
- [x] Add query param validation via Fastify schema
- [x] Wire new routes into Fastify server (movieRoutes.ts + seriesRoutes.ts)
- [x] Run server tests — GREEN

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
