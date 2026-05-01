# WebTorrent Native Addon Resolution

## Problem
WebTorrent native addons crash on hosts missing libuv — requires `--no-addons` flag. This limits torrent functionality and performance.

## Solution
Investigate libuv/N-API coverage, find alternative torrent engine, or implement graceful fallback.

## Acceptance Criteria
- [ ] Root cause of libuv crash identified
- [ ] Solution implemented (alternative engine or fallback)
- [ ] Torrent functionality works without `--no-addons`
- [ ] Performance benchmarks acceptable
