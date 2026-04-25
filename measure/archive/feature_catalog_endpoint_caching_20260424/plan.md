# Plan: Indexer Catalog Endpoint Caching

## Phase 1: Cache Implementation

- [x] Task: Build in-memory catalog cache
    - [x] Write tests for cache load, serve, and reload
    - [x] Implement CatalogCache class with startup load
    - [x] Add file watcher for automatic invalidation
    - [x] Fix CATALOG_PATH to use __dirname-relative resolution

## Phase 2: Endpoint Integration

- [x] Task: Wire cache to catalog endpoints
    - [x] Write tests for cached endpoint responses
    - [x] Replace disk reads with cache.get() calls
    - [x] Add manual invalidation endpoint (POST /api/indexers/catalog/reload)

## Phase 3: Verification

- [x] Task: Full suite validation
    - [x] Run `npm run test` — all tests pass (232 files / 1758 tests)
    - [x] Run app build — clean build
