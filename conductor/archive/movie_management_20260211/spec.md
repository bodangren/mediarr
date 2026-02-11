# Specification: Track 5 - Movie Management Module (Radarr Layer)

## Overview
This track implements the Movie management logic for Mediarr, following the "Radarr" paradigm. To ensure efficiency and high code reuse, we will refactor the existing TV-centric infrastructure (from Track 4) into a unified **Shared Media Base**. This allows movies to leverage the same search, download, and organization pipelines already established for TV series.

## Functional Requirements
### 1. Unified Media Architecture
- **Schema Refactoring:** Update the Prisma schema to introduce a shared `Media` base (or specialized relations) that handles common fields like `tmdbId`, `title`, `year`, `monitored`, and `qualityProfile`.
- **Logic Reuse:** Refactor `MetadataProvider`, `Organizer`, and `SearchService` to work with a generic `BaseMedia` interface.

### 2. Movie Lifecycle & Metadata
- **Metadata Integration:** Fetch movie data from TMDB, focusing on "Released" status (Digital, Blu-ray, and Streaming availability).
- **Data Model:** Implement the `Movie` entity as a specialization of the shared media base.
- **Shared Quality Profiles:** Utilize the existing `QualityProfile` system for movie selection and ranking.

### 3. Library & File Organization
- **Standardized Pathing:** Implement the `Movie Title (Year)/` folder structure.
- **File Colocation:** Ensure metadata (`.nfo`), artwork (posters/banners), and subtitles are stored directly within the movie's folder.
- **Atomic Operations:** Reuse the `Organizer` service's hard-linking and cross-device move logic for movie files.

### 4. Search & Discovery
- **Automated Monitoring:** Integrate movies into the `RssSyncService` to identify releases matching "Released" criteria.
- **Manual Search:** Implement movie-specific search translation (TMDB ID -> Indexer Query).
- **Wanted Logic:** Include missing/unreleased movies in the centralized "Wanted" dashboard.

## Non-Functional Requirements
- **High Code Reuse:** Aim for >60% reuse of the services implemented in Track 4.
- **Regression Testing:** Ensure the refactor does not break existing TV management functionality.
- **Performance:** Maintain fast library scanning for large movie collections.

## Acceptance Criteria
- Users can search for and add movies to their collection.
- Movies are only triggered for download once their status is "Released" or "Streaming".
- Downloaded movies are correctly renamed and moved into a `Movie Title (Year)/` folder.
- Metadata and artwork are colocated with the movie file.
- The same Quality Profiles can be applied to both Movies and TV Shows successfully.

## Out of Scope
- Movie Collections/Boxsets management.
- Multi-edition tracking (e.g., Director's Cut vs. Theatrical) in the first iteration.
- Automatic trailer fetching.
