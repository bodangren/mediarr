# TV adult library UX review — Kimi K3.1 Pro (2026-11-09)

*Scope: `adult_library_screen.dart`, `adult_item_card.dart`, adult entry/lock portions of `home_screen.dart`.*

## 1. What exists now
- `AdultLibraryScreen` is a separate `StatefulWidget` calling `MediarrApiClient` directly; playback delegated via optional `onSelect`; loads 24 items and sends query/page/pageSize (`AL:55-65`).
- Search exists but only on keyboard submission (`AL:99-102`, `:149-162`); focusing near grid end appends the next page (`:104-114`).
- Titled items are placed before review items within each fetched page, pages appended (`:68-89`). Header total/review counts; footer loading/end status (`:135-147`, `:192-214`).
- Cards: thumbnails/fallbacks, title, metadata, review badge (`AC:89-140`); single focus stop with ring/scale, Select/Enter/game-A (`AC:49-87`).
- Loading, inline error, loading-more exist (`AL:166-214`). Home's visible rows contain no Adult entry or lock; integration unverified.

## 2. Gaps
**P0 — privacy/exit safety:** no PIN verification, unlock expiry, inactivity/background relock, route guard or explicit Back handling in this screen; a tile-only lock elsewhere would not protect deep links/restore. Title/filenames/search text/thumbnails render immediately; no paused/app-switcher privacy mask. Thumbnail URLs are base-URL concatenation with `Image.network` and no auth headers (`AL:116-121`, `AC:99-104`) — client-only hiding is insufficient.

**P1 — usable media manager:** no sections, user sort, filters, Play All/Shuffle, details, watched/resume indicators or progress hand-off; `onSelect == null` makes selection a no-op and no in-scope caller proves playback works (`AL:24-25`, `:184-190`). Search is remote-hostile; no empty-library/no-results state, focused Retry or pagination retry; incrementing `_pageNumber` before a failed append can permanently skip a page; overlapping searches can commit stale results (`AL:55-114`). Default grid traversal + first-card autofocus doesn't guarantee toolbar reachability/focus restoration/Back. Per-page review sorting is not a global section.

**P2:** loaded/total + section/facet counts, duplicates/missing-file visibility, review workflows, guarded prune/bulk actions; raw exception text should become safe actionable copy.

## 3. Design + remote
**Locked:** neutral “Private library” screen, no counts/titles/images; centred PIN pad, Unlock/Cancel. Require PIN on every cold entry; lock on exit/background and after five minutes without remote input; clear sensitive snapshots and cancel unlocked requests.
**Unlocked:** 48 px margins; 80 px header with count + Lock Now; 56 px tabs (Continue/Recent/Unwatched/Needs Review/All); 64 px toolbar with 600 px Search, Sort, Filter, Play All, Shuffle. Six 284 px cards, 24 px gutters, two visible rows, 32 px status/footer; 8 px around cards for unclipped focus ring; cards show Resume progress/time, watched check, review state.
Remote: D-pad deterministic tabs→toolbar→grid; Left/Right cards, Up/Down rows; OK details; Play/Pause direct resume/play; long-OK Mark watched/Review/Prune; Menu filters. Back closes keyboard/details then **locks and removes the library route**. Restore focus by item ID after details.

## 4. Phases/tests/APIs
1. **Privacy gate:** shared route/screen guard, expiring unlock state, lifecycle/Back lock. Test deep link while locked, wrong PIN, fake-clock timeout, background/resume, Back stack, zero thumbnail requests before unlock.
2. **Browse/focus:** query-scoped providers, server sections/sort/filter/search, robust pagination/states; 1920×1080 goldens, D-pad/focus-restoration, empty/error/retry, out-of-order response and failed-page recovery.
3. **Playback/maintenance:** details, resume/watched, whole-filter Play All, review/prune; test queues >24, resume updates, watched rollback, prune confirmation, relock after playback.
APIs needed (unless present): unlock/session authorization covering items and thumbnails; server sort/filter/facets/sections counts; adult detail; watched/progress mutations; ordered IDs for a whole query; prune dry-run/confirm.

## 5. Friction
Local mutable load/page state bypasses Riverpod query invalidation/AsyncValue, while Home uses watched FutureProviders. Introduce an adult-only provider family so history never leaks into normal Home rows. Home mixes root MaterialPageRoute with go_router; one Adult route/navigator policy is essential for guards, Back and focus restoration.
