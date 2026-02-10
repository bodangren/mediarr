# Specification: Track 2 - Unified Indexer Engine (Prowlarr Layer)

## Overview
Implement the "Mediarr" Indexer Engine, focusing on torrent indexer management, searching, and synchronization. This module will reverse-engineer Prowlarr's logic to support a wide range of torrent sites using a hybrid approach of standard protocols (Torznab/RSS) and definition-driven scraping.

## Functional Requirements
- **Indexer Management:**
    - CRUD operations for Torrent Indexers.
    - Support for "Custom" indexers based on Torznab or Generic RSS protocols.
    - **Definition Loader:** Implement a parser for Prowlarr-style definition files (YAML) to dynamically support a vast library of torrent indexers.
- **Testing Capability:**
    - Provide a "Test" endpoint for each indexer to verify connectivity, API keys, and basic search functionality.
- **Search Abstraction Layer:**
    - Unified internal API to query multiple indexers simultaneously.
    - Translation of generic search queries into site-specific HTTP requests.
    - Support for both API-based (Torznab) and scraping-based (CSS/XPath selectors from definitions) extraction.
- **RSS Synchronization:**
    - Background service using `node-cron` to periodically fetch the latest releases from enabled indexers.
    - Storage of latest releases in the local SQLite database for quick "Available" checks.
- **Category Mapping:**
    - Unified internal category system (e.g., Movies, TV, Music).
    - Mapping logic to translate site-specific category IDs to Mediarr standards.

## Non-Functional Requirements
- **Exclusivity:** Focus solely on Torrent protocols; Usenet/Newznab is out of scope for this track.
- **Performance:** Search requests should be parallelized with appropriate timeouts and error handling for slow/unresponsive indexers.
- **Maintainability:** Use a clear abstraction for the `Indexer` interface to allow for future expansion.

## Acceptance Criteria
- [ ] Users can add a Torznab-compatible indexer and successfully "Test" it.
- [ ] The engine can load and initialize an indexer using a Prowlarr `.yml` definition file.
- [ ] A search query for a known torrent returns standardized results from multiple enabled indexers.
- [ ] RSS sync runs on a schedule and populates the database with new releases.
- [ ] Categories are correctly mapped from the indexer's native format to the internal system.

## Out of Scope
- Usenet/NZB indexer support.
- Advanced "FlareSolverr" or proxy/VPN integration (to be handled in a later "Connectivity/Security" track).
- UI Dashboard for search results (this track focuses on the Backend/Engine logic).
