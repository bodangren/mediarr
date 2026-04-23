# Plan: Indexer Catalog Endpoint Caching

## Phase 1: Cache Implementation

- [ ] Task: Build in-memory catalog cache
    - [ ] Write tests for cache load, serve, and reload
    - [ ] Implement CatalogCache class with startup load
    - [ ] Add file watcher for automatic invalidation
    - [ ] Fix CATALOG_PATH to use __dirname-relative resolution

## Phase 2: Endpoint Integration

- [ ] Task: Wire cache to catalog endpoints
    - [ ] Write tests for cached endpoint responses
    - [ ] Replace disk reads with cache.get() calls
    - [ ] Add manual invalidation endpoint (POST /api/indexers/catalog/reload)

## Phase 3: Verification

- [ ] Task: Full suite validation
    - [ ] Run `npm run lint` — zero errors
    - [ ] Run `npm run test` — all tests pass
    - [ ] Run `npm run build` — clean build
