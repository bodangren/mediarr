# Specification: Search and Add to Wanted

## 1. Overview
The goal of this track is to implement the "Search and Add" workflow for both Movies and TV Shows. Users will be able to search for media by title, view detailed metadata (poster, overview, year, etc.) from TMDB and TVDB, and add these items to the system's "Wanted" list. This is the first step in the media acquisition lifecycle, preceding automated indexing and downloading.

## 2. Functional Requirements
- **Unified Search Interface:**
    - A dedicated `/search` route in the Vite frontend.
    - A search bar that accepts text input for Movie or TV Show titles.
    - Real-time or trigger-based (Enter/Button) fetching of results from the backend.
- **Metadata Integration:**
    - Backend integration with TMDB API for Movie search results.
    - Backend integration with TVDB API (likely via SkyHook proxy) for TV Show search results.
    - Unified data model for search results to be rendered in the frontend.
- **Search Results View:**
    - Display results in a grid or list format with posters, titles, years, and media type indicators.
    - A "Add to Wanted" button/action for each result.
- **Add to Wanted Workflow:**
    - Persistence of selected media items in the SQLite database.
    - Prevention of adding duplicates (checking if the item is already in the library or wanted list).
    - Basic success/failure feedback in the UI.

## 3. Non-Functional Requirements
- **Responsiveness:** The search results should load efficiently and the UI should remain responsive during API calls.
- **Error Handling:** Graceful handling of API rate limits or connectivity issues with metadata providers.
- **Type Safety:** Strict TypeScript typing for search result payloads and database models.

## 4. Acceptance Criteria
- [ ] User can navigate to `/search`.
- [ ] User can search for a movie and see relevant results from TMDB.
- [ ] User can search for a TV show and see relevant results from TVDB.
- [ ] Clicking "Add to Wanted" saves the item to the database.
- [ ] Added items appear in the "Wanted" section of the Library (if implemented) or can be verified in the database.
- [ ] Duplicate items cannot be added multiple times.

## 5. Out of Scope
- Automated RSS/Indexer searches upon adding to Wanted.
- Advanced filtering of search results (genre, rating, etc.) in this initial phase.
- Deep-dive metadata (episodes, cast, etc.) beyond basic series/movie level overview.