# WebTorrent Native Addon Resolution — Implementation Plan

## Phase 1: Investigation [x]
- [x] Document exact crash scenario and error messages
- [x] Test with different Node.js/bun versions
- [x] Check libuv availability on target platforms
- [x] Research alternative torrent engines (webtorrent-js, torrent-stream)

**Findings:**
- Without `--no-addons`: Bun crashes with `unsupported uv function: uv_timer_init` because native addons call unsupported libuv functions
- With `--no-addons`: `node-datachannel` (WebRTC dependency) throws `ERR_DLOPEN_DISABLED`, causing fallback to non-functional stub torrent manager
- WebTorrent can operate without native addons - it just loses uTP and WebRTC, falling back to TCP-only
- Solution: Patch `node-datachannel` to gracefully handle missing native addons with stub exports

## Phase 2: Solution Implementation [ ]
- [ ] Implement chosen solution (graceful fallback or alternative engine)
- [ ] Add configuration option for addon behavior
- [ ] Write tests for fallback path

## Phase 3: Validation [ ]
- [ ] Test on platforms without libuv
- [ ] Verify torrent download/upload functionality
- [ ] Benchmark performance vs baseline
