# Plan: WantedSearchService Comprehensive Corner-Case Testing

## Phase 1: Movie Title Validation Bug

- [x] Write failing test: `autoSearchMovie` grabs a release for a similarly-titled wrong movie (e.g., "The Matrix" grabs "The Matrix Reloaded" because indexer returned it with high score)
- [x] Write failing test: `autoSearchMovie` correctly grabs a release when the title matches
- [x] Implement fix: add title validation to `autoSearchMovie` using a variant-matching approach similar to `titlesMatch`
- [x] Run test suite, confirm all pass
- [ ] Commit: `git commit -m "bug(wantedsearch): add movie title validation to prevent wrong-movie grabs"`

**Checkpoint:** `CI=true bun run test --run 2>&1 | tail -40`

---

## Phase 2: Season Completeness Consistency Bug

- [x] Write failing test: `isSeasonComplete` returns true when last episode aired < 24h ago, but `isReleasedYet` would skip that episode
- [x] Write failing test: `autoSearchSeries` grabs a season pack before all episodes have aired (within grace period)
- [x] Implement fix: update `isSeasonComplete` to use the same 24-hour grace period as `isReleasedYet`
- [x] Run test suite, confirm all pass
- [x] Commit: `git commit -m "bug(wantedsearch): align isSeasonComplete grace period with isReleasedYet"`

**Checkpoint:** `CI=true bun run test --run 2>&1 | tail -40`

---

## Phase 3: Multi-Episode Regex Capture Bug

- [x] Write failing test: `regexFallback('S01E01E02')` returns only `episodeNumbers: [1]` (current broken behavior)
- [x] Write failing test: `autoSearchEpisode` misses a valid `S01E01E02` release when searching for E02 (regex path)
- [x] Implement fix: update regex in `regexFallback` to capture all episode numbers in `S01E01E02E03` patterns
- [x] Write passing test: `S01E01E02` returns `episodeNumbers: [1, 2]`
- [x] Write passing test: `autoSearchEpisode` correctly accepts `S01E01E02` when searching for E02
- [x] Run test suite, confirm all pass
- [x] Commit: `git commit -m "bug(wantedsearch): fix regex fallback to capture all episode numbers in multi-episode releases"`

**Checkpoint:** `CI=true bun run test --run 2>&1 | tail -40`

---

## Phase 4: Adjacent Edge Cases & Final Verification

- [x] Write test: Movie title validation handles leading articles ("The Matrix" matches "Matrix, The")
- [x] Write test: Movie title validation handles year stripping ("The Matrix 1999" matches "The Matrix")
- [x] Write test: Multi-episode regex handles 3+ episodes (`S01E01E02E03`)
- [x] Write test: Season pack grab respects grace period for all episodes in season
- [x] Run full test suite
- [x] Run production build
- [ ] Commit: `git commit -m "test(wantedsearch): add adjacent edge case tests for all three bug fixes"`

**Final Checkpoint:**
```bash
CI=true bun run test --run 2>&1 | tail -60
cd app && npm run build 2>&1 | tail -20
```
