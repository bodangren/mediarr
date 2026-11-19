# Plan — TV Client UI/UX Fixes

Track: `feature_tv_client_ux_20261116` — spec: [spec.md](./spec.md)
Owner report: 7 defects, 2026-11-16.

Write scopes (do not cross them):
- **Lead**: `clients/mediarr-client/lib/features/library/`, `clients/mediarr-client/lib/shared/widgets/media_detail/`, `clients/mediarr-client/lib/core/widgets/netflix_scaffold.dart`
- **tv-player**: `clients/mediarr-client/lib/features/playback/`
- **subs-badge**: `server/src/`, `clients/mediarr-client/lib/shared/models/`, `clients/mediarr-client/lib/shared/providers/`, `clients/mediarr-client/lib/main.dart`

Never stage `automation/dsh-plugins/**` (another session owns those edits).

---

## Phase 1 — Detail-screen entry and titles (Lead)

- [x] **1.1** Movie detail: initial focus lands on Play/Resume, not Back (FR-7). `movie_detail_screen.dart`, `action_bar.dart` — 76832c8
- [x] **1.2** Series detail: title renders in full (two lines + auto-shrink, no ellipsis) (FR-2). `series_detail_screen.dart` — 76832c8

## Phase 2 — Library navigation and artwork (Lead)

- [x] **2.1** Series detail: D-pad order follows the visual layout; no unreachable/stuck control (FR-3). `series_detail_screen.dart`, `media_detail/episode_list.dart` — 76832c8
- [x] **2.2** Series/movie grids: poster frames match artwork aspect; landscape art fitted inside the portrait card (FR-1). `poster_card.dart` — 76832c8

## Phase 3 — Focus traps (tv-player)

- [x] **3.1** End-of-playback continue/stop prompt is fully D-pad navigable with a working escape (FR-4). `features/playback/` — 428dbc4
- [x] **3.2** Audit every dialog/sheet reachable from playback for focusability + Back escape; fix each (FR-4). — 428dbc4

## Phase 4 — Subtitle availability badge (subs-badge + Lead)

- [x] **4.1** Server: expose per-item zh/en subtitle availability on list + detail payloads (FR-5). `server/src/` — fc664a2
- [x] **4.2** Client models/providers parse the new field (FR-5). `lib/shared/models/`, `lib/shared/providers/` — fc664a2
- [x] **4.3** Badge widget rendered on movie/series detail and episode tiles (FR-5). Lead integrates. — fc664a2

## Phase 5 — Freshness (subs-badge)

- [x] **5.1** Refresh library/series/movie providers on app resume and on TV focus regain (FR-6). `lib/main.dart`, `lib/shared/providers/` — fc664a2

## Phase 6 — Delivery

- [x] **6.1** Full gates: `flutter analyze --no-pub` clean, `flutter test --no-pub` 575/575, server `npx tsc -p server/tsconfig.json --noEmit` exit 0, vitest 24/24 on the touched routes. — fc664a2
- [x] **6.2** Build release APK, publish, install on the TV, re-assert the launcher. — 2bca691f **BUILD + PUBLISH DONE, INSTALL BLOCKED:** APK built at build-number 103 (59.5 MB, sha256 `4f7879ad…`) and copied to `/config/client-updates/mediarr-client-103.apk`, but `adb install -r` returns `INSTALL_FAILED_UPDATE_INCOMPATIBLE: Package com.mediarr.mediarr_client signatures do not match previously installed version`. The installed build (1.3.78 / code 102, installed 2026-11-10 21:59) was signed with a key that exists nowhere on this host (searched `~/.android`, `/root/.android`, the repo, and the 4TB drive). `manifest.json` was rolled back to 102 so the TV is not prompted with an uninstallable update. Resolving needs either the original keystore or an uninstall+reinstall (which clears the saved server address) — owner decision.

---

## Follow-ups from device verification (2026-11-17)

- [x] **7.1** Poster bug corrected at the data layer, not the tile: TVDB `/banners/posters/` wins over `/banners/graphical/`+`/banners/text/`; 24 series repaired on the live library. — 4b704158
- [x] **7.2** Title fit measured with the ambient text scaler + width headroom; verified on the device (36 px, no clipping). — 2bca691f
- [x] **7.3** Discovery actually works: LAN `/api/health` probe in parallel with mDNS + auto-connect on a single result; verified by a clean reinstall that connected with no typing. — 2bca691f
- [x] **7.4** Search field is escapable (Down/Back/Escape) on both library grids and the search route; verified on the device. — 2bca691f
- [x] **7.5** Release build fixed: dev-only `integration_test` no longer poisons the generated plugin registrant (that had produced an APK with zero plugins and a blank screen). — 2bca691f
- [x] **7.6** Build 103 installed on the TV (`adb install`, launcher re-asserted, server auto-discovered) and published as the update manifest. — 2bca691f

## Follow-ups from the frictionless-media goal (2026-11-19)

- [x] **8.1** Post-import scans are no longer deferred by a *paused* client. The client beacons
  progress every 10 s whether playing or not, so the old "a progress row exists in the last 5
  minutes" test kept every 30-minute import pass deferred for the 7 hours the owner left the player
  paused (six consecutive `Post-import scan deferred` lines, 13:01→15:30), and freshly imported
  media waited for the 02:00 scan. `PlaybackActivityGate` now calls a session live only when the
  position moved since the previous pass; 8 unit tests, server `tsc` clean.

- [x] **8.2** Continue Watching no longer goes stale. It was fetched once at app start and cached
  for the app's life, so Home kept offering the previous episode: measured on the TV, the server
  returned `Archer S08E05 53.9%` while Home still showed `S08E04 46%`, and the hero said S08E04. The
  provider is now invalidated on playback exit (after the final progress report) and on app resume.
  Verified on the device with build 120 / 1.3.96: exit → Home shows hero `Archer S08E06` and first
  tile `S08E06 58%`; `flutter analyze` clean, `flutter test --no-pub` 586/586.

- [x] **8.3** A paused client no longer beacons or blocks registration. Two halves: `PlaybackActivityGate`
  (server) treats a session as live only when the position moves, and the client beacons only while
  playing (position written once on pause/seek/stop). End-to-end proof on the live engine: with a
  session paused since 16:40:57 the 17:01 pass logged `Post-import scan: 0 movie(s), 82 episode(s),
  3842 subtitle file(s) detected` instead of the `deferred` line every pass produced from 13:01 to
  16:31. Device check: paused at 13:17, no progress row update for 40+ s afterwards (previously every
  10 s). APK 121 / 1.3.97 installed; 589/589 client tests.
- [x] **8.4** Bonus material is no longer retried as missing episodes: featurette/extras/bonus/trailer/
  sample directories are pruned from the episode walk. Removed the twice-per-pass
  `[BulkImport] Failed to import … fetch failed` errors; 11/11 folder-import tests.

## Notes

- TV was unreachable at track start (`adb connect` → "No route to host") and came back at 20:50, so
  the install was attempted — the blocker is the signing key, not the network.
- Building needed `flutter pub get` to run online, and Astrill's DNS proxy does not resolve
  `pub.dev`; a temporary `/etc/hosts` entry (removed afterwards) let pub resolve. Builds then need
  `--no-pub`, and a stale `GeneratedPluginRegistrant.java` had to be deleted once so Gradle
  regenerated it without the dev-only `integration_test` plugin.
