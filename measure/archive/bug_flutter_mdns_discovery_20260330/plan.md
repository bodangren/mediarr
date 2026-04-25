# Implementation Plan: Flutter mDNS Discovery Fix

## Phase 1 — Fix mDNS Resolve & Provider Default

- [x] Task: Rewrite `bonsoir_adapter.dart` to handle `discoveryServiceFound` events, call `event.service!.resolve(discovery.serviceResolver)`, and emit `DiscoveredServer` on `discoveryServiceResolved`
- [x] Task: Write tests for `BonsoirMdnsAdapter` verifying `resolve()` is called and `onServerFound` emits after both found+resolved events
- [x] Task: Replace `discoveryServiceProvider` default in `discovery_service.dart` with a no-op `MdnsDiscoveryAdapter` that returns an empty stream (no `UnimplementedError`)
- [x] Task: Remove try-catch blocks from `discovery_screen.dart` lines 28-34 and 69-73; use direct provider reads
- [x] Task: Write tests for `DiscoveryScreen` verifying scan auto-starts and discovered servers render as cards

## Phase 2 — Fix Playback Tests

- [x] Task: Rewrite `playback_screen_test.dart` — test PlaybackState model, formatDuration, overlay rendering (loading, error, completed, transport controls)
- [x] Task: Run `cd clients/mediarr-client && flutter test` — all pass
- [x] Task: Measure - Checkpoint Phase 2
