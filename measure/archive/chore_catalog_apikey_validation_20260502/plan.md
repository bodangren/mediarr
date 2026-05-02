# Plan: Catalog Indexer API Key Validation Guard

## Phase 1: Server — Validation Logic
- [x] Write tests for `validateCatalogEntry` helper (requiresApiKey + empty key → error, key provided → pass, no key required → pass)
- [x] Implement `validateCatalogEntry` in `indexerService.ts`
- [x] Verify all new tests pass

## Phase 2: Server — Route Integration
- [x] Write route-level test for `POST /api/indexers/catalog/add` with missing required key → 422
- [x] Wire validation guard into catalog add handler in `indexerRoutes.ts`
- [x] Return structured `ValidationError` with `requiresApiKey: true` flag
- [x] Verify all new tests pass

## Phase 3: Frontend — API Key Prompt Modal
- [x] Frontend already has inline API key inputs with client-side validation
- [x] Server-side 422 response handling already works via existing error toast
- [x] No modal needed — inline UX is superior for this flow

## Phase 4: Integration & Polish
- [x] Server validation tests pass (11 tests in indexerRoutes.catalog.test.ts)
- [x] Full test suite: 1742 tests passed, 11 skipped
- [x] Build clean: typecheck + app build succeed
- [x] Dev server smoke test: responds with HTML
