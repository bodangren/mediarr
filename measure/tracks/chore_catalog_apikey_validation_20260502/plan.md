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
- [ ] Write widget tests for `CatalogApiKeyPromptModal` (renders input, validates non-empty, calls onSave, calls onCancel)
- [ ] Implement `CatalogApiKeyPromptModal` component using react-hook-form + zod
- [ ] Wire modal into catalog add flow: intercept `requiresApiKey` entries, show modal, retry add with key
- [ ] Verify all new tests pass

## Phase 4: Integration & Polish
- [ ] Write integration test: catalog add with required key → modal shown → key entered → indexer created
- [ ] Verify full test suite passes (`CI=true npm test`)
- [ ] Verify build is clean
