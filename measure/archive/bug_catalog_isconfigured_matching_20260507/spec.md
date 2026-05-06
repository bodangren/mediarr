# Specification: Fix Catalog `isConfigured` Matching

## Overview

The indexer catalog endpoint (`GET /api/indexers/catalog`) returns a list of known indexers with an `isConfigured` flag indicating whether each one is already set up in the system. Currently this flag is computed by comparing the catalog entry's `name` (case-insensitive) against existing indexer names in the database.

This breaks when users rename indexers after adding them — the catalog then shows the indexer as "not configured" even though it is, allowing duplicate additions.

## Functional Requirements

1. **Cardigann Indexers**: Match catalog entries to configured indexers by:
   - `implementation === 'Cardigann'`
   - `settings.definitionId === catalogEntry.id`

2. **Torznab/Newznab Indexers**: Match by:
   - `implementation === 'Torznab'` or `implementation === 'Newznab'`
   - `settings.baseUrl` or `settings.url` or `settings.host` matching `catalogEntry.baseUrl`

3. **Fallback**: Keep name-based matching as a fallback for backwards compatibility and custom indexers not in the catalog.

4. **No Breaking Changes**: The API response shape remains identical. Only the accuracy of `isConfigured` improves.

## Acceptance Criteria

- [ ] A Cardigann indexer renamed from "1337x" to "My 1337x" still shows `isConfigured: true` in the catalog.
- [ ] A Torznab indexer renamed from "NZBGeek" to "My NZBGeek" still shows `isConfigured: true`.
- [ ] A newly added indexer that matches by name continues to work as before.
- [ ] Existing tests pass; new regression tests cover renamed-indexer scenarios.

## Out of Scope

- Changing the catalog JSON format
- Changing the indexer database schema
- UI changes (the UI already consumes `isConfigured` correctly)
