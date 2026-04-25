# Phase 10.4 Deployment Notes - Prowlarr UI Cloning

Track: `prowlarr_ui_cloning_20260214`  
Phase: `10.4 Final documentation`

## Why this deployment note exists

This phase finalized docs for Prowlarr-clone UI surfaces and the API contracts they rely on. Deployment must include the settings schema migration introduced during Phase 10 integration so `/settings/general` works with host/security/logging/update sections.

## Required schema migration

Apply Prisma migration:

- Migration directory: `prisma/migrations/20260215130442_add_app_settings_sections/`
- SQL file: `prisma/migrations/20260215130442_add_app_settings_sections/migration.sql`
- Columns added on `AppSettings`: `host`, `security`, `logging`, `update`
- Model reference: `prisma/schema.prisma` (`model AppSettings`)

Run:

```bash
npx prisma migrate status
npx prisma migrate deploy
```

## Deploy sequence (track-relevant)

1. Install deps and build:

```bash
npm install
npm run build --workspace=app
```

2. Start API and UI:

```bash
npm run start:api
npm run start:app
```

3. If using containers, rebuild images so frontend rewrite config and backend route changes are current:

```bash
podman-compose up --build -d
```

## Post-deploy verification

### API smoke checks

```bash
curl -s http://localhost:3001/api/settings
curl -s http://localhost:3001/api/indexers
curl -s -X POST http://localhost:3001/api/releases/search -H "content-type: application/json" -d '{"query":"test","searchType":"search","limit":5,"offset":0}'
curl -s http://localhost:3001/api/system/status
```

Expected:

- `/api/settings` payload includes `host`, `security`, `logging`, and `update` blocks (nullable or populated).
- Other routes return envelope-shaped `data` payloads without schema errors.

### UI route checks

Open and verify these pages render and save/query actions work:

- `http://localhost:3000/indexers`
- `http://localhost:3000/search`
- `http://localhost:3000/history`
- `http://localhost:3000/settings/general`
- `http://localhost:3000/settings/ui`
- `http://localhost:3000/system/status`
- `http://localhost:3000/system/tasks`
- `http://localhost:3000/system/backup`
- `http://localhost:3000/system/events`
- `http://localhost:3000/system/logs/files`
- `http://localhost:3000/system/updates`

### Automated verification commands used

```bash
CI=true npm run test --workspace=app -- "src/lib/api/systemApi.test.ts" "src/lib/api/backupApi.test.ts" "src/lib/api/logsApi.test.ts" "src/lib/api/updatesApi.test.ts" "src/lib/api/eventsApi.test.ts" "src/lib/events/useEventsCacheBridge.test.tsx"

CI=true npm run test -- tests/api-system-routes.test.ts tests/api-route-map.test.ts

CI=true npm run test --workspace=app -- "src/app/(shell)/indexers/page.test.tsx" "src/app/(shell)/search/page.test.tsx" "src/app/(shell)/history/page.test.tsx" "src/app/(shell)/settings/general/page.test.tsx" "src/app/(shell)/settings/ui/page.test.tsx" "src/app/(shell)/system/status/page.test.tsx" "src/app/(shell)/system/tasks/page.test.tsx" "src/app/(shell)/system/backup/page.test.tsx" "src/app/(shell)/system/events/page.test.tsx" "src/app/(shell)/system/logs/files/page.test.tsx" "src/app/(shell)/system/updates/page.test.tsx"
```

Notes:

- Phase 10.3 coverage is currently implemented as Vitest integration-journey tests with mocked API clients (`app/src/app/(shell)/e2e-journeys.test.tsx`), not full browser E2E.
- The focused page suite currently passes, but it can emit non-fatal warning noise in jsdom (`act(...)` and query warning output). Track this as test-harness stability debt; it does not change runtime deployment requirements.
