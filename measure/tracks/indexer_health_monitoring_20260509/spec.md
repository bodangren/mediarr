# Track: Indexer Health Monitoring and Auto-Disable

## Problem
Indexers can fail silently (timeout, 403/429 responses, DNS issues) and the system continues attempting searches against them, wasting resources and slowing search results.

## Goal
Add health monitoring for each configured indexer: track response times, failure rates, and automatically disable indexers that exceed failure thresholds.

## Acceptance Criteria
- [ ] Health check endpoint or background job tests each indexer periodically
- [ ] Health metrics stored per indexer (lastSuccessAt, failureCount, avgResponseTimeMs)
- [ ] Auto-disable indexer after N consecutive failures (configurable threshold)
- [ ] Manual re-enable UI in settings
- [ ] Search queries skip disabled indexers automatically
- [ ] Tests pass (backend + component tests)
- [ ] Build and typecheck clean
