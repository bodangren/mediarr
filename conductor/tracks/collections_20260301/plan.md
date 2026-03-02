# Implementation Plan: Collections

## Phase 1: Database & Metadata Sync [checkpoint: pre-existing]
> Goal: Store collection data and fetch it automatically.

- [x] Task: Database Schema
    - [x] Sub-task: Add `Collection` model to Prisma schema (tmdbCollectionId, name, overview, posterPath, backdropPath, monitored, qualityProfileId, rootFolderPath, addMoviesAutomatically, searchOnAdd, minimumAvailability).
    - [x] Sub-task: Add `collectionId` FK on `Movie` with optional relation to `Collection`.
- [x] Task: CollectionRepository — typed CRUD + count helpers (findAll, findById, findByTmdbCollectionId, create, update, delete, getMovieCount, getInLibraryCount)
- [x] Task: CollectionService
    - [x] Sub-task: `fetchFromTMDB(tmdbCollectionId)` — fetch collection + parts from TMDB API.
    - [x] Sub-task: `createCollection(tmdbCollectionId, options)` — upsert Collection record and optionally add/link movies.
    - [x] Sub-task: `syncCollectionMovies(collectionId)` — pull latest TMDB parts; create or link new movies.
    - [x] Sub-task: `searchMissingMovies(collectionId)` — counts missing monitored movies (stub; wiring to search deferred).
- [x] Task: TMDB Auto-wiring on Movie Add (69ea8f1)
    - [x] Sub-task: When a movie is added via the search/add flow, inspect the TMDB movie response for `belongs_to_collection`.
    - [x] Sub-task: If present, call `CollectionService.linkMovieToCollection` (idempotent via conflict handling) to auto-create or link.
    - [x] Sub-task: Write unit tests covering: movie with collection data creates/links collection; movie without collection data is a no-op; duplicate TMDB collection ID is handled gracefully.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database & Metadata Sync' (Protocol in workflow.md)

## Phase 2: Collections API [checkpoint: pre-existing]
> Goal: Serve collection data to the frontend.

- [x] Task: Collection CRUD Endpoints
    - [x] Sub-task: `GET /api/collections` — list all, with movieCount and moviesInLibrary.
    - [x] Sub-task: `GET /api/collections/:id` — detail with nested movies and their download status.
    - [x] Sub-task: `POST /api/collections` — create from TMDB ID.
    - [x] Sub-task: `PUT /api/collections/:id` — update settings.
    - [x] Sub-task: `DELETE /api/collections/:id` — delete collection, unlinks movies.
    - [x] Sub-task: `POST /api/collections/:id/search` — trigger search for missing items.
    - [x] Sub-task: `POST /api/collections/:id/sync` — sync movie list from TMDB.
- [x] Task: Movie Detail API — include collection data (8fa3174)
    - [x] Sub-task: Update `GET /api/movies/:id` Prisma query to `include: { collection: true }`.
    - [x] Sub-task: Map the collection relation to `{ id, name, posterUrl }` in the response shape.
    - [x] Sub-task: Write unit test asserting the movie detail response includes `collection: { id, name, posterUrl }` when a movie belongs to a collection, and `null` otherwise.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Collections API' (Protocol in workflow.md)

## Phase 3: Frontend Collections UI
> Goal: Let users browse and manage their collections.

- [x] Task: Collection UI Components (pre-existing — see issues below)
    - [x] Sub-task: `CollectionCard.tsx` — poster, progress bar, monitor toggle, hover actions (search/edit/delete).
    - [x] Sub-task: `CollectionGrid.tsx` — responsive 1→2→3→4-col grid; empty state.
    - [x] Sub-task: `EditCollectionModal.tsx` — edit form with name, overview, minimumAvailability, qualityProfile, rootFolder, searchOnAdd, monitored.
