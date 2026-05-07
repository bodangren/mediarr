# Release Scoring Breakdown Panel Plan

## Phase 1: Backend Scoring Context & Tests

- [x] Audit `CustomFormatScoringEngine` — breakdown already captured in `UnifiedScoringResult`
- [x] Define `ScoringBreakdown` interface extending existing breakdown with indexerPriority, seeders
- [x] Add `scoringBreakdown` to `SearchCandidate` interface
- [x] Modify `applyUnifiedScoring` to store full breakdown on each release
- [x] Run tests — GREEN (72 scoring engine tests pass, 0 regressions)

## Phase 2: Backend Implementation

- [x] `CustomFormatScoringEngine.scoreCandidateUnified()` already returns breakdown
- [x] `applyUnifiedScoring` now stores `scoringBreakdown` on each `SearchCandidate`
- [x] Extended `SearchCandidate` with optional `scoringBreakdown` field
- [x] Backward compatible: breakdown is optional, existing clients unaffected
- [x] Typecheck passes — GREEN

## Phase 3: Frontend Components (TDD)

- [x] Write tests for `ScoreBreakdownPanel` — renders sections, JSON toggle, copy (8 tests)
- [x] Implement `ScoreBreakdownPanel` with total score, format list, confidence, indexer, seeders sections
- [x] Implement JSON view toggle with copy-to-clipboard
- [x] Run component tests — GREEN (8 tests)

## Phase 4: Integration into Search Results

- [x] Modify `SeriesInteractiveSearchModal` to include expandable breakdown panel
- [x] Score breakdown data flows from API response → ReleaseCandidate → ReleaseResult
- [x] Add conditional rendering: only show breakdown when data is present
- [x] Write integration test: open search modal → results load → expand breakdown → verify scores (2 tests)
- [x] Run integration tests — GREEN

## Phase 5: Performance & Verification

- [x] Breakdown is computed during existing scoring pass — zero additional server cost
- [x] App builds cleanly
- [x] Run `CI=true npm test` — full suite green (1828 tests)
- [x] Run `npm run build --workspace=app` — clean
- [x] Commit and push
