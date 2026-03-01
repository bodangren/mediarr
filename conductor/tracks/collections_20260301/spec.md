# Specification: Collections

## Overview
This track introduces the ability to group related movies and TV series into curated collections. The primary driver will be TMDB Collections (e.g., "The Matrix Collection", "Marvel Cinematic Universe"), allowing the system to automatically group related media and suggest missing entries to complete a collection.

## Scope
*   **Backend:**
    *   Database schema updates to support a `Collection` model and many-to-many links to `Movie` and `Series`.
    *   Metadata fetcher updates to pull collection information from TMDB when a movie is added.
    *   API endpoints to list collections, get collection details (including missing/wanted items), and manually create/edit custom collections.
*   **Frontend:**
    *   A dedicated `/library/collections` page showing a grid of collection posters.
    *   A Collection Detail page showing the items in the collection, their download status, and a button to "Search for missing items".
    *   Links from a Movie Detail page to its parent Collection.

## Out of Scope
*   Dynamic/Smart collections based on filters (e.g., "All Action Movies 2020-2025"). This track focuses on static, explicitly curated lists.
