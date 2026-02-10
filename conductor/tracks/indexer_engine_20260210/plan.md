# Implementation Plan: Track 2 - Unified Indexer Engine (Prowlarr Layer)

## Phase 1: Database Schema & Core Models [checkpoint: 30d1805]
Establish the data structures required to store indexers, their configurations, and synchronized releases.

- [x] Task: Update Prisma schema to include `Indexer` and `IndexerRelease` models. 9f6c682
- [x] Task: Implement `Indexer` CRUD repository with support for encrypted/sensitive settings storage. 0686832
- [x] Task: Create `Category` mapping table and seed initial standard categories (Movies, TV). 33077f5
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database Schema & Core Models' (Protocol in workflow.md) 30d1805

## Phase 2: Indexer Definitions & Abstraction [checkpoint: d45ae83]
Build the core engine logic to load indexer definitions and provide a unified interface by reverse engineering Prowlarr's YAML parsing logic.

- [x] Task: Implement `DefinitionLoader` to parse Prowlarr-style YAML definition files (analyzing `reference/prowlarr` for field mappings). 7eb650c
- [x] Task: Create a base `Indexer` class and specialized subclasses (`TorznabIndexer`, `ScrapingIndexer`). 3838cc5
- [x] Task: Implement the `IndexerFactory` to instantiate indexers from database records or definition files. fe35932
- [x] Task: Conductor - User Manual Verification 'Phase 2: Indexer Definitions & Abstraction' (Protocol in workflow.md) d45ae83

## Phase 3: Communication & Testing Logic [checkpoint: 2b1216a]
Implement the network layer for interacting with indexers and verifying their status.

- [x] Task: Implement robust `HttpClient` with support for custom headers, user-agents, and timeout handling. 0c92b76
- [x] Task: Implement the `Test` capability for Torznab and Definition-based indexers. 3eb2094
- [x] Task: Implement the `Search` translation logic (Generic Query -> HTTP Request). 20141e7
- [x] Task: Conductor - User Manual Verification 'Phase 3: Communication & Testing Logic' (Protocol in workflow.md) 2b1216a

## Phase 4: Parsing & Results Standardization [checkpoint: 5a874ea]
Develop the logic to extract and standardize data from various indexer response formats, matching Prowlarr's result extraction patterns.

- [x] Task: Implement `TorznabParser` for standard XML/RSS responses. 05644f4
- [x] Task: Implement `ScrapingParser` using CSS/XPath selectors from YAML definitions (Cardigann-style). 39d59fd
- [x] Task: Create a unified `IndexerResult` model and result merging/deduplication logic. bad3762
- [x] Task: Conductor - User Manual Verification 'Phase 4: Parsing & Results Standardization' (Protocol in workflow.md) 5a874ea

## Phase 5: RSS Sync & Scheduling
Implement the background automation for keeping the local database up to date.

- [x] Task: Set up `node-cron` scheduler within the server application. 9b8a814
- [x] Task: Implement the `RssSyncService` to fetch and store new releases for enabled indexers. b9bd009
- [ ] Task: Implement category filtering and mapping during the RSS sync process.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: RSS Sync & Scheduling' (Protocol in workflow.md)
