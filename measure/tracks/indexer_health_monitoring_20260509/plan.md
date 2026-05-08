# Plan: Indexer Health Monitoring and Auto-Disable

## Phase 1: Health Check Service (TDD)
- [ ] Write tests for IndexerHealthService
- [ ] Implement health check ping for Torznab/Newznab/Cardigann indexers
- [ ] Store health status in SQLite (indexer_health table)
- [ ] Tests pass

## Phase 2: Auto-Disable Logic (TDD)
- [ ] Write tests for consecutive failure threshold detection
- [ ] Implement auto-disable when threshold exceeded
- [ ] Skip disabled indexers in search queries
- [ ] Tests pass

## Phase 3: UI Integration
- [ ] Add health status badge to indexer list in settings
- [ ] Add manual re-enable button for auto-disabled indexers
- [ ] Add health history tooltip
- [ ] Component tests pass

## Phase 4: Verification
- [ ] Full test suite green
- [ ] Typecheck clean
- [ ] Update tech-debt.md
- [ ] Commit and push
