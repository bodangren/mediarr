# Implementation Plan: Collections

## Phase 1: Database & Metadata Sync
> Goal: Store collection data and fetch it automatically.

- [ ] Task: Database Schema
    - [ ] Sub-task: Add `Collection` model to Prisma schema (TMDB ID, title, overview, poster/fanart paths).
    - [ ] Sub-task: Add relations from `Movie` and `Series` to `Collection`.
- [ ] Task: Metadata Provider Updates
    - [ ] Sub-task: Update `MetadataProvider` to fetch `belongs_to_collection` data when fetching movie details from TMDB.
    - [ ] Sub-task: Create or update the Collection record in the database when a movie is added.

## Phase 2: Collections API
> Goal: Serve collection data to the frontend.

- [ ] Task: Build API Endpoints
    - [ ] Sub-task: `GET /api/collections` (list all collections, sortable).
    - [ ] Sub-task: `GET /api/collections/:id` (get collection details, including nested movies with their download status).
    - [ ] Sub-task: `POST /api/collections/:id/search` (trigger a search for all missing items in the collection).

## Phase 3: Frontend Collections UI
> Goal: Let users browse and manage their collections.

- [ ] Task: Collections Library Page
    - [ ] Sub-task: Build `/library/collections` route.
    - [ ] Sub-task: Render a grid of collection posters.
- [ ] Task: Collection Detail Page
    - [ ] Sub-task: Build `/library/collections/:id` route.
    - [ ] Sub-task: Render header with collection poster/fanart and overview.
    - [ ] Sub-task: Render list of items in the collection, clearly indicating which ones are in the user's library and which are missing.
    - [ ] Sub-task: Wire "Search for Missing" button.
- [ ] Task: Movie Detail Integration
    - [ ] Sub-task: Add a "Part of the [X] Collection" link on the Movie Detail page if it belongs to one.
