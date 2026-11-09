# TV YouTube UX review — Kimi K3.1 Pro (2026-11-09)

*Scope: `youtube_library_screen.dart`, `youtube_video.dart`, `playback_queue.dart`.*

## 1. What exists now
- `StatefulWidget` loads up to 500 videos once and queue health separately; all state local (`_videos`, `_queue`, `_loading`, `_error`), not Riverpod (`LIB:33-72`).
- Client groups by channel, “Uncategorized”→“Unsorted”, channels sorted by descending count; API order within channel (`LIB:83-90`).
- Home: horizontal channel rails, 340 px cards, thumbnails, duration, watched label (`LIB:131-205`, `:229-330`). “See all” pushes a route with a copied channel list rendered as a narrow vertical list (`:149-178`, `:334-417`).
- Cards handle Select/Enter → optional `onSelect`; caller owns playback (`:13-27`, `:244-265`). Model has stream URL, channel, duration, watched, resume position (not displayed) (`MODEL:5-52`).
- Queue health is one ellipsized line plus hard-coded “downloads run every 20 minutes” (`LIB:110-119`); `failed`/`total` omitted from summary, queue errors silently ignored (`MODEL:58-103`, `LIB:65-71`). Autoplay/queue logic is episode-only (`QUEUE:8-105`).

## 2. Gaps
**P0:** no All-videos view, search, sort, watched/channel filter; large-channel-first ordering is not useful recency/title ordering (`LIB:83-90`). No per-channel/all-filtered play-all, stable playback order, Up Next or YouTube queue. Remote reliability: arrow traversal, scroll-to-focused, hardware Back not explicitly managed; channel view gives both Back and first card `autofocus: true` (competing initial focus, `LIB:361-405`); no deterministic focus restoration after `Navigator.pop`.

**P1:** 500-item cap, eager copied lists, one narrow card per row wastes 1080p (`LIB:52-56`, `:394-410`). Watched is grey text only; resume invisible; no progress bar/Resume/unwatched filter/mark-watched (`:310-320`, `MODEL:25-26`). No item-level queue/failure details/retry/cancel/per-video state; failed downloads can vanish from summary. Autoplay clarity missing (`QUEUE:90-105`). Loading only spinner; errors raw text with no Retry; error with zero videos shows “No downloaded videos yet” (`LIB:121-130`).

**P2:** channel avatars/metadata, published dates, duration-aware layout, settings/help, richer empty states.

## 3. Design + remote
48 px safe margins, 80 px title/queue header, 64 px toolbar: **Search**, **All videos / Channels**, **Newest/Oldest/Title**, **All/Unwatched/Watched**. Body ≥20 px; titles ≥28 px.
Channel mode: 320 px-high rails, five visible 336 px cards, thumbnail progress bar, watched check; each header has focused Play all and See all. See all/All videos: five-column grid with server pagination, sticky query toolbar, channel Play all.
Initial focus first result; Up reaches toolbar/header; Left/Right within rails; Down preserves column; every move ensure-visible without wrapping. OK plays/resumes; Menu/long-OK: Play from here, Add to queue, Mark watched/unwatched. Back closes search/actions, otherwise pops See all restoring exact card and scroll; home Back normal. Autoplay gets a YouTube-specific setting and “Up next: title” countdown with Cancel.

## 4. Phases/tests/APIs
1. **Focus/state foundation:** explicit traversal/focus memory, retryable states, watched/resume presentation, local query model; 1920×1080 golden/widget tests for every direction, Back restoration, long titles, loading/error/empty.
2. **Scalable discovery:** Riverpod query/channel providers, grid See all, server-backed search/filter/sort/pagination; unit-test grouping/filter combinations; integration-test cursor boundaries and focus across page loads.
3. **Playback/queue:** typed YouTube queue, per-channel/filtered play-all, explicit autoplay, resume refresh, actionable download panel; test queue order, cancellation, autoplay on/off, watched updates, retry/failure display.
Server contracts not evidenced: cursor pagination; `q`, channel ID, watched, sort params; channel summaries; published-at/channel-ID fields; item-level queue status/actions; stable play-all ordering; idempotent progress/watched updates. The 500 cap cannot provide global search/play-all (`LIB:52-54`).

## 5. Friction
Local imperative state and one-time loading fight shared filters/pagination/post-playback refresh. Passing copied `videos` into `MaterialPageRoute` makes See all stale; pass query/provider identity (`LIB:156-163`). Optional external `onSelect` leaves play-all semantics undefined. Do not force YouTube into `PlaybackQueueItem` (season/episode schema and episode-only autoplay incompatible); preserve deliberate separation (`QUEUE:13-29`, `MODEL:1-4`).
