# Query Conventions

## Query Key Structure
All keys use the shape `[domain, resource, params?]`.

Examples:
- `['series', 'list', { page, pageSize, sortBy, sortDir, search }]`
- `['series', 'detail', id]`
- `['movies', 'list', { ... }]`
- `['movies', 'detail', id]`
- `['media', 'wanted', { page, pageSize, type }]`
- `['media', 'release-candidates', request]`
- `['torrents', 'list', { page, pageSize }]`
- `['indexers', 'list']`
- `['activity', 'list', { page, pageSize, filters }]`
- `['health']`
- `['settings']`

## Stale Times
- Lists: `30s`
- Details: `60s`
- Queue/torrents: `5s`

Configured in `src/lib/query/queryClient.ts` and consumed through `useApiQuery`.

## Invalidation Rules
- `grabRelease` success invalidates:
  - `['torrents']`
  - `['media', 'wanted']`
- Import and add-media operations invalidate:
  - `['series']`
  - `['movies']`
  - `['media', 'wanted']`
- Settings mutation invalidates:
  - `['settings']`

## Optimistic Update Pattern
Use `useOptimisticMutation` for inline operations:
1. Cancel queries for the target key.
2. Snapshot current cache entries.
3. Apply optimistic cache transform.
4. On failure, rollback snapshot and emit error toast.
5. On success, optionally invalidate dependent keys.

## SSE-to-Cache Bridge
`useEventsCacheBridge` connects to `eventsApi` and maps events to cache actions:
- `torrent:stats` -> updates all `['torrents']` caches.
- `activity:new` -> invalidates `['activity']`.
- `health:update` -> invalidates `['health']`.

The bridge is mounted globally from `AppProviders`.
