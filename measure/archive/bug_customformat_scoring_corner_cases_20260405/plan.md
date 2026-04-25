# Plan: CustomFormatScoringEngine Comprehensive Corner-Case Testing

## Phase 1: Condition Evaluators — Regex, Size, Language
- [x] Test regex condition with valid pattern matching title
- [x] Test regex condition with invalid pattern returns false (not crash)
- [x] Test notRegex operator with invalid pattern returns true
- [x] Test regex condition with field='releaseGroup' and field='source'
- [x] Test size condition with greaterThan, lessThan, equals operators
- [x] Test size condition with non-finite value returns false
- [x] Test language condition with contains, notContains, equals operators
- [x] Test language condition case-insensitivity

## Phase 2: Condition Evaluators — IndexerFlag, ReleaseGroup, Source, Resolution, QualityModifier
- [x] Test indexerFlag condition matches flag in array
- [x] Test indexerFlag condition with no flags returns false
- [x] Test releaseGroup condition with contains, equals, regex operators
- [x] Test source condition with contains, notContains, equals operators
- [x] Test resolution condition with equals, greaterThan, lessThan
- [x] Test resolution condition with non-finite value returns false
- [x] Test qualityModifier condition with contains check
- [x] Test negation (negate: true) on each condition type

## Phase 3: evaluate() and scoreRelease() — Format Evaluation
- [x] Test evaluate() with empty conditions returns false
- [x] Test evaluate() with all conditions matching returns true
- [x] Test evaluate() with one condition failing returns false (AND logic)
- [x] Test evaluate() with negated conditions in AND logic
- [x] Test scoreRelease() with multiple formats, some matching
- [x] Test scoreRelease() with no formats matching returns zero score
- [x] Test scoreReleaseForQualityProfile() equivalent behavior

## Phase 4: scoreCandidateUnified() — Multi-Dimensional Scoring
- [x] Test unified scoring with all components (custom format + confidence + indexer + seeders)
- [x] Test confidence scoring with exact title match = 100
- [x] Test confidence scoring with Levenshtein distance for partial match
- [x] Test confidence scoring with season/episode bonus (caps at 100)
- [x] Test confidence scoring with AI-parsed relevanceScore
- [x] Test indexer scoring (priority * 5)
- [x] Test seed scoring (log10(seeds) * 10, zero seeders = 0)
- [x] Test total score breakdown matches sum of components
