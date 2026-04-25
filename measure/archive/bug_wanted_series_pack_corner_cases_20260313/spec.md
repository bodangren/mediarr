# Spec: WantedSearchService autoSearchSeries Corner Cases

## Problem Statement

`WantedSearchService.autoSearchSeries()` has a confirmed bug: when a complete series
pack is grabbed for an ended series, the function returns early via `if (grabbed) return`.
This early return happens inside an `else` block, which means the specials-search block
at the bottom of the function is **never reached**. Missing specials (season 0 episodes)
are permanently skipped for any ended series that successfully grabbed a series pack.

Additionally, `autoSearchSeries()` has zero test coverage. Adjacent corner cases
(season-pack fallback, isSeasonComplete edge cases, individual episode fallback) also
need tests to prevent future regressions.

## Confirmed Bug

```
autoSearchSeries("Breaking Bad")
  → series.status === 'Ended'
  → tryGrabSeriesPack returns true
  → if (grabbed) return;  ← BUG: exits before specials search
  → season 0 / specials never searched
```

## Acceptance Criteria

- [ ] Failing test: ended series, pack grabbed → specials (season 0) still searched.
- [ ] `autoSearchSeries` with ended status and no series pack → falls through to per-season + specials.
- [ ] `autoSearchSeries` for a continuing series (not Ended) → no pack search, individual episodes.
- [ ] Season pack grabbed for complete season → individual episodes in that season are skipped.
- [ ] Season pack not found → individual episode searches run for all unreleased-filtered episodes.
- [ ] `isSeasonComplete` with empty episode list → returns false (no crash).
- [ ] `isSeasonComplete` with all-past air dates → returns true.
- [ ] `isSeasonComplete` with null air dates → returns false.

## Subsystem Scope

- `server/src/services/WantedSearchService.ts` — `autoSearchSeries()` logic