- [ ] Task: Fix type definitions and component gaps
    - [ ] Sub-task: Consolidate `types/collection.ts` — expand `MovieCollection` to include `tmdbCollectionId`, `backdropUrl`, `qualityProfileId`, `qualityProfile`, `minimumAvailability`, `rootFolderPath`, `addMoviesAutomatically`, `searchOnAdd`; remove duplicate type from `collectionApi.ts` and re-export from `types/collection.ts`.
    - [ ] Sub-task: Add `onNavigate?: (id: number) => void` prop to `CollectionCard`; wrap the poster image and title in a clickable element that calls `onNavigate(collection.id)`.
    - [ ] Sub-task: Thread `onNavigate` through `CollectionGrid` to each `CollectionCard`.
    - [ ] Sub-task: Update `EditCollectionModal` to accept `qualityProfiles: { id: number; name: string }[]` as a prop and render them dynamically instead of hardcoded options.
    - [ ] Sub-task: Update `EditCollectionModal` to properly pre-fill `minimumAvailability`, `qualityProfileId`, and `rootFolder` from the `collection` prop (requires fields now present on the type).
    - [ ] Sub-task: Update existing tests for `CollectionCard`, `CollectionGrid`, and `EditCollectionModal` to reflect new props/behaviour.
- [ ] Task: Collections Library Page (`/library/collections`)
    - [ ] Sub-task: Create `CollectionsPage` component — fetch list via `collectionApi.list()` with React Query (`queryKeys.collections()`).
    - [ ] Sub-task: Render `CollectionGrid` with live data; handle `onToggleMonitored` (call `collectionApi.update` + invalidate), `onSearch` (call `collectionApi.search`), `onEdit` (open `EditCollectionModal`), `onDelete` (call `collectionApi.delete` + invalidate), `onNavigate` (call `navigate('/library/collections/:id')`).
    - [ ] Sub-task: Fetch quality profiles via `queryKeys.qualityProfiles()` and pass to `EditCollectionModal`.
    - [ ] Sub-task: Add "Add Collection" button that opens an inline modal accepting a TMDB Collection ID, calls `collectionApi.create`, and invalidates the list query.
    - [ ] Sub-task: Register route in `App.tsx` — replace the `StaticPage` placeholder with `<CollectionsPage />`.
    - [ ] Sub-task: Write component tests for the Collections Library page (list renders, empty state, add flow, edit flow).
- [ ] Task: Collection Detail Page (`/library/collections/:id`)
    - [ ] Sub-task: Create `CollectionDetailPage` component — read `:id` from URL params, fetch via `collectionApi.getById(id)` with React Query (`queryKeys.collectionDetail(id)`).
    - [ ] Sub-task: Render backdrop hero section: backdrop image, overlaid poster, title, overview, and `X of Y in library` stats badge.
    - [ ] Sub-task: Render movie list rows: poster thumbnail (or placeholder), title, year, status badge (In Library / Missing / Announced), and monitored indicator.
    - [ ] Sub-task: Wire "Search for Missing" button → `collectionApi.search(id)` → toast feedback.
    - [ ] Sub-task: Wire "Sync from TMDB" button → `collectionApi.sync(id)` → invalidate detail query → toast feedback.
    - [ ] Sub-task: Register `/library/collections/:id` route in `App.tsx`.
    - [ ] Sub-task: Write component tests for Collection Detail page (renders header, renders movie rows, search button calls API, sync button calls API).
- [ ] Task: Movie Detail → Collection Link
    - [ ] Sub-task: Update `GET /api/movies/:id` response to include `collection.id` (covered in Phase 2 task above).
    - [ ] Sub-task: Update `movieApi.ts` Zod schema to parse `collection.id` (already has the field — verify it survives to the component).
    - [ ] Sub-task: Update `MovieDetailHeader` to render the collection section as a `<Link to={/library/collections/${collection.id}}>` (using React Router `Link`) instead of a plain `<span>`.
    - [ ] Sub-task: Write unit test for `MovieDetailHeader` asserting the collection renders as a link with the correct href when `collection.id` is present.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Collections UI' (Protocol in workflow.md)
