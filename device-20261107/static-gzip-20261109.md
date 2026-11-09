# SPA bundle over the wire: 1.98 MB → 544 KB (2026-11-09)

## Finding
The SPA static handler read files and sent them with correct MIME/cache headers but **no compression**.
Vite's main bundle is 1.98 MB on disk, so remote browsers (laptop on the LAN) downloaded all of it.

## Fix
`registerStaticServing` now gzips compressible assets (text/CSS/JS/JSON/SVG) larger than 1 KB when the
client accepts gzip, with `Content-Encoding: gzip` + `Vary: Accept-Encoding`, and caches the compressed
bytes by path+mtime so repeat requests are not recompressed. HTML/identity responses are untouched.

## Measurement (live bundle `/assets/index-C8aCyAkT.js`)
```
identity  1,984,061 bytes  0.009 s
gzip        543,684 bytes  0.101 s (first, compression)
gzip        543,684 bytes  0.004 s / 0.004 s / 0.003 s (cached)
```
**73 % smaller transfer**; overhead only on the first request per file.

## Tests
`staticServing.test.ts` gained three cases: gzip when accepted (body gunzips to the original), identity
when not accepted, and no compression for tiny assets. 20 tests pass.
