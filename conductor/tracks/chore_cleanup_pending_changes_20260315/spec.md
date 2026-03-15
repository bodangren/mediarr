# Spec: Cleanup Pending Changes from Prior Work

## Problem Statement

Several uncommitted working-tree changes accumulated during the previous day's work
(2026-03-14/15) outside of a formal track. These need to be committed and the codebase
brought to a clean state before proceeding with directive work.

**Pending changes in working tree:**

1. `app/vite.config.ts` — Added `host: true` so the Vite dev server listens on
   `0.0.0.0`, enabling LAN devices (e.g. Android TV) to reach the dev server directly.

2. `server/src/main.ts` — Added LAN IP detection logic for mDNS advertisement.
   When the system hostname resolves to `127.x.x.x`, bonjour-service was advertising
   the loopback address. Now we detect the preferred network interface (`MDNS_IFACE`,
   default `wlp3s0`) or the first non-loopback IPv4 address and pass it as `host`
   to the mDNS announcement.

3. `server/src/services/DiscoveryService.ts` — Added optional `host?` field to
   `BonjourInstance`, `DiscoveryServiceOptions`, and `DiscoveryAnnouncement` to support
   the explicit LAN IP from `main.ts`.

4. `clients/android-tv/app/build.gradle.kts` — Version bump to 1.1 (versionCode 2).

5. `clients/android-tv/app/src/main/java/com/mediarr/tv/notification/NotificationEventSource.kt`
   — Fixed `isActive` → `currentCoroutineContext().isActive` in the reconnect loop to
   avoid the `isActive` extension not being in scope inside a `suspend fun`.

6. `conductor/tracks/chore_server_module_alignment_20260315/` — Three files exist in
   HEAD but have been deleted on disk (archive move happened outside of git). Stage
   these deletions so HEAD matches disk.

## Acceptance Criteria

- [ ] All six change groups are committed with descriptive messages.
- [ ] `conductor/tracks/chore_server_module_alignment_20260315/` is removed from HEAD.
- [ ] `git status` shows a clean working tree.
- [ ] Full test suite passes (or pre-existing failures are documented).
- [ ] The branch is merged to `main` and pushed.
