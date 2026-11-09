# JSON API responses now gzip: heavy library payload 2.0 MB → 188 KB (2026-11-09)

## Finding
Static assets were the visible payload, but the SPA/TV library endpoints are heavier:
`/api/movies?pageSize=500` returns **2,006,693 bytes** of JSON (the TV fetches pages of 500; the SPA lists
with nested variants). Every LAN client downloaded it uncompressed.

## Fix
An `onSend` hook (`api/responseCompression.ts`) gzips JSON payloads **> 1 KB** when the client accepts
gzip, sets `Content-Encoding` + `Vary`, and leaves SSE (`text/event-stream`), non-JSON, small responses and
already-encoded payloads untouched (the report page and health probe are unaffected).

## Live measurement (`/api/movies?pageSize=500`, current bundle of variants)
```
identity  2,006,693 bytes  0.303 s (includes query)
gzip        187,553 bytes  0.216 s (includes query + compression)
content-encoding: gzip;  vary: Accept-Encoding;  content-length: 187553
/api/health with gzip: 217 bytes, uncompressed (below threshold)
```
**90.6 % smaller transfer** for the heaviest API call.

## Tests
`responseCompression.test.ts`: large JSON gzips (gunzips to original), identity without accept-encoding,
and non-JSON/tiny/already-encoded payloads are untouched (3 tests). Route tests (movies, system, playback)
still green: 20 tests.
