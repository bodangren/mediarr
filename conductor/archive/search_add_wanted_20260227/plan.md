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
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Add to Wanted Persistence
> Goal: Enable saving media items to the database and preventing duplicates.

- [x] Task: Update Database Schema and Repository
    - [x] Write failing tests for adding a media item to the "Wanted" list.
    - [x] Implement repository logic to save search results to the database.
    - [x] Add duplicate check logic (ensure item isn't already in library/wanted).
- [x] Task: Create "Add" API Endpoint
    - [x] Write failing integration tests for `POST /api/wanted`.
    - [x] Implement Fastify route to handle adding items.
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Frontend Search Interface
> Goal: Provide a user-friendly UI for searching and adding media.

- [x] Task: Create Search Page Layout and Route
    - [x] Write failing UI tests for the `/search` route.
    - [x] Implement search page with a search bar and results container.
- [x] Task: Implement Search Results Rendering
    - [x] Write failing UI tests for rendering search results from the API.
    - [x] Implement result cards with posters, titles, and media types.
- [x] Task: Connect "Add to Wanted" Action
    - [x] Write failing UI tests for the "Add" button click and API call.
    - [x] Implement frontend logic to call `POST /api/wanted`.
    - [x] Add success/error toast notifications.
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)