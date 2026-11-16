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
- [ ] **6.2** Build release APK (`--build-number` = current+1), publish with `automation/scripts/publish-client-update.sh`, install on the TV and re-assert the launcher; if the device is unreachable, record it as pending.

---

## Notes

- TV was unreachable (`adb connect 192.168.10.60:5555` → "No route to host") at track start on
  2026-11-16 19:00; 6.2 splits build/publish (doable) from install (needs the device).
