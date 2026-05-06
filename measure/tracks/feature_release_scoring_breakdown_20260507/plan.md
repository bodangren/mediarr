# Release Scoring Breakdown Panel Plan

## Phase 1: Backend Scoring Context & Tests

- [ ] Audit `CustomFormatScoringEngine` to identify where breakdown data can be captured
- [ ] Define `ScoringBreakdown` TypeScript interface (customFormats, indexerPriority, titleConfidence, seeders, penalties, total)
- [ ] Modify scoring methods to return `{ score: number, breakdown: ScoringBreakdown }` instead of just `number`
- [ ] Update `SearchAggregationService` and `WantedSearchService` to pass breakdown through to API responses
- [ ] Write unit tests for breakdown computation (verify arithmetic adds up to total score)
- [ ] Run tests — expect RED (breakdown field not yet in response shapes)

## Phase 2: Backend Implementation

- [ ] Refactor `CustomFormatScoringEngine.scoreRelease()` to collect and return breakdown
- [ ] Update all callers to destructure `{ score, breakdown }`
- [ ] Extend release DTOs to include optional `scoringBreakdown` field
- [ ] Update Fastify route serializers to include breakdown in JSON responses
- [ ] Ensure backward compatibility: clients that don't read breakdown are unaffected
- [ ] Run server tests — expect GREEN

## Phase 3: Frontend Components (TDD)

- [ ] Write tests for `ScoreBreakdownPanel` — renders sections, expands/collapses
- [ ] Write tests for `ScoreBreakdownSection` — displays format name + score correctly
- [ ] Write tests for `ScoreBreakdownJson` — toggles JSON view, copy button
- [ ] Write tests for `ScoreBreakdownTotal` — total score matches sum of sections
- [ ] Implement `ScoreBreakdownPanel` with shadcn Collapsible + existing design tokens
- [ ] Implement `ScoreBreakdownSection` for each scoring dimension
- [ ] Implement `ScoreBreakdownJson` with syntax-highlighted JSON display
- [ ] Implement `ScoreBreakdownTotal` with visual emphasis
- [ ] Run component tests — expect GREEN

## Phase 4: Integration into Search Results

- [ ] Modify `SearchResultRow` / `ReleaseCard` components to include breakdown panel
- [ ] Fetch or receive breakdown data from existing search API response
- [ ] Add conditional rendering: only show breakdown when data is present
- [ ] Write integration test: open search modal → results load → expand breakdown → verify scores sum correctly
- [ ] Run integration tests — expect GREEN

## Phase 5: Performance & Verification

- [ ] Benchmark search result render time before/after with 100+ results
- [ ] Ensure breakdown computation adds <5ms per release on server
- [ ] Manual smoke test: run interactive search, expand breakdowns, verify totals
- [ ] Run `CI=true npm test` — full suite green
- [ ] Run `npm run build --workspace=app` — clean
- [ ] Commit and push
