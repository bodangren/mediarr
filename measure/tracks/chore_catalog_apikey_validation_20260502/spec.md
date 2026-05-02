# Feature: Catalog Indexer API Key Validation Guard

## Context
Tech debt review item `review_20260413` identifies that one-click catalog add stores empty `apiKey` silently when `entry.requiresApiKey` is true. This allows indexers to be persisted in a broken state — the user adds an indexer from the catalog, thinks it's configured, but it fails at search time because no API key was provided.

## Problem
When a user clicks "Add" on a catalog entry that requires an API key, the system creates the indexer record with an empty string `apiKey`. No validation rejects this, and no UI prompt asks for the key. The indexer appears configured but is non-functional.

## Proposed Solution
Add a validation guard on the catalog add endpoint that:
1. Checks if `entry.requiresApiKey` is true
2. If true, rejects the request with a `ValidationError` before `repository.create`
3. Returns a structured error response indicating API key is required
4. Update the frontend catalog add flow to show an API key input modal when `requiresApiKey` is true

## Affected Files
- `server/src/routes/indexerRoutes.ts` (add validation in catalog add handler)
- `server/src/services/indexerService.ts` (add `validateCatalogEntry` helper)
- `app/src/components/catalog/` (add API key prompt modal for catalog entries)
- Tests for validation logic and UI modal

## Testing Strategy
- Unit tests for `validateCatalogEntry` — rejects when key required but empty, passes when key provided, passes when key not required
- Route-level test verifying 400 response for missing required key
- Widget test for API key prompt modal
