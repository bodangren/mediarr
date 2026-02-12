# Reproducibility Command Log

## Phase 1
- `CI=true npm test -- tests/track9-phase1-schema.test.ts`
- `CI=true npm run test:coverage -- tests/track9-phase1-schema.test.ts`

## Phase 2 (Backend Runtime)
- `ENCRYPTION_KEY='track9-probe-key' API_HOST=127.0.0.1 API_PORT=3901 DATABASE_URL='file:prisma/dev.db' npm run start:api`
- `curl -X POST http://127.0.0.1:3901/api/indexers ...`
- `curl -X POST http://127.0.0.1:3901/api/media/search ...`
- `curl -X POST http://127.0.0.1:3901/api/releases/search ...`
- `curl -X POST http://127.0.0.1:3901/api/releases/grab ...`
- `curl http://127.0.0.1:3901/api/torrents?page=1&pageSize=25`
- `curl http://127.0.0.1:3901/api/activity?page=1&pageSize=25&eventType=RELEASE_GRABBED`
- `curl -X POST http://127.0.0.1:3901/api/subtitles/search ...`
- `npx tsx /tmp/track9_definition_wiring_probe.ts`
- `npx tsx /tmp/track9_metadata_api_key_probe.ts`
- `CI=true npm test -- tests/track9-phase2-backend-parity.test.ts`

## Phase 3 (Frontend Runtime)
- `PORT=3100 NEXT_TELEMETRY_DISABLED=1 npm run dev --workspace=app`
- `curl http://127.0.0.1:3100/<route>` for `/`, `/activity`, `/settings`, `/indexers`, `/add`, `/wanted`, `/queue`, `/subtitles`, `/library/movies`, `/library/series`
- `curl http://127.0.0.1:3901/api/<workflow-route>` for indexer, add-media, wanted, queue, subtitles, settings workflow probes
- `CI=true npm test -- tests/track9-phase3-frontend-parity.test.ts`

## Phase 4
- `node conductor/tracks/clone_parity_gap_investigation_20260212/scripts/generate-validation-integrity-report.mjs`
- `CI=true npm test -- tests/track9-phase4-validation-integrity.test.ts`

## Phase 5
- `CI=true npm test -- tests/track9-phase5-remediation-backlog.test.ts`
- `CI=true npm test -- tests/track9-phase1-schema.test.ts tests/track9-phase2-backend-parity.test.ts tests/track9-phase3-frontend-parity.test.ts tests/track9-phase4-validation-integrity.test.ts tests/track9-phase5-remediation-backlog.test.ts`
