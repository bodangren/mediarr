# Implementation Plan: Search and Add to Wanted

## Phase 1: Backend Metadata Integration
> Goal: Establish connectivity with metadata providers and expose a unified search API.

- [x] Task: Implement TMDB/TVDB search clients
    - [x] Write failing unit tests for TMDB movie search.
    - [x] Write failing unit tests for TVDB/SkyHook series search.
    - [x] Implement TMDB client and ensure tests pass.
    - [x] Implement TVDB client and ensure tests pass.
- [x] Task: Create Search API Endpoint
    - [x] Write failing integration tests for `GET /api/search?q=...`.
    - [x] Implement Fastify route that aggregates results from both clients.
    - [x] Verify search results return a unified data structure.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Add to Wanted Persistence
> Goal: Enable saving media items to the database and preventing duplicates.

- [~] Task: Update Database Schema and Repository
    - [ ] Write failing tests for adding a media item to the "Wanted" list.
    - [ ] Implement repository logic to save search results to the database.
    - [ ] Add duplicate check logic (ensure item isn't already in library/wanted).
- [ ] Task: Create "Add" API Endpoint
    - [ ] Write failing integration tests for `POST /api/wanted`.
    - [ ] Implement Fastify route to handle adding items.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Frontend Search Interface
> Goal: Provide a user-friendly UI for searching and adding media.

- [ ] Task: Create Search Page Layout and Route
    - [ ] Write failing UI tests for the `/search` route.
    - [ ] Implement search page with a search bar and results container.
- [ ] Task: Implement Search Results Rendering
    - [ ] Write failing UI tests for rendering search results from the API.
    - [ ] Implement result cards with posters, titles, and media types.
- [ ] Task: Connect "Add to Wanted" Action
    - [ ] Write failing UI tests for the "Add" button click and API call.
    - [ ] Implement frontend logic to call `POST /api/wanted`.
    - [ ] Add success/error toast notifications.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)