# Plan: Catalog Indexer API Key Validation Guard

## Phase 1: Server — Validation Logic
- [ ] Write tests for `validateCatalogEntry` helper (requiresApiKey + empty key → error, key provided → pass, no key required → pass)
- [ ] Implement `validateCatalogEntry` in `indexerService.ts`
- [ ] Verify all new tests pass

## Phase 2: Server — Route Integration
- [ ] Write route-level test for `POST /api/indexers/catalog/add` with missing required key → 400
- [ ] Wire validation guard into catalog add handler in `indexerRoutes.ts`
- [ ] Return structured `ValidationError` with `requiresApiKey: true` flag
- [ ] Verify all new tests pass

## Phase 3: Frontend — API Key Prompt Modal
- [ ] Write widget tests for `CatalogApiKeyPromptModal` (renders input, validates non-empty, calls onSave, calls onCancel)
- [ ] Implement `CatalogApiKeyPromptModal` component using react-hook-form + zod
- [ ] Wire modal into catalog add flow: intercept `requiresApiKey` entries, show modal, retry add with key
- [ ] Verify all new tests pass

## Phase 4: Integration & Polish
- [ ] Write integration test: catalog add with required key → modal shown → key entered → indexer created
- [ ] Verify full test suite passes (`CI=true npm test`)
- [ ] Verify build is clean
