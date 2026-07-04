# Plan: Fix App View/Card Component Prop Drift Test Failures

## Phase 1: Reproduce
- [ ] Run failing files and capture the exact missing elements/behaviors.
- [ ] Compare component props with test expectations.
- [ ] Update plan with mismatch list.
- [ ] Commit: `docs(measure): diagnose app view card prop drift`

## Phase 2: Fix MoviePosterView
- [ ] Update component or test for monitored toggle, delete, search, rating, runtime, navigation, fallback.
- [ ] Verify file green.
- [ ] Commit: `fix(app): align MoviePosterView tests with current component`

## Phase 3: Fix SeriesOverviewView
- [ ] Update component or test for monitored toggle, description expansion, episode progress, delete, navigation.
- [ ] Verify file green.
- [ ] Commit: `fix(app): align SeriesOverviewView tests with current component`

## Phase 4: Fix IndexerCatalogPanel
- [ ] Update public/private catalog card assertions.
- [ ] Verify file green.
- [ ] Commit: `fix(app): align IndexerCatalogPanel tests with current cards`

## Phase 5: Regression
- [ ] Run all three files together.
- [ ] Run root `CI=true npm test`.
- [ ] Commit: `test(app): verify view/card prop drift fixes`

## Phase 6: Closeout
- [ ] Update `measure/tech-debt.md`.
- [ ] Archive track.
- [ ] Commit: `docs(measure): close out view card prop drift track`
