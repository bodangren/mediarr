# Prowlarr UI API Integration Guide (Track 10.4)

This guide documents frontend/backend contracts used by Prowlarr-clone pages and where to update them safely.

## Contract layers

- Frontend route constants: `app/src/lib/api/routeMap.ts`
- Frontend runtime validation: `app/src/lib/api/*.ts` (Zod schemas)
- Backend route handlers: `server/src/api/routes/*.ts` (Fastify schema + handlers)
- API server registration: `server/src/api/createApiServer.ts`

When adding/changing contracts, update all four layers together.

## Endpoint matrix used by Prowlarr pages

| Surface | Frontend client | Endpoint(s) | Backend route file |
| --- | --- | --- | --- |
| Indexers list + CRUD + test | `app/src/lib/api/indexerApi.ts` | `GET /api/indexers`, `POST /api/indexers`, `PUT /api/indexers/:id`, `DELETE /api/indexers/:id`, `POST /api/indexers/:id/test`, `POST /api/indexers/test` | `server/src/api/routes/indexerRoutes.ts` |
| Manual search + grab | `app/src/lib/api/releaseApi.ts` | `POST /api/releases/search`, `POST /api/releases/grab` | `server/src/api/routes/releaseRoutes.ts` |
| History page | `app/src/lib/api/activityApi.ts` | `GET /api/activity`, `DELETE /api/activity`, `PATCH /api/activity/:id/fail`, `GET /api/activity/export` | `server/src/api/routes/operationsRoutes.ts` |
| General settings | `app/src/lib/api/settingsApi.ts` | `GET /api/settings`, `PATCH /api/settings` | `server/src/api/routes/operationsRoutes.ts` |
| System status + tasks + system events | `app/src/lib/api/systemApi.ts` | `GET /api/system/status`, `GET /api/tasks/scheduled`, `GET /api/tasks/queued`, `GET /api/tasks/history`, `GET /api/tasks/history/:id`, `POST /api/tasks/scheduled/:taskId/run`, `DELETE /api/tasks/queued/:taskId`, `GET /api/system/events`, `DELETE /api/system/events/clear`, `GET /api/system/events/export` | `server/src/api/routes/systemRoutes.ts` |
| Backup page | `app/src/lib/api/backupApi.ts` | `GET /api/backups`, `POST /api/backups`, `GET /api/backups/schedule`, `PATCH /api/backups/schedule`, `POST /api/backups/:id/restore`, `POST /api/backups/:id/download`, `DELETE /api/backups/:id` | `server/src/api/routes/backupRoutes.ts` |
| Log files page | `app/src/lib/api/logsApi.ts` | `GET /api/logs/files`, `GET /api/logs/files/:filename`, `DELETE /api/logs/files/:filename`, `POST /api/logs/files/:filename/clear`, `GET /api/logs/files/:filename/download` | `server/src/api/routes/logsRoutes.ts` |
| Updates page | `app/src/lib/api/updatesApi.ts` | `GET /api/updates/current`, `GET /api/updates/available`, `GET /api/updates/history`, `POST /api/updates/check`, `POST /api/updates/install`, `GET /api/updates/progress/:updateId` | `server/src/api/routes/updatesRoutes.ts` |

## Real-time bridge (SSE)

- Stream endpoint: `GET /api/events/stream` in `server/src/api/routes/eventsRoutes.ts`
- Frontend SSE client: `app/src/lib/api/eventsApi.ts`
- Cache invalidation bridge: `app/src/lib/events/useEventsCacheBridge.ts`

Supported events consumed by Prowlarr pages:

- `indexer:added`, `indexer:updated`, `indexer:deleted`, `indexer:healthChanged`
- `health:update`
- `command:started`, `command:completed`
- `activity:new`

If you add an event type, update:

1. `EventsPayloadMap` in `app/src/lib/api/eventsApi.ts`
2. `openStream()` listeners in `app/src/lib/api/eventsApi.ts`
3. cache invalidation handlers in `app/src/lib/events/useEventsCacheBridge.ts`
4. event publisher callsites in server routes/services

## Request/response conventions

- Every API response is wrapped in the standard envelope from `server/src/api/contracts.ts`; frontend API clients unwrap and validate payloads.
- Paginated endpoints use `requestPaginated(...)` in frontend clients and `sendPaginatedSuccess(...)` in backend routes.
- Settings and indexer draft-test payloads intentionally pass `settings` as JSON string (`indexerApi.ts` + `indexerRoutes.ts`).

## Contract verification commands used in this phase

```bash
CI=true npm run test --workspace=app -- "src/lib/api/systemApi.test.ts" "src/lib/api/backupApi.test.ts" "src/lib/api/logsApi.test.ts" "src/lib/api/updatesApi.test.ts" "src/lib/api/eventsApi.test.ts" "src/lib/events/useEventsCacheBridge.test.tsx"

CI=true npm run test -- tests/api-system-routes.test.ts tests/api-route-map.test.ts
```

## Safe-change checklist

1. Update `app/src/lib/api/routeMap.ts` and the corresponding frontend API client schema.
2. Update backend route schema/handler in `server/src/api/routes/*`.
3. Add/adjust frontend and backend tests for contract shape.
4. Run the verification commands above before merging.
