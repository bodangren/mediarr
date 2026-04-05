# Track: CustomFormatScoringEngine Comprehensive Corner-Case Testing

## Problem

The `CustomFormatScoringEngine` is the decision engine that determines which release gets grabbed from search results. It has **zero test coverage**. If it mis-scores releases, the system grabs wrong quality, wrong source, or even wrong media entirely.

## Scope

- `CustomFormatScoringEngine.ts` — all condition types, negation logic, unified scoring
- `scoreCandidateUnified()` — multi-dimensional scoring (custom formats + confidence + indexer + seeders)
- `evaluate()` — release evaluation against custom formats with AND logic
- All 8 condition type evaluators: regex, size, language, indexerFlag, releaseGroup, source, resolution, qualityModifier

## Known Risk Areas (from code review)

1. **Empty conditions array** returns `false` — correct behavior but untested
2. **Invalid regex** gracefully returns `false` — untested
3. **Negation with AND logic** — `conditions.every()` with `negate: true` on some conditions — untested
4. **Levenshtein scoring** edge cases (empty strings, very long titles) — untested
5. **Zero-seeder releases** — `Math.log10(0)` would be `-Infinity` but guarded by `seeders > 0` — untested
6. **Size comparisons** with non-finite values — untested
7. **`notRegex` operator** — returns `true` on invalid regex — untested
8. **`field` parameter on regex conditions** — defaults to 'title', supports 'releaseGroup' and 'source' — untested
9. **Season/episode bonus** in confidence scoring — adds 20 points but caps at 100 — untested

## Success Criteria

- 30+ tests covering all condition types, operators, negation, and scoring paths
- All tests pass
- Any bugs found are fixed with minimal code changes
- Lessons learned documented
