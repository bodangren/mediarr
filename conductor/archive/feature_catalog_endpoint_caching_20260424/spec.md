# Spec: Indexer Catalog Endpoint Caching

## Overview

The indexer catalog endpoints in `indexerRoutes.ts` read `popular-indexers.json` from disk on every request. While acceptable for MVP with a small catalog, this becomes a performance issue as the catalog grows. This track adds in-memory caching with file-watcher invalidation.

## Functional Requirements

1. Load `popular-indexers.json` into memory at server startup
2. Serve catalog data from memory on subsequent requests
3. Watch the catalog file for changes and reload automatically
4. Provide a manual cache invalidation endpoint for admin use
5. Fix `CATALOG_PATH` resolution to use `__dirname`-relative path instead of `process.cwd()` (tech debt item)

## Non-Functional Requirements

- Cache must be thread-safe for concurrent Fastify request handling
- File watcher must handle file replacement (rename + write) gracefully
- Memory usage must be bounded (single JSON file)

## Acceptance Criteria

- [ ] Catalog endpoints serve from in-memory cache after startup
- [ ] File changes trigger automatic cache reload
- [ ] `CATALOG_PATH` uses `__dirname`-relative resolution
- [ ] Manual cache invalidation endpoint exists
- [ ] Tests verify caching behavior and file watcher
- [ ] Existing catalog endpoint tests pass

## Out of Scope

- Redis or distributed caching
- Catalog file format changes
- Popular indexer data updates
