# Track 7A Contract Conventions

## Canonical Response Envelope

### Success

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

- `success`: always `true` for successful calls.
- `data`: resource payload.
- `meta`: optional metadata.

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": {},
    "retryable": false,
    "path": "/api/..."
  }
}
```

- `code`: machine-readable domain error code.
- `message`: safe summary for operators.
- `details`: optional structured details.
- `retryable`: whether retry is recommended.
- `path`: request path if known.

### Pagination Meta

```json
{
  "page": 1,
  "pageSize": 25,
  "total": 120,
  "totalPages": 5,
  "hasNext": true,
  "hasPrev": false,
  "sort": "added",
  "order": "desc"
}
```

## Route Naming

- Prefix all API routes with `/api`.
- Use plural resource names: `/api/indexers`, `/api/torrents`, `/api/activity`.
- Use kebab-case for action endpoints: `/api/indexers/:id/test`.
- Prefer nested ownership paths when parent context matters: `/api/series/:seriesId/episodes`.

## ID and Parameter Standards

- Use `:id` for generic numeric identifiers.
- Use explicit identifiers when multiple IDs may appear: `:movieId`, `:episodeId`, `:torrentHash`.
- `BigInt` IDs are serialized as strings at the boundary.

## Query Parameters

- Pagination: `page`, `pageSize`.
- Sorting: `sort`, `order` (`asc`|`desc`).
- Filtering: `status`, `q`, resource-specific filters.
- Date range filters use ISO 8601 UTC strings: `from`, `to`.
- Unknown query params are ignored unless explicitly validated by route schema.
