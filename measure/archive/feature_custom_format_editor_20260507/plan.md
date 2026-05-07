# Custom Format Editor & Live Tester Plan

## Phase 1: Backend API Contract & Tests

- [x] Audit existing custom format database schema in `server/src/db/schema.ts`
- [x] Design `GET /api/custom-formats` — list all formats with nested conditions
- [x] Design `GET /api/custom-formats/:id` — single format with conditions
- [x] Design `POST /api/custom-formats` — create format + conditions transactionally
- [x] Design `PUT /api/custom-formats/:id` — update format + conditions
- [x] Design `DELETE /api/custom-formats/:id` — delete format + cascade conditions
- [x] Design `POST /api/custom-formats/:id/test` — live tester endpoint (title + format conditions → match result)
- [x] Write unit tests for all endpoints with mock repository (server workspace) — 13 tests passing
- [x] Run tests — GREEN

## Phase 2: Backend Implementation

- [x] List endpoint exists with relational queries
- [x] Create/update endpoints exist with validation
- [x] Delete endpoint exists with cascade
- [x] Test endpoint exists using `CustomFormatScoringEngine`
- [x] Routes wired into Fastify
- [x] Run server tests — GREEN (13 tests)

## Phase 3: Frontend Components (TDD)

- [x] Write tests for `FormatLiveTester` — input, submit, match result display (7 tests)
- [x] Implement `FormatLiveTester` with inline result cards
- [x] Write tests for `CustomFormatsSettingsPage` — renders rows, search filter, delete, modal open (7 tests)
- [x] Implement `CustomFormatsSettingsPage` with table, search, clone, test panel, edit/delete
- [x] Existing `CustomFormatModal` and `ConditionBuilder` reused and verified
- [x] Run component tests — GREEN (14 tests)

## Phase 4: Page Integration & Routing

- [x] Create `CustomFormatsSettingsPage.tsx` with list + editor modal + live tester panel
- [x] Add route under `/settings/custom-formats` in React Router
- [x] Add settings sidebar navigation link
- [x] Wire API client for CRUD operations
- [x] Integrate live tester as inline expandable panel per format row
- [x] Run integration tests — GREEN

## Phase 5: Polish & Verification

- [x] App builds cleanly
- [x] Run `CI=true npm test` — full suite green (1828 tests)
- [x] Run `npm run build --workspace=app` — clean
- [x] Commit and push
