# Custom Format Editor & Live Tester Plan

## Phase 1: Backend API Contract & Tests

- [ ] Audit existing custom format database schema in `server/src/db/schema.ts`
- [ ] Design `GET /api/settings/custom-formats` — list all formats with nested conditions
- [ ] Design `GET /api/settings/custom-formats/:id` — single format with conditions
- [ ] Design `POST /api/settings/custom-formats` — create format + conditions transactionally
- [ ] Design `PUT /api/settings/custom-formats/:id` — update format + conditions
- [ ] Design `DELETE /api/settings/custom-formats/:id` — delete format + cascade conditions
- [ ] Design `POST /api/settings/custom-formats/test` — live tester endpoint (title + format conditions → match result)
- [ ] Write unit tests for all endpoints with mock Drizzle client (server workspace)
- [ ] Run tests — expect RED

## Phase 2: Backend Implementation

- [ ] Implement list endpoint with Drizzle relational queries
- [ ] Implement create/update endpoints with transaction wrapping (format + conditions)
- [ ] Implement delete endpoint with cascade
- [ ] Implement test endpoint using existing `CustomFormatScoringEngine` logic
- [ ] Add zod request body validation for all mutating endpoints
- [ ] Wire routes into Fastify under existing settings prefix
- [ ] Run server tests — expect GREEN

## Phase 3: Frontend Components (TDD)

- [ ] Write tests for `CustomFormatList` — renders rows, delete confirmation, search filter
- [ ] Write tests for `CustomFormatEditor` — form validation, add/remove conditions, score input
- [ ] Write tests for `ConditionRow` — condition type selector, value input, negation toggle
- [ ] Write tests for `FormatLiveTester` — input, submit, match result display
- [ ] Write tests for `ConditionBuilder` — AND/OR group nesting, add/remove groups
- [ ] Implement `CustomFormatList` using shadcn Table + existing DataTable patterns
- [ ] Implement `CustomFormatEditor` with react-hook-form + zodResolver
- [ ] Implement `ConditionRow` with dynamic fields based on condition type
- [ ] Implement `FormatLiveTester` with inline result cards
- [ ] Implement `ConditionBuilder` supporting nested groups
- [ ] Run component tests — expect GREEN

## Phase 4: Page Integration & Routing

- [ ] Create `CustomFormatsSettingsPage.tsx` with list + editor drawer
- [ ] Add route under `/settings/custom-formats` in React Router
- [ ] Add settings sidebar navigation link
- [ ] Wire TanStack Query hooks for CRUD operations + invalidation
- [ ] Integrate live tester as inline panel on the editor
- [ ] Write integration test: create format → save → list updates → test against sample title
- [ ] Run integration tests — expect GREEN

## Phase 5: Polish & Verification

- [ ] Manual smoke test: create complex format with nested conditions, test against real release titles
- [ ] Verify score preview matches `CustomFormatScoringEngine` output
- [ ] Ensure responsive layout on mobile viewport
- [ ] Run `CI=true npm test` — full suite green
- [ ] Run `npm run build --workspace=app` — clean
- [ ] Commit and push
