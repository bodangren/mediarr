# Track: Fix Failing Tests

## Overview

Fix the non-backup failing tests to restore test suite to passing state.

## Failing Test Categories

### Server/API Tests (24 tests failing)
1. `tests/api-calendar.test.ts` - 9 failed (validation errors not being caught properly)
2. `tests/torrent-completion.test.js` - 5 failed
3. `tests/api-route-map.test.ts` - 1 failed
4. `server/src/api/routes/mediaRoutes.wanted.test.ts` - 3 failed
5. `server/src/api/routes/downloadClientRoutes.test.ts` - 1 failed
6. `tests/api-sdk-contract.test.ts` - 1 failed
7. `tests/metadata-provider-unified.test.js` - 1 failed
8. `tests/torrent-manager-sync-loop.test.js` - 2 failed
9. `tests/activity-event-emission.test.js` - 2 failed
10. `tests/media-search-service.test.js` - 4 failed
11. `tests/rss-media-monitor.test.js` - 1 failed
12. `tests/search-translator.test.js` - 1 failed
13. `tests/indexer-test-capability.test.js` - 1 failed
14. `tests/tv-search-service.test.js` - 1 failed
15. `tests/metadata-provider.test.js` - 2 failed
16. `tests/api-contract-harness.test.ts` - 1 failed
17. `tests/rss-tv-monitor.test.js` - 1 failed
18. `tests/torrent-api.test.js` - 2 failed
19. `tests/integration/subtitle-provider.test.ts` - 1 failed
20. `tests/prowlarr-track-phase1-task1.1-audit.test.ts` - 1 failed
21. `tests/subtitle-provider-factory.test.js` - 1 failed
22. `tests/database-migration.test.js` - 1 failed
23. `tests/wanted-search-service.test.ts` - 2 failed

### App Tests (Frontend - 18 tests failing)
24. `app/src/lib/indexer/indexerPresets.test.ts` - 3 failed
25. `app/src/lib/theme/colorImpaired.test.ts` - 4 failed
26. `app/src/lib/hooks/useTouchGestures.test.ts` - 8 failed
27. `app/src/lib/uiPreferences.test.ts` - 3 failed

### Excluded from this track
- All `app_src_backup/**` tests (old backup directory with stale imports)
- `tests/api-handlers.test.ts` - FIXED

## Test Run Command
```bash
npm test 2>&1 | tee failed-tests-2026-03-14.txt
```

## Acceptance Criteria
- All non-backup tests pass
- Focus on server/API tests first (core functionality)
- App tests secondary
- Do NOT modify app_src_backup tests
