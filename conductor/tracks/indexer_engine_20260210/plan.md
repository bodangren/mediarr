# Implementation Plan: Track 2 - Unified Indexer Engine (Prowlarr Layer)

## Phase 1: Database Schema & Core Models
Establish the data structures required to store indexers, their configurations, and synchronized releases.

- [~] Task: Update Prisma schema to include `Indexer` and `IndexerRelease` models.
- [ ] Task: Implement `Indexer` CRUD repository with support for encrypted/sensitive settings storage.
- [ ] Task: Create `Category` mapping table and seed initial standard categories (Movies, TV).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database Schema & Core Models' (Protocol in workflow.md)

## Phase 2: Indexer Definitions & Abstraction
Build the core engine logic to load indexer definitions and provide a unified interface by reverse engineering Prowlarr's YAML parsing logic.

- [ ] Task: Implement `DefinitionLoader` to parse Prowlarr-style YAML definition files (analyzing `reference/prowlarr` for field mappings).
- [ ] Task: Create a base `Indexer` class and specialized subclasses (`TorznabIndexer`, `ScrapingIndexer`).
- [ ] Task: Implement the `IndexerFactory` to instantiate indexers from database records or definition files.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Indexer Definitions & Abstraction' (Protocol in workflow.md)

## Phase 3: Communication & Testing Logic
Implement the network layer for interacting with indexers and verifying their status.

- [ ] Task: Implement robust `HttpClient` with support for custom headers, user-agents, and timeout handling.
- [ ] Task: Implement the `Test` capability for Torznab and Definition-based indexers.
- [ ] Task: Implement the `Search` translation logic (Generic Query -> HTTP Request).
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Communication & Testing Logic' (Protocol in workflow.md)

## Phase 4: Parsing & Results Standardization
Develop the logic to extract and standardize data from various indexer response formats, matching Prowlarr's result extraction patterns.

- [ ] Task: Implement `TorznabParser` for standard XML/RSS responses.
- [ ] Task: Implement `ScrapingParser` using CSS/XPath selectors from YAML definitions (Cardigann-style).
- [ ] Task: Create a unified `IndexerResult` model and result merging/deduplication logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Parsing & Results Standardization' (Protocol in workflow.md)

## Phase 5: RSS Sync & Scheduling
Implement the background automation for keeping the local database up to date.

- [ ] Task: Set up `node-cron` scheduler within the server application.
- [ ] Task: Implement the `RssSyncService` to fetch and store new releases for enabled indexers.
- [ ] Task: Implement category filtering and mapping during the RSS sync process.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: RSS Sync & Scheduling' (Protocol in workflow.md)
