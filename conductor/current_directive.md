# Current Strategic Directive

> **AUTONOMOUS AGENT — CRITICAL INSTRUCTION:**
> You MUST NOT drift from this directive. Do not plan or implement features, UI improvements,
> refactors, or any work that is not directly in service of the goal below. If you feel tempted
> to do something "nice to have" or unrelated, stop and re-read this directive.

---

## Directive: Comprehensive Corner-Case Testing for Core User Workflows

The project's top priority is **finding and fixing broken corner cases in the automated media
acquisition pipeline**. Real bugs have been confirmed:

- Automatic episode searches grab the **wrong episode** (wrong season/episode matching logic)
- Completed torrents **fail to import** correctly (ImportManager edge cases)
- Failed imports are **deleted when the seed ratio is met** instead of being retried or preserved
- Other edge cases in the end-to-end user workflow remain untested and unknown

### What This Means For Every Track

Every track planned under this directive must follow this priority order:

1. **Write a test that reproduces a known broken corner case** (Red phase — the test must fail first)
2. **Fix the underlying bug** (Green phase — make the test pass with minimal code changes)
3. **Expand coverage to adjacent corner cases** in the same subsystem
4. Repeat for the next subsystem

### Subsystems In Scope (in priority order)

1. `WantedSearchService` — episode matching, release-date guards, wrong-episode grabs
2. `ImportManager` — torrent completion → file organization; all 4 import paths; failed-import lifecycle
3. `SearchAggregationService` / `MediaSearchService` — indexer search, torrent grab, seed-ratio deletion
4. Any other subsystem surfaced by test failures during the above work

### Out of Scope Until Directive Changes

- New UI features or visual improvements
- New API endpoints not related to the above subsystems
- Infrastructure / deployment changes
- Android TV client work
- Performance optimization (unless a bug is caused by a race condition)
