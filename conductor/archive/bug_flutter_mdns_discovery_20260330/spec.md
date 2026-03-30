# Spec: Flutter mDNS Discovery Fix

## Context

The Flutter client's zero-config auto-discovery is completely non-functional. The
`BonsoirMdnsAdapter` listens for `discoveryServiceResolved` events but never calls
`resolve()` on discovered services. Per the Bonsoir API, discovery fires
`discoveryServiceFound` first (name only), then the caller must invoke
`event.service!.resolve(discovery.serviceResolver)` to get host/port. Without this,
the `onServerFound` stream never emits — the discovery screen scans, finds nothing,
and times out. Users can only connect via manual host entry.

Two secondary issues compound the problem:

1. **Fragile provider default**: `discoveryServiceProvider` throws `UnimplementedError`
   if not overridden. `discovery_screen.dart` wraps every provider read in try-catch
   as a workaround. The default should be a no-op adapter instead.

2. **Dead test file**: `playback_screen_test.dart` renders standalone widgets
   (CircularProgressIndicator, Icon, Text) and asserts they exist. None of the 5
   tests exercise the actual `PlaybackScreen` widget. Zero confidence in real behavior.

## Acceptance Criteria

- mDNS discovery finds and resolves `_mediarr._tcp` services on LAN.
- `DiscoveryScreen` auto-starts scan, shows discovered servers as tappable cards.
- Manual entry fallback still works when mDNS finds nothing.
- `discoveryServiceProvider` defaults to a no-op `MdnsDiscoveryAdapter` (no throw).
- `discovery_screen.dart` has zero try-catch around provider reads.
- `playback_screen_test.dart` tests real `PlaybackScreen` behavior or is deleted.
- All Flutter tests pass (`cd clients/mediarr-client && flutter test`).
